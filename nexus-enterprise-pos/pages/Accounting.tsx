import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import { Transaction, Order, OrderStatus } from '../types';
import { MOCK_ORDERS, TRANSACTIONS } from '../constants';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Download, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

const Accounting: React.FC = () => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ 
    grossSales: 0,
    discounts: 0,
    revenue: 0, // Net Sales
    cogs: 0,
    grossProfit: 0,
    expenses: 0, 
    netProfit: 0, 
    growth: 0 
  });

  useEffect(() => {
    const fetchData = async () => {
      // 1. Calculate Sales Metrics from Orders
      let grossSales = 0;
      let totalDiscounts = 0;
      let totalCOGS = 0;

      // Only count COMPLETED orders for P&L
      const completedOrders = MOCK_ORDERS.filter(o => o.status === OrderStatus.COMPLETED);

      completedOrders.forEach(order => {
        // Calculate Gross Sales (Price * Qty) and COGS (Cost * Qty) per item
        order.items.forEach(item => {
           grossSales += (item.price * item.quantity);
           totalCOGS += (item.costPrice * item.quantity);
        });

        // Accumulate Order Level Discounts
        totalDiscounts += (order.discount || 0);
      });

      // Net Sales (Revenue) = Gross Sales - Discounts
      const netSales = grossSales - totalDiscounts;

      // 2. Calculate Expenses from Transactions
      const totalExpenses = TRANSACTIONS
        .filter(t => t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // 3. Profit Calculations
      const grossProfit = netSales - totalCOGS;
      const netProfit = grossProfit - totalExpenses;

      setTransactions(TRANSACTIONS);
      setStats({
        grossSales: grossSales,
        discounts: totalDiscounts,
        revenue: netSales,
        cogs: totalCOGS,
        grossProfit: grossProfit,
        expenses: totalExpenses,
        netProfit: netProfit,
        growth: 12.5 // Mock growth
      });
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-enter">
        <div className="relative pl-4 border-l-4 border-sky-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('financialLedger').split(' ')[0]} <span className="text-sky-500">{t('financialLedger').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-neutral-500 mt-1 font-mono text-sm tracking-wider">
            {t('plAnalyticsLive')}
          </p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all font-medium text-sm">
             <Download className="w-4 h-4" /> {t('exportReport')}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-enter" style={{ animationDelay: '100ms' }}>
         <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <TrendingUp className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('netRevenue')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white font-mono">{formatMoney(stats.revenue)}</h3>
               <div className="flex items-center gap-1 mt-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <ArrowUpRight className="w-3 h-3" /> +{stats.growth}% {t('growth')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500"></div>
         </div>
         
         <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group hover:shadow-md transition-shadow">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Activity className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('costOfGoods')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white font-mono">{formatMoney(stats.cogs)}</h3>
               <p className="text-xs text-neutral-500 mt-2">{t('operationalCosts')}</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-neutral-400"></div>
         </div>

         <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <TrendingDown className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('expenses')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white font-mono">{formatMoney(stats.expenses)}</h3>
               <div className="flex items-center gap-1 mt-2 text-red-600 dark:text-red-400 text-xs font-bold">
                  <ArrowDownRight className="w-3 h-3" /> +2.1%
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>
         </div>

         <div className={`p-5 rounded-lg border ${stats.netProfit >= 0 ? 'border-sky-500/50 dark:border-sky-500/30 bg-sky-50 dark:bg-neutral-900' : 'border-red-500/50 dark:border-red-500/30 bg-red-50 dark:bg-neutral-900'} relative overflow-hidden group hover:shadow-md transition-shadow`}>
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <DollarSign className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('netProfit')}</p>
               <h3 className={`text-3xl font-bold font-mono mt-1 ${stats.netProfit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-600 dark:text-red-400'}`}>{formatMoney(stats.netProfit)}</h3>
               <div className="mt-4 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className={`h-full w-[75%] ${stats.netProfit >= 0 ? 'bg-sky-500' : 'bg-red-500'}`}></div>
               </div>
               <p className="text-xs text-neutral-500 mt-2 font-mono">
                 {t('margin')}: {stats.revenue ? ((stats.netProfit / stats.revenue) * 100).toFixed(1) : 0}%
               </p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-enter" style={{ animationDelay: '200ms' }}>
         <div className="lg:col-span-2">
            <Card title={t('transactionalDataStream')} className="h-full !p-0 overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
                     <thead className="bg-neutral-100 dark:bg-neutral-950 text-xs uppercase tracking-wider text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800 font-mono">
                        <tr>
                           <th className="px-6 py-4">{t('description')}</th>
                           <th className="px-6 py-4">{t('category')}</th>
                           <th className="px-6 py-4">{t('date')}</th>
                           <th className="px-6 py-4 text-right">{t('amount')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                        {transactions.map(t => (
                           <tr key={t.id} className="hover:bg-emerald-50/10 dark:hover:bg-emerald-900/10 transition-colors">
                              <td className="px-6 py-4 font-medium text-neutral-800 dark:text-neutral-200">{t.description}</td>
                              <td className="px-6 py-4">
                                 <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                   {t.category}
                                 </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs">{new Date(t.date).toLocaleDateString()}</td>
                              <td className={`px-6 py-4 text-right font-mono font-bold ${t.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                 {t.type === 'Income' ? '+' : '-'}{formatMoney(t.amount)}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </Card>
         </div>
         <div>
            <Card title={t('plBreakdown')} className="h-full">
               <div className="space-y-4 p-2 font-mono">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-neutral-600 dark:text-neutral-400">{t('grossSales')}</span>
                     <span className="font-bold text-neutral-900 dark:text-neutral-100">{formatMoney(stats.grossSales)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-neutral-600 dark:text-neutral-400">{t('discounts')}</span>
                     <span className="font-bold text-red-500">-{formatMoney(stats.discounts)}</span>
                  </div>
                  <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-2"></div>
                  <div className="flex justify-between items-center text-sm font-bold">
                     <span className="text-emerald-600 dark:text-emerald-400">{t('netRevenue')}</span>
                     <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(stats.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2">
                     <span className="text-neutral-600 dark:text-neutral-400">{t('cogs')}</span>
                     <span className="font-bold text-red-500">-{formatMoney(stats.cogs)}</span>
                  </div>
                  <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-2"></div>
                  <div className="flex justify-between items-center text-sm font-bold">
                     <span className="text-blue-600 dark:text-blue-400">{t('grossProfit')}</span>
                     <span className="text-blue-600 dark:text-blue-400">{formatMoney(stats.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2">
                     <span className="text-neutral-600 dark:text-neutral-400">{t('opExpenses')}</span>
                     <span className="font-bold text-red-500">-{formatMoney(stats.expenses)}</span>
                  </div>
                  <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-2"></div>
                  <div className="flex justify-between items-center text-lg font-bold p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mt-4">
                     <span className="text-emerald-800 dark:text-emerald-200 uppercase tracking-widest text-xs">{t('netIncome')}</span>
                     <span className={`${stats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatMoney(stats.netProfit)}
                     </span>
                  </div>
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
};

export default Accounting;