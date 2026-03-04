import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, Plus, Search, Edit2, Trash2, MapPin, ArrowRightLeft, Package, X, Eye } from 'lucide-react';
import { Api } from '../services/api';

interface WarehouseData {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  code: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  address?: string;
  locationCount: number;
  locations: Array<{ id: string; name: string; code: string }>;
  createdAt: string;
}

interface StockBalance {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
}

interface TransferData {
  id: string;
  transferNumber: string;
  fromWarehouse: string;
  toWarehouse: string;
  status: string;
  itemCount: number;
  items: Array<{ productId: string; productName: string; quantity: number; unitCost: number }>;
  notes?: string;
  createdBy?: string;
  completedAt?: string;
  createdAt: string;
}

const warehouseTypes = [
  { value: 'RAW_MATERIAL', label: 'Raw Material', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'PRODUCTION', label: 'Production', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'FINISHED_GOODS', label: 'Finished Goods', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'SCRAP', label: 'Scrap', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'GENERAL', label: 'General', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300' },
];

const getTypeStyle = (type: string) => warehouseTypes.find(t => t.value === type) || warehouseTypes[4];

const Warehouses: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'warehouses' | 'transfers'>('warehouses');
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseData | null>(null);
  const [warehouseStock, setWarehouseStock] = useState<StockBalance[]>([]);

  // Form state
  const [form, setForm] = useState({ name: '', code: '', type: 'GENERAL', address: '', isDefault: false });
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    notes: '',
    items: [{ productId: '', quantity: 1 }] as Array<{ productId: string; quantity: number }>,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [whData, prodData] = await Promise.all([
        Api.warehouses.getAll(),
        Api.products.getAll(),
      ]);
      setWarehouses(whData);
      setProducts(prodData);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      const result = await Api.warehouseMovements.getTransfers();
      setTransfers(result.data || []);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'transfers') fetchTransfers();
  }, [activeTab, fetchTransfers]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      alert('Please fill in warehouse name and code');
      return;
    }
    try {
      await Api.warehouses.create(form);
      setShowCreateModal(false);
      setForm({ name: '', code: '', type: 'GENERAL', address: '', isDefault: false });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create warehouse');
    }
  };

  const handleUpdate = async () => {
    if (!editingWarehouse) return;
    try {
      await Api.warehouses.update(editingWarehouse.id, form);
      setEditingWarehouse(null);
      setShowCreateModal(false);
      setForm({ name: '', code: '', type: 'GENERAL', address: '', isDefault: false });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update warehouse');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await Api.warehouses.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete warehouse');
    }
  };

  const handleViewStock = async (wh: WarehouseData) => {
    setSelectedWarehouse(wh);
    try {
      const stock = await Api.warehouses.getStock(wh.id);
      setWarehouseStock(stock);
      setShowStockModal(true);
    } catch (err) {
      console.error('Failed to load stock:', err);
    }
  };

  const handleTransfer = async () => {
    const validItems = transferForm.items.filter(i => i.productId && i.quantity > 0);
    if (!transferForm.fromWarehouseId || !transferForm.toWarehouseId || validItems.length === 0) {
      alert('Please fill all required fields');
      return;
    }
    try {
      await Api.warehouseMovements.transfer({
        branchId: 'main-branch-id',
        ...transferForm,
        items: validItems,
      });
      setShowTransferModal(false);
      setTransferForm({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [{ productId: '', quantity: 1 }] });
      fetchTransfers();
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Transfer failed');
    }
  };

  const openEdit = (wh: WarehouseData) => {
    setEditingWarehouse(wh);
    setForm({ name: wh.name, code: wh.code, type: wh.type, address: wh.address || '', isDefault: wh.isDefault });
    setShowCreateModal(true);
  };

  const filtered = warehouses.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.code.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: warehouses.length,
    active: warehouses.filter(w => w.isActive).length,
    types: new Set(warehouses.map(w => w.type)).size,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Warehouse Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage warehouses, locations, and stock transfers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg"><Warehouse className="w-5 h-5 text-sky-600" /></div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-neutral-500">Total Warehouses</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><Package className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.active}</p>
              <p className="text-xs text-neutral-500">Active Warehouses</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg"><MapPin className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.types}</p>
              <p className="text-xs text-neutral-500">Warehouse Types</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
        {(['warehouses', 'transfers'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {tab === 'warehouses' ? 'Warehouses' : 'Stock Transfers'}
          </button>
        ))}
      </div>

      {activeTab === 'warehouses' && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="text" placeholder="Search warehouses..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <button onClick={() => { setEditingWarehouse(null); setForm({ name: '', code: '', type: 'GENERAL', address: '', isDefault: false }); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Warehouse
            </button>
          </div>

          {/* Warehouses Grid */}
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(wh => {
                const typeStyle = getTypeStyle(wh.type);
                return (
                  <div key={wh.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-900 dark:text-white">{wh.name}</h3>
                          {wh.isDefault && <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded font-medium">DEFAULT</span>}
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">Code: {wh.code}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeStyle.color}`}>{typeStyle.label}</span>
                    </div>
                    {wh.address && <p className="text-xs text-neutral-500 mb-3 flex items-center gap-1"><MapPin className="w-3 h-3" /> {wh.address}</p>}
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
                      <span>{wh.locationCount} locations</span>
                      <span className={`px-1.5 py-0.5 rounded ${wh.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700'}`}>
                        {wh.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <button onClick={() => handleViewStock(wh)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Stock
                      </button>
                      <button onClick={() => openEdit(wh)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(wh.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-20 text-neutral-400">
                  <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No warehouses found</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'transfers' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">{transfers.length} transfers</p>
            <button onClick={() => setShowTransferModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">
              <ArrowRightLeft className="w-4 h-4" /> New Transfer
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Transfer #</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">From</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">To</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-mono text-xs">{t.transferNumber}</td>
                    <td className="px-4 py-3">{t.fromWarehouse}</td>
                    <td className="px-4 py-3">{t.toWarehouse}</td>
                    <td className="px-4 py-3">{t.itemCount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-neutral-400">No transfers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create/Edit Warehouse Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Code *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  {warehouseTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
                Set as default warehouse
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
              <button onClick={editingWarehouse ? handleUpdate : handleCreate} className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">
                {editingWarehouse ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Stock Transfer</h2>
              <button onClick={() => setShowTransferModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">From Warehouse *</label>
                  <select value={transferForm.fromWarehouseId} onChange={e => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="">Select...</option>
                    {warehouses.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">To Warehouse *</label>
                  <select value={transferForm.toWarehouseId} onChange={e => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="">Select...</option>
                    {warehouses.filter(w => w.isActive && w.id !== transferForm.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Items</label>
                {transferForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select value={item.productId} onChange={e => {
                      const items = [...transferForm.items];
                      items[idx].productId = e.target.value;
                      setTransferForm({ ...transferForm, items });
                    }} className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                      <option value="">Select product...</option>
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                    <input type="number" min={1} value={item.quantity} onChange={e => {
                      const items = [...transferForm.items];
                      items[idx].quantity = parseInt(e.target.value) || 1;
                      setTransferForm({ ...transferForm, items });
                    }} className="w-20 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    {transferForm.items.length > 1 && (
                      <button onClick={() => {
                        const items = transferForm.items.filter((_, i) => i !== idx);
                        setTransferForm({ ...transferForm, items });
                      }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setTransferForm({ ...transferForm, items: [...transferForm.items, { productId: '', quantity: 1 }] })}
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium">+ Add Item</button>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
                <textarea value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowTransferModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleTransfer} className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">Execute Transfer</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock View Modal */}
      {showStockModal && selectedWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStockModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedWarehouse.name} — Stock</h2>
                <p className="text-xs text-neutral-500">{getTypeStyle(selectedWarehouse.type).label} warehouse</p>
              </div>
              <button onClick={() => setShowStockModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-3 py-2 font-medium text-neutral-500">Product</th>
                  <th className="text-left px-3 py-2 font-medium text-neutral-500">SKU</th>
                  <th className="text-right px-3 py-2 font-medium text-neutral-500">Qty</th>
                  <th className="text-right px-3 py-2 font-medium text-neutral-500">Unit Cost</th>
                  <th className="text-right px-3 py-2 font-medium text-neutral-500">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {warehouseStock.map((s, i) => (
                  <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50">
                    <td className="px-3 py-2">{s.productName}</td>
                    <td className="px-3 py-2 text-neutral-500 font-mono text-xs">{s.sku}</td>
                    <td className="px-3 py-2 text-right font-medium">{s.quantity}</td>
                    <td className="px-3 py-2 text-right">${s.unitCost.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">${s.totalValue.toFixed(2)}</td>
                  </tr>
                ))}
                {warehouseStock.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-neutral-400">No stock in this warehouse</td></tr>
                )}
              </tbody>
            </table>
            {warehouseStock.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between text-sm font-medium">
                <span>{warehouseStock.length} products</span>
                <span>Total: ${warehouseStock.reduce((s, i) => s + i.totalValue, 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
