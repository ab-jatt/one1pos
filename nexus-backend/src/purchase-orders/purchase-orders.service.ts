import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private readonly poSequencePad = 5;

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
      poNumber: po.poNumber,
      supplier: po.supplier.name,
      supplierId: po.supplierId,
      items: po.items.length,
      total: Number(po.total),
      notes: po.notes,
      expectedDeliveryDate: po.date.toISOString().split('T')[0],
      status: this.mapStatus(po.status),
      date: po.createdAt.toISOString().split('T')[0],
    }));
  }

  private mapStatus(status: PurchaseOrderStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
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
      case 'approved':
        return 'APPROVED';
      case 'received':
        return 'RECEIVED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  private async generatePoNumber(
    tx: Prisma.TransactionClient,
    branchId: string,
    dateContext: Date,
  ): Promise<string> {
    const year = dateContext.getFullYear();
    const prefix = `PO-${year}-`;

    const latest = await tx.purchaseOrder.findFirst({
      where: {
        branchId,
        poNumber: { startsWith: prefix },
      },
      orderBy: { poNumber: 'desc' },
      select: { poNumber: true },
    });

    const latestSeq = latest?.poNumber
      ? Number.parseInt(latest.poNumber.split('-').pop() || '0', 10)
      : 0;
    const nextSeq = latestSeq + 1;

    return `${prefix}${String(nextSeq).padStart(this.poSequencePad, '0')}`;
  }

  private ensureMutableBeforeApproval(status: PurchaseOrderStatus) {
    if (status === 'APPROVED') {
      throw new BadRequestException(
        'Approved purchase orders are locked and cannot be edited.',
      );
    }

    if (status === 'RECEIVED' || status === 'CANCELLED') {
      throw new BadRequestException(
        'Only pending purchase orders can be edited.',
      );
    }
  }

  async findOne(id: string, branchId?: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
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

    if (branchId && order.branchId !== branchId) {
      throw new NotFoundException(`Purchase Order ${id} not found`);
    }

    return {
      id: order.id,
      poNumber: order.poNumber,
      supplier: order.supplier.name,
      supplierId: order.supplierId,
      items: order.items.map((i) => ({
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity,
        unitCost: Number(i.cost),
      })),
      total: Number(order.total),
      notes: order.notes,
      expectedDeliveryDate: order.date.toISOString().split('T')[0],
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
    const expectedDeliveryDate = dto.expectedDeliveryDate
      ? new Date(dto.expectedDeliveryDate)
      : dto.date
        ? new Date(dto.date)
        : new Date();

    let order: any = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        order = await this.prisma.$transaction(
          async (tx) => {
            const poNumber = await this.generatePoNumber(
              tx,
              branchId,
              expectedDeliveryDate,
            );

            const createdOrder = await tx.purchaseOrder.create({
              data: {
                poNumber,
                supplierId: dto.supplierId,
                branchId,
                status: initialStatus,
                total,
                notes: dto.notes || null,
                date: expectedDeliveryDate,
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

            if (initialStatus === 'RECEIVED') {
              for (const item of createdOrder.items) {
                let stock = await tx.stock.findUnique({
                  where: {
                    branchId_productId: {
                      branchId: createdOrder.branchId,
                      productId: item.productId,
                    },
                  },
                });

                const openingStock = stock ? stock.quantity : 0;
                const closingStock = openingStock + item.quantity;

                if (!stock) {
                  stock = await tx.stock.create({
                    data: {
                      productId: item.productId,
                      branchId: createdOrder.branchId,
                      quantity: closingStock,
                    },
                  });
                } else {
                  await tx.stock.update({
                    where: { id: stock.id },
                    data: { quantity: closingStock },
                  });
                }

                const existingMovement = await tx.stockMovement.findFirst({
                  where: {
                    stockId: stock.id,
                    type: 'RESTOCK',
                    referenceId: createdOrder.id,
                  },
                });

                if (!existingMovement) {
                  await tx.stockMovement.create({
                    data: {
                      stockId: stock.id,
                      type: 'RESTOCK',
                      quantityIn: item.quantity,
                      quantityOut: 0,
                      openingStock,
                      closingStock,
                      reason: `Purchase Order ${createdOrder.poNumber}`,
                      referenceId: createdOrder.id,
                    },
                  });
                }
              }
            }

            return createdOrder;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 3
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!order) {
      throw new ConflictException('Failed to generate a unique PO number for this store.');
    }

    return {
      id: order.id,
      poNumber: order.poNumber,
      supplier: order.supplier.name,
      supplierId: order.supplierId,
      items: order.items.length,
      total: Number(order.total),
      notes: order.notes,
      expectedDeliveryDate: order.date.toISOString().split('T')[0],
      status: this.mapStatus(order.status),
      date: order.createdAt.toISOString().split('T')[0],
    };
  }

  async update(id: string, dto: any, branchId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          items: true,
          supplier: true,
        },
      });

      if (!order || order.branchId !== branchId) {
        throw new NotFoundException(`Purchase Order ${id} not found`);
      }

      this.ensureMutableBeforeApproval(order.status);

      if (dto.supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: dto.supplierId, branchId },
          select: { id: true },
        });

        if (!supplier) {
          throw new BadRequestException('Supplier is invalid for this store.');
        }
      }

      const hasItemsUpdate = Array.isArray(dto.items);

      if (hasItemsUpdate && dto.items.length === 0) {
        throw new BadRequestException('Purchase order must contain at least one item.');
      }

      const computedTotal = hasItemsUpdate
        ? dto.items.reduce(
            (sum: number, item: any) =>
              sum + Number(item.quantity) * Number(item.unitCost || item.cost || 0),
            0,
          )
        : Number(order.total);

      return tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          supplierId: dto.supplierId ?? order.supplierId,
          notes: dto.notes ?? order.notes,
          date: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : dto.date
              ? new Date(dto.date)
              : order.date,
          total: computedTotal,
          ...(hasItemsUpdate
            ? {
                items: {
                  deleteMany: {},
                  create: dto.items.map((item: any) => ({
                    productId: item.productId,
                    quantity: Number(item.quantity),
                    cost: Number(item.unitCost || item.cost || 0),
                  })),
                },
              }
            : {}),
        },
        include: {
          supplier: true,
          items: true,
        },
      });
    });

    return {
      id: updated.id,
      poNumber: updated.poNumber,
      supplier: updated.supplier.name,
      supplierId: updated.supplierId,
      items: updated.items.length,
      total: Number(updated.total),
      notes: updated.notes,
      expectedDeliveryDate: updated.date.toISOString().split('T')[0],
      status: this.mapStatus(updated.status),
      date: updated.createdAt.toISOString().split('T')[0],
    };
  }

  async updateStatus(id: string, status: string, branchId?: string) {
    const newStatus = this.mapStatusToEnum(status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException(`Purchase Order ${id} not found`);
      }

      if (branchId && order.branchId !== branchId) {
        throw new NotFoundException(`Purchase Order ${id} not found`);
      }

      if (order.status === 'RECEIVED' && newStatus !== 'RECEIVED') {
        throw new BadRequestException('Received purchase orders cannot change status.');
      }

      if (order.status === 'CANCELLED' && newStatus !== 'CANCELLED') {
        throw new BadRequestException('Cancelled purchase orders cannot change status.');
      }

      if (order.status === 'PENDING' && !['APPROVED', 'RECEIVED', 'CANCELLED'].includes(newStatus)) {
        throw new BadRequestException('Invalid status transition from Pending.');
      }

      if (order.status === 'APPROVED' && !['APPROVED', 'RECEIVED', 'CANCELLED'].includes(newStatus)) {
        throw new BadRequestException('Invalid status transition from Approved.');
      }

      // If receiving/approving now (from non-received), increase stock and log in same transaction.
      if (newStatus === 'RECEIVED' && order.status !== 'RECEIVED') {
        for (const item of order.items) {
          let stock = await tx.stock.findUnique({
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
            stock = await tx.stock.create({
              data: {
                branchId: order.branchId,
                productId: item.productId,
                quantity: closingStock,
              },
            });
          } else {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: closingStock },
            });
          }

          const existingMovement = await tx.stockMovement.findFirst({
            where: {
              stockId: stock.id,
              type: 'RESTOCK',
              referenceId: order.id,
            },
          });

          if (!existingMovement) {
            await tx.stockMovement.create({
              data: {
                stockId: stock.id,
                type: 'RESTOCK',
                quantityIn: item.quantity,
                quantityOut: 0,
                openingStock,
                closingStock,
                reason: `Purchase Order Received - ${order.poNumber}`,
                referenceId: order.id,
              },
            });
          }
        }
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
        include: { supplier: true, items: true },
      });
    });

    return {
      id: updated.id,
      poNumber: updated.poNumber,
      supplier: updated.supplier.name,
      supplierId: updated.supplierId,
      items: updated.items.length,
      total: Number(updated.total),
      notes: updated.notes,
      expectedDeliveryDate: updated.date.toISOString().split('T')[0],
      status: this.mapStatus(updated.status),
      date: updated.createdAt.toISOString().split('T')[0],
    };
  }
}
