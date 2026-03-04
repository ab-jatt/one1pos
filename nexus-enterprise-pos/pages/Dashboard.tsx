
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DollarSign, ShoppingBag, TrendingUp, TrendingDown, Wallet, Package,
  AlertTriangle, ArrowDownRight, ArrowUpRight, Activity, Loader2,
  Calendar, CreditCard, Truck, BarChart3,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface Overview {
  salesToday: number;
  ordersToday: number;
  salesThisMonth: number;
  ordersThisMonth: number;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  totalOrders: number;
  totalInventoryValue: number;
  lowStockCount: number;
  totalStockItems: number;
  totalReceivable: number;
  receivableCount: number;
  totalPayable: number;
  payableCount: number;
  cogs: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  totalLoss: number;
}

interface SalesTrendPoint {
  date: string;
  sales: number;
  cost: number;
  profit: number;
  orders: number;
}

interface ProfitTrendPoint {
  date: string;
  revenue: number;
  cost: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
}

interface StockDistItem {
  name: string;
  value: number;
  quantity: number;
}

interface TopProduct {
  name: string;
  sales: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: string;
  customer?: { name: string } | null;
  payments?: { method: string }[];
}

type DatePreset = 'today' | 'week' | 'month' | 'custom';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

function getPresetDates(preset: DatePreset): { start: string; end: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'today': {
      const s = fmt(now);
      return { start: s, end: s };
    }
    case 'week': {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      return { start: fmt(s), end: fmt(now) };
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: fmt(s), end: fmt(now) };
    }
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  // ── Dark mode detection ─────────────────────────
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ── Date filter state ───────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd };
    return getPresetDates(datePreset);
  }, [datePreset, customStart, customEnd]);

  // ── Data state ──────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [profitTrend, setProfitTrend] = useState<ProfitTrendPoint[]>([]);
  const [stockDist, setStockDist] = useState<StockDistItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // ── Fetch data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const start = dateRange?.start;
      const end = dateRange?.end;

      const [ov, st, pt, sd, tp, ro] = await Promise.all([
        Api.dashboard.getOverview(start, end),
        Api.dashboard.getSalesTrend(start, end),
        Api.dashboard.getProfitTrend(start, end),
        Api.dashboard.getStockDistribution(),
        Api.dashboard.getTopProducts(start, end),
        Api.dashboard.getRecentOrders(8),
      ]);

      setOverview(ov);
      setSalesTrend(st);
      setProfitTrend(pt);
      setStockDist(sd);
      setTopProducts(tp);
      setRecentOrders(ro);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Tooltip style (shared) ──────────────────────
  const tooltipStyle = {
    backgroundColor: isDark ? '#171717' : '#ffffff',
    borderRadius: '8px',
    border: isDark ? '1px solid #262626' : '1px solid #e5e5e5',
    color: isDark ? '#fafafa' : '#171717',
    fontSize: '12px',
  };

  const axisStroke = isDark ? '#525252' : '#a3a3a3';

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        <span className="ml-3 text-neutral-500 dark:text-neutral-400">{t('loading')}</span>
      </div>
    );
  }

  const ov = overview!;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header & Date Filter ─────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div className="relative">
          <div className="absolute -left-4 top-1 w-0.5 h-10 bg-sky-500 rounded-r-full" />
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('businessOverview')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-500" /> {t('systemOperational')}
          </p>
        </div>

        {/* Date Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'week', 'month', 'custom'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                ${datePreset === preset
                  ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-sky-300 dark:hover:border-sky-700'}
              `}
            >
              <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />
              {preset === 'today' ? t('today') : preset === 'week' ? t('thisWeek') : preset === 'month' ? t('thisMonth') : t('customRange')}
            </button>
          ))}

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
              />
              <span className="text-neutral-400 text-xs">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
              />
            </div>
          )}

          {loading && (
            <Loader2 className="w-4 h-4 text-sky-500 animate-spin ml-2" />
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 1 – OVERVIEW CARDS (4 groups)
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ── Sales Card ─────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 border-b-2 border-b-sky-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/30 text-sky-500 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('salesOverview')}</p>
            <h3 className="text-2xl font-semibold text-neutral-900 dark:text-white mt-1 tracking-tight">
              {formatCurrency(ov.netSales)}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">{t('netSales')} ({t('totalOrders')}: {ov.totalOrders})</p>
            <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('today')}</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(ov.salesToday)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('thisMonth')}</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(ov.salesThisMonth)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stock Card ─────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 border-b-2 border-b-violet-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-500 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('stockOverview')}</p>
            <h3 className="text-2xl font-semibold text-neutral-900 dark:text-white mt-1 tracking-tight">
              {formatCurrency(ov.totalInventoryValue)}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">{t('inventoryValue')}</p>
            <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('totalStockItems') || 'Items'}</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{ov.totalStockItems.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1">
                {ov.lowStockCount > 0 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('lowStockItems')}</p>
                  <p className={`text-sm font-semibold ${ov.lowStockCount > 0 ? 'text-amber-500' : 'text-neutral-800 dark:text-neutral-200'}`}>{ov.lowStockCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Receivable / Payable Card ──────────────── */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 border-b-2 border-b-amber-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('receivablePayable')}</p>
            <div className="flex gap-4 mt-3">
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('totalReceivable')}</p>
                </div>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(ov.totalReceivable)}</p>
                <p className="text-[10px] text-neutral-400">{ov.receivableCount} {t('customersOwe')}</p>
              </div>
              <div className="w-px bg-neutral-100 dark:bg-neutral-800" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('totalPayable')}</p>
                </div>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-0.5">{formatCurrency(ov.totalPayable)}</p>
                <p className="text-[10px] text-neutral-400">{ov.payableCount} {t('pendingPurchases')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Profit & Loss Card ─────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 border-b-2 border-b-emerald-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
              ov.netProfit >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'
                : 'bg-red-50 dark:bg-red-950/30 text-red-500'
            }`}>
              {ov.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t('profitLoss')}</p>
            <h3 className={`text-2xl font-semibold mt-1 tracking-tight ${
              ov.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(ov.netProfit)}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">{t('netProfit')}</p>
            <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('grossProfit')}</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(ov.grossProfit)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">{t('expenses')}</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(ov.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════
          SECTION 2 – SALES TREND CHART
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card title={t('salesTrendChart')} className="h-full">
            {salesTrend.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-neutral-400 text-sm">{t('noDataAvailable')}</div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#f0f0f0'} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={axisStroke}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v))} dx={-5} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => new Date(l).toLocaleDateString()} />
                    <Area type="monotone" dataKey="sales" name={t('revenue')} stroke="#0ea5e9" strokeWidth={2} fill="url(#gradSales)" animationDuration={1000} />
                    <Area type="monotone" dataKey="cost" name={t('cost')} stroke="#a855f7" strokeWidth={1.5} fill="none" strokeDasharray="5 3" animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Top Products */}
        <div>
          <Card title={t('topProducts')} className="h-full">
            {topProducts.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-neutral-400 text-sm">{t('noDataAvailable')}</div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#262626' : '#f0f0f0'} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: isDark ? '#a3a3a3' : '#525252' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(14,165,233,0.05)' }} />
                    <Bar dataKey="sales" name={t('units')} fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 3 – PROFIT TREND & STOCK DISTRIBUTION
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card title={t('profitTrendChart')} className="h-full">
            {profitTrend.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-neutral-400 text-sm">{t('noDataAvailable')}</div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#f0f0f0'} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={axisStroke}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v))} dx={-5} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => new Date(l).toLocaleDateString()} />
                    <Line type="monotone" dataKey="grossProfit" name={t('grossProfit')} stroke="#10b981" strokeWidth={2} dot={false} animationDuration={1000} />
                    <Line type="monotone" dataKey="netProfit" name={t('netProfit')} stroke="#0ea5e9" strokeWidth={2} dot={false} animationDuration={1000} />
                    <Line type="monotone" dataKey="expenses" name={t('expenses')} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" dot={false} animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Stock Distribution Pie */}
        <div>
          <Card title={t('stockDistribution')} className="h-full">
            {stockDist.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-neutral-400 text-sm">{t('noDataAvailable')}</div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockDist}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      animationDuration={800}
                    >
                      {stockDist.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', color: isDark ? '#a3a3a3' : '#525252' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 4 – RECENT ORDERS TABLE
      ══════════════════════════════════════════════ */}
      <Card title={t('recentTransactions')} className="overflow-visible">
        <div className="overflow-x-auto -mx-6 px-6 pb-2">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
            <thead className="text-xs uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800 text-neutral-500 font-medium border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">{t('orderNumber')}</th>
                <th className="px-6 py-3 whitespace-nowrap">{t('dateTime')}</th>
                <th className="px-6 py-3 whitespace-nowrap">{t('customerName')}</th>
                <th className="px-6 py-3 whitespace-nowrap">{t('payment')}</th>
                <th className="px-6 py-3 whitespace-nowrap">{t('status')}</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">{t('total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-400">{t('noDataAvailable')}</td>
                </tr>
              ) : recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-sky-500">{order.orderNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                    {new Date(order.createdAt).toLocaleDateString()} <span className="text-neutral-300 dark:text-neutral-600">|</span> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">{order.customer?.name || t('guest')}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                      {order.payments?.[0]?.method || t('cash')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      order.status === 'COMPLETED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                        : order.status === 'REFUNDED'
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(Number(order.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
