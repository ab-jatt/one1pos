import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExchangesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique exchange number
   */
  private async generateExchangeNumber(): Promise<string> {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastExchange = await this.prisma.exchange.findFirst({
      where: {
        exchangeNumber: {
          startsWith: `EX-${datePrefix}`,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastExchange) {
      const lastSequence = parseInt(lastExchange.exchangeNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `EX-${datePrefix}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Create an exchange transaction
   * 
   * CORE RULES:
   * 1. Exchange is NOT a sale and NOT a purchase
   * 2. Returned items → Stock IN (EXCHANGE_IN movement)
   * 3. Issued items → Stock OUT (EXCHANGE_OUT movement)
   * 4. Net amount = Issued Value - Returned Value
   * 5. Amount adjustments affect ONLY monetary value, NOT inventory quantities
   * 6. Original invoice is NEVER modified
   * 7. Full audit trail is maintained
   */
  async create(createExchangeDto: CreateExchangeDto) {
    const {
      originalOrderId,
      branchId,
      customerId,
      processedById,
      returnedItems,
      issuedItems,
      paymentMethod,
      adjustedAmount,
      adjustmentReason,
      adjustedById,
      notes,
    } = createExchangeDto;

    // VALIDATION: Original order must exist
    const originalOrder = await this.prisma.order.findUnique({
      where: { id: originalOrderId },
      include: { items: true },
    });

    if (!originalOrder) {
      throw new NotFoundException('Original order not found. Exchange requires a valid invoice reference.');
    }

    // VALIDATION: If adjustment is provided, reason is mandatory
    if (adjustedAmount !== undefined && adjustedAmount !== null && !adjustmentReason) {
      throw new BadRequestException('Adjustment reason is mandatory when adjusting the exchange amount.');
    }

    // Calculate system totals based on ACTUAL quantities (never affected by price override)
    const returnedTotal = returnedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const issuedTotal = issuedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    
    // System-calculated amount: Positive = customer pays, Negative = refund/credit
    const calculatedAmount = issuedTotal - returnedTotal;
    
    // Final difference: Use adjusted amount if provided, otherwise use calculated
    const hasAdjustment = adjustedAmount !== undefined && adjustedAmount !== null;
    const finalDifference = hasAdjustment ? adjustedAmount : calculatedAmount;

    // VALIDATION: Stock availability for issued items (quantities NEVER change based on price)
    for (const item of issuedItems) {
      const stock = await this.prisma.stock.findFirst({
        where: {
          branchId,
          productId: item.productId,
        },
      });

      if (!stock || stock.quantity < item.quantity) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        throw new BadRequestException(
          `Insufficient stock for ${product?.name || 'product'}. Available: ${stock?.quantity || 0}, Required: ${item.quantity}`,
        );
      }
    }

    // Generate exchange number
    const exchangeNumber = await this.generateExchangeNumber();

    // Determine payment status
    let paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'CREDIT_ISSUED' | 'CREDIT_USED' | 'NOT_APPLICABLE' = 'PENDING';
    if (finalDifference === 0) {
      paymentStatus = 'NOT_APPLICABLE';
    }

    // Process exchange in a transaction for data integrity
    const exchange = await this.prisma.$transaction(async (tx) => {
      // Create exchange record with all amount tracking fields
      const newExchange = await tx.exchange.create({
        data: {
          exchangeNumber,
          originalOrderId,
          customerId,
          branchId,
          processedById,
          returnedTotal: new Decimal(returnedTotal),
          issuedTotal: new Decimal(issuedTotal),
          calculatedAmount: new Decimal(calculatedAmount),
          adjustedAmount: hasAdjustment ? new Decimal(adjustedAmount) : null,
          adjustmentReason: hasAdjustment ? adjustmentReason : null,
          adjustedById: hasAdjustment ? adjustedById : null,
          difference: new Decimal(finalDifference),
          paymentMethod,
          paymentStatus,
          notes: hasAdjustment 
            ? `${notes || ''}\n[Amount Adjustment: Calculated ${calculatedAmount}, Adjusted to ${adjustedAmount}. Reason: ${adjustmentReason}]`.trim()
            : notes,
          returnedItems: {
            create: returnedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Decimal(item.unitPrice),
              totalPrice: new Decimal(item.unitPrice * item.quantity),
            })),
          },
          issuedItems: {
            create: issuedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Decimal(item.unitPrice),
              totalPrice: new Decimal(item.unitPrice * item.quantity),
            })),
          },
        },
        include: {
          returnedItems: { include: { product: true } },
          issuedItems: { include: { product: true } },
          customer: true,
          originalOrder: true,
        },
      });

      // ========================================
      // STOCK LEDGER: RETURNED ITEMS → STOCK IN
      // Movement type: EXCHANGE_IN (not RETURN to distinguish from refunds)
      // ========================================
      for (const item of returnedItems) {
        let stockRecord = await tx.stock.findFirst({
          where: {
            branchId,
            productId: item.productId,
          },
        });

        if (!stockRecord) {
          stockRecord = await tx.stock.create({
            data: {
              branchId,
              productId: item.productId,
              quantity: 0,
            },
          });
        }

        const openingQty = stockRecord.quantity;
        const closingQty = openingQty + item.quantity;

        // Update stock quantity
        await tx.stock.update({
          where: { id: stockRecord.id },
          data: {
            quantity: { increment: item.quantity },
          },
        });

        // Create stock movement with clear exchange reference
        await tx.stockMovement.create({
          data: {
            stockId: stockRecord.id,
            type: 'EXCHANGE_IN', // Clear identification as exchange stock-in
            quantityIn: item.quantity,
            quantityOut: 0,
            openingStock: openingQty,
            closingStock: closingQty,
            reason: `Exchange Return - ${exchangeNumber}`,
            referenceId: newExchange.id,
            createdById: processedById,
          },
        });
      }

      // ========================================
      // STOCK LEDGER: ISSUED ITEMS → STOCK OUT
      // Movement type: EXCHANGE_OUT (not SALE to distinguish from sales)
      // ========================================
      for (const item of issuedItems) {
        const stockRecord = await tx.stock.findFirst({
          where: {
            branchId,
            productId: item.productId,
          },
        });

        if (!stockRecord) {
          throw new BadRequestException('Stock record not found during exchange processing');
        }

        const openingQty = stockRecord.quantity;
        const closingQty = openingQty - item.quantity;

        // Update stock quantity
        await tx.stock.update({
          where: { id: stockRecord.id },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        // Create stock movement with clear exchange reference
        await tx.stockMovement.create({
          data: {
            stockId: stockRecord.id,
            type: 'EXCHANGE_OUT', // Clear identification as exchange stock-out
            quantityIn: 0,
            quantityOut: item.quantity,
            openingStock: openingQty,
            closingStock: closingQty,
            reason: `Exchange Issue - ${exchangeNumber}`,
            referenceId: newExchange.id,
            createdById: processedById,
          },
        });
      }

      // ========================================
      // PAYMENT & CREDIT HANDLING
      // Based on FINAL adjusted amount (not calculated)
      // ========================================
      if (customerId && finalDifference !== 0) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });

        if (customer) {
          if (finalDifference < 0) {
            // Customer is owed a refund/credit
            if (!paymentMethod || paymentMethod === 'CREDIT') {
              // Issue store credit
              await tx.customer.update({
                where: { id: customerId },
                data: {
                  balance: { increment: Math.abs(finalDifference) },
                },
              });

              // Record in customer ledger with exchange reference
              await tx.customerLedger.create({
                data: {
                  customerId,
                  exchangeId: newExchange.id,
                  type: 'CREDIT',
                  amount: new Decimal(Math.abs(finalDifference)),
                  description: `Exchange credit issued - ${exchangeNumber}${hasAdjustment ? ' (Adjusted)' : ''}`,
                },
              });

              // Update payment status
              await tx.exchange.update({
                where: { id: newExchange.id },
                data: { paymentStatus: 'CREDIT_ISSUED' },
              });
            } else {
              // Cash/card refund - just record it
              await tx.exchange.update({
                where: { id: newExchange.id },
                data: { paymentStatus: 'REFUNDED' },
              });
            }
          } else if (finalDifference > 0) {
            // Customer owes additional payment
            if (paymentMethod === 'CREDIT') {
              // Deduct from store credit
              if (Number(customer.balance) < finalDifference) {
                throw new BadRequestException(
                  `Insufficient customer credit balance. Available: ${customer.balance}, Required: ${finalDifference}`
                );
              }

              await tx.customer.update({
                where: { id: customerId },
                data: {
                  balance: { decrement: finalDifference },
                },
              });

              // Record in customer ledger with exchange reference
              await tx.customerLedger.create({
                data: {
                  customerId,
                  exchangeId: newExchange.id,
                  type: 'DEBIT',
                  amount: new Decimal(finalDifference),
                  description: `Exchange payment (from credit) - ${exchangeNumber}${hasAdjustment ? ' (Adjusted)' : ''}`,
                },
              });

              await tx.exchange.update({
                where: { id: newExchange.id },
                data: { paymentStatus: 'CREDIT_USED' },
              });
            } else if (paymentMethod) {
              // Paid with cash/card
              await tx.exchange.update({
                where: { id: newExchange.id },
                data: { paymentStatus: 'PAID' },
              });
            }
            // If no payment method and customer owes, status remains PENDING
          }
        }
      } else if (finalDifference === 0) {
        await tx.exchange.update({
          where: { id: newExchange.id },
          data: { paymentStatus: 'NOT_APPLICABLE' },
        });
      }

      // ========================================
      // TRANSACTION RECORD FOR ACCOUNTING
      // This is a separate exchange transaction, NOT modifying sales
      // ========================================
      if (finalDifference !== 0 && paymentMethod && paymentMethod !== 'CREDIT') {
        await tx.transaction.create({
          data: {
            branchId,
            description: `Exchange ${finalDifference > 0 ? 'Payment Received' : 'Refund Issued'} - ${exchangeNumber}${hasAdjustment ? ' (Adjusted)' : ''}`,
            amount: new Decimal(Math.abs(finalDifference)),
            type: finalDifference > 0 ? 'INCOME' : 'EXPENSE',
            category: 'Exchange',
            referenceId: newExchange.id,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: processedById,
          action: 'CREATE',
          module: 'EXCHANGE',
          details: JSON.stringify({
            exchangeNumber,
            originalOrderId,
            returnedTotal,
            issuedTotal,
            calculatedAmount,
            adjustedAmount: hasAdjustment ? adjustedAmount : null,
            adjustmentReason: hasAdjustment ? adjustmentReason : null,
            finalDifference,
            returnedItemsCount: returnedItems.length,
            issuedItemsCount: issuedItems.length,
          }),
        },
      });

      return newExchange;
    });

    // Return comprehensive exchange summary
    return {
      exchange,
      summary: {
        exchangeNumber,
        returnedTotal,
        issuedTotal,
        calculatedAmount,
        adjustedAmount: hasAdjustment ? adjustedAmount : null,
        adjustmentReason: hasAdjustment ? adjustmentReason : null,
        finalDifference,
        differenceType: finalDifference > 0 
          ? 'CUSTOMER_PAYS' 
          : finalDifference < 0 
            ? 'REFUND_DUE' 
            : 'EVEN',
        wasAdjusted: hasAdjustment,
        paymentStatus: exchange.paymentStatus || 'PENDING',
      },
    };
  }

  /**
   * Find all exchanges with pagination
   */
  async findAll(params: {
    branchId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { branchId, customerId, startDate, endDate, page = 1, limit = 20, status } = params;

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [exchanges, total] = await Promise.all([
      this.prisma.exchange.findMany({
        where,
        include: {
          customer: true,
          originalOrder: { select: { orderNumber: true } },
          processedBy: { select: { id: true, name: true } },
          adjustedBy: { select: { id: true, name: true } },
          returnedItems: { include: { product: { select: { name: true, sku: true } } } },
          issuedItems: { include: { product: { select: { name: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exchange.count({ where }),
    ]);

    return {
      data: exchanges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single exchange by ID
   */
  async findOne(id: string) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id },
      include: {
        customer: true,
        originalOrder: {
          include: {
            items: { include: { product: true } },
          },
        },
        processedBy: { select: { id: true, name: true, email: true } },
        adjustedBy: { select: { id: true, name: true, email: true } },
        returnedItems: { include: { product: true } },
        issuedItems: { include: { product: true } },
        branch: true,
        ledgerEntries: true,
      },
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    // Add computed fields for clarity
    return {
      ...exchange,
      wasAdjusted: exchange.adjustedAmount !== null,
      adjustmentDifference: exchange.adjustedAmount 
        ? Number(exchange.adjustedAmount) - Number(exchange.calculatedAmount)
        : 0,
    };
  }

  /**
   * Find exchange by exchange number
   */
  async findByExchangeNumber(exchangeNumber: string) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { exchangeNumber },
      include: {
        customer: true,
        originalOrder: {
          include: {
            items: { include: { product: true } },
          },
        },
        processedBy: { select: { id: true, name: true, email: true } },
        adjustedBy: { select: { id: true, name: true, email: true } },
        returnedItems: { include: { product: true } },
        issuedItems: { include: { product: true } },
        branch: true,
        ledgerEntries: true,
      },
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    return {
      ...exchange,
      wasAdjusted: exchange.adjustedAmount !== null,
      adjustmentDifference: exchange.adjustedAmount 
        ? Number(exchange.adjustedAmount) - Number(exchange.calculatedAmount)
        : 0,
    };
  }

  /**
   * Cancel an exchange (rollback stock movements)
   * This reverses all inventory changes but preserves the record for audit
   */
  async cancel(id: string, reason: string, cancelledById?: string) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Cancellation reason is required');
    }

    const exchange = await this.findOne(id);

    if (exchange.status === 'CANCELLED') {
      throw new BadRequestException('Exchange is already cancelled');
    }

    return await this.prisma.$transaction(async (tx) => {
      // ========================================
      // REVERSE RETURNED ITEMS → STOCK OUT
      // (They were added, now remove them)
      // ========================================
      for (const item of exchange.returnedItems) {
        const stockRecord = await tx.stock.findFirst({
          where: {
            branchId: exchange.branchId,
            productId: item.productId,
          },
        });

        if (stockRecord) {
          const openingQty = stockRecord.quantity;
          const closingQty = openingQty - item.quantity;

          await tx.stock.update({
            where: { id: stockRecord.id },
            data: { quantity: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              stockId: stockRecord.id,
              type: 'ADJUSTMENT',
              quantityIn: 0,
              quantityOut: item.quantity,
              openingStock: openingQty,
              closingStock: closingQty,
              reason: `Exchange Cancelled - Reverse Return - ${exchange.exchangeNumber}`,
              referenceId: exchange.id,
              createdById: cancelledById,
            },
          });
        }
      }

      // ========================================
      // REVERSE ISSUED ITEMS → STOCK IN
      // (They were removed, now add them back)
      // ========================================
      for (const item of exchange.issuedItems) {
        const stockRecord = await tx.stock.findFirst({
          where: {
            branchId: exchange.branchId,
            productId: item.productId,
          },
        });

        if (stockRecord) {
          const openingQty = stockRecord.quantity;
          const closingQty = openingQty + item.quantity;

          await tx.stock.update({
            where: { id: stockRecord.id },
            data: { quantity: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              stockId: stockRecord.id,
              type: 'ADJUSTMENT',
              quantityIn: item.quantity,
              quantityOut: 0,
              openingStock: openingQty,
              closingStock: closingQty,
              reason: `Exchange Cancelled - Reverse Issue - ${exchange.exchangeNumber}`,
              referenceId: exchange.id,
              createdById: cancelledById,
            },
          });
        }
      }

      // ========================================
      // REVERSE CUSTOMER CREDIT/DEBIT
      // ========================================
      if (exchange.customerId) {
        const finalDiff = Number(exchange.difference);
        
        if (finalDiff < 0 && exchange.paymentStatus === 'CREDIT_ISSUED') {
          // Credit was issued, now reverse it
          await tx.customer.update({
            where: { id: exchange.customerId },
            data: { balance: { decrement: Math.abs(finalDiff) } },
          });

          await tx.customerLedger.create({
            data: {
              customerId: exchange.customerId,
              exchangeId: exchange.id,
              type: 'DEBIT',
              amount: new Decimal(Math.abs(finalDiff)),
              description: `Exchange cancelled - credit reversed - ${exchange.exchangeNumber}`,
            },
          });
        } else if (finalDiff > 0 && exchange.paymentStatus === 'CREDIT_USED') {
          // Credit was used, now restore it
          await tx.customer.update({
            where: { id: exchange.customerId },
            data: { balance: { increment: finalDiff } },
          });

          await tx.customerLedger.create({
            data: {
              customerId: exchange.customerId,
              exchangeId: exchange.id,
              type: 'CREDIT',
              amount: new Decimal(finalDiff),
              description: `Exchange cancelled - credit restored - ${exchange.exchangeNumber}`,
            },
          });
        }
      }

      // Update exchange status
      const cancelled = await tx.exchange.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'NOT_APPLICABLE',
          notes: exchange.notes
            ? `${exchange.notes}\n\n[CANCELLED: ${reason} - ${new Date().toISOString()}]`
            : `[CANCELLED: ${reason} - ${new Date().toISOString()}]`,
        },
        include: {
          returnedItems: { include: { product: true } },
          issuedItems: { include: { product: true } },
          customer: true,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: cancelledById,
          action: 'CANCEL',
          module: 'EXCHANGE',
          details: JSON.stringify({
            exchangeNumber: exchange.exchangeNumber,
            reason,
            originalDifference: Number(exchange.difference),
            wasAdjusted: exchange.adjustedAmount !== null,
          }),
        },
      });

      return cancelled;
    });
  }

  /**
   * Adjust exchange amount after creation
   * Only allowed for PENDING payment status exchanges
   */
  async adjustAmount(
    id: string, 
    adjustedAmount: number, 
    adjustmentReason: string, 
    adjustedById: string
  ) {
    if (!adjustmentReason || adjustmentReason.trim().length === 0) {
      throw new BadRequestException('Adjustment reason is mandatory');
    }

    const exchange = await this.findOne(id);

    if (exchange.status === 'CANCELLED') {
      throw new BadRequestException('Cannot adjust a cancelled exchange');
    }

    if (exchange.paymentStatus !== 'PENDING' && exchange.paymentStatus !== 'NOT_APPLICABLE') {
      throw new BadRequestException(
        'Cannot adjust amount after payment has been processed. Current status: ' + exchange.paymentStatus
      );
    }

    const previousDifference = Number(exchange.difference);
    const calculatedAmount = Number(exchange.calculatedAmount);

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.exchange.update({
        where: { id },
        data: {
          adjustedAmount: new Decimal(adjustedAmount),
          adjustmentReason,
          adjustedById,
          difference: new Decimal(adjustedAmount),
          notes: exchange.notes
            ? `${exchange.notes}\n\n[Amount adjusted from ${previousDifference} to ${adjustedAmount}. Reason: ${adjustmentReason}]`
            : `[Amount adjusted from ${previousDifference} to ${adjustedAmount}. Reason: ${adjustmentReason}]`,
        },
        include: {
          returnedItems: { include: { product: true } },
          issuedItems: { include: { product: true } },
          customer: true,
          adjustedBy: { select: { id: true, name: true } },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: adjustedById,
          action: 'ADJUST',
          module: 'EXCHANGE',
          details: JSON.stringify({
            exchangeNumber: exchange.exchangeNumber,
            calculatedAmount,
            previousDifference,
            newAdjustedAmount: adjustedAmount,
            reason: adjustmentReason,
          }),
        },
      });

      return {
        exchange: updated,
        adjustment: {
          calculatedAmount,
          previousDifference,
          newAdjustedAmount: adjustedAmount,
          adjustmentDelta: adjustedAmount - calculatedAmount,
          reason: adjustmentReason,
        },
      };
    });
  }

  /**
   * Process payment for a pending exchange
   */
  async processPayment(id: string, paymentMethod: 'CASH' | 'CARD' | 'CREDIT', processedById?: string) {
    const exchange = await this.findOne(id);

    if (exchange.status === 'CANCELLED') {
      throw new BadRequestException('Cannot process payment for a cancelled exchange');
    }

    if (exchange.paymentStatus !== 'PENDING') {
      throw new BadRequestException('Exchange payment has already been processed');
    }

    const finalDifference = Number(exchange.difference);

    if (finalDifference === 0) {
      throw new BadRequestException('No payment needed for this exchange (difference is zero)');
    }

    return await this.prisma.$transaction(async (tx) => {
      let newPaymentStatus: 'PAID' | 'REFUNDED' | 'CREDIT_ISSUED' | 'CREDIT_USED';

      if (finalDifference > 0) {
        // Customer pays
        if (paymentMethod === 'CREDIT' && exchange.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: exchange.customerId },
          });

          if (!customer || Number(customer.balance) < finalDifference) {
            throw new BadRequestException('Insufficient customer credit balance');
          }

          await tx.customer.update({
            where: { id: exchange.customerId },
            data: { balance: { decrement: finalDifference } },
          });

          await tx.customerLedger.create({
            data: {
              customerId: exchange.customerId,
              exchangeId: exchange.id,
              type: 'DEBIT',
              amount: new Decimal(finalDifference),
              description: `Exchange payment processed - ${exchange.exchangeNumber}`,
            },
          });

          newPaymentStatus = 'CREDIT_USED';
        } else {
          // Cash or card payment
          await tx.transaction.create({
            data: {
              branchId: exchange.branchId,
              description: `Exchange Payment - ${exchange.exchangeNumber}`,
              amount: new Decimal(finalDifference),
              type: 'INCOME',
              category: 'Exchange',
              referenceId: exchange.id,
            },
          });

          newPaymentStatus = 'PAID';
        }
      } else {
        // Refund to customer
        if (paymentMethod === 'CREDIT' && exchange.customerId) {
          await tx.customer.update({
            where: { id: exchange.customerId },
            data: { balance: { increment: Math.abs(finalDifference) } },
          });

          await tx.customerLedger.create({
            data: {
              customerId: exchange.customerId,
              exchangeId: exchange.id,
              type: 'CREDIT',
              amount: new Decimal(Math.abs(finalDifference)),
              description: `Exchange credit issued - ${exchange.exchangeNumber}`,
            },
          });

          newPaymentStatus = 'CREDIT_ISSUED';
        } else {
          // Cash or card refund
          await tx.transaction.create({
            data: {
              branchId: exchange.branchId,
              description: `Exchange Refund - ${exchange.exchangeNumber}`,
              amount: new Decimal(Math.abs(finalDifference)),
              type: 'EXPENSE',
              category: 'Exchange',
              referenceId: exchange.id,
            },
          });

          newPaymentStatus = 'REFUNDED';
        }
      }

      const updated = await tx.exchange.update({
        where: { id },
        data: {
          paymentMethod,
          paymentStatus: newPaymentStatus,
        },
        include: {
          returnedItems: { include: { product: true } },
          issuedItems: { include: { product: true } },
          customer: true,
        },
      });

      return updated;
    });
  }
}
