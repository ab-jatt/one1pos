import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { OrderStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.order.findMany({
      where: { branchId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    return order;
  }

  async create(createOrderDto: CreateOrderDto, branchId: string) {
    const { items, customerId, cashierId, paymentMethod, discount, pointsRedeemed } = createOrderDto;

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    // Calculate totals
    let subtotal = 0;
    let totalCost = 0;

    // Validate products and calculate totals
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            stocks: {
              where: { branchId },
            },
          },
        });

        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        const stock = product.stocks[0];
        if (!stock || stock.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }

        subtotal += Number(product.price) * item.quantity;
        totalCost += Number(product.costPrice) * item.quantity;

        return {
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          cost: product.costPrice,
        };
      }),
    );

    // Apply discount
    const discountAmount = discount || 0;
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calculate tax (8%)
    const taxRate = 0.08;
    const tax = subtotalAfterDiscount * taxRate;
    const total = subtotalAfterDiscount + tax;

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customerId || null,
          cashierId,
          branchId,
          status: OrderStatus.COMPLETED,
          subtotal,
          tax,
          discount: discountAmount,
          total,
          items: {
            create: orderItems,
          },
          payments: {
            create: {
              method: paymentMethod as PaymentMethod,
              amount: total,
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          payments: true,
        },
      });

      // Decrease stock for each item
      for (const item of orderItems) {
        await tx.stock.updateMany({
          where: {
            branchId,
            productId: item.productId,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Create stock movement
        const stock = await tx.stock.findFirst({
          where: {
            branchId,
            productId: item.productId,
          },
        });

        if (stock) {
          const currentStock = stock.quantity;
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              type: 'SALE',
              quantityIn: 0,
              quantityOut: item.quantity,
              openingStock: currentStock,
              closingStock: currentStock - item.quantity,
              reason: `Order ${orderNumber}`,
              referenceId: newOrder.id,
            },
          });
        }
      }

      // Handle CREDIT payment - create ledger entry
      if (customerId && paymentMethod === PaymentMethod.CREDIT) {
        await tx.customerLedger.create({
          data: {
            customerId,
            orderId: newOrder.id,
            type: 'CREDIT',
            amount: total,
            description: `Credit sale - Order ${orderNumber}`,
          },
        });

        // Update customer balance to reflect total credit owed
        const totalOwed = await tx.customerLedger.aggregate({
          where: { customerId },
          _sum: { amount: true },
        });

        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance: totalOwed._sum.amount || 0,
          },
        });
      }

      // Update customer points if applicable
      if (customerId && pointsRedeemed) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            points: {
              decrement: pointsRedeemed,
            },
          },
        });
      }

      // Add points earned (1 point per dollar)
      if (customerId) {
        const pointsEarned = Math.floor(subtotalAfterDiscount);
        await tx.customer.update({
          where: { id: customerId },
          data: {
            points: {
              increment: pointsEarned,
            },
          },
        });
      }

      // Create accounting transaction
      await tx.transaction.create({
        data: {
          branchId,
          description: `Sale - ${orderNumber}`,
          amount: total,
          type: 'INCOME',
          category: 'Sales',
          referenceId: newOrder.id,
          orderId: newOrder.id,
        },
      });

      return newOrder;
    });

    return order;
  }

  async refund(id: string, refundOrderDto: RefundOrderDto) {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Order has already been refunded');
    }

    const { items: refundItems, reason } = refundOrderDto;

    // Build a map of itemId -> quantity to refund
    const refundQuantityMap = new Map<string, number>();
    refundItems.forEach((ri) => {
      refundQuantityMap.set(ri.itemId, ri.quantity);
    });

    // Calculate refund amount and validate quantities
    let refundAmount = 0;
    const itemsToRefund: Array<{
      item: (typeof order.items)[0];
      refundQty: number;
    }> = [];

    for (const item of order.items) {
      const requestedQty = refundQuantityMap.get(item.id);
      if (requestedQty !== undefined) {
        if (requestedQty > item.quantity) {
          throw new BadRequestException(
            `Cannot refund ${requestedQty} units of ${item.product?.name || 'item'} - only ${item.quantity} in order`,
          );
        }
        itemsToRefund.push({ item, refundQty: requestedQty });
        refundAmount += Number(item.price) * requestedQty;
      }
    }

    if (itemsToRefund.length === 0) {
      throw new BadRequestException('No valid items selected for refund');
    }

    // Check if this is a full refund (all items, full quantities)
    const isFullRefund = itemsToRefund.every(
      ({ item, refundQty }) => refundQty === item.quantity,
    ) && itemsToRefund.length === order.items.length;

    // Process refund in transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Update order status only if full refund
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: isFullRefund ? OrderStatus.REFUNDED : order.status,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          payments: true,
        },
      });

      // Restore stock for refunded items
      for (const { item, refundQty } of itemsToRefund) {
        // Get or create stock record
        let stockRecord = await tx.stock.findFirst({
          where: {
            branchId: order.branchId,
            productId: item.productId,
          },
        });

        // If no stock record exists, create one
        if (!stockRecord) {
          stockRecord = await tx.stock.create({
            data: {
              branchId: order.branchId,
              productId: item.productId,
              quantity: 0,
            },
          });
        }

        const openingQty = stockRecord.quantity;

        await tx.stock.update({
          where: { id: stockRecord.id },
          data: {
            quantity: {
              increment: refundQty,
            },
          },
        });

        // Create stock movement for return
        await tx.stockMovement.create({
          data: {
            stockId: stockRecord.id,
            type: 'RETURN',
            quantityIn: refundQty,
            quantityOut: 0,
            openingStock: openingQty,
            closingStock: openingQty + refundQty,
            reason: `Refund (${refundQty}x) - ${reason || 'Customer request'}`,
            referenceId: order.id,
          },
        });
      }

      // Create refund transaction
      await tx.transaction.create({
        data: {
          branchId: order.branchId,
          description: `Refund - ${order.orderNumber}`,
          amount: refundAmount,
          type: 'EXPENSE',
          category: 'Refund',
          referenceId: order.id,
        },
      });

      return updated;
    });

    return {
      order: updatedOrder,
      refundAmount,
      refundedItems: itemsToRefund.map(({ item, refundQty }) => ({
        productId: item.productId,
        productName: item.product?.name,
        quantity: refundQty,
        unitPrice: Number(item.price),
        totalRefund: Number(item.price) * refundQty,
      })),
    };
  }

  async getStats(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: OrderStatus.COMPLETED,
        createdAt: {
          gte: today,
        },
      },
    });

    const totalSales = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const orderCount = orders.length;
    const averageOrder = orderCount > 0 ? totalSales / orderCount : 0;

    return {
      todaySales: totalSales,
      todayOrders: orderCount,
      averageOrderValue: averageOrder,
    };
  }
}
