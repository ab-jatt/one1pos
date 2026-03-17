import React, { useState, useEffect, useCallback } from 'react';
import { Factory, Plus, Search, X, ArrowDown, ArrowUp, Package, ChevronRight, AlertCircle } from 'lucide-react';
import { Api } from '../services/api';
import { useToast } from '../context/ToastContext';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  MATERIALS_ISSUED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  MATERIALS_ISSUED: 'Materials Issued',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

const Production: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form state
  const [createForm, setCreateForm] = useState({
    productId: '', quantity: 1, notes: '',
    items: [{ productId: '', requiredQty: 1, unitCost: 0 }] as Array<{ productId: string; requiredQty: number; unitCost: number }>,
  });
  const [issueForm, setIssueForm] = useState({ warehouseId: '', items: [] as Array<{ productionOrderItemId: string; quantity: number; maxQty: number; productName: string }> });
  const [receiveForm, setReceiveForm] = useState({ warehouseId: '', quantity: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, prodsRes, whRes] = await Promise.all([
        Api.productionOrders.getAll({ status: statusFilter || undefined }),
        Api.products.getAll(),
        Api.warehouses.getAll(),
      ]);
      setOrders(ordersRes.data || ordersRes);
      setProducts(prodsRes);
      setWarehouses(whRes);
    } catch (err) {
      console.error('Failed to load production data:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!createForm.productId || createForm.quantity < 1) { showWarning('Please fill required fields'); return; }
    try {
      const validItems = createForm.items.filter(i => i.productId && i.requiredQty > 0);
      await Api.productionOrders.create({
        productId: createForm.productId,
        quantity: createForm.quantity,
        notes: createForm.notes,
        items: validItems,
      });
      setShowCreateModal(false);
      setCreateForm({ productId: '', quantity: 1, notes: '', items: [{ productId: '', requiredQty: 1, unitCost: 0 }] });
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to create production order');
    }
  };

  const openIssueModal = (order: any) => {
    setSelectedOrder(order);
    const items = order.items
      .filter((i: any) => i.remaining > 0)
      .map((i: any) => ({
        productionOrderItemId: i.id,
        quantity: i.remaining,
        maxQty: i.remaining,
        productName: i.productName,
      }));
    setIssueForm({ warehouseId: '', items });
    setShowIssueModal(true);
  };

  const handleIssue = async () => {
    if (!selectedOrder || !issueForm.warehouseId) { showWarning('Select a warehouse'); return; }
    const validItems = issueForm.items.filter(i => i.quantity > 0);
    if (validItems.length === 0) { showWarning('No items to issue'); return; }
    try {
      await Api.productionOrders.issueMaterials(selectedOrder.id, {
        warehouseId: issueForm.warehouseId,
        items: validItems.map(i => ({ productionOrderItemId: i.productionOrderItemId, quantity: i.quantity })),
      });
      setShowIssueModal(false);
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Issue failed');
    }
  };

  const openReceiveModal = (order: any) => {
    setSelectedOrder(order);
    setReceiveForm({ warehouseId: '', quantity: order.quantity - order.completedQty });
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!selectedOrder || !receiveForm.warehouseId) { showWarning('Select a warehouse'); return; }
    try {
      await Api.productionOrders.receiveGoods(selectedOrder.id, {
        warehouseId: receiveForm.warehouseId,
        quantity: receiveForm.quantity,
      });
      setShowReceiveModal(false);
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Receive failed');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this production order?')) return;
    try {
      await Api.productionOrders.cancel(id);
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Cancel failed');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await Api.productionOrders.updateStatus(id, status);
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Status update failed');
    }
  };

  const viewDetail = async (order: any) => {
    try {
      const detail = await Api.productionOrders.getById(order.id);
      setSelectedOrder(detail);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Failed to load order details:', err);
    }
  };

  const filtered = orders.filter((o: any) =>
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.productName?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: orders.length,
    inProgress: orders.filter((o: any) => o.status === 'IN_PROGRESS' || o.status === 'MATERIALS_ISSUED').length,
    completed: orders.filter((o: any) => o.status === 'RECEIVED').length,
    totalCost: orders.reduce((s: number, o: any) => s + (o.totalCost || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Production Orders</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage production, material issue & goods receipt</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Production Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, icon: Factory, color: 'sky' },
          { label: 'In Progress', value: stats.inProgress, icon: Package, color: 'amber' },
          { label: 'Completed', value: stats.completed, icon: Package, color: 'emerald' },
          { label: 'Total Cost', value: `$${stats.totalCost.toFixed(2)}`, icon: Package, color: 'violet' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${s.color}-100 dark:bg-${s.color}-900/30 rounded-lg`}><s.icon className={`w-5 h-5 text-${s.color}-600`} /></div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-neutral-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="">All Status</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Order #</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Product</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-500">Qty</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-500">Completed</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Cost</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: any) => (
                  <tr key={order.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{order.productName}</p>
                        <p className="text-xs text-neutral-500">{order.category}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{order.quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={order.completedQty >= order.quantity ? 'text-emerald-600 font-medium' : ''}>
                        {order.completedQty}/{order.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[order.status] || ''}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">${(order.totalCost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewDetail(order)} className="p-1.5 text-neutral-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg" title="View Details">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {(order.status === 'DRAFT' || order.status === 'MATERIALS_ISSUED' || order.status === 'IN_PROGRESS') && (
                          <button onClick={() => openIssueModal(order)} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Issue Materials">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                        )}
                        {order.status !== 'DRAFT' && order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                          <button onClick={() => openReceiveModal(order)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg" title="Receive Goods">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        )}
                        {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                          <button onClick={() => handleCancel(order.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Cancel">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-16 text-neutral-400">
                    <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No production orders found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Production Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Production Order</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Finished Product *</label>
                <select value={createForm.productId} onChange={e => setCreateForm({ ...createForm, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">Select product...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Quantity to Produce *</label>
                <input type="number" min={1} value={createForm.quantity} onChange={e => setCreateForm({ ...createForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 mb-2 block">Bill of Materials (Raw Materials)</label>
                {createForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select value={item.productId} onChange={e => {
                      const items = [...createForm.items];
                      items[idx].productId = e.target.value;
                      const prod = products.find((p: any) => p.id === e.target.value);
                      if (prod) items[idx].unitCost = prod.costPrice || 0;
                      setCreateForm({ ...createForm, items });
                    }} className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                      <option value="">Raw material...</option>
                      {products.filter((p: any) => p.id !== createForm.productId).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min={1} value={item.requiredQty} onChange={e => {
                      const items = [...createForm.items];
                      items[idx].requiredQty = parseInt(e.target.value) || 1;
                      setCreateForm({ ...createForm, items });
                    }} className="w-20 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm" placeholder="Qty" />
                    {createForm.items.length > 1 && (
                      <button onClick={() => setCreateForm({ ...createForm, items: createForm.items.filter((_, i) => i !== idx) })}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setCreateForm({ ...createForm, items: [...createForm.items, { productId: '', requiredQty: 1, unitCost: 0 }] })}
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium">+ Add Material</button>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
                <textarea value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors">Create Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Materials Modal */}
      {showIssueModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowIssueModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Issue Materials</h2>
                <p className="text-xs text-neutral-500">{selectedOrder.orderNumber} — {selectedOrder.productName}</p>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Source Warehouse (Raw Materials) *</label>
                <select value={issueForm.warehouseId} onChange={e => setIssueForm({ ...issueForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">Select warehouse...</option>
                  {warehouses.filter((w: any) => w.isActive).map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-2 block">Materials to Issue</label>
                {issueForm.items.length === 0 && (
                  <div className="flex items-center gap-2 text-amber-600 text-xs p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <AlertCircle className="w-4 h-4" /> All materials have been fully issued
                  </div>
                )}
                {issueForm.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <span className="flex-1 text-sm">{item.productName}</span>
                    <input type="number" min={0} max={item.maxQty} value={item.quantity} onChange={e => {
                      const items = [...issueForm.items];
                      items[idx].quantity = Math.min(parseInt(e.target.value) || 0, item.maxQty);
                      setIssueForm({ ...issueForm, items });
                    }} className="w-20 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-center" />
                    <span className="text-xs text-neutral-400">/ {item.maxQty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowIssueModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleIssue} className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">Issue Materials</button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Goods Modal */}
      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReceiveModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Receive Finished Goods</h2>
                <p className="text-xs text-neutral-500">{selectedOrder.orderNumber} — {selectedOrder.productName}</p>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Destination Warehouse (Finished Goods) *</label>
                <select value={receiveForm.warehouseId} onChange={e => setReceiveForm({ ...receiveForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">Select warehouse...</option>
                  {warehouses.filter((w: any) => w.isActive).map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Quantity to Receive</label>
                <input type="number" min={1} max={selectedOrder.quantity - selectedOrder.completedQty}
                  value={receiveForm.quantity} onChange={e => setReceiveForm({ ...receiveForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <p className="text-xs text-neutral-400 mt-1">Remaining: {selectedOrder.quantity - selectedOrder.completedQty} of {selectedOrder.quantity}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowReceiveModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleReceive} className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">Receive Goods</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedOrder.orderNumber}</h2>
                <p className="text-xs text-neutral-500">Production Order Details</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-xs text-neutral-500">Finished Product</p>
                <p className="font-medium">{selectedOrder.productName}</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-xs text-neutral-500">Status</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[selectedOrder.status] || ''}`}>
                  {statusLabels[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-xs text-neutral-500">Progress</p>
                <p className="font-medium">{selectedOrder.completedQty} / {selectedOrder.quantity}</p>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mt-1">
                  <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${(selectedOrder.completedQty / selectedOrder.quantity) * 100}%` }} />
                </div>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-xs text-neutral-500">Total Cost</p>
                <p className="font-medium text-lg">${(selectedOrder.totalCost || 0).toFixed(2)}</p>
              </div>
            </div>

            <h3 className="font-semibold mb-2">Bill of Materials</h3>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-3 py-2 font-medium text-neutral-500">Material</th>
                  <th className="text-center px-3 py-2 font-medium text-neutral-500">Required</th>
                  <th className="text-center px-3 py-2 font-medium text-neutral-500">Issued</th>
                  <th className="text-center px-3 py-2 font-medium text-neutral-500">Remaining</th>
                  <th className="text-right px-3 py-2 font-medium text-neutral-500">Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item: any) => (
                  <tr key={item.id} className="border-b border-neutral-50 dark:border-neutral-800/50">
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-neutral-500">{item.productSku}</p>
                    </td>
                    <td className="px-3 py-2 text-center">{item.requiredQty}</td>
                    <td className="px-3 py-2 text-center">{item.issuedQty}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={item.remaining <= 0 ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                        {item.remaining}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">${(item.unitCost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {(selectedOrder.status === 'DRAFT' || selectedOrder.status === 'MATERIALS_ISSUED' || selectedOrder.status === 'IN_PROGRESS') && (
                <button onClick={() => { setShowDetailModal(false); openIssueModal(selectedOrder); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Issue Materials
                </button>
              )}
              {selectedOrder.status !== 'DRAFT' && selectedOrder.status !== 'RECEIVED' && selectedOrder.status !== 'CANCELLED' && (
                <button onClick={() => { setShowDetailModal(false); openReceiveModal(selectedOrder); }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Receive Goods
                </button>
              )}
              {selectedOrder.status === 'MATERIALS_ISSUED' && (
                <button onClick={() => { setShowDetailModal(false); handleStatusUpdate(selectedOrder.id, 'IN_PROGRESS'); }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Start Production
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;
