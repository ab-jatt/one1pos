import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, avatar: true, branchId: true },
    });
    return user ?? null;
  }

  async findAllByBranch(branchId: string) {
    return this.prisma.user.findMany({
      where: { branchId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        branchId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(dto: { name: string; email: string; password: string; role: string }, branchId: string) {
    // Validate role
    const validRoles = ['MANAGER', 'CASHIER'];
    if (!validRoles.includes(dto.role)) {
      throw new BadRequestException('Staff role must be MANAGER or CASHIER');
    }

    // Check if email already exists
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role as any,
        permissions: [],
        branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        branchId: true,
        createdAt: true,
      },
    });
  }

  async updateStaff(id: string, dto: { name?: string; email?: string; role?: string; password?: string }, branchId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, branchId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in your branch');
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.role && ['MANAGER', 'CASHIER'].includes(dto.role)) data.role = dto.role;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        branchId: true,
        createdAt: true,
      },
    });
  }

  async removeStaff(id: string, branchId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, branchId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in your branch');
    }
    if (user.role === 'OWNER') {
      throw new BadRequestException('Cannot delete the owner account');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
