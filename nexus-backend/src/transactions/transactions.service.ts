import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: { date: 'desc' },
      take: 100,
    });

    return transactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type === 'INCOME' ? 'Income' : 'Expense',
      category: t.category,
      date: t.date.toISOString().split('T')[0],
    }));
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return {
      id: transaction.id,
      description: transaction.description,
      amount: Number(transaction.amount),
      type: transaction.type === 'INCOME' ? 'Income' : 'Expense',
      category: transaction.category,
      date: transaction.date.toISOString().split('T')[0],
    };
  }

  async create(dto: any) {
    const transaction = await this.prisma.transaction.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        type: dto.type === 'Income' ? 'INCOME' : 'EXPENSE',
        category: dto.category,
        date: dto.date ? new Date(dto.date) : new Date(),
        branchId: dto.branchId,
      },
    });

    return {
      id: transaction.id,
      description: transaction.description,
      amount: Number(transaction.amount),
      type: transaction.type === 'INCOME' ? 'Income' : 'Expense',
      category: transaction.category,
      date: transaction.date.toISOString().split('T')[0],
    };
  }

  async getFinancialStats() {
    // Get income
    const income = await this.prisma.transaction.aggregate({
      where: { type: 'INCOME' },
      _sum: { amount: true },
    });

    // Get expenses
    const expenses = await this.prisma.transaction.aggregate({
      where: { type: 'EXPENSE' },
      _sum: { amount: true },
    });

    const totalIncome = Number(income._sum?.amount || 0);
    const totalExpenses = Number(expenses._sum?.amount || 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      revenue: totalIncome,
      expenses: totalExpenses,
      netProfit,
      growth: 12.5, // Placeholder - would calculate from historical data
    };
  }
}
