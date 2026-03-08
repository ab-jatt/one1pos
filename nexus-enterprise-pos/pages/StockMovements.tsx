import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Plus, Search, X, ArrowDown, ArrowUp, Filter, RefreshCw } from 'lucide-react';
import { Api } from '../services/api';

const movementTypeLabels: Record<string, string> = {
  PURCHASE_RECEIVE: 'Purchase Receive',
  SALES_DISPATCH: 'Sales Dispatch',
  PRODUCTION_ISSUE: 'Production Issue',
  PRODUCTION_RECEIVE: 'Production Receive',
  TRANSFER: 'Transfer',
  ADJUSTMENT_IN: 'Adjustment In',
  ADJUSTMENT_OUT: 'Adjustment Out',
  RETURN_IN: 'Return In',
  RETURN_OUT: 'Return Out',
};

const movementTypeColors: Record<string, string> = {
  PURCHASE_RECEIVE: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  SALES_DISPATCH: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  PRODUCTION_ISSUE: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  PRODUCTION_RECEIVE: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  TRANSFER: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20',
  ADJUSTMENT_IN: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20',
  ADJUSTMENT_OUT: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  RETURN_IN: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
  RETURN_OUT: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
};

const isIncoming = (type: string) =>
  ['PURCHASE_RECEIVE', 'PRODUCTION_RECEIVE', 'ADJUSTMENT_IN', 'RETURN_IN', 'TRANSFER'].includes(type);

const StockMovements: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'movements' | 'balances'>('movements');
  const [movements, setMovements] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    warehouseId: '', productId: '', type: 'ADJUSTMENT_IN' as string, quantity: 1, unitCost: 0, reason: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const [movRes, balRes, whRes, prodRes] = await Promise.all([
        Api.warehouseMovements.getAll(params),
        Api.warehouseMovements.getBalances(warehouseFilter ? { warehouseId: warehouseFilter } : {}),
        Api.warehouses.getAll(),
        Api.products.getAll(),
      ]);
      setMovements(movRes.data || movRes);
      setBalances(balRes.data || balRes);
      setWarehouses(whRes);
      setProducts(prodRes);
    } catch (err) {
      console.error('Failed to load stock movement data:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, warehouseFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdjustment = async () => {
    if (!adjustForm.warehouseId || !adjustForm.productId) return alert('Fill required fields');
    try {
      await Api.warehouseMovements.createAdjustment({
        warehouseId: adjustForm.warehouseId,
        productId: adjustForm.productId,
        type: adjustForm.type as any,
        quantity: adjustForm.quantity,
        unitCost: adjustForm.unitCost,
        reason: adjustForm.reason,
      });
      setShowAdjustModal(false);
      setAdjustForm({ warehouseId: '', productId: '', type: 'ADJUSTMENT_IN', quantity: 1, unitCost: 0, reason: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const filteredMovements = movements.filter((m: any) =>
    m.productName?.toLowerCase().includes(search.toLowerCase()) ||
    m.referenceId?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBalances = balances.filter((b: any) =>
    b.productName?.toLowerCase().includes(search.toLowerCase()) ||
    b.warehouseName?.toLowerCase().includes(search.toLowerCase())
  );

  const incomingTotal = movements.filter((m: any) => isIncoming(m.movementType)).reduce((s: number, m: any) => s + (m.quantity || 0), 0);
  const outgoingTotal = movements.filter((m: any) => !isIncoming(m.movementType)).reduce((s: number, m: any) => s + (m.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Stock Movements</h1>
          <p className="text-sm text-neutral-500 mt-1">Track all inventory movements and stock balances</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Adjustment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg"><ArrowLeftRight className="w-5 h-5 text-sky-600" /></div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{movements.length}</p>
              <p className="text-xs text-neutral-500">Total Movements</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><ArrowDown className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{incomingTotal}</p>
              <p className="text-xs text-neutral-500">Total Incoming</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><ArrowUp className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{outgoingTotal}</p>
              <p className="text-xs text-neutral-500">Total Outgoing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
        {(['movements', 'balances'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {tab === 'movements' ? 'Movement History' : 'Stock Balances'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder={activeTab === 'movements' ? 'Search movements...' : 'Search balances...'} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="">All Warehouses</option>
          {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {activeTab === 'movements' && (
          <>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="">All Types</option>
              {Object.entries(movementTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From"
              className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To"
              className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </>
        )}
        {(typeFilter || warehouseFilter || dateFrom || dateTo) && (
          <button onClick={() => { setTypeFilter(''); setWarehouseFilter(''); setDateFrom(''); setDateTo(''); }}
            className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
            <Filter className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : activeTab === 'movements' ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">From</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">To</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((m: any) => (
                  <tr key={m.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-3 text-xs text-neutral-500">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full w-fit ${movementTypeColors[m.movementType] || ''}`}>
                        {isIncoming(m.movementType) ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                        {movementTypeLabels[m.movementType] || m.movementType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.productName}</p>
                      <p className="text-xs text-neutral-500">{m.productSku}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{m.fromWarehouseName || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{m.toWarehouseName || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={isIncoming(m.movementType) ? 'text-emerald-600' : 'text-red-600'}>
                        {isIncoming(m.movementType) ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">${(m.unitCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${(m.totalCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{m.referenceType ? `${m.referenceType}` : '—'}</td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-16 text-neutral-400">
                    <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No movements found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Warehouse</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Product</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Balance</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Total In</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Total Out</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((b: any, i: number) => (
                  <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-medium">{b.warehouseName}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.productName}</p>
                      <p className="text-xs text-neutral-500">{b.productSku}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${b.balance > 0 ? 'text-emerald-600' : b.balance < 0 ? 'text-red-600' : ''}`}>{b.balance}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">+{b.totalIn || 0}</td>
                    <td className="px-4 py-3 text-right text-red-600">-{b.totalOut || 0}</td>
                  </tr>
                ))}
                {filteredBalances.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-16 text-neutral-400">
                    <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No stock balances found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdjustModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Stock Adjustment</h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Type *</label>
                <select value={adjustForm.type} onChange={e => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
                  <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Warehouse *</label>
                <select value={adjustForm.warehouseId} onChange={e => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">Select warehouse...</option>
                  {warehouses.filter((w: any) => w.isActive).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Product *</label>
                <select value={adjustForm.productId} onChange={e => {
                  const prod = products.find((p: any) => p.id === e.target.value);
                  setAdjustForm({ ...adjustForm, productId: e.target.value, unitCost: prod?.costPrice || 0 });
                }}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">Select product...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Quantity *</label>
                  <input type="number" min={1} value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Unit Cost</label>
                  <input type="number" min={0} step={0.01} value={adjustForm.unitCost} onChange={e => setAdjustForm({ ...adjustForm, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Reason</label>
                <textarea value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" rows={2} placeholder="Reason for adjustment..." />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdjustModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleAdjustment}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors ${adjustForm.type === 'ADJUSTMENT_IN' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {adjustForm.type === 'ADJUSTMENT_IN' ? 'Add Stock' : 'Remove Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockMovements;
