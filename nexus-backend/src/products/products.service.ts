import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async generateSku(branchId: string): Promise<string> {
    const last = await this.prisma.product.findFirst({
      where: { branchId, sku: { startsWith: 'SKU-' } },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });
    const nextNum = last?.sku
      ? parseInt(last.sku.replace('SKU-', ''), 10) + 1
      : 1;
    const sku = `SKU-${String(nextNum).padStart(6, '0')}`;
    const exists = await this.prisma.product.findFirst({ where: { branchId, sku } });
    return exists ? `SKU-${Date.now()}` : sku;
  }

  private async generateProductCode(branchId: string): Promise<string> {
    const last = await this.prisma.product.findFirst({
      where: { branchId, productCode: { startsWith: 'PRD-' } },
      orderBy: { productCode: 'desc' },
      select: { productCode: true },
    });
    const nextNum = last?.productCode
      ? parseInt(last.productCode.replace('PRD-', ''), 10) + 1
      : 1;
    const code = `PRD-${String(nextNum).padStart(6, '0')}`;
    // Safety check: if this code is already taken (race condition), fall back to timestamp
    const exists = await this.prisma.product.findFirst({ where: { branchId, productCode: code } });
    return exists ? `PRD-${Date.now()}` : code;
  }

  async findAll(branchId: string) {
    const products = await this.prisma.product.findMany({
      where: { branchId, deletedAt: null },
      include: {
        category: true,
        subcategory: true,
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
      subcategory: product.subcategory?.name || null,
      subcategoryId: product.subcategoryId || null,
      stock: product.stocks.reduce((sum, s) => sum + s.quantity, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }

  async findOne(id: string, branchId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        stocks: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (branchId && product.branchId !== branchId) {
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
      subcategory: product.subcategory?.name || null,
      subcategoryId: product.subcategoryId || null,
      stock: product.stocks.reduce((sum, s) => sum + s.quantity, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async search(q: string, branchId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        branchId,
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
        subcategory: true,
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
      subcategory: product.subcategory?.name || null,
      subcategoryId: product.subcategoryId || null,
      stock: product.stocks.reduce((sum, s) => sum + s.quantity, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }

  async create(data: any, branchId: string, userId?: string) {
    // productCode is always auto-generated; client-supplied value is ignored
    const productCode = await this.generateProductCode(branchId);
    const sku = data.sku?.trim() || (await this.generateSku(branchId));
    const openingStock = Math.max(0, Number(data.stock) || 0);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            name: data.name,
            sku,
            productCode,
            barcode: data.barcode || null,
            description: data.description,
            image: data.image,
            price: data.price,
            costPrice: data.costPrice,
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId || null,
            branchId,
          },
        });

        const stock = await tx.stock.create({
          data: {
            branchId,
            productId: createdProduct.id,
            quantity: openingStock,
          },
        });

        if (data.stock !== undefined) {
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              type: 'OPENING_STOCK' as any,
              reason: 'Product creation',
              referenceId: createdProduct.id,
              createdById: userId,
              openingStock: 0,
              quantityIn: openingStock,
              quantityOut: 0,
              closingStock: openingStock,
            },
          });
        }

        return createdProduct;
      });

      return this.findOne(product.id, branchId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('sku')) {
          throw new ConflictException(`A product with SKU "${sku}" already exists in this store.`);
        }
        if (target.includes('barcode')) {
          throw new ConflictException(`A product with barcode "${data.barcode}" already exists in this store.`);
        }
        if (target.includes('productCode')) {
          throw new ConflictException(`A product with code "${productCode}" already exists in this store.`);
        }
        throw new ConflictException('A product with these details already exists.');
      }
      throw error;
    }
  }

  async update(id: string, data: any, branchId: string) {
    const existing = await this.findOne(id, branchId); // Check if exists and belongs to branch

    // Product code is immutable after creation — reject any attempt to change it
    if (data.productCode !== undefined && data.productCode !== existing.productCode) {
      throw new BadRequestException('Product code cannot be modified after creation.');
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          sku: data.sku,
          // productCode is intentionally excluded — it is immutable
          ...(data.barcode !== undefined && { barcode: data.barcode || null }),
          description: data.description,
          image: data.image,
          price: data.price,
          costPrice: data.costPrice,
          categoryId: data.categoryId,
          ...(data.subcategoryId !== undefined && { subcategoryId: data.subcategoryId || null }),
        },
      });

      // Update stock if provided
      if (data.stock !== undefined) {
        await this.prisma.stock.upsert({
          where: {
            branchId_productId: {
              branchId,
              productId: id,
            },
          },
          update: {
            quantity: data.stock,
          },
          create: {
            branchId,
            productId: id,
            quantity: data.stock,
          },
      });
    }

    return this.findOne(product.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('sku')) {
          throw new ConflictException(`A product with SKU "${data.sku}" already exists in this store.`);
        }
        if (target.includes('barcode')) {
          throw new ConflictException(`A product with barcode "${data.barcode}" already exists in this store.`);
        }
        throw new ConflictException('A product with these details already exists.');
      }
      throw error;
    }
  }

  async remove(id: string, branchId: string) {
    await this.findOne(id, branchId); // Check if exists and belongs to branch

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
