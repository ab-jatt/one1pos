import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseMovementType } from '@prisma/client';

@Injectable()
export class WarehouseMovementsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Central stock movement creation function.
   * ALL inventory changes must go through this method.
   */
  async createMovement(data: {
    branchId: string;
    productId: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity: number;
    unitCost?: number;
    movementType: WarehouseMovementType;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdById?: string;
    skipNegativeCheck?: boolean;
  }) {
    if (data.quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    // Validate warehouses belong to tenant/branch
    if (data.fromWarehouseId) {
      const fromWh = await this.prisma.warehouse.findUnique({
        where: { id: data.fromWarehouseId },
      });
      if (!fromWh || fromWh.branchId !== data.branchId) {
        throw new BadRequestException('Source warehouse does not belong to this branch');
      }

      // Check stock availability (unless skip flag is set)
      if (!data.skipNegativeCheck) {
        const balance = await this.getProductBalance(data.fromWarehouseId, data.productId);
        if (balance < data.quantity) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${balance}, Requested: ${data.quantity}`,
          );
        }
      }
    }

    if (data.toWarehouseId) {
      const toWh = await this.prisma.warehouse.findUnique({
        where: { id: data.toWarehouseId },
      });
      if (!toWh || toWh.branchId !== data.branchId) {
        throw new BadRequestException('Destination warehouse does not belong to this branch');
      }
    }

    const totalCost = (data.unitCost || 0) * data.quantity;

    const movement = await this.prisma.warehouseMovement.create({
      data: {
        branchId: data.branchId,
        productId: data.productId,
        fromWarehouseId: data.fromWarehouseId || null,
        toWarehouseId: data.toWarehouseId || null,
        quantity: data.quantity,
        unitCost: data.unitCost || 0,
        totalCost,
        movementType: data.movementType,
        referenceType: data.referenceType || null,
        referenceId: data.referenceId || null,
        notes: data.notes || null,
        createdById: data.createdById || null,
      },
      include: {
        product: true,
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    return {
      id: movement.id,
      productId: movement.productId,
      productName: movement.product.name,
      fromWarehouse: movement.fromWarehouse?.name || null,
      toWarehouse: movement.toWarehouse?.name || null,
      quantity: movement.quantity,
      unitCost: Number(movement.unitCost),
      totalCost: Number(movement.totalCost),
      movementType: movement.movementType,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      notes: movement.notes,
      createdAt: movement.createdAt.toISOString(),
    };
  }

  /**
   * Get product balance in a specific warehouse (SUM of movements)
   */
  async getProductBalance(warehouseId: string, productId: string): Promise<number> {
    const incoming = await this.prisma.warehouseMovement.aggregate({
      where: { toWarehouseId: warehouseId, productId },
      _sum: { quantity: true },
    });

    const outgoing = await this.prisma.warehouseMovement.aggregate({
      where: { fromWarehouseId: warehouseId, productId },
      _sum: { quantity: true },
    });

    return (incoming._sum.quantity || 0) - (outgoing._sum.quantity || 0);
  }

  /**
   * Get all stock balances across all warehouses
   */
  async getStockBalances(filters: {
    branchId?: string;
    warehouseId?: string;
    productId?: string;
  }) {
    const whereIncoming: any = {};
    const whereOutgoing: any = {};

    if (filters.branchId) {
      whereIncoming.branchId = filters.branchId;
      whereOutgoing.branchId = filters.branchId;
    }
    if (filters.warehouseId) {
      whereIncoming.toWarehouseId = filters.warehouseId;
      whereOutgoing.fromWarehouseId = filters.warehouseId;
    }
    if (filters.productId) {
      whereIncoming.productId = filters.productId;
      whereOutgoing.productId = filters.productId;
    }

    const incoming = await this.prisma.warehouseMovement.groupBy({
      by: ['productId', 'toWarehouseId'],
      where: { ...whereIncoming, toWarehouseId: filters.warehouseId || { not: null } },
      _sum: { quantity: true, totalCost: true },
    });

    const outgoing = await this.prisma.warehouseMovement.groupBy({
      by: ['productId', 'fromWarehouseId'],
      where: { ...whereOutgoing, fromWarehouseId: filters.warehouseId || { not: null } },
      _sum: { quantity: true, totalCost: true },
    });

    // Build balance map: warehouseId -> productId -> { qty, value }
    const balanceMap = new Map<string, Map<string, { qty: number; value: number }>>();

    for (const rec of incoming) {
      const whId = rec.toWarehouseId!;
      if (!balanceMap.has(whId)) balanceMap.set(whId, new Map());
      const whMap = balanceMap.get(whId)!;
      const current = whMap.get(rec.productId) || { qty: 0, value: 0 };
      current.qty += rec._sum.quantity || 0;
      current.value += Number(rec._sum.totalCost || 0);
      whMap.set(rec.productId, current);
    }

    for (const rec of outgoing) {
      const whId = rec.fromWarehouseId!;
      if (!balanceMap.has(whId)) balanceMap.set(whId, new Map());
      const whMap = balanceMap.get(whId)!;
      const current = whMap.get(rec.productId) || { qty: 0, value: 0 };
      current.qty -= rec._sum.quantity || 0;
      current.value -= Number(rec._sum.totalCost || 0);
      whMap.set(rec.productId, current);
    }

    // Resolve product and warehouse info
    const allProductIds = new Set<string>();
    const allWarehouseIds = new Set<string>();
    for (const [whId, prods] of balanceMap) {
      allWarehouseIds.add(whId);
      for (const pid of prods.keys()) allProductIds.add(pid);
    }

    const [products, warehouses] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: Array.from(allProductIds) } },
        include: { category: true },
      }),
      this.prisma.warehouse.findMany({
        where: { id: { in: Array.from(allWarehouseIds) } },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    const results: any[] = [];
    for (const [whId, prods] of balanceMap) {
      const wh = warehouseMap.get(whId);
      for (const [pid, balance] of prods) {
        if (balance.qty === 0) continue;
        const product = productMap.get(pid);
        results.push({
          warehouseId: whId,
          warehouseName: wh?.name || 'Unknown',
          warehouseType: wh?.type || 'GENERAL',
          productId: pid,
          productName: product?.name || 'Unknown',
          sku: product?.sku || '',
          category: product?.category?.name || '',
          quantity: balance.qty,
          unitCost: Number(product?.costPrice || 0),
          totalValue: balance.qty * Number(product?.costPrice || 0),
        });
      }
    }

    return results.sort((a, b) => a.warehouseName.localeCompare(b.warehouseName));
  }

  /**
   * Get all movements with filters
   */
  async findAll(filters: {
    branchId?: string;
    warehouseId?: string;
    productId?: string;
    movementType?: WarehouseMovementType;
    referenceType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.productId) where.productId = filters.productId;
    if (filters.movementType) where.movementType = filters.movementType;
    if (filters.referenceType) where.referenceType = filters.referenceType;
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

    const [movements, total] = await Promise.all([
      this.prisma.warehouseMovement.findMany({
        where,
        include: {
          product: true,
          fromWarehouse: true,
          toWarehouse: true,
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.warehouseMovement.count({ where }),
    ]);

    return {
      data: movements.map((m) => ({
        id: m.id,
        productId: m.productId,
        productName: m.product.name,
        sku: m.product.sku,
        fromWarehouseId: m.fromWarehouseId,
        fromWarehouse: m.fromWarehouse?.name || null,
        toWarehouseId: m.toWarehouseId,
        toWarehouse: m.toWarehouse?.name || null,
        quantity: m.quantity,
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost),
        movementType: m.movementType,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        notes: m.notes,
        createdBy: m.createdBy?.name || null,
        createdAt: m.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create manual stock adjustment
   */
  async createAdjustment(dto: {
    branchId: string;
    warehouseId: string;
    productId: string;
    quantity: number;
    type: 'IN' | 'OUT';
    reason?: string;
    createdById?: string;
  }) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new BadRequestException('Product not found');

    const movementType = dto.type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

    return this.createMovement({
      branchId: dto.branchId || 'main-branch-id',
      productId: dto.productId,
      fromWarehouseId: dto.type === 'OUT' ? dto.warehouseId : undefined,
      toWarehouseId: dto.type === 'IN' ? dto.warehouseId : undefined,
      quantity: dto.quantity,
      unitCost: Number(product.costPrice),
      movementType: movementType as WarehouseMovementType,
      referenceType: 'ADJUSTMENT',
      notes: dto.reason || `Manual ${dto.type} adjustment`,
      createdById: dto.createdById,
    });
  }

  /**
   * Transfer stock between warehouses
   */
  async transferStock(dto: {
    branchId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    items: Array<{ productId: string; quantity: number }>;
    notes?: string;
    createdById?: string;
  }) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different');
    }

    const results = await this.prisma.$transaction(async (tx) => {
      // Generate transfer number
      const count = await tx.stockTransfer.count();
      const transferNumber = `TRF-${String(count + 1).padStart(6, '0')}`;

      const transfer = await tx.stockTransfer.create({
        data: {
          branchId: dto.branchId || 'main-branch-id',
          transferNumber,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          status: 'COMPLETED',
          notes: dto.notes,
          createdById: dto.createdById,
          completedAt: new Date(),
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: { include: { product: true } },
        },
      });

      // Create movement records for each item
      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });

        // Check source warehouse balance
        const incomingAgg = await tx.warehouseMovement.aggregate({
          where: { toWarehouseId: dto.fromWarehouseId, productId: item.productId },
          _sum: { quantity: true },
        });
        const outgoingAgg = await tx.warehouseMovement.aggregate({
          where: { fromWarehouseId: dto.fromWarehouseId, productId: item.productId },
          _sum: { quantity: true },
        });
        const balance = (incomingAgg._sum.quantity || 0) - (outgoingAgg._sum.quantity || 0);

        if (balance < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product?.name}. Available: ${balance}, Requested: ${item.quantity}`,
          );
        }

        await tx.warehouseMovement.create({
          data: {
            branchId: dto.branchId || 'main-branch-id',
            productId: item.productId,
            fromWarehouseId: dto.fromWarehouseId,
            toWarehouseId: dto.toWarehouseId,
            quantity: item.quantity,
            unitCost: Number(product?.costPrice || 0),
            totalCost: item.quantity * Number(product?.costPrice || 0),
            movementType: 'TRANSFER',
            referenceType: 'TRANSFER',
            referenceId: transfer.id,
            notes: dto.notes,
            createdById: dto.createdById,
          },
        });
      }

      return transfer;
    });

    return {
      id: results.id,
      transferNumber: results.transferNumber,
      fromWarehouse: results.fromWarehouse.name,
      toWarehouse: results.toWarehouse.name,
      status: results.status,
      items: results.items.map((i) => ({
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity,
      })),
      completedAt: results.completedAt?.toISOString(),
      createdAt: results.createdAt.toISOString(),
    };
  }

  /**
   * Get all stock transfers
   */
  async findAllTransfers(filters: {
    branchId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.status) where.status = filters.status;

    const [transfers, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: { include: { product: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return {
      data: transfers.map((t) => ({
        id: t.id,
        transferNumber: t.transferNumber,
        fromWarehouse: t.fromWarehouse.name,
        toWarehouse: t.toWarehouse.name,
        status: t.status,
        itemCount: t.items.length,
        items: t.items.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          quantity: i.quantity,
          unitCost: Number(i.unitCost),
        })),
        notes: t.notes,
        createdBy: t.createdBy?.name || null,
        completedAt: t.completedAt?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
