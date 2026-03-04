import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ─── Helper: build date range filter ───────────────────────────
  private buildDateRange(startDate?: string, endDate?: string) {
    const filter: any = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return Object.keys(filter).length ? filter : undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW – single endpoint powering ALL dashboard cards
  // ═══════════════════════════════════════════════════════════════
  async getOverview(startDate?: string, endDate?: string) {
    const dateRange = this.buildDateRange(startDate, endDate);
    const dateFilter = dateRange ? { createdAt: dateRange } : {};

    // ── Sales ────────────────────────────────────────────────────
    const orders = await this.prisma.order.findMany({
      where: { status: 'COMPLETED', ...dateFilter },
      include: {
        items: {
          include: { product: { select: { costPrice: true } } },
        },
      },
    });

    let grossSales = 0;
    let totalDiscounts = 0;
    let cogs = 0;
    const totalOrders = orders.length;

    orders.forEach((order) => {
      order.items.forEach((item) => {
        grossSales += Number(item.price) * item.quantity;
        cogs += Number(item.product?.costPrice || 0) * item.quantity;
      });
      totalDiscounts += Number(order.discount) || 0;
    });

    const netSales = grossSales - totalDiscounts;

    // ── Today's sales (always today regardless of filter) ───────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaySalesAgg = await this.prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { total: true },
      _count: true,
    });
    const salesToday = Number(todaySalesAgg._sum?.total || 0);
    const ordersToday = todaySalesAgg._count || 0;

    // ── This month's sales (always current month) ───────────────
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthSalesAgg = await this.prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: monthStart, lte: todayEnd },
      },
      _sum: { total: true },
      _count: true,
    });
    const salesThisMonth = Number(monthSalesAgg._sum?.total || 0);
    const ordersThisMonth = monthSalesAgg._count || 0;

    // ── Stock & inventory value ─────────────────────────────────
    const stocks = await this.prisma.stock.findMany({
      include: { product: { select: { costPrice: true, price: true } } },
    });

    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let totalStockItems = 0;

    stocks.forEach((s) => {
      totalInventoryValue += s.quantity * Number(s.product.costPrice);
      totalStockItems += s.quantity;
      if (s.quantity <= s.minStock) lowStockCount++;
    });

    // ── Receivable (customer balances > 0 = they owe us) ────────
    const receivable = await this.prisma.customer.aggregate({
      where: { balance: { gt: 0 }, deletedAt: null },
      _sum: { balance: true },
      _count: true,
    });
    const totalReceivable = Number(receivable._sum?.balance || 0);
    const receivableCount = receivable._count || 0;

    // ── Payable (purchase orders that are PENDING) ──────────────
    const payable = await this.prisma.purchaseOrder.aggregate({
      where: { status: 'PENDING' },
      _sum: { total: true },
      _count: true,
    });
    const totalPayable = Number(payable._sum?.total || 0);
    const payableCount = payable._count || 0;

    // ── Expenses ────────────────────────────────────────────────
    const expenseFilter = dateRange
      ? { type: 'EXPENSE' as const, date: dateRange }
      : { type: 'EXPENSE' as const };

    const expensesAgg = await this.prisma.transaction.aggregate({
      where: expenseFilter,
      _sum: { amount: true },
    });
    const totalExpenses = Number(expensesAgg._sum?.amount || 0);

    // ── Profit & Loss ───────────────────────────────────────────
    const grossProfit = netSales - cogs;
    const netProfit = grossProfit - totalExpenses;
    const totalLoss = netProfit < 0 ? Math.abs(netProfit) : 0;

    return {
      // Sales
      salesToday,
      ordersToday,
      salesThisMonth,
      ordersThisMonth,
      grossSales,
      totalDiscounts,
      netSales,
      totalOrders,

      // Stock
      totalInventoryValue,
      lowStockCount,
      totalStockItems,

      // Receivable / Payable
      totalReceivable,
      receivableCount,
      totalPayable,
      payableCount,

      // P&L
      cogs,
      totalExpenses,
      grossProfit,
      netProfit,
      totalLoss,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SALES TREND – daily totals for chart
  // ═══════════════════════════════════════════════════════════════
  async getSalesTrend(startDate?: string, endDate?: string) {
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default last 30 days
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: { product: { select: { costPrice: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const map: Record<string, { sales: number; cost: number; orders: number }> =
      {};

    // Pre-fill all dates in range
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      map[key] = { sales: 0, cost: 0, orders: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    orders.forEach((order) => {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (!map[key]) map[key] = { sales: 0, cost: 0, orders: 0 };
      map[key].sales += Number(order.total);
      map[key].orders += 1;
      order.items.forEach((item) => {
        map[key].cost += Number(item.product?.costPrice || 0) * item.quantity;
      });
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        sales: Math.round(v.sales * 100) / 100,
        cost: Math.round(v.cost * 100) / 100,
        profit: Math.round((v.sales - v.cost) * 100) / 100,
        orders: v.orders,
      }));
  }

  // ═══════════════════════════════════════════════════════════════
  // PROFIT TREND – daily profit/loss for chart
  // ═══════════════════════════════════════════════════════════════
  async getProfitTrend(startDate?: string, endDate?: string) {
    const salesTrend = await this.getSalesTrend(startDate, endDate);

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    // Get expenses grouped by day
    const expenseTxns = await this.prisma.transaction.findMany({
      where: {
        type: 'EXPENSE',
        date: { gte: start, lte: end },
      },
      select: { amount: true, date: true },
    });

    const expByDay: Record<string, number> = {};
    expenseTxns.forEach((tx) => {
      const key = tx.date.toISOString().slice(0, 10);
      expByDay[key] = (expByDay[key] || 0) + Number(tx.amount);
    });

    return salesTrend.map((day) => ({
      date: day.date,
      revenue: day.sales,
      cost: day.cost,
      expenses: Math.round((expByDay[day.date] || 0) * 100) / 100,
      grossProfit: day.profit,
      netProfit:
        Math.round((day.profit - (expByDay[day.date] || 0)) * 100) / 100,
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // STOCK DISTRIBUTION – top categories by stock value
  // ═══════════════════════════════════════════════════════════════
  async getStockDistribution() {
    const stocks = await this.prisma.stock.findMany({
      include: {
        product: {
          select: {
            costPrice: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const catMap: Record<string, { value: number; quantity: number }> = {};

    stocks.forEach((s) => {
      const cat = s.product.category?.name || 'Uncategorized';
      if (!catMap[cat]) catMap[cat] = { value: 0, quantity: 0 };
      catMap[cat].value += s.quantity * Number(s.product.costPrice);
      catMap[cat].quantity += s.quantity;
    });

    return Object.entries(catMap)
      .map(([name, v]) => ({
        name,
        value: Math.round(v.value * 100) / 100,
        quantity: v.quantity,
      }))
      .sort((a, b) => b.value - a.value);
  }

  // ═══════════════════════════════════════════════════════════════
  // TOP PRODUCTS (kept from original, now supports date filter)
  // ═══════════════════════════════════════════════════════════════
  async getTopProducts(startDate?: string, endDate?: string) {
    const dateRange = this.buildDateRange(startDate, endDate);

    const orderFilter: any = {};
    if (dateRange) {
      orderFilter.order = { createdAt: dateRange, status: 'COMPLETED' };
    } else {
      orderFilter.order = { status: 'COMPLETED' };
    }

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: orderFilter,
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    return topProducts.map((tp) => {
      const product = products.find((p) => p.id === tp.productId);
      return {
        name: product?.name || 'Unknown',
        sales: tp._sum.quantity || 0,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RECENT ORDERS (kept from original)
  // ═══════════════════════════════════════════════════════════════
  async getRecentOrders(limit = 10) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        payments: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LEGACY – keep old getStats so nothing breaks
  // ═══════════════════════════════════════════════════════════════
  async getStats() {
    const overview = await this.getOverview();
    return {
      netSales: overview.netSales,
      grossProfit: overview.grossProfit,
      netProfit: overview.netProfit,
      totalOrders: overview.totalOrders,
      grossSales: overview.grossSales,
      totalDiscounts: overview.totalDiscounts,
      cogs: overview.cogs,
      expenses: overview.totalExpenses,
    };
  }

  async getSalesData() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
      select: { total: true, createdAt: true },
    });

    const salesByDay: Record<string, number> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    orders.forEach((order) => {
      const dayName = days[order.createdAt.getDay()];
      salesByDay[dayName] = (salesByDay[dayName] || 0) + Number(order.total);
    });

    return days.map((day) => ({
      name: day,
      sales: salesByDay[day] || 0,
    }));
  }
}
