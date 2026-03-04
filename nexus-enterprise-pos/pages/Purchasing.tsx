
import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import { PurchaseOrder, Supplier, Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { ShoppingBag, Plus, Calendar, CheckCircle, Clock, Search, X, Save, Trash2, Printer, FileText, Package, TrendingUp, Filter, Check, XCircle } from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';

interface LineItem {
  id: number;
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
}

const Purchasing: React.FC = () => {
  const { t = (key: string) => key } = useLanguage() || {};
  const { formatMoney = (val: number) => `$${val.toFixed(2)}` } = useCurrency() || {};
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Pending' | 'Received'>('Pending');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: Date.now(), productId: '', productName: '', quantity: 1, cost: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      const poData = await Api.purchasing.getPurchaseOrders();
      const supplierData = await Api.suppliers.getAll();
      const productData = await Api.products.getAll();
      setOrders(poData);
      setSuppliers(supplierData);
      setProducts(productData);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), productId: '', productName: '', quantity: 1, cost: 0 }]);
  };

  const handleRemoveLineItem = (id: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: number, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleProductSelect = (lineItemId: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setLineItems(lineItems.map(item => 
        item.id === lineItemId 
          ? { ...item, productId: product.id, productName: product.name, cost: product.costPrice || 0 } 
          : item
      ));
    }
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  };

  const handleCreatePO = async () => {
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }
    
    // Filter out line items without a product selected
    const validItems = lineItems.filter(item => item.productId);
    if (validItems.length === 0) {
      alert('Please add at least one product');
      return;
    }

    // Build the payload expected by the backend
    const payload = {
      supplierId,
      branchId: 'main-branch-id',
      status,
      items: validItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.cost
      }))
    };

    try {
      const createdPO = await Api.purchasing.createPO(payload);
      setOrders([createdPO, ...orders]);
      setIsCreateModalOpen(false);
      
      // Reset form
      setSupplierId('');
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('Pending');
      setLineItems([{ id: Date.now(), productId: '', productName: '', quantity: 1, cost: 0 }]);
    } catch (error) {
      console.error('Failed to create PO:', error);
      alert('Failed to create purchase order. Please try again.');
    }
  };

  const handlePrintPO = () => {
    window.print();
  };

  const handleUpdateStatus = async (poId: string, newStatus: string) => {
    try {
      const updatedPO = await Api.purchasing.updateStatus(poId, newStatus);
      setOrders(orders.map(po => po.id === poId ? updatedPO : po));
    } catch (error) {
      console.error('Failed to update PO status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const filteredOrders = orders.filter(order => 
    statusFilter === 'All' || order.status === statusFilter
  );

  return (
    <div className="space-y-6 print:hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-enter">
        <div className="relative pl-4 border-l-4 border-sky-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('procurement')} <span className="text-orange-500">{t('operations')}</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono text-sm tracking-wider">
            {t('supplyChainManager')}
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm transition-all group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> <span className="font-bold tracking-wide text-sm">{t('newOrder')}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter" style={{ animationDelay: '100ms' }}>
         <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Clock className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('pendingApproval')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{orders.filter(o => o.status === 'Pending').length}</h3>
               <div className="mt-2 text-xs text-orange-500/80 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div> {t('awaitingAuthorization')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-200 dark:bg-neutral-700"></div>
         </div>

         <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <ShoppingBag className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('totalOrders')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{orders.length}</h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-blue-500" /> {t('procurementVolume')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-200 dark:bg-neutral-700"></div>
         </div>

         <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <CheckCircle className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('received')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{orders.filter(o => o.status === 'Received').length}</h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                   {t('fulfilledOrders')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-200 dark:bg-neutral-700"></div>
         </div>
      </div>

      <Card className="!p-0 overflow-visible print:hidden border-t-4 border-t-sky-500 animate-enter" style={{ animationDelay: '200ms' }}>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between bg-neutral-50 dark:bg-neutral-900/50">
           <div className="relative max-w-md w-full group">
            <div className="relative flex items-center bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700">
               <Search className="absolute left-3 text-neutral-400 w-4 h-4" />
               <input 
              type="text" 
              placeholder="SEARCH PO DATABASE..." 
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border-none focus:ring-0 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 font-mono"
            />
          </div>
          </div>

          {/* Futuristic Filter Dropdown */}
          <Dropdown
            options={[
              { value: 'All', label: t('allStatuses') },
              { value: 'Pending', label: t('pending') },
              { value: 'Received', label: t('received') },
              { value: 'Cancelled', label: t('cancelled') },
            ]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            icon={<Filter className="w-4 h-4" />}
            className="min-w-[160px]"
            size="sm"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800 font-mono">
              <tr>
                <th className="px-6 py-4">{t('poNumber')}</th>
                <th className="px-6 py-4">{t('supplier')}</th>
                <th className="px-6 py-4">{t('date')}</th>
                <th className="px-6 py-4">{t('items')}</th>
                <th className="px-6 py-4">{t('totalValue')}</th>
                <th className="px-6 py-4">{t('status')}</th>
                <th className="px-6 py-4 text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 font-mono">{t('accessingDatabase')}</td></tr>
              ) : filteredOrders.map((po) => (
                <tr key={po.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-500 transition-colors">{po.id}</td>
                  <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">{po.supplier}</td>
                  <td className="px-6 py-4 flex items-center gap-2 font-mono text-xs">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    {new Date(po.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-mono">
                    <div className="flex items-center gap-2">
                        <Package className="w-3 h-3 text-neutral-400" />
                        {po.items} units
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(Number(po.total))}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      po.status === 'Received' ? 'bg-green-100/10 text-green-600 dark:text-green-400 border-green-500/30' :
                      po.status === 'Pending' ? 'bg-orange-100/10 text-orange-600 dark:text-orange-400 border-orange-500/30' :
                      'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-600'
                    }`}>
                      {po.status === 'Pending' && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2 animate-pulse"></div>}
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {po.status === 'Pending' && (
                          <>
                            <button 
                                onClick={() => handleUpdateStatus(po.id, 'Received')}
                                className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Mark as Received"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleUpdateStatus(po.id, 'Cancelled')}
                                className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Cancel PO"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {po.status === 'Received' && (
                          <span className="p-1.5 text-green-500" title="Order Fulfilled">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                        {po.status === 'Cancelled' && (
                          <span className="p-1.5 text-red-400" title="Order Cancelled">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                        <button 
                            onClick={() => setSelectedPO(po)}
                            className="p-1.5 text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title="Print PO"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create PO Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-200 p-4 print:hidden">
          <div className="w-full max-w-2xl rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col relative max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500"></div>
            
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
               <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                 <ShoppingBag className="w-5 h-5 text-orange-500" /> 
                 <span className="uppercase tracking-wide text-sm">{t('newPurchaseOrder')}</span>
               </h3>
               <button onClick={() => setIsCreateModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white dark:bg-neutral-950">
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 dark:text-orange-400/80 mb-1.5 uppercase tracking-wider">{t('selectSupplier')}</label>
                    <Dropdown
                      options={[
                        { value: '', label: t('chooseVendor') },
                        ...suppliers.map(sup => ({ value: String(sup.id), label: sup.name }))
                      ]}
                      value={supplierId}
                      onChange={(val) => setSupplierId(val)}
                      placeholder={t('chooseVendor')}
                      size="md"
                      buttonClassName="rounded-xl py-3"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-orange-400/80 mb-1.5 uppercase tracking-wider">{t('date')}</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all text-neutral-900 dark:text-white font-mono text-sm" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-orange-400/80 mb-1.5 uppercase tracking-wider">{t('status')}</label>
                    <Dropdown
                      options={[
                        { value: 'Pending', label: t('pending') },
                        { value: 'Received', label: t('received') },
                      ]}
                      value={status}
                      onChange={(val) => setStatus(val as any)}
                      size="md"
                      buttonClassName="rounded-xl py-3"
                    />
                 </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                 <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-300">{t('itemsSpecification')}</h4>
                    <button 
                      onClick={handleAddLineItem}
                      className="text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline flex items-center gap-1 uppercase tracking-wider"
                    >
                      <Plus className="w-3 h-3" /> {t('addItem')}
                    </button>
                 </div>
                 
                 <div className="space-y-2">
                    {lineItems.map((item, index) => (
                      <div key={item.id} className="flex gap-2 items-start animate-in fade-in slide-in-from-top-2 duration-200">
                         <div className="flex-1">
                            <Dropdown
                              options={[
                                { value: '', label: t('selectProduct') || 'Select Product' },
                                ...products.map(prod => ({ value: String(prod.id), label: `${prod.sku} - ${prod.name}` }))
                              ]}
                              value={String(item.productId)}
                              onChange={(val) => handleProductSelect(item.id, val)}
                              placeholder={t('selectProduct') || 'Select Product'}
                              size="sm"
                              buttonClassName="rounded-lg"
                            />
                         </div>
                         <div className="w-20">
                            <input 
                              type="number" 
                              placeholder="Qty"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm font-mono text-center text-neutral-900 dark:text-white" 
                            />
                         </div>
                         <div className="w-28 relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-mono">$</div>
                            <input 
                              type="number" 
                              placeholder="Cost"
                              min="0"
                              step="0.01"
                              value={item.cost}
                              onChange={e => updateLineItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm font-mono text-neutral-900 dark:text-white" 
                            />
                         </div>
                         <button 
                           onClick={() => handleRemoveLineItem(item.id)}
                           className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                           disabled={lineItems.length === 1}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    ))}
                 </div>
                 
                 <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-neutral-800 mt-4">
                    <div className="text-right">
                       <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t('totalAmount')}</p>
                       <p className="text-2xl font-bold font-mono text-neutral-800 dark:text-white">{formatMoney(calculateTotal())}</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
               <button 
                 onClick={() => setIsCreateModalOpen(false)}
                 className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleCreatePO}
                 className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm uppercase text-xs tracking-wider"
               >
                 <Save className="w-4 h-4" /> {t('saveOrder')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal - Keeping standard layout for print, but styling the container */}
      {selectedPO && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4 print:p-0 print:bg-white print:fixed print:inset-0">
            <style type="text/css" media="print">
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-po, #printable-po * { visibility: visible; }
                        #printable-po { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
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
                            <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100">{t('printPreview')}</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">{selectedPO.id}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrintPO} className="p-2 hover:bg-white/20 dark:hover:bg-neutral-700 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400">
                            <Printer className="w-5 h-5" />
                        </button>
                        <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-white/20 dark:hover:bg-neutral-700 rounded-lg transition-colors text-neutral-500 dark:text-neutral-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 bg-gray-100 dark:bg-neutral-950 p-8 overflow-y-auto print:bg-white print:p-0 print:overflow-visible">
                    <div id="printable-po" className="bg-white text-neutral-900 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-[20mm] origin-top transform scale-95 sm:scale-100 print:shadow-none print:scale-100 print:mx-0">
                        {/* PO Content for Print */}
                        <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-sky-900">one1pos</h1>
                                <p className="text-gray-500 mt-1">123 Innovation Blvd</p>
                                <p className="text-gray-500">Tech City, TC 90210</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Purchase Order</h2>
                                <p className="text-gray-600 font-mono mt-1">#{selectedPO.id}</p>
                                <div className={`inline-flex items-center px-2 py-0.5 mt-2 rounded-full text-xs font-bold border ${selectedPO.status === 'Received' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                    {selectedPO.status.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vendor</h3>
                                <p className="text-lg font-bold text-gray-800">{selectedPO.supplier}</p>
                                <p className="text-gray-500">Vendor ID: VND-{Math.floor(Math.random() * 1000)}</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date Issued</h3>
                                <p className="text-lg font-bold text-gray-800">{new Date(selectedPO.date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="mb-8">
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="bg-gray-50 border-y border-gray-200">
                                       <th className="py-3 px-4 font-semibold text-gray-700">Item Description</th>
                                       <th className="py-3 px-4 font-semibold text-gray-700 text-right">Quantity</th>
                                       <th className="py-3 px-4 font-semibold text-gray-700 text-right">Unit Cost</th>
                                       <th className="py-3 px-4 font-semibold text-gray-700 text-right">Total</th>
                                   </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-4 px-4 text-gray-800">
                                            <p className="font-medium">Standard Inventory Replenishment</p>
                                            <p className="text-xs text-gray-400 mt-1">Bulk order per agreement</p>
                                        </td>
                                        <td className="py-4 px-4 text-gray-800 text-right">{selectedPO.items}</td>
                                        <td className="py-4 px-4 text-gray-800 text-right">{formatMoney(Number(selectedPO.total) / (selectedPO.items || 1))}</td>
                                        <td className="py-4 px-4 text-gray-800 font-medium text-right">{formatMoney(Number(selectedPO.total))}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="py-4 px-4 text-right font-bold text-gray-700">Subtotal</td>
                                        <td className="py-4 px-4 text-right font-bold text-gray-700">{formatMoney(Number(selectedPO.total))}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="py-2 px-4 text-right text-gray-500">Tax (0%)</td>
                                        <td className="py-2 px-4 text-right text-gray-500">{formatMoney(0)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="py-4 px-4 text-right font-extrabold text-sky-900 text-xl border-t border-gray-200 mt-2">Total</td>
                                        <td className="py-4 px-4 text-right font-extrabold text-sky-900 text-xl border-t border-gray-200 mt-2">{formatMoney(Number(selectedPO.total))}</td>
                                    </tr>
                                </tfoot>
                           </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Purchasing;
