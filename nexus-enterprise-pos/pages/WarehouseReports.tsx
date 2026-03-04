import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Search, RefreshCw, Package, Factory, ArrowLeftRight, DollarSign, AlertTriangle } from 'lucide-react';
import { Api } from '../services/api';

type ReportTab = 'stockBalance' | 'movements' | 'valuation' | 'production' | 'finishedGoods' | 'lowStock' | 'transfers';

const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: 'stockBalance', label: 'Stock Balance', icon: Package },
  { key: 'movements', label: 'Movements', icon: ArrowLeftRight },
  { key: 'valuation', label: 'Valuation', icon: DollarSign },
  { key: 'production', label: 'Production', icon: Factory },
  { key: 'finishedGoods', label: 'Finished Goods', icon: Package },
  { key: 'lowStock', label: 'Low Stock', icon: AlertTriangle },
  { key: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
];

const WarehouseReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('stockBalance');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    Api.warehouses.getAll().then(setWarehouses).catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const fetchers: Record<ReportTab, () => Promise<any>> = {
        stockBalance: () => Api.warehouseReports.stockBalance(params),
        movements: () => Api.warehouseReports.movements(params),
        valuation: () => Api.warehouseReports.inventoryValuation(params),
        production: () => Api.warehouseReports.productionConsumption(params),
        finishedGoods: () => Api.warehouseReports.finishedGoods(params),
        lowStock: () => Api.warehouseReports.lowStock(params),
        transfers: () => Api.warehouseReports.transfers(params),
      };

      const result = await fetchers[activeTab]();
      setReportData(result);
    } catch (err) {
      console.error('Report fetch failed:', err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [activeTab]);

  const exportCSV = () => {
    if (!reportData?.data?.length) return;
    const rows = reportData.data;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((r: any) => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeTab}_report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const data = reportData?.data || [];
  const summary = reportData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Warehouse Reports</h1>
          <p className="text-sm text-neutral-500 mt-1">Comprehensive inventory and production analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReport} className="p-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCSV} disabled={!data.length}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="">All Warehouses</option>
          {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm" />
        <button onClick={fetchReport}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Search className="w-4 h-4 inline mr-1" /> Generate
        </button>
      </div>

      {/* Summary Cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(summary).map(([key, value]: [string, any]) => (
            <div key={key} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p className="text-xs text-neutral-500 mb-1">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {typeof value === 'number' ? (key.toLowerCase().includes('cost') || key.toLowerCase().includes('value') ? `$${value.toFixed(2)}` : value.toLocaleString()) : value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Report Data */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : data.length > 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  {Object.keys(data[0]).map(key => (
                    <th key={key} className="text-left px-4 py-3 font-medium text-neutral-500 whitespace-nowrap">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    {Object.entries(row).map(([key, val]: [string, any], ci) => (
                      <td key={ci} className="px-4 py-3 whitespace-nowrap">
                        {typeof val === 'number'
                          ? (key.toLowerCase().includes('cost') || key.toLowerCase().includes('value') || key.toLowerCase().includes('price'))
                            ? `$${val.toFixed(2)}`
                            : val.toLocaleString()
                          : val instanceof Date
                            ? new Date(val).toLocaleDateString()
                            : String(val ?? '—')
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-16 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          <p className="text-neutral-400">No data available for this report</p>
          <p className="text-xs text-neutral-400 mt-1">Adjust filters and click Generate</p>
        </div>
      )}
    </div>
  );
};

export default WarehouseReports;
