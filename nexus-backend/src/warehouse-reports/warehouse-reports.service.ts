import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehouseReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the most recent supplier for a product in a warehouse
   * Used to show "primary vendor" in balance reports
   */
  private async getRecentSupplierForProduct(
    branchId: string,
    warehouseId: string,
    productId: string,
  ): Promise<string> {
    try {
      // Find the most recent PURCHASE movement for this product in this warehouse
      const movement = await this.prisma.warehouseMovement.findFirst({
        where: {
          branchId,
          toWarehouseId: warehouseId,
          productId,
          referenceType: 'PURCHASE',
        },
        include: {
          // Purchase movement's referenceId points to PurchaseOrder
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!movement || !movement.referenceId) {
        return 'N/A';
      }

      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: movement.referenceId },
        include: { supplier: { select: { name: true } } },
      });

      return po?.supplier?.name || 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * 1. Stock Balance Report — Product × Warehouse × Qty × Value
   */
  async getStockBalanceReport(filters: {
    branchId?: string;
    warehouseId?: string;
    categoryId?: string;
  }) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        deletedAt: null,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.warehouseId ? { id: filters.warehouseId } : {}),
      },
    });

    const results: any[] = [];

    for (const warehouse of warehouses) {
      const incoming = await this.prisma.warehouseMovement.groupBy({
        by: ['productId'],
        where: {
          branchId: warehouse.branchId,
          toWarehouseId: warehouse.id,
        },
        _sum: { quantity: true, totalCost: true },
      });

      const outgoing = await this.prisma.warehouseMovement.groupBy({
        by: ['productId'],
        where: {
          branchId: warehouse.branchId,
          fromWarehouseId: warehouse.id,
        },
        _sum: { quantity: true, totalCost: true },
      });

      const balanceMap = new Map<string, { qty: number; value: number }>();
      for (const r of incoming) {
        balanceMap.set(r.productId, {
          qty: r._sum.quantity || 0,
          value: Number(r._sum.totalCost || 0),
        });
      }
      for (const r of outgoing) {
        const curr = balanceMap.get(r.productId) || { qty: 0, value: 0 };
        curr.qty -= r._sum.quantity || 0;
        curr.value -= Number(r._sum.totalCost || 0);
        balanceMap.set(r.productId, curr);
      }

      const productIds = Array.from(balanceMap.keys());
      if (productIds.length === 0) continue;

      const productWhere: any = {
        id: { in: productIds },
        branchId: warehouse.branchId,
      };
      if (filters.categoryId) productWhere.categoryId = filters.categoryId;

      const products = await this.prisma.product.findMany({
        where: productWhere,
        include: { category: true },
      });

      for (const product of products) {
        const balance = balanceMap.get(product.id);
        if (!balance || balance.qty === 0) continue;

        // Get the most recent supplier for this product in this warehouse
        const vendorName = await this.getRecentSupplierForProduct(
          warehouse.branchId,
          warehouse.id,
          product.id,
        );

        results.push({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          warehouseType: warehouse.type,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.category?.name || '',
          quantity: balance.qty,
          unitCost: Number(product.costPrice),
          totalValue: balance.qty * Number(product.costPrice),
          vendorName, // Added vendor information
        });
      }
    }

    // Summary
    const totalItems = results.length;
    const totalQuantity = results.reduce((sum, r) => sum + r.quantity, 0);
    const totalValue = results.reduce((sum, r) => sum + r.totalValue, 0);

    return {
      data: results,
      summary: { totalItems, totalQuantity, totalValue },
    };
  }

  /**
   * Resolve vendor/supplier name for a warehouse movement
   * For PURCHASE movements, follows referenceId → PurchaseOrder → Supplier
   * For other movements, returns "N/A"
   */
  private async resolveVendorName(
    referenceType: string | null,
    referenceId: string | null,
  ): Promise<string> {
    if (!referenceId || !referenceType) return 'N/A';

    // Only PURCHASE movements reference PurchaseOrders with suppliers
    if (referenceType === 'PURCHASE') {
      try {
        const po = await this.prisma.purchaseOrder.findUnique({
          where: { id: referenceId },
          include: {
            supplier: {
              select: { name: true },
            },
          },
        });
        return po?.supplier?.name || 'N/A';
      } catch (error) {
        return 'N/A';
      }
    }

    // Other reference types (PRODUCTION, SALE, TRANSFER, ADJUSTMENT) don't have suppliers
    return 'N/A';
  }

  /**
   * 2. Stock Movement Report — filtered by date, product, warehouse, type
   */
  async getStockMovementReport(filters: {
    branchId?: string;
    warehouseId?: string;
    productId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.productId) where.productId = filters.productId;
    if (filters.movementType) where.movementType = filters.movementType;
    if (filters.warehouseId) {
      where.OR = [
        { fromWarehouseId: filters.warehouseId },
        { toWarehouseId: filters.warehouseId },
      ];
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }

    const movements = await this.prisma.warehouseMovement.findMany({
      where,
      include: {
        product: true,
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Resolve vendor names for each movement
    const dataWithVendors = await Promise.all(
      movements.map(async (m) => {
        const vendorName = await this.resolveVendorName(
          m.referenceType,
          m.referenceId,
        );
        return {
          id: m.id,
          date: m.createdAt.toISOString(),
          productName: m.product.name,
          sku: m.product.sku,
          fromWarehouse: m.fromWarehouse?.name || '-',
          toWarehouse: m.toWarehouse?.name || '-',
          quantity: m.quantity,
          unitCost: Number(m.unitCost),
          totalCost: Number(m.totalCost),
          movementType: m.movementType,
          referenceType: m.referenceType || '-',
          referenceId: m.referenceId || '-',
          vendorName, // Added vendor information
          notes: m.notes || '',
          createdBy: m.createdBy?.name || '-',
        };
      }),
    );

    // Summary by type
    const summaryByType: Record<string, { count: number; totalQty: number; totalValue: number }> = {};
    for (const m of dataWithVendors) {
      if (!summaryByType[m.movementType]) {
        summaryByType[m.movementType] = { count: 0, totalQty: 0, totalValue: 0 };
      }
      summaryByType[m.movementType].count++;
      summaryByType[m.movementType].totalQty += m.quantity;
      summaryByType[m.movementType].totalValue += m.totalCost;
    }

    return { data: dataWithVendors, summary: summaryByType, totalRecords: dataWithVendors.length };
  }

  /**
   * 3. Inventory Valuation Report
   */
  async getInventoryValuationReport(filters: { branchId?: string }) {
    const balanceReport = await this.getStockBalanceReport(filters);

    // Group by warehouse
    const byWarehouse: Record<string, { name: string; type: string; items: number; qty: number; value: number }> = {};
    for (const item of balanceReport.data) {
      if (!byWarehouse[item.warehouseId]) {
        byWarehouse[item.warehouseId] = {
          name: item.warehouseName,
          type: item.warehouseType,
          items: 0,
          qty: 0,
          value: 0,
        };
      }
      byWarehouse[item.warehouseId].items++;
      byWarehouse[item.warehouseId].qty += item.quantity;
      byWarehouse[item.warehouseId].value += item.totalValue;
    }

    // Group by category
    const byCategory: Record<string, { items: number; qty: number; value: number }> = {};
    for (const item of balanceReport.data) {
      const cat = item.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { items: 0, qty: 0, value: 0 };
      byCategory[cat].items++;
      byCategory[cat].qty += item.quantity;
      byCategory[cat].value += item.totalValue;
    }

    return {
      details: balanceReport.data,
      byWarehouse: Object.entries(byWarehouse).map(([id, v]) => ({ warehouseId: id, ...v })),
      byCategory: Object.entries(byCategory).map(([name, v]) => ({ category: name, ...v })),
      summary: balanceReport.summary,
    };
  }

  /**
   * 4. Production Consumption Report
   */
  async getProductionConsumptionReport(filters: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    productionOrderId?: string;
  }) {
    const where: any = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.productionOrderId) where.id = filters.productionOrderId;

    const orders = await this.prisma.productionOrder.findMany({
      where,
      include: {
        product: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      finishedProduct: order.product.name,
      targetQty: order.quantity,
      completedQty: order.completedQty,
      status: order.status,
      rawMaterialCost: Number(order.rawMaterialCost),
      totalCost: Number(order.totalCost),
      materials: order.items.map((item) => ({
        productName: item.product.name,
        sku: item.product.sku,
        requiredQty: item.requiredQty,
        issuedQty: item.issuedQty,
        returnedQty: item.returnedQty,
        netConsumed: item.issuedQty - item.returnedQty,
        unitCost: Number(item.unitCost),
        totalCost: (item.issuedQty - item.returnedQty) * Number(item.unitCost),
        fulfillmentRate: item.requiredQty > 0
          ? Math.round(((item.issuedQty - item.returnedQty) / item.requiredQty) * 100)
          : 0,
      })),
      startDate: order.startDate?.toISOString() || null,
      completedDate: order.completedDate?.toISOString() || null,
      createdAt: order.createdAt.toISOString(),
    }));

    const totalOrders = data.length;
    const totalMaterialCost = data.reduce((s, d) => s + d.rawMaterialCost, 0);
    const completedOrders = data.filter((d) => d.status === 'RECEIVED').length;

    return {
      data,
      summary: { totalOrders, completedOrders, totalMaterialCost },
    };
  }

  /**
   * 5. Finished Goods Production Report
   */
  async getFinishedGoodsReport(filters: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {
      movementType: 'PRODUCTION_RECEIVE',
    };
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }

    const movements = await this.prisma.warehouseMovement.findMany({
      where,
      include: {
        product: { include: { category: true } },
        toWarehouse: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = movements.map((m) => ({
      date: m.createdAt.toISOString(),
      productName: m.product.name,
      sku: m.product.sku,
      category: m.product.category?.name || '',
      quantity: m.quantity,
      unitCost: Number(m.unitCost),
      totalCost: Number(m.totalCost),
      warehouse: m.toWarehouse?.name || '-',
      referenceId: m.referenceId,
    }));

    // Group by product
    const byProduct: Record<string, { name: string; totalQty: number; totalValue: number }> = {};
    for (const m of data) {
      if (!byProduct[m.sku]) byProduct[m.sku] = { name: m.productName, totalQty: 0, totalValue: 0 };
      byProduct[m.sku].totalQty += m.quantity;
      byProduct[m.sku].totalValue += m.totalCost;
    }

    return {
      data,
      byProduct: Object.entries(byProduct).map(([sku, v]) => ({ sku, ...v })),
      summary: {
        totalProduced: data.reduce((s, d) => s + d.quantity, 0),
        totalValue: data.reduce((s, d) => s + d.totalCost, 0),
      },
    };
  }

  /**
   * 6. Low Stock Report
   */
  async getLowStockReport(filters: {
    branchId?: string;
    warehouseId?: string;
    threshold?: number;
  }) {
    const balanceReport = await this.getStockBalanceReport(filters);
    const threshold = filters.threshold || 10;

    const lowStockItems = balanceReport.data
      .filter((item: any) => item.quantity <= threshold)
      .sort((a: any, b: any) => a.quantity - b.quantity);

    return {
      data: lowStockItems,
      summary: {
        totalLowStockItems: lowStockItems.length,
        outOfStockItems: lowStockItems.filter((i: any) => i.quantity <= 0).length,
        threshold,
      },
    };
  }

  /**
   * 7. Warehouse Transfer Report
   */
  async getTransferReport(filters: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }

    const transfers = await this.prisma.stockTransfer.findMany({
      where,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = transfers.map((t) => ({
      id: t.id,
      transferNumber: t.transferNumber,
      fromWarehouse: t.fromWarehouse.name,
      toWarehouse: t.toWarehouse.name,
      status: t.status,
      itemCount: t.items.length,
      totalQuantity: t.items.reduce((s, i) => s + i.quantity, 0),
      totalValue: t.items.reduce((s, i) => s + i.quantity * Number(i.unitCost), 0),
      items: t.items.map((i) => ({
        productName: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unitCost: Number(i.unitCost),
      })),
      createdBy: t.createdBy?.name || '-',
      completedAt: t.completedAt?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      data,
      summary: {
        totalTransfers: data.length,
        completedTransfers: data.filter((d) => d.status === 'COMPLETED').length,
        totalItemsMoved: data.reduce((s, d) => s + d.totalQuantity, 0),
      },
    };
  }
}
