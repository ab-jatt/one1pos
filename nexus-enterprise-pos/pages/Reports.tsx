import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { SALES_DATA, TOP_PRODUCTS_DATA, MOCK_ORDERS, TRANSACTIONS } from '../constants';
import { OrderStatus } from '../types';
import { BarChart, Bar, PieChart, Pie, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, AreaChart, Area } from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { Download, TrendingUp, DollarSign, PieChart as PieChartIcon, Activity, Printer, FileText, Eye, Search, X, PlusCircle, RefreshCw, BarChart3, Binary } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#22c55e'];

// Enhanced Mock Reports with internal data snapshots
const INITIAL_REPORTS = [
  { 
    id: 'RPT-2023-101', 
    title: 'Daily Sales Closing', 
    type: 'Sales', 
    date: '2023-10-25', 
    generatedBy: 'System', 
    status: 'Ready', 
    size: '1.2 MB',
    data: { revenue: 12450.00, orders: 342, aov: 36.40, growth: 12 } 
  },
  { 
    id: 'RPT-2023-100', 
    title: 'Inventory Valuation', 
    type: 'Inventory', 
    date: '2023-10-24', 
    generatedBy: 'John Doe', 
    status: 'Ready', 
    size: '850 KB',
    data: { revenue: 45000.00, orders: 0, aov: 0, growth: 0 } 
  },
  { 
    id: 'RPT-2023-099', 
    title: 'Monthly P&L Statement', 
    type: 'Financial', 
    date: '2023-10-01', 
    generatedBy: 'Sarah Manager', 
    status: 'Ready', 
    size: '2.4 MB',
    data: { revenue: 156000.00, cogs: 45000, grossProfit: 111000, expenses: 65000, netProfit: 46000, margin: 29.5 }
  },
];

const CUSTOMER_TRAFFIC = [
  { name: 'Mon', visitors: 145, new: 24 },
  { name: 'Tue', visitors: 230, new: 45 },
  { name: 'Wed', visitors: 180, new: 30 },
  { name: 'Thu', visitors: 290, new: 65 },
  { name: 'Fri', visitors: 350, new: 80 },
  { name: 'Sat', visitors: 480, new: 120 },
  { name: 'Sun', visitors: 420, new: 95 },
];

