import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string, categoryId?: string) {
    return this.prisma.subcategory.findMany({
      where: {
        branchId,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, branchId?: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        products: true,
      },
    });

    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    if (branchId && subcategory.branchId !== branchId) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    return subcategory;
  }

  async create(dto: CreateSubcategoryDto, branchId: string) {
    return this.prisma.subcategory.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        branchId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateSubcategoryDto, branchId?: string) {
    const existing = await this.findOne(id, branchId);

    // Enforce name uniqueness within the same store + category
    if (dto.name && branchId) {
      const categoryId = dto.categoryId ?? existing.categoryId;
      const duplicate = await this.prisma.subcategory.findFirst({
        where: {
          branchId,
          categoryId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Subcategory "${dto.name}" already exists in this category.`);
      }
    }

    try {
      return await this.prisma.subcategory.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.categoryId && { categoryId: dto.categoryId }),
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Subcategory "${dto.name}" already exists in this category.`);
      }
      throw error;
    }
  }

  async remove(id: string, branchId?: string) {
    await this.findOne(id, branchId);

    return this.prisma.subcategory.delete({
      where: { id },
    });
  }
}
