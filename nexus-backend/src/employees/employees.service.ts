import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const employees = await this.prisma.employee.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return employees.map((e) => ({
      id: e.id,
      name: e.user.name,
      role: e.position,
      department: e.department,
      salary: Number(e.salary),
      status: e.status === 'ACTIVE' ? 'Active' : 'On Leave',
      joinDate: e.joinDate.toISOString().split('T')[0],
      email: e.user.email,
    }));
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return {
      id: employee.id,
      name: employee.user.name,
      role: employee.position,
      department: employee.department,
      salary: Number(employee.salary),
      status: employee.status === 'ACTIVE' ? 'Active' : 'On Leave',
      joinDate: employee.joinDate.toISOString().split('T')[0],
      email: employee.user.email,
    };
  }

  async create(dto: any) {
    // First create a user for the employee
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: 'temp_password_123',
        name: dto.name,
        role: 'CASHIER',
        permissions: [],
      },
    });

    const employee = await this.prisma.employee.create({
      data: {
        userId: user.id,
        position: dto.role || dto.position,
        department: dto.department,
        salary: dto.salary,
        status: dto.status === 'Active' ? 'ACTIVE' : 'ON_LEAVE',
        joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
      },
      include: { user: true },
    });

    return {
      id: employee.id,
      name: employee.user.name,
      role: employee.position,
      department: employee.department,
      salary: Number(employee.salary),
      status: employee.status === 'ACTIVE' ? 'Active' : 'On Leave',
      joinDate: employee.joinDate.toISOString().split('T')[0],
    };
  }

  async update(id: string, dto: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Update user if name/email provided
    if (dto.name || dto.email) {
      await this.prisma.user.update({
        where: { id: employee.userId },
        data: {
          name: dto.name,
          email: dto.email,
        },
      });
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        position: dto.role || dto.position,
        department: dto.department,
        salary: dto.salary,
        status: dto.status === 'Active' ? 'ACTIVE' : 'ON_LEAVE',
      },
      include: { user: true },
    });

    return {
      id: updated.id,
      name: updated.user.name,
      role: updated.position,
      department: updated.department,
      salary: Number(updated.salary),
      status: updated.status === 'ACTIVE' ? 'Active' : 'On Leave',
      joinDate: updated.joinDate.toISOString().split('T')[0],
    };
  }

  async remove(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    await this.prisma.employee.delete({
      where: { id },
    });

    return { success: true };
  }

  async runPayroll() {
    // In a real app, this would generate payroll records
    // For now, just return success
    return { success: true, message: 'Payroll processed successfully' };
  }
}
