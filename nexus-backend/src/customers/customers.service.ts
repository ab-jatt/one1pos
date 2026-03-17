import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.customer.findMany({
      where: { branchId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, branchId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    if (branchId && customer.branchId !== branchId) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto, branchId: string) {
    return this.prisma.customer.create({
      data: {
        name: createCustomerDto.name,
        email: createCustomerDto.email,
        phone: createCustomerDto.phone,
        points: 0,
        balance: 0,
        branchId,
      },
    });
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, branchId: string) {
    await this.findOne(id, branchId);

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string, branchId: string) {
    await this.findOne(id, branchId);

    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async adjustPoints(id: string, adjustPointsDto: AdjustPointsDto, branchId: string) {
    const customer = await this.findOne(id, branchId);

    const newPoints = Math.max(0, customer.points + adjustPointsDto.points);

    return this.prisma.customer.update({
      where: { id },
      data: { points: newPoints },
    });
  }

  async adjustBalance(id: string, adjustBalanceDto: AdjustBalanceDto, branchId: string) {
    const customer = await this.findOne(id, branchId);

    const adjustment =
      adjustBalanceDto.type === 'CREDIT'
        ? adjustBalanceDto.amount
        : -adjustBalanceDto.amount;

    const newBalance = Number(customer.balance) + adjustment;

    return this.prisma.customer.update({
      where: { id },
      data: { balance: newBalance },
    });
  }

  async getLedger(id: string, branchId: string, startDate?: string, endDate?: string) {
    // Verify customer exists and belongs to this branch
    await this.findOne(id, branchId);

    // Build date filter
    const dateFilter: any = {};
    
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    } else {
      // Default to start of current month
      const now = new Date();
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Fetch ledger entries
    const entries = await this.prisma.customerLedger.findMany({
      where: {
        customerId: id,
        createdAt: dateFilter,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate running balance for each entry
    // First get all entries before the start date to calculate opening balance
    const previousEntries = await this.prisma.customerLedger.findMany({
      where: {
        customerId: id,
        createdAt: {
          lt: dateFilter.gte,
        },
      },
    });

    let runningBalance = previousEntries.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0
    );

    const ledgerWithBalance = entries.map((entry) => {
      runningBalance += Number(entry.amount);
      return {
        id: entry.id,
        date: entry.createdAt,
        orderId: entry.orderId,
        invoiceId: entry.orderId ? `INV-${entry.orderId}` : null,
        type: entry.type,
        debit: entry.type === 'CREDIT' ? Number(entry.amount) : 0,
        credit: entry.type === 'PAYMENT' ? Math.abs(Number(entry.amount)) : 0,
        description: entry.description,
        runningBalance: runningBalance,
      };
    });

    // Calculate totals
    const totalDebit = ledgerWithBalance.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = ledgerWithBalance.reduce((sum, e) => sum + e.credit, 0);

    return {
      entries: ledgerWithBalance,
      openingBalance: previousEntries.reduce(
        (sum, entry) => sum + Number(entry.amount),
        0
      ),
      closingBalance: runningBalance,
      totalDebit,
      totalCredit,
    };
  }
}
