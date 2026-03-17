import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Package, 
  Search, 
  Download, 
  RefreshCw, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Box, 
  ChevronDown,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText
} from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';

interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  productSku: string;
  type: string;
  quantityIn: number;
  quantityOut: number;
  openingStock: number;
  closingStock: number;
  reason: string | null;
  referenceId: string | null;
  vendorName: string; // Added vendor information
}

interface ProductStock {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  currentStock: number;
  openingStock: number;
  closingStock: number;
  totalIn: number;
  totalOut: number;
  movements: any[];
}

interface StockReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalProducts: number;
    totalOpeningStock: number;
    totalClosingStock: number;
    totalStockIn: number;
    totalStockOut: number;
    totalMovements: number;
  };
  products: ProductStock[];
}

const StockReport: React.FC = () => {
  const { t = (key: string) => key } = useLanguage() || {};
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<StockReport | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'movements'>('summary');
  
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await Api.products.getAll();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  // Fetch report data
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      if (viewMode === 'summary') {
        const data = await Api.stockReports.getReport(startDate, endDate, selectedProduct || undefined);
        setReportData(data);
      } else {
        const data = await Api.stockReports.getMovements(startDate, endDate, selectedProduct || undefined, currentPage, 50);
        setMovements(data.movements);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedProduct, viewMode, currentPage]);

  // Quick date filters
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setThisWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const setLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(lastDayOfLastMonth.toISOString().split('T')[0]);
  };

  // Filter products by search
  const filteredProducts = reportData?.products.filter(p =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.productSku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Export to CSV
  const exportToCSV = () => {
    if (!reportData) return;
    
    const headers = ['Product Name', 'SKU', 'Category', 'Opening Stock', 'Stock In', 'Stock Out', 'Closing Stock'];
    const rows = reportData.products.map(p => [
      p.productName,
      p.productSku,
      p.category,
      p.openingStock,
      p.totalIn,
      p.totalOut,
      p.closingStock
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'OPENING_STOCK': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'SALE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'RESTOCK': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'RETURN': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ADJUSTMENT': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'DAMAGE': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            {t('stockActivityReport')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {t('trackInventoryMovements')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={!reportData}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {t('exportCsv')}
          </button>
          <button
            onClick={fetchReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neutral-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white text-sm"
            />
            <span className="text-neutral-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white text-sm"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <button onClick={setToday} className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">{t('todayFilter')}</button>
            <button onClick={setThisWeek} className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">{t('thisWeekFilter')}</button>
            <button onClick={setThisMonth} className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">{t('thisMonthFilter')}</button>
            <button onClick={setLastMonth} className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">{t('lastMonthFilter')}</button>
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-2">
            <Dropdown
              options={[
                { value: '', label: t('allProducts') },
                ...products.map((product) => ({ value: String(product.id), label: `${product.name} (${product.sku})` }))
              ]}
              value={selectedProduct}
              onChange={(val) => setSelectedProduct(val)}
              icon={<Filter className="w-4 h-4" />}
              className="min-w-[200px]"
              size="sm"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 ml-auto">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'summary' ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-neutral-600 dark:text-neutral-400'}`}
            >
              {t('summaryView')}
            </button>
            <button
              onClick={() => setViewMode('movements')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'movements' ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-neutral-600 dark:text-neutral-400'}`}
            >
              {t('allMovements')}
            </button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      {reportData && viewMode === 'summary' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase">{t('products')}</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{reportData.summary.totalProducts}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-500/20 rounded-lg">
                <Box className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium uppercase">{t('opening')}</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{reportData.summary.totalOpeningStock.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ArrowUpCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase">{t('stockIn')}</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">+{reportData.summary.totalStockIn.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ArrowDownCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase">{t('stockOut')}</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">-{reportData.summary.totalStockOut.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/20 rounded-lg">
                <Box className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium uppercase">{t('closing')}</p>
                <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{reportData.summary.totalClosingStock.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium uppercase">{t('movements')}</p>
                <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{reportData.summary.totalMovements}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-neutral-500 dark:text-neutral-400">Loading stock report...</p>
            </div>
          </div>
        ) : viewMode === 'summary' ? (
          <>
            {/* Search Bar */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder={t('searchProducts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white"
                />
              </div>
            </div>

            {/* Product Summary Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100 dark:bg-neutral-800">
                  <tr className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">{t('product')}</th>
                    <th className="px-4 py-3 text-left">{t('category')}</th>
                    <th className="px-4 py-3 text-right">{t('openingStock')}</th>
                    <th className="px-4 py-3 text-right">{t('stockIn')}</th>
                    <th className="px-4 py-3 text-right">{t('stockOut')}</th>
                    <th className="px-4 py-3 text-right">{t('closingStock')}</th>
                    <th className="px-4 py-3 text-right">{t('stockChange')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredProducts.map((product) => {
                    const change = product.closingStock - product.openingStock;
                    return (
                      <tr key={product.productId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-neutral-800 dark:text-white">{product.productName}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{product.productSku}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs rounded-lg">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                          {product.openingStock.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400 font-semibold">
                          {product.totalIn > 0 ? `+${product.totalIn.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-red-600 dark:text-red-400 font-semibold">
                          {product.totalOut > 0 ? `-${product.totalOut.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {product.closingStock.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-semibold ${change > 0 ? 'text-green-600 dark:text-green-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-500'}`}>
                            {change > 0 ? `+${change}` : change}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{t('noStockData')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Movements Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100 dark:bg-neutral-800">
                  <tr className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">{t('date')}</th>
                    <th className="px-4 py-3 text-left">{t('product')}</th>
                    <th className="px-4 py-3 text-left">{t('vendor')}</th>
                    <th className="px-4 py-3 text-left">{t('type')}</th>
                    <th className="px-4 py-3 text-right">{t('stockIn')}</th>
                    <th className="px-4 py-3 text-right">{t('stockOut')}</th>
                    <th className="px-4 py-3 text-right">{t('opening')}</th>
                    <th className="px-4 py-3 text-right">{t('closing')}</th>
                    <th className="px-4 py-3 text-left">{t('reference')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(movement.date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-neutral-800 dark:text-white">{movement.productName}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{movement.productSku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-lg font-medium">
                          {movement.vendorName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getMovementTypeColor(movement.type)}`}>
                          {movement.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400 font-semibold">
                        {movement.quantityIn > 0 ? `+${movement.quantityIn}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-600 dark:text-red-400 font-semibold">
                        {movement.quantityOut > 0 ? `-${movement.quantityOut}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                        {movement.openingStock}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {movement.closingStock}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-[200px] truncate">
                        {movement.reason || '-'}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{t('noMovements')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default StockReport;
