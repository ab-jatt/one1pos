import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        deletedAt: null,
        branchId,
      },
      include: {
        branch: true,
        locations: { where: { isActive: true } },
        _count: {
          select: {
            movementsFrom: true,
            movementsTo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return warehouses.map((w) => ({
      id: w.id,
      branchId: w.branchId,
      branchName: w.branch.name,
      name: w.name,
      code: w.code,
      type: w.type,
      isDefault: w.isDefault,
      isActive: w.isActive,
      address: w.address,
      locationCount: w.locations.length,
      locations: w.locations.map((l) => ({
        id: l.id,
        name: l.name,
        code: l.code,
      })),
      createdAt: w.createdAt.toISOString(),
    }));
  }

  async findOne(id: string, branchId?: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        branch: true,
        locations: true,
      },
    });

    if (!warehouse || warehouse.deletedAt) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }

    if (branchId && warehouse.branchId !== branchId) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }

    return {
      id: warehouse.id,
      branchId: warehouse.branchId,
      branchName: warehouse.branch.name,
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive,
      address: warehouse.address,
      locations: warehouse.locations.map((l) => ({
        id: l.id,
        name: l.name,
        code: l.code,
        isActive: l.isActive,
      })),
      createdAt: warehouse.createdAt.toISOString(),
    };
  }

  async create(dto: any, branchId: string) {
    // Validate required fields
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Warehouse name is required');
    }
    if (!dto.code || !dto.code.trim()) {
      throw new BadRequestException('Warehouse code is required');
    }

    // Validate unique code per branch
    const existing = await this.prisma.warehouse.findUnique({
      where: { branchId_code: { branchId, code: dto.code.trim() } },
    });
    if (existing) {
      throw new BadRequestException(`Warehouse code '${dto.code}' already exists for this branch`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { branchId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        branchId,
        name: dto.name.trim(),
        code: dto.code.trim(),
        type: dto.type || 'GENERAL',
        isDefault: dto.isDefault || false,
        address: dto.address,
        locations: dto.locations?.length
          ? {
              create: dto.locations.map((l: any) => ({
                name: l.name,
                code: l.code,
              })),
            }
          : undefined,
      },
      include: { branch: true, locations: true },
    });

    return {
      id: warehouse.id,
      branchId: warehouse.branchId,
      branchName: warehouse.branch.name,
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive,
      address: warehouse.address,
      locationCount: warehouse.locations.length,
      locations: warehouse.locations.map((l) => ({
        id: l.id,
        name: l.name,
        code: l.code,
      })),
      createdAt: warehouse.createdAt.toISOString(),
    };
  }

  async update(id: string, dto: any, branchId?: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse || warehouse.deletedAt) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }
    if (branchId && warehouse.branchId !== branchId) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { branchId: warehouse.branchId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        type: dto.type,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
        address: dto.address,
      },
      include: { branch: true, locations: true },
    });

    return {
      id: updated.id,
      branchId: updated.branchId,
      branchName: updated.branch.name,
      name: updated.name,
      code: updated.code,
      type: updated.type,
      isDefault: updated.isDefault,
      isActive: updated.isActive,
      address: updated.address,
      locationCount: updated.locations.length,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async remove(id: string, branchId?: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
    if (branchId && warehouse.branchId !== branchId) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }

    await this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { success: true };
  }

  // Add location to warehouse
  async addLocation(warehouseId: string, dto: any, branchId?: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    if (branchId && warehouse.branchId !== branchId) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    const location = await this.prisma.warehouseLocation.create({
      data: {
        warehouseId,
        name: dto.name,
        code: dto.code,
      },
    });

    return { id: location.id, name: location.name, code: location.code, isActive: location.isActive };
  }

  // Get stock balances for a warehouse (calculated from movements)
  async getStockBalances(warehouseId: string, branchId?: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    if (branchId && warehouse.branchId !== branchId) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    // Incoming movements (to this warehouse)
    const incoming = await this.prisma.warehouseMovement.groupBy({
      by: ['productId'],
      where: { toWarehouseId: warehouseId },
      _sum: { quantity: true },
    });

    // Outgoing movements (from this warehouse)
    const outgoing = await this.prisma.warehouseMovement.groupBy({
      by: ['productId'],
      where: { fromWarehouseId: warehouseId },
      _sum: { quantity: true },
    });

    const balanceMap = new Map<string, number>();

    for (const rec of incoming) {
      balanceMap.set(rec.productId, (balanceMap.get(rec.productId) || 0) + (rec._sum.quantity || 0));
    }
    for (const rec of outgoing) {
      balanceMap.set(rec.productId, (balanceMap.get(rec.productId) || 0) - (rec._sum.quantity || 0));
    }

    // Get product info
    const productIds = Array.from(balanceMap.keys());
    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return productIds
      .map((productId) => {
        const product = productMap.get(productId);
        const qty = balanceMap.get(productId) || 0;
        return {
          productId,
          productName: product?.name || 'Unknown',
          sku: product?.sku || '',
          category: product?.category?.name || '',
          quantity: qty,
          unitCost: Number(product?.costPrice || 0),
          totalValue: qty * Number(product?.costPrice || 0),
        };
      })
      .filter((b) => b.quantity !== 0)
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }
}
