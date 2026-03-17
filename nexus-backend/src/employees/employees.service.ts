import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        user: { branchId },
      },
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

  async findOne(id: string, branchId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (branchId && employee.user?.branchId !== branchId) {
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

  async create(dto: any, branchId: string) {
    this.logger.log(`Creating employee: ${dto.name} (${dto.email}) in branch ${branchId}`);

    // First create a user for the employee
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: 'temp_password_123',
        name: dto.name,
        role: 'CASHIER',
        permissions: [],
        branchId,
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

    this.logger.log(`Employee created: ${employee.id} (${employee.user.name})`);

    return {
      id: employee.id,
      name: employee.user.name,
      email: employee.user.email,
      role: employee.position,
      department: employee.department,
      salary: Number(employee.salary),
      status: employee.status === 'ACTIVE' ? 'Active' : 'On Leave',
      joinDate: employee.joinDate.toISOString().split('T')[0],
    };
  }

  async update(id: string, dto: any, branchId?: string) {
    this.logger.log(`Updating employee ${id} (branch: ${branchId})`);
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (branchId && employee.user?.branchId !== branchId) {
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

  async remove(id: string, branchId?: string) {
    this.logger.log(`Removing employee ${id} (branch: ${branchId})`);
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (branchId && employee.user?.branchId !== branchId) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    await this.prisma.employee.delete({
      where: { id },
    });

    return { success: true };
  }

  async runPayroll(branchId: string) {
    this.logger.log(`Running payroll for branch ${branchId}`);

    // Fetch all active employees for this branch
    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        user: { branchId },
      },
      include: { user: true },
    });

    if (employees.length === 0) {
      return { success: false, message: 'No active employees found' };
    }

    // Determine payroll period: from the 1st (or 16th) of the current month
    const now = new Date();
    const dayOfMonth = now.getDate();
    let periodStart: Date;
    let periodEnd: Date;

    if (dayOfMonth <= 15) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 16);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
    }

    // Create payroll record with items in a transaction
    const payrollRecord = await this.prisma.$transaction(async (tx) => {
      // Calculate individual amounts (semi-monthly: salary / 24)
      const items = employees.map((emp) => ({
        employeeId: emp.id,
        amount: Number(emp.salary) / 24,
        deductions: 0,
        bonuses: 0,
      }));

      const totalPaid = items.reduce((sum, item) => sum + item.amount, 0);

      const record = await tx.payrollRecord.create({
        data: {
          branchId,
          periodStart,
          periodEnd,
          payDate: now,
          totalPaid,
          status: 'Paid',
          items: {
            create: items,
          },
        },
        include: {
          items: {
            include: {
              employee: { include: { user: true } },
            },
          },
        },
      });

      return record;
    });

    this.logger.log(`Payroll completed: ${payrollRecord.id} — ${employees.length} employees, total ${Number(payrollRecord.totalPaid)}`);

    return {
      success: true,
      id: payrollRecord.id,
      period: `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      payDate: payrollRecord.payDate.toISOString().split('T')[0],
      employees: employees.length,
      total: Number(payrollRecord.totalPaid),
      status: payrollRecord.status,
    };
  }

  async getPayrollHistory(branchId: string) {
    const records = await this.prisma.payrollRecord.findMany({
      where: { branchId },
      include: {
        items: true,
      },
      orderBy: { payDate: 'desc' },
      take: 20,
    });

    return records.map((r) => ({
      id: r.id,
      period: `${r.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${r.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      payDate: r.payDate.toISOString().split('T')[0],
      employees: r.items.length,
      total: Number(r.totalPaid),
      status: r.status,
    }));
  }
}
