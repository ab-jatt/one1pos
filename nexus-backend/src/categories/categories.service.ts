import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.category.findMany({
      where: { branchId },
      include: {
        _count: {
          select: { products: true, subcategories: true },
        },
        subcategories: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, branchId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (branchId && category.branchId !== branchId) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto, branchId: string) {
    try {
      return await this.prisma.category.create({
        data: {
          name: createCategoryDto.name,
          branchId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Category "${createCategoryDto.name}" already exists.`);
      }
      throw error;
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, branchId?: string) {
    await this.findOne(id, branchId); // Check if exists and belongs to branch

    // Enforce name uniqueness within the same store
    if (updateCategoryDto.name && branchId) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          branchId,
          name: { equals: updateCategoryDto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Category "${updateCategoryDto.name}" already exists in this store.`);
      }
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name: updateCategoryDto.name },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Category "${updateCategoryDto.name}" already exists in this store.`);
      }
      throw error;
    }
  }

  async remove(id: string, branchId?: string) {
    await this.findOne(id, branchId); // Check if exists and belongs to branch

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