const Reports: React.FC = () => {
  const { t = (key: string) => key } = useLanguage() || {};
  const { formatMoney = (val: number) => `$${val.toFixed(2)}`, currencySymbol = '$' } = useCurrency() || {};
  const { showSuccess } = useToast();
  
  const [activeTab, setActiveTab] = useState<'analytics' | 'documents'>('analytics');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date Filtering State
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate Financial Metrics (Strict P&L Logic)
  let grossSales = 0;
  let totalDiscounts = 0;
  let cogs = 0;

  // Only consider COMPLETED orders for valid financial metrics
  const completedOrders = MOCK_ORDERS.filter(o => o.status === OrderStatus.COMPLETED);

  completedOrders.forEach(order => {
    order.items.forEach(item => {
        grossSales += (item.price * item.quantity);
        cogs += (item.costPrice * item.quantity);
    });
    totalDiscounts += (order.discount || 0);
  });

  const netSales = grossSales - totalDiscounts;

  const expenses = TRANSACTIONS
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const grossProfit = netSales - cogs;
  const netProfit = grossProfit - expenses;
  const margin = netSales ? (netProfit / netSales) * 100 : 0;

  // Filtering Logic
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            report.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateRange.start) {
        matchesDate = matchesDate && new Date(report.date) >= new Date(dateRange.start);
      }
      if (dateRange.end) {
        matchesDate = matchesDate && new Date(report.date) <= new Date(dateRange.end);
      }

      return matchesSearch && matchesDate;
    });
  }, [reports, searchTerm, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  const generateDayClosingReport = async () => {
    setIsGenerating(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Calculate snapshot metrics based on current MOCK_ORDERS
    const todayOrders = MOCK_ORDERS.filter(o => o.status === OrderStatus.COMPLETED);
    const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = todayOrders.length;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

    const newReport = {
      id: `RPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      title: 'Daily Sales Closing',
      type: 'Sales',
      date: new Date().toISOString().split('T')[0],
      generatedBy: 'Admin', // In a real app, use auth context
      status: 'Ready',
      size: '1.4 MB',
      data: {
        revenue: totalRevenue,
        orders: orderCount,
        aov: aov,
        growth: Math.random() * 5 // Mock growth
      }
    };

    setReports(prev => [newReport, ...prev]);
    setIsGenerating(false);
    setActiveTab('documents'); // Switch to documents tab to see new report
    showSuccess(t('dailyClosingReportGenerated'));
  };

  const generatePLReport = async () => {
    setIsGenerating(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newReport = {
      id: `RPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      title: 'Profit & Loss Statement',
      type: 'Financial',
      date: new Date().toISOString().split('T')[0],
      generatedBy: 'Admin',
      status: 'Ready',
      size: '2.1 MB',
      data: {
        revenue: netSales,
        cogs: cogs,
        grossProfit: grossProfit,
        expenses: expenses,
        netProfit: netProfit,
        margin: margin
      }
    };

    setReports(prev => [newReport, ...prev]);
    setIsGenerating(false);
    setActiveTab('documents');
    showSuccess(t('plReportGenerated'));
  };

  return (
    <div className="space-y-6 print:hidden">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 print:hidden animate-enter">
        <div className="relative pl-4 border-l-4 border-sky-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('intelligenceCenter')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono text-sm tracking-wider">
            {t('dataAnalytics')}
          </p>
        </div>
        <div className="flex gap-2">
           <div className="flex p-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
             <button 
               onClick={() => setActiveTab('analytics')}
               className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'analytics' ? 'bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
             >
               {t('dashboard')}
             </button>
             <button 
               onClick={() => setActiveTab('documents')}
               className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'documents' ? 'bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
             >
               {t('archive')}
             </button>
           </div>
           
           <button 
             onClick={handlePrint}
             className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ml-2 shadow-sm"
           >
             <Printer className="w-4 h-4" /> {t('print')}
           </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-12 h-12 text-neutral-400" /></div>
                    <div className="relative z-10">
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('netSales')}</p>
                        <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatMoney(netSales)}</h3>
                    </div>
                </div>
                <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-12 h-12 text-neutral-400" /></div>
                    <div className="relative z-10">
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('grossProfit')}</p>
                        <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatMoney(grossProfit)}</h3>
                    </div>
                </div>
                <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-12 h-12 text-neutral-400" /></div>
                    <div className="relative z-10">
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('netProfit')}</p>
                        <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatMoney(netProfit)}</h3>
                    </div>
                </div>
                <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><PieChartIcon className="w-12 h-12 text-neutral-400" /></div>
                    <div className="relative z-10">
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('netMargin')}</p>
                        <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{margin.toFixed(1)}%</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title={t('salesTrendsLast7Days')}>
                    <div className="h-80 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={SALES_DATA}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#94a3b8' : '#d1d5db'} strokeOpacity={isDark ? 0.1 : 0.5} vertical={false} />
                            <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value}`} dx={-10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', backdropFilter: 'blur(12px)', color: isDark ? '#f8fafc' : '#111827' }}
                                itemStyle={{ color: '#a78bfa' }}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                </Card>

                <Card title={t('revenueByCategory')}>
                    <div className="h-80 w-full flex items-center justify-center pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={TOP_PRODUCTS_DATA}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="sales"
                            >
                                {TOP_PRODUCTS_DATA.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', backdropFilter: 'blur(12px)', color: isDark ? '#f8fafc' : '#111827' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title={t('customerTraffic')}>
                    <div className="h-80 w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={CUSTOMER_TRAFFIC}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#94a3b8' : '#d1d5db'} strokeOpacity={isDark ? 0.1 : 0.5} />
                                <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke={isDark ? '#94a3b8' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', backdropFilter: 'blur(12px)', color: isDark ? '#f8fafc' : '#111827' }}
                                />
                                <Legend />
                                <Bar dataKey="visitors" name={t('totalVisitors')} fill="#818cf8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="new" name={t('newCustomers')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title={t('topSellingProducts')}>
                    <div className="h-80 w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={TOP_PRODUCTS_DATA} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#94a3b8' : '#d1d5db'} strokeOpacity={isDark ? 0.1 : 0.5} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'rgba(139, 92, 246, 0.1)'}} contentStyle={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', backdropFilter: 'blur(12px)', color: isDark ? '#f8fafc' : '#111827' }} />
                            <Bar dataKey="sales" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20}>
                                {TOP_PRODUCTS_DATA.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
            <Card className="overflow-visible !p-0 border-t-4 border-t-sky-500">
                {/* Documents Toolbar */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                    <div className="relative w-full lg:w-96 group">
                        <div className="relative flex items-center bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <Search className="absolute left-3 text-neutral-400 w-4 h-4" />
                            <input 
                            type="text" 
                            placeholder={t('searchArchives')} 
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border-none focus:ring-0 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 font-mono"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <button 
                          onClick={generateDayClosingReport}
                          disabled={isGenerating}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-sky-500 hover:text-sky-500 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                           {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                           {t('generateClosing')}
                        </button>
                        
                        <button 
                          onClick={generatePLReport}
                          disabled={isGenerating}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                           {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                           {t('generatePL')}
                        </button>
                    </div>
                </div>

                {/* Documents Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
                        <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800 font-mono">
                            <tr>
                                <th className="px-6 py-4">{t('reportName')}</th>
                                <th className="px-6 py-4">{t('type')}</th>
                                <th className="px-6 py-4">{t('dateGenerated')}</th>
                                <th className="px-6 py-4">{t('generatedBy')}</th>
                                <th className="px-6 py-4">{t('status')}</th>
                                <th className="px-6 py-4 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                            {filteredReports.length > 0 ? (
                                filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-lg group-hover:scale-110 transition-transform">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-sky-500 transition-colors">{report.title}</div>
                                                    <div className="text-xs text-neutral-400 font-mono">{report.size} • {report.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                                {report.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(report.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{report.generatedBy}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                report.status === 'Ready' ? 'bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-100/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${report.status === 'Ready' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => setSelectedReport(report)}
                                                    className="p-2 text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                                                    title={t('viewReport')}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    className="p-2 text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                                                    title={t('downloadPdf')}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    className="p-2 text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                                                    title={t('print')}
                                                    onClick={handlePrint}
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-neutral-400">
                                        <div className="flex flex-col items-center">
                                            <Binary className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="font-mono uppercase tracking-widest">{t('noArchivesFound')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
      )}

      {/* Report Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4 print:p-0 print:bg-white print:fixed print:inset-0">
            <style type="text/css" media="print">
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-report, #printable-report * { visibility: visible; }
                        #printable-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                        @page { size: auto; margin: 20mm; }
                    }
                `}
            </style>
            <div className="w-full max-w-4xl h-[85vh] rounded-lg shadow-xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 print:shadow-none print:border-none print:h-auto print:w-full">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100">{selectedReport.title}</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">{selectedReport.id} • {new Date(selectedReport.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="p-2 hover:bg-white/20 dark:hover:bg-neutral-700 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400">
                            <Printer className="w-5 h-5" />
                        </button>
                        <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-white/20 dark:hover:bg-neutral-700 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 bg-gray-100 dark:bg-neutral-950 p-8 overflow-y-auto print:bg-white print:p-0 print:overflow-visible">
                    <div id="printable-report" className="bg-white text-neutral-900 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-[20mm] origin-top transform scale-95 sm:scale-100 print:shadow-none print:scale-100 print:mx-0">
                        {/* Mock PDF Content */}
                        <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-sky-900">one1pos</h1>
                                <p className="text-gray-500 mt-1">Enterprise Point of Sale System</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">{t('report')}</h2>
                                <p className="text-gray-600 font-mono mt-1 font-bold">#{selectedReport.id}</p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase tracking-wide border-l-4 border-sky-500 pl-3">{selectedReport.title}</h3>
                            <p className="text-gray-600 text-sm mt-2">{t('generatedOn')} <span className="font-mono font-bold">{new Date().toLocaleString()}</span> {t('by')} {selectedReport.generatedBy}</p>
                        </div>

                        <div className="mb-8">
                           <p className="text-gray-700 mb-4 text-sm">This report provides a comprehensive analysis of {selectedReport.type.toLowerCase()} metrics for the specified period.</p>
                           
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="bg-gray-50 border-b border-gray-200">
                                       <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500">{t('metric')}</th>
                                       <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500 text-right">{t('value')}</th>
                                       <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-gray-500 text-right">{t('change')}</th>
                                   </tr>
                                </thead>
                                <tbody>
                                    {selectedReport.type === 'Financial' ? (
                                        <>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-3 px-4 text-gray-800 font-medium">{t('netSalesRevenue')}</td>
                                                <td className="py-3 px-4 text-gray-800 text-right font-mono">{formatMoney(selectedReport.data?.revenue || 0)}</td>
                                                <td className="py-3 px-4 text-gray-500 text-right font-mono">-</td>
                                            </tr>
                                             <tr className="border-b border-gray-100">
                                                <td className="py-3 px-4 text-gray-800 font-medium">{t('cogs')}</td>
                                                <td className="py-3 px-4 text-red-600 text-right font-mono">-{formatMoney(selectedReport.data?.cogs || 0)}</td>
                                                <td className="py-3 px-4 text-gray-500 text-right font-mono">-</td>
                                            </tr>
                                            <tr className="border-b border-gray-100 bg-gray-50">
                                                <td className="py-3 px-4 text-gray-900 font-bold">{t('grossProfitLabel')}</td>
                                                <td className="py-3 px-4 text-gray-900 text-right font-bold font-mono">{formatMoney(selectedReport.data?.grossProfit || 0)}</td>
                                                <td className="py-3 px-4 text-gray-500 text-right font-mono">-</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-3 px-4 text-gray-800 font-medium">{t('operatingExpenses')}</td>
                                                <td className="py-3 px-4 text-red-600 text-right font-mono">-{formatMoney(selectedReport.data?.expenses || 0)}</td>
                                                <td className="py-3 px-4 text-gray-500 text-right font-mono">-</td>
                                            </tr>
                                            <tr className="border-b border-gray-100 bg-sky-50">
                                                <td className="py-3 px-4 text-sky-900 font-bold">{t('netProfitLabel')}</td>
                                                <td className="py-3 px-4 text-sky-900 text-right font-bold font-mono">{formatMoney(selectedReport.data?.netProfit || 0)}</td>
                                                <td className="py-3 px-4 text-sky-600 text-right font-bold font-mono">{selectedReport.data?.margin?.toFixed(1)}%</td>
                                            </tr>
                                        </>
                                    ) : (
                                        <>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-3 px-4 text-gray-800 font-medium">{t('totalRevenue')}</td>
                                                <td className="py-3 px-4 text-gray-800 text-right font-mono">{formatMoney(selectedReport.data?.revenue || 0)}</td>
                                                <td className="py-3 px-4 text-green-600 text-right font-mono">+{selectedReport.data?.growth?.toFixed(1) || 0}%</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-3 px-4 text-gray-800 font-medium">{t('transactionCount')}</td>
                                                <td className="py-3 px-4 text-gray-800 text-right font-mono">{selectedReport.data?.orders || 0}</td>
                                                <td className="py-3 px-4 text-green-600 text-right font-mono">+5%</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-3 px-4 text-gray-800 font-medium">{t('averageOrderValue')}</td>
                                                <td className="py-3 px-4 text-gray-800 text-right font-mono">{formatMoney(selectedReport.data?.aov || 0)}</td>
                                                <td className="py-3 px-4 text-red-500 text-right font-mono">-2%</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                           </table>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-center text-gray-400 text-xs uppercase tracking-widest">{t('confidentialDocument')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;