import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { branchId },
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((po) => ({
      id: po.id,
      supplier: po.supplier.name,
      items: po.items.length,
      total: Number(po.total),
      status: this.mapStatus(po.status),
      date: po.createdAt.toISOString().split('T')[0],
    }));
  }

  private mapStatus(status: PurchaseOrderStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'RECEIVED':
        return 'Received';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  private mapStatusToEnum(status: string): PurchaseOrderStatus {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'PENDING';
      case 'received':
        return 'RECEIVED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Purchase Order ${id} not found`);
    }

    return {
      id: order.id,
      supplier: order.supplier.name,
      supplierId: order.supplierId,
      items: order.items.map((i) => ({
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity,
        unitCost: Number(i.cost),
      })),
      total: Number(order.total),
      status: this.mapStatus(order.status),
      date: order.createdAt.toISOString().split('T')[0],
    };
  }

  async create(dto: any, branchId: string) {
    // Calculate total from items
    let total = 0;
    if (dto.items) {
      for (const item of dto.items) {
        total += (item.unitCost || item.cost) * item.quantity;
      }
    }

    const initialStatus = this.mapStatusToEnum(dto.status || 'Pending');

    const order = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        branchId,
        status: initialStatus,
        total,
        items: dto.items
          ? {
              create: dto.items.map((i: any) => ({
                productId: i.productId,
                quantity: i.quantity,
                cost: i.unitCost || i.cost,
              })),
            }
          : undefined,
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    // If created with RECEIVED status, update stock immediately
    if (initialStatus === 'RECEIVED') {
      for (const item of order.items) {
        // Get or create stock record
        let stock = await this.prisma.stock.findUnique({
          where: {
            branchId_productId: {
              branchId: order.branchId,
              productId: item.productId,
            },
          },
        });

        const openingStock = stock ? stock.quantity : 0;
        const closingStock = openingStock + item.quantity;

        if (!stock) {
          stock = await this.prisma.stock.create({
            data: {
              productId: item.productId,
              branchId: order.branchId,
              quantity: item.quantity,
            },
          });
        } else {
          await this.prisma.stock.update({
            where: { id: stock.id },
            data: { quantity: { increment: item.quantity } },
          });
        }

        // Create stock movement
        await this.prisma.stockMovement.create({
          data: {
            stockId: stock.id,
            type: 'RESTOCK',
            quantityIn: item.quantity,
            quantityOut: 0,
            openingStock,
            closingStock,
            reason: `Purchase Order ${order.id}`,
            referenceId: order.id,
          },
        });
      }
    }

    return {
      id: order.id,
      supplier: order.supplier.name,
      items: order.items.length,
      total: Number(order.total),
      status: this.mapStatus(order.status),
      date: order.createdAt.toISOString().split('T')[0],
    };
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Purchase Order ${id} not found`);
    }

    const newStatus = this.mapStatusToEnum(status);

    // If receiving, increase stock and log to ledger
    if (newStatus === 'RECEIVED' && order.status !== 'RECEIVED') {
      for (const item of order.items) {
        // Get or create stock record
        let stock = await this.prisma.stock.findUnique({
          where: {
            branchId_productId: {
              branchId: order.branchId,
              productId: item.productId,
            },
          },
        });

        if (!stock) {
          stock = await this.prisma.stock.create({
            data: {
              branchId: order.branchId,
              productId: item.productId,
              quantity: 0,
            },
          });
        }

        const currentStock = stock.quantity;
        const newStock = currentStock + item.quantity;

        // Update stock quantity
        await this.prisma.stock.update({
          where: { id: stock.id },
          data: { quantity: newStock },
        });

        // Log to stock ledger
        await this.prisma.stockMovement.create({
          data: {
            stockId: stock.id,
            type: 'RESTOCK',
            quantityIn: item.quantity,
            quantityOut: 0,
            openingStock: currentStock,
            closingStock: newStock,
            reason: `Purchase Order Received - PO#${order.id.slice(0, 8)}`,
            referenceId: order.id,
          },
        });
      }
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
      include: { supplier: true, items: true },
    });

    return {
      id: updated.id,
      supplier: updated.supplier.name,
      items: updated.items.length,
      total: Number(updated.total),
      status: this.mapStatus(updated.status),
      date: updated.createdAt.toISOString().split('T')[0],
    };
  }
}
