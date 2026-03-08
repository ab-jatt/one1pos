import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async generateProductCode(): Promise<string> {
    const last = await this.prisma.product.findFirst({
      where: { productCode: { startsWith: 'PRD-' } },
      orderBy: { productCode: 'desc' },
      select: { productCode: true },
    });
    const nextNum = last?.productCode
      ? parseInt(last.productCode.replace('PRD-', ''), 10) + 1
      : 1;
    const code = `PRD-${String(nextNum).padStart(6, '0')}`;
    // Safety check: if this code is already taken (race condition), fall back to timestamp
    const exists = await this.prisma.product.findUnique({ where: { productCode: code } });
    return exists ? `PRD-${Date.now()}` : code;
  }

  async findAll(branchId: string) {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        stocks: {
          where: { branchId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include stock as a single number
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      productCode: product.productCode,
      barcode: product.barcode,
      description: product.description,
      image: product.image,
      price: Number(product.price),
      costPrice: Number(product.costPrice),
      category: product.category?.name || 'Uncategorized',
      categoryId: product.categoryId,
      stock: product.stocks.reduce((sum, s) => sum + s.quantity, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      productCode: product.productCode,
      barcode: product.barcode,
      description: product.description,
      image: product.image,
      price: Number(product.price),
      costPrice: Number(product.costPrice),
      category: product.category?.name || 'Uncategorized',
      categoryId: product.categoryId,
      stock: product.stocks.reduce((sum, s) => sum + s.quantity, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async search(q: string, branchId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { productCode: q },
          { barcode: q },
          { sku: q },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
        stocks: { where: { branchId } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      productCode: product.productCode,
      barcode: product.barcode,
      description: product.description,
      image: product.image,
      price: Number(product.price),
      costPrice: Number(product.costPrice),
      category: product.category?.name || 'Uncategorized',
      categoryId: product.categoryId,
      stock: product.stocks.reduce((sum, s) => sum + s.quantity, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }

  async create(data: any) {
    const productCode = data.productCode || (await this.generateProductCode());

    const product = await this.prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        productCode,
        barcode: data.barcode || null,
        description: data.description,
        image: data.image,
        price: data.price,
        costPrice: data.costPrice,
        categoryId: data.categoryId,
      },
      include: {
        category: true,
      },
    });

    // Create initial stock if branchId provided
    if (data.branchId && data.stock !== undefined) {
      await this.prisma.stock.create({
        data: {
          branchId: data.branchId,
          productId: product.id,
          quantity: data.stock || 0,
        },
      });
    }

    return this.findOne(product.id);
  }

  async update(id: string, data: any) {
    await this.findOne(id); // Check if exists

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku,
        ...(data.productCode !== undefined && { productCode: data.productCode }),
        ...(data.barcode !== undefined && { barcode: data.barcode || null }),
        description: data.description,
        image: data.image,
        price: data.price,
        costPrice: data.costPrice,
        categoryId: data.categoryId,
      },
    });

    // Update stock if provided
    if (data.branchId && data.stock !== undefined) {
      await this.prisma.stock.upsert({
        where: {
          branchId_productId: {
            branchId: data.branchId,
            productId: id,
          },
        },
        update: {
          quantity: data.stock,
        },
        create: {
          branchId: data.branchId,
          productId: id,
          quantity: data.stock,
        },
      });
    }

    return this.findOne(product.id);
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Soft delete
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStockLedger(
    productId: string,
    branchId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Get the stock record for this product and branch
    const stock = await this.prisma.stock.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
      include: {
        product: true,
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `Stock not found for product ${productId} in branch ${branchId}`,
      );
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    // Get movements within date range
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        stockId: stock.id,
        ...(start || end
          ? {
              createdAt: {
                ...(start && { gte: start }),
                ...(end && { lte: end }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate opening stock (stock before start date)
    let openingStock = 0;
    if (start) {
      const movementsBefore = await this.prisma.stockMovement.findMany({
        where: {
          stockId: stock.id,
          createdAt: { lt: start },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Calculate opening stock from previous movements
      let runningStock = 0;
      for (const movement of movementsBefore) {
        runningStock = runningStock + movement.quantityIn - movement.quantityOut;
      }
      openingStock = runningStock;
    }

    // Transform movements for response
    let runningBalance = openingStock;
    const ledgerEntries = movements.map((movement) => {
      const previousBalance = runningBalance;
      runningBalance = runningBalance + movement.quantityIn - movement.quantityOut;

      return {
        id: movement.id,
        date: movement.createdAt,
        type: movement.type,
        quantityIn: movement.quantityIn,
        quantityOut: movement.quantityOut,
        openingStock: previousBalance,
        closingStock: runningBalance,
        reason: movement.reason,
        referenceId: movement.referenceId,
        createdBy: 'System',
      };
    });

    return {
      product: {
        id: stock.product.id,
        name: stock.product.name,
        sku: stock.product.sku,
      },
      currentStock: stock.quantity,
      openingStock,
      closingStock: runningBalance,
      movements: ledgerEntries,
    };
  }
}
