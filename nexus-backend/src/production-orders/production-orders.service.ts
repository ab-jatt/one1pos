import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionOrderStatus } from '@prisma/client';

@Injectable()
export class ProductionOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { branchId: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { branchId: filters.branchId };
    if (filters.status) where.status = filters.status as ProductionOrderStatus;

    const [orders, total] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where,
        include: {
          product: { include: { category: true } },
          items: { include: { product: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.productionOrder.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.formatOrder(o)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, branchId?: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: { include: { category: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
        branch: true,
      },
    });

    if (!order) throw new NotFoundException(`Production Order ${id} not found`);
    if (branchId && order.branchId !== branchId) throw new NotFoundException(`Production Order ${id} not found`);
    return this.formatOrder(order);
  }

  async create(dto: any, branchId: string) {
    const count = await this.prisma.productionOrder.count({ where: { branchId } });
    const orderNumber = `PRD-${String(count + 1).padStart(6, '0')}`;

    const order = await this.prisma.productionOrder.create({
      data: {
        branchId,
        orderNumber,
        productId: dto.productId,
        quantity: dto.quantity,
        status: 'DRAFT',
        notes: dto.notes,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        createdById: dto.createdById,
        items: dto.items?.length
          ? {
              create: dto.items.map((item: any) => ({
                productId: item.productId,
                requiredQty: item.requiredQty,
                unitCost: item.unitCost || 0,
              })),
            }
          : undefined,
      },
      include: {
        product: { include: { category: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return this.formatOrder(order);
  }

  async update(id: string, dto: any, branchId?: string) {
    const order = await this.prisma.productionOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Production Order ${id} not found`);
    if (branchId && order.branchId !== branchId) throw new NotFoundException(`Production Order ${id} not found`);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Can only update draft production orders');
    }

    const updated = await this.prisma.productionOrder.update({
      where: { id },
      data: {
        productId: dto.productId,
        quantity: dto.quantity,
        notes: dto.notes,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },
      include: {
        product: { include: { category: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return this.formatOrder(updated);
  }

  /**
   * Issue materials from raw material warehouse to production
   * Reduces stock in source warehouse
   */
  async issueMaterials(id: string, dto: {
    warehouseId: string;
    items: Array<{ productionOrderItemId: string; quantity: number }>;
    createdById?: string;
  }, branchId?: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException(`Production Order ${id} not found`);
    if (branchId && order.branchId !== branchId) throw new NotFoundException(`Production Order ${id} not found`);
    if (order.status === 'COMPLETED' || order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot issue materials for ${order.status} order`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let totalMaterialCost = 0;

      for (const issueItem of dto.items) {
        const orderItem = order.items.find((i) => i.id === issueItem.productionOrderItemId);
        if (!orderItem) {
          throw new BadRequestException(`Production order item ${issueItem.productionOrderItemId} not found`);
        }

        const remainingToIssue = orderItem.requiredQty - orderItem.issuedQty;
        if (issueItem.quantity > remainingToIssue) {
          throw new BadRequestException(
            `Cannot issue ${issueItem.quantity} of ${orderItem.product.name}. Remaining to issue: ${remainingToIssue}`,
          );
        }

        // Check warehouse stock (ledger-based)
        const incomingAgg = await tx.warehouseMovement.aggregate({
          where: { toWarehouseId: dto.warehouseId, productId: orderItem.productId },
          _sum: { quantity: true },
        });
        const outgoingAgg = await tx.warehouseMovement.aggregate({
          where: { fromWarehouseId: dto.warehouseId, productId: orderItem.productId },
          _sum: { quantity: true },
        });
        const warehouseBalance = (incomingAgg._sum.quantity || 0) - (outgoingAgg._sum.quantity || 0);

        if (warehouseBalance < issueItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${orderItem.product.name}. Available: ${warehouseBalance}, Requested: ${issueItem.quantity}`,
          );
        }

        const unitCost = Number(orderItem.unitCost || orderItem.product.costPrice);
        const itemCost = unitCost * issueItem.quantity;
        totalMaterialCost += itemCost;

        // Update issued qty on production order item
        await tx.productionOrderItem.update({
          where: { id: orderItem.id },
          data: { issuedQty: { increment: issueItem.quantity } },
        });

        // Create warehouse movement (Production Issue)
        await tx.warehouseMovement.create({
          data: {
            branchId: order.branchId,
            productId: orderItem.productId,
            fromWarehouseId: dto.warehouseId,
            toWarehouseId: null,
            quantity: issueItem.quantity,
            unitCost,
            totalCost: itemCost,
            movementType: 'PRODUCTION_ISSUE',
            referenceType: 'PRODUCTION',
            referenceId: order.id,
            notes: `Issued to Production Order ${order.orderNumber}`,
            createdById: dto.createdById,
          },
        });

        // Also update the legacy Stock table for backward compatibility
        const stock = await tx.stock.findUnique({
          where: {
            branchId_productId: {
              branchId: order.branchId,
              productId: orderItem.productId,
            },
          },
        });

        if (stock) {
          const openingStock = stock.quantity;
          const closingStock = openingStock - issueItem.quantity;
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: issueItem.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              type: 'TRANSFER_OUT',
              quantityOut: issueItem.quantity,
              openingStock,
              closingStock,
              reason: `Production Issue - ${order.orderNumber}`,
              referenceId: order.id,
              createdById: dto.createdById,
            },
          });
        }
      }

      // Update production order status and cost
      const newStatus = order.status === 'DRAFT' ? 'MATERIALS_ISSUED' : order.status;
      const updated = await tx.productionOrder.update({
        where: { id },
        data: {
          status: newStatus as ProductionOrderStatus,
          rawMaterialCost: { increment: totalMaterialCost },
          totalCost: { increment: totalMaterialCost },
        },
        include: {
          product: { include: { category: true } },
          items: { include: { product: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      return updated;
    });

    return this.formatOrder(result);
  }

  /**
   * Receive finished goods into warehouse
   * Increases stock in finished goods warehouse
   */
  async receiveGoods(id: string, dto: {
    warehouseId: string;
    quantity: number;
    createdById?: string;
  }, branchId?: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { product: true, items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException(`Production Order ${id} not found`);
    if (branchId && order.branchId !== branchId) throw new NotFoundException(`Production Order ${id} not found`);
    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot receive goods for ${order.status} order`);
    }
    if (order.status === 'DRAFT') {
      throw new BadRequestException('Cannot receive before issuing materials');
    }

    const remainingToReceive = order.quantity - order.completedQty;
    if (dto.quantity > remainingToReceive) {
      throw new BadRequestException(
        `Cannot receive ${dto.quantity}. Remaining to receive: ${remainingToReceive}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const unitCost = Number(order.rawMaterialCost) / order.quantity;
      const totalCost = unitCost * dto.quantity;

      // Create warehouse movement (Production Receive)
      await tx.warehouseMovement.create({
        data: {
          branchId: order.branchId,
          productId: order.productId,
          fromWarehouseId: null,
          toWarehouseId: dto.warehouseId,
          quantity: dto.quantity,
          unitCost,
          totalCost,
          movementType: 'PRODUCTION_RECEIVE',
          referenceType: 'PRODUCTION',
          referenceId: order.id,
          notes: `Received from Production Order ${order.orderNumber}`,
          createdById: dto.createdById,
        },
      });

      // Also update legacy Stock table for backward compatibility
      let stock = await tx.stock.findUnique({
        where: {
          branchId_productId: {
            branchId: order.branchId,
            productId: order.productId,
          },
        },
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            branchId: order.branchId,
            productId: order.productId,
            quantity: 0,
          },
        });
      }

      const openingStock = stock.quantity;
      const closingStock = openingStock + dto.quantity;

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: { increment: dto.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          type: 'RESTOCK',
          quantityIn: dto.quantity,
          openingStock,
          closingStock,
          reason: `Production Receive - ${order.orderNumber}`,
          referenceId: order.id,
          createdById: dto.createdById,
        },
      });

      // Determine new status
      const newCompletedQty = order.completedQty + dto.quantity;
      let newStatus = order.status;
      if (newCompletedQty >= order.quantity) {
        newStatus = 'RECEIVED';
      } else if (order.status !== 'IN_PROGRESS') {
        newStatus = 'IN_PROGRESS';
      }

      const updated = await tx.productionOrder.update({
        where: { id },
        data: {
          completedQty: { increment: dto.quantity },
          status: newStatus as ProductionOrderStatus,
          completedDate: newCompletedQty >= order.quantity ? new Date() : undefined,
        },
        include: {
          product: { include: { category: true } },
          items: { include: { product: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      return updated;
    });

    return this.formatOrder(result);
  }

  /**
   * Return materials back to warehouse (optional)
   */
  async returnMaterials(id: string, dto: {
    warehouseId: string;
    items: Array<{ productionOrderItemId: string; quantity: number }>;
    createdById?: string;
  }, branchId?: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException(`Production Order ${id} not found`);
    if (branchId && order.branchId !== branchId) throw new NotFoundException(`Production Order ${id} not found`);

    const result = await this.prisma.$transaction(async (tx) => {
      let totalReturnCost = 0;

      for (const returnItem of dto.items) {
        const orderItem = order.items.find((i) => i.id === returnItem.productionOrderItemId);
        if (!orderItem) throw new BadRequestException(`Item ${returnItem.productionOrderItemId} not found`);

        if (returnItem.quantity > (orderItem.issuedQty - orderItem.returnedQty)) {
          throw new BadRequestException(
            `Cannot return ${returnItem.quantity} of ${orderItem.product.name}. Max returnable: ${orderItem.issuedQty - orderItem.returnedQty}`,
          );
        }

        const unitCost = Number(orderItem.unitCost || orderItem.product.costPrice);
        const itemCost = unitCost * returnItem.quantity;
        totalReturnCost += itemCost;

        await tx.productionOrderItem.update({
          where: { id: orderItem.id },
          data: { returnedQty: { increment: returnItem.quantity } },
        });

        // Create reverse movement
        await tx.warehouseMovement.create({
          data: {
            branchId: order.branchId,
            productId: orderItem.productId,
            fromWarehouseId: null,
            toWarehouseId: dto.warehouseId,
            quantity: returnItem.quantity,
            unitCost,
            totalCost: itemCost,
            movementType: 'RETURN_IN',
            referenceType: 'PRODUCTION',
            referenceId: order.id,
            notes: `Returned from Production Order ${order.orderNumber}`,
            createdById: dto.createdById,
          },
        });

        // Update legacy Stock
        const stock = await tx.stock.findUnique({
          where: {
            branchId_productId: {
              branchId: order.branchId,
              productId: orderItem.productId,
            },
          },
        });

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: { increment: returnItem.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              type: 'RETURN',
              quantityIn: returnItem.quantity,
              openingStock: stock.quantity,
              closingStock: stock.quantity + returnItem.quantity,
              reason: `Material Return - ${order.orderNumber}`,
              referenceId: order.id,
              createdById: dto.createdById,
            },
          });
        }
      }

      const updated = await tx.productionOrder.update({
        where: { id },
        data: {
          rawMaterialCost: { decrement: totalReturnCost },
          totalCost: { decrement: totalReturnCost },
        },
        include: {
          product: { include: { category: true } },
          items: { include: { product: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      return updated;
    });

    return this.formatOrder(result);
  }

  /**
   * Update production order status
   */
  async updateStatus(id: string, status: string, branchId?: string) {
    const order = await this.prisma.productionOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Production Order ${id} not found`);
    if (branchId && order.branchId !== branchId) throw new NotFoundException(`Production Order ${id} not found`);

    const updated = await this.prisma.productionOrder.update({
      where: { id },
      data: {
        status: status as ProductionOrderStatus,
        startDate: status === 'IN_PROGRESS' && !order.startDate ? new Date() : undefined,
        completedDate: status === 'COMPLETED' || status === 'RECEIVED' ? new Date() : undefined,
      },
      include: {
        product: { include: { category: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return this.formatOrder(updated);
  }

  /**
   * Cancel production order
   */
  async cancel(id: string, branchId?: string) {
    const order = await this.prisma.productionOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Production Order ${id} not found`);
    if (branchId && order.branchId !== branchId) throw new NotFoundException(`Production Order ${id} not found`);
    if (order.status === 'RECEIVED') {
      throw new BadRequestException('Cannot cancel a received production order');
    }

    const updated = await this.prisma.productionOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        product: { include: { category: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return this.formatOrder(updated);
  }

  private formatOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      branchName: order.branch?.name,
      productId: order.productId,
      productName: order.product.name,
      productSku: order.product.sku,
      category: order.product.category?.name || '',
      quantity: order.quantity,
      completedQty: order.completedQty,
      status: order.status,
      rawMaterialCost: Number(order.rawMaterialCost),
      totalCost: Number(order.totalCost),
      notes: order.notes,
      startDate: order.startDate?.toISOString() || null,
      completedDate: order.completedDate?.toISOString() || null,
      createdBy: order.createdBy?.name || null,
      items: order.items?.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        productSku: i.product.sku,
        requiredQty: i.requiredQty,
        issuedQty: i.issuedQty,
        returnedQty: i.returnedQty,
        unitCost: Number(i.unitCost),
        remaining: i.requiredQty - i.issuedQty + i.returnedQty,
      })) || [],
      createdAt: order.createdAt.toISOString(),
    };
  }
}
