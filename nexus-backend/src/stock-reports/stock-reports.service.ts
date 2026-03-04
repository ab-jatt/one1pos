import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive stock report with date filtering
   */
  async getStockReport(
    branchId: string,
    startDate?: string,
    endDate?: string,
    productId?: string,
  ) {
    // Parse dates properly - when date string is like "2026-01-15", 
    // we want to treat it as local date, not UTC
    const now = new Date();
    
    let start: Date;
    let end: Date;
    
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    
    if (endDate) {
      const [year, month, day] = endDate.split('-').map(Number);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    // Build stock query filters
    const stockFilters: any = { branchId };
    if (productId) {
      stockFilters.productId = productId;
    }

    // Get all stocks with their products
    const stocks = await this.prisma.stock.findMany({
      where: stockFilters,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    // Process each stock to get ledger data
    const reportData = await Promise.all(
      stocks.map(async (stock) => {
        // Get movements before start date to calculate opening stock
        const movementsBefore = await this.prisma.stockMovement.findMany({
          where: {
            stockId: stock.id,
            createdAt: { lt: start },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Calculate opening stock from movements before start date
        let openingStock = 0;
        for (const movement of movementsBefore) {
          openingStock = openingStock + movement.quantityIn - movement.quantityOut;
        }

        // Get movements within date range
        const movements = await this.prisma.stockMovement.findMany({
          where: {
            stockId: stock.id,
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Calculate totals
        let totalIn = 0;
        let totalOut = 0;
        let runningBalance = openingStock;

        const ledgerEntries = movements.map((movement) => {
          const prevBalance = runningBalance;
          runningBalance = runningBalance + movement.quantityIn - movement.quantityOut;
          totalIn += movement.quantityIn;
          totalOut += movement.quantityOut;

          return {
            id: movement.id,
            date: movement.createdAt,
            type: movement.type,
            quantityIn: movement.quantityIn,
            quantityOut: movement.quantityOut,
            openingStock: prevBalance,
            closingStock: runningBalance,
            reason: movement.reason,
            referenceId: movement.referenceId,
          };
        });

        return {
          productId: stock.product.id,
          productName: stock.product.name,
          productSku: stock.product.sku,
          category: stock.product.category?.name || 'Uncategorized',
          currentStock: stock.quantity,
          openingStock,
          closingStock: runningBalance,
          totalIn,
          totalOut,
          movements: ledgerEntries,
        };
      }),
    );

    // Calculate summary totals
    const summary = {
      totalProducts: reportData.length,
      totalOpeningStock: reportData.reduce((sum, r) => sum + r.openingStock, 0),
      totalClosingStock: reportData.reduce((sum, r) => sum + r.closingStock, 0),
      totalStockIn: reportData.reduce((sum, r) => sum + r.totalIn, 0),
      totalStockOut: reportData.reduce((sum, r) => sum + r.totalOut, 0),
      totalMovements: reportData.reduce((sum, r) => sum + r.movements.length, 0),
    };

    return {
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      summary,
      products: reportData,
    };
  }

  /**
   * Get all stock movements across all products with date filters
   */
  async getAllMovements(
    branchId: string,
    startDate?: string,
    endDate?: string,
    productId?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const now = new Date();
    
    // Parse dates properly - when date string is like "2026-01-15", 
    // we want to treat it as local date, not UTC
    let start: Date;
    let end: Date;
    
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    
    if (endDate) {
      const [year, month, day] = endDate.split('-').map(Number);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    // Build filters
    const whereClause: any = {
      stock: { branchId },
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (productId) {
      whereClause.stock.productId = productId;
    }

    // Get total count
    const totalCount = await this.prisma.stockMovement.count({
      where: whereClause,
    });

    // Get movements with pagination
    const movements = await this.prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        stock: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      movements: movements.map((m) => ({
        id: m.id,
        date: m.createdAt,
        productId: m.stock.product.id,
        productName: m.stock.product.name,
        productSku: m.stock.product.sku,
        type: m.type,
        quantityIn: m.quantityIn,
        quantityOut: m.quantityOut,
        openingStock: m.openingStock,
        closingStock: m.closingStock,
        reason: m.reason,
        referenceId: m.referenceId,
      })),
    };
  }

  /**
   * Record a manual stock adjustment with validation
   */
  async createAdjustment(
    branchId: string,
    productId: string,
    adjustmentType: 'IN' | 'OUT',
    quantity: number,
    reason: string,
    userId?: string,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Get stock record
    let stock = await this.prisma.stock.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    if (!stock) {
      // Create stock record if doesn't exist
      stock = await this.prisma.stock.create({
        data: {
          branchId,
          productId,
          quantity: 0,
        },
      });
    }

    const currentStock = stock.quantity;
    let newStock: number;
    let quantityIn = 0;
    let quantityOut = 0;

    if (adjustmentType === 'OUT') {
      // Prevent negative stock
      if (currentStock < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Current: ${currentStock}, Requested: ${quantity}`,
        );
      }
      newStock = currentStock - quantity;
      quantityOut = quantity;
    } else {
      newStock = currentStock + quantity;
      quantityIn = quantity;
    }

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Update stock
      const updatedStock = await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: newStock },
        include: { product: true },
      });

      // Create movement record
      const movement = await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          type: 'ADJUSTMENT',
          quantityIn,
          quantityOut,
          openingStock: currentStock,
          closingStock: newStock,
          reason: `Manual Adjustment: ${reason}`,
          createdById: userId,
        },
      });

      return { stock: updatedStock, movement };
    });

    return {
      success: true,
      product: {
        id: result.stock.product.id,
        name: result.stock.product.name,
      },
      previousStock: currentStock,
      newStock: newStock,
      adjustment: adjustmentType === 'IN' ? `+${quantity}` : `-${quantity}`,
      movementId: result.movement.id,
    };
  }

  /**
   * Get daily stock summary for a specific date
   */
  async getDailyStockSummary(branchId: string, date: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stocks = await this.prisma.stock.findMany({
      where: { branchId },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    const dailySummary = await Promise.all(
      stocks.map(async (stock) => {
        // Get all movements up to end of target day
        const allMovements = await this.prisma.stockMovement.findMany({
          where: {
            stockId: stock.id,
            createdAt: { lte: endOfDay },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Calculate opening stock (before target date)
        let openingStock = 0;
        let closingStock = 0;
        let dayIn = 0;
        let dayOut = 0;

        for (const movement of allMovements) {
          if (movement.createdAt < targetDate) {
            openingStock = openingStock + movement.quantityIn - movement.quantityOut;
          } else {
            dayIn += movement.quantityIn;
            dayOut += movement.quantityOut;
          }
        }

        closingStock = openingStock + dayIn - dayOut;

        return {
          productId: stock.product.id,
          productName: stock.product.name,
          productSku: stock.product.sku,
          openingStock,
          stockIn: dayIn,
          stockOut: dayOut,
          closingStock,
        };
      }),
    );

    return {
      date: date,
      products: dailySummary,
      totals: {
        openingStock: dailySummary.reduce((sum, p) => sum + p.openingStock, 0),
        stockIn: dailySummary.reduce((sum, p) => sum + p.stockIn, 0),
        stockOut: dailySummary.reduce((sum, p) => sum + p.stockOut, 0),
        closingStock: dailySummary.reduce((sum, p) => sum + p.closingStock, 0),
      },
    };
  }
}
