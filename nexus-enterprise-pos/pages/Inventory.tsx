
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { AccessGate } from '../components/ui/AccessGate';
import { Api, Category } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { Package, Search, Filter, Download, Plus, X, Image as ImageIcon, Save, Trash2, Edit2, RefreshCw, AlertTriangle, TrendingUp, DollarSign, Box, Loader2, Calendar, Upload } from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';
import { Product, Role } from '../types';

const Inventory: React.FC = () => {
  const { t = (key: string) => key } = useLanguage() || {};
  const { formatMoney = (val: number) => `$${val.toFixed(2)}` } = useCurrency() || {};
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'Out'>('All');

  // Add Product State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product> & { categoryId?: string }>({
    name: '',
    category: 'Latif',
    price: 0,
    costPrice: 0,
    stock: 0,
    sku: '',
    productCode: '',
    barcode: '',
    image: 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000)
  });

  // Edit Product State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(Product & { categoryId?: string }) | null>(null);

  // Add Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Stock Ledger State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Image upload state & refs
  const [isUploadingAddImage, setIsUploadingAddImage] = useState(false);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [ledgerStartDate, setLedgerStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [ledgerEndDate, setLedgerEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch products and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          Api.products.getAll(),
          Api.categories.getAll(),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get category names for filter dropdown
  const categoryNames = ['All', ...categories.map(c => c.name)];

  const filteredProducts = products.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku?.toLowerCase() || '').includes(q) ||
      (p.productCode?.toLowerCase() || '').includes(q) ||
      (p.barcode?.toLowerCase() || '').includes(q);
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === 'Low') matchesStock = p.stock > 0 && p.stock < 20;
    if (stockFilter === 'Out') matchesStock = p.stock === 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Stats Calculation - ensure numbers are properly converted
  const totalValue = products.reduce((acc, p) => acc + (Number(p.price) * Number(p.stock)), 0);
  const lowStockCount = products.filter(p => Number(p.stock) < 20).length;
  const totalItems = products.reduce((acc, p) => acc + Number(p.stock), 0);

  const handleDelete = async (id: string) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await Api.products.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(t('deleteFailure'));
      }
    }
  };

  const handleViewLedger = async (product: Product) => {
    setSelectedProduct(product);
    setIsLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const data = await Api.stockLedger.getLedger(product.id, ledgerStartDate, ledgerEndDate);
      setLedgerData(data);
    } catch (error) {
      console.error('Error fetching stock ledger:', error);
      alert('Failed to load stock ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const refreshLedger = async () => {
    if (!selectedProduct) return;
    setLedgerLoading(true);
    try {
      const data = await Api.stockLedger.getLedger(selectedProduct.id, ledgerStartDate, ledgerEndDate);
      setLedgerData(data);
    } catch (error) {
      console.error('Error refreshing ledger:', error);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleExportXML = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `inventory_export_${timestamp}.xml`;

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<inventory>\n';
    xmlContent += `  <metadata>\n    <exportDate>${new Date().toISOString()}</exportDate>\n    <totalItems>${filteredProducts.length}</totalItems>\n  </metadata>\n`;
    xmlContent += '  <items>\n';

    filteredProducts.forEach(product => {
      xmlContent += '    <item>\n';
      xmlContent += `      <id>${product.id}</id>\n`;
      xmlContent += `      <name>${product.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</name>\n`;
      xmlContent += `      <sku>${product.sku}</sku>\n`;
      xmlContent += `      <category>${product.category}</category>\n`;
      xmlContent += `      <price>${product.price}</price>\n`;
      xmlContent += `      <costPrice>${product.costPrice}</costPrice>\n`;
      xmlContent += `      <stock>${product.stock}</stock>\n`;
      xmlContent += '    </item>\n';
    });

    xmlContent += '  </items>\n';
    xmlContent += '</inventory>';

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.sku) {
      alert('Please fill in required fields');
      return;
    }

    try {
      // Find category ID from name
      const category = categories.find(c => c.name === newProduct.category);
      
      const productData = {
        name: newProduct.name!,
        sku: newProduct.sku!,
        ...(newProduct.productCode?.trim() && { productCode: newProduct.productCode.trim() }),
        ...(newProduct.barcode?.trim() && { barcode: newProduct.barcode.trim() }),
        price: Number(newProduct.price),
        costPrice: Number(newProduct.costPrice) || 0,
        categoryId: category?.id || categories[0]?.id,
        image: newProduct.image || `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
        stock: Number(newProduct.stock) || 0,
      };

      const createdProduct = await Api.products.create(productData);
      setProducts(prev => [createdProduct, ...prev]);
      setIsAddModalOpen(false);
      setNewProduct({
        name: '',
        category: categories[0]?.name || 'Food',
        price: 0,
        costPrice: 0,
        stock: 0,
        sku: '',
        productCode: '',
        barcode: '',
        image: 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000)
      });
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    }
  };

  const handleEditClick = (product: Product) => {
    // Find category ID from name
    const category = categories.find(c => c.name === product.category);
    setEditingProduct({ ...product, categoryId: category?.id });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    if (!editingProduct.name || !editingProduct.price || !editingProduct.sku) {
       alert('Please fill in required fields');
       return;
    }

    try {
      // Find category ID from name if category was changed
      const category = categories.find(c => c.name === editingProduct.category);
      
      const updateData = {
        name: editingProduct.name,
        sku: editingProduct.sku,
        productCode: editingProduct.productCode?.trim() || undefined,
        barcode: editingProduct.barcode?.trim() || undefined,
        price: Number(editingProduct.price),
        costPrice: Number(editingProduct.costPrice),
        categoryId: category?.id || editingProduct.categoryId,
        image: editingProduct.image,
        stock: Number(editingProduct.stock),
      };

      const updatedProduct = await Api.products.update(editingProduct.id, updateData);
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    }
  };

  const handleImageUpload = async (
    file: File,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void,
  ) => {
    setUploading(true);
    try {
      const url = await Api.products.uploadImage(file);
      setUrl(url);
    } catch {
      alert('Failed to upload image. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    // Check for duplicate category names
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      alert('A category with this name already exists');
      return;
    }

    try {
      setIsCreatingCategory(true);
      const createdCategory = await Api.categories.create(newCategoryName.trim());
      setCategories(prev => [...prev, createdCategory]);
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Helper to calculate profit margin percentage
  const calculateMargin = (price: number, cost: number) => {
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-7rem)] gap-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="relative pl-4 border-l-4 border-sky-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('inventory')} <span className="text-sky-500">{t('inventoryOverview')}</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono text-sm tracking-wider">
            {t('manageStockLevels')}
          </p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={handleExportXML}
             className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg hover:border-neutral-300 dark:hover:border-neutral-600 transition-all group shadow-sm"
           >
             <Download className="w-4 h-4 group-hover:text-sky-500 transition-colors" /> <span className="hidden sm:inline text-sm font-medium">{t('export')}</span>
           </button>
           
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md transition-all group"
           >
             <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> <span className="font-bold tracking-wide text-sm">{t('add')}</span>
           </button>
        </div>
      </div>

      {/* Command Center Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Box className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('products')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{products.length} <span className="text-sm font-normal text-neutral-400">{t('items')}</span></h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Box className="w-3 h-3" /> {totalItems} {t('stock')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-500"></div>
         </div>

         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <AlertTriangle className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('attentionRequired')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{lowStockCount} <span className="text-sm font-normal text-neutral-400">{t('alerts')}</span></h3>
               <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {t('lowStockThreshold')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>
         </div>

         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <DollarSign className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('inventoryValuation')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{formatMoney(totalValue)}</h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" /> {t('potentialRevenue')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-neutral-900 dark:bg-white"></div>
         </div>
      </div>

      <Card className="!p-0 overflow-hidden border-t-4 border-t-sky-500">
        {/* Futuristic Toolbar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col xl:flex-row gap-4 justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="relative max-w-md w-full">
            <div className="relative flex items-center bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700">
               <Search className="absolute left-3 text-neutral-400 w-4 h-4" />
               <input 
                 type="text" 
                 placeholder={t('search')}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border-none focus:ring-0 focus:outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 font-mono"
               />
            </div>
          </div>
          
          <div className="flex gap-3 items-center flex-wrap">
             {/* Category Filter */}
             <Dropdown
               options={categoryNames.map(cat => ({ value: cat, label: cat }))}
               value={categoryFilter}
               onChange={(val) => setCategoryFilter(val)}
               icon={<Filter className="w-4 h-4" />}
               className="min-w-[160px]"
               size="sm"
             />

             {/* Add Category Button */}
             <button
               onClick={() => setIsCategoryModalOpen(true)}
               className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-200"
             >
               <Plus className="w-3.5 h-3.5" /> Category
             </button>

             {/* Stock Filter */}
             <Dropdown
               options={[
                 { value: 'All', label: t('allStockLevels') },
                 { value: 'Low', label: t('lowStockAlerts') },
                 { value: 'Out', label: t('outOfStock') },
               ]}
               value={stockFilter}
               onChange={(val) => setStockFilter(val as any)}
               icon={<AlertTriangle className="w-4 h-4" />}
               className="min-w-[160px]"
               size="sm"
             />
          </div>
        </div>

        {/* Tactical Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-100 dark:bg-neutral-950 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800 font-mono">
              <tr>
                <th className="px-6 py-4">{t('productName')}</th>
                <th className="px-6 py-4">{t('category')}</th>
                <th className="px-6 py-4 text-right">{t('costPrice')}</th>
                <th className="px-6 py-4 text-right">{t('price')}</th>
                <th className="px-6 py-4 text-center">{t('stockLevel')}</th>
                <th className="px-6 py-4">{t('stock')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-neutral-200 dark:bg-neutral-800 overflow-hidden border border-neutral-300 dark:border-neutral-700 relative group-hover:border-sky-500/50 transition-colors">
                        <img src={product.image} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.sku}/200/200`; }} />
                      </div>
                      <div>
                        <div className="font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{product.name}</div>
                        <div className="text-xs text-neutral-500 font-mono flex items-center gap-2">
                           <span className="opacity-50">SKU:</span> 
                           <span className="text-neutral-600 dark:text-neutral-400">{product.sku}</span>
                           {product.productCode && (
                             <><span className="opacity-50 ml-1">·</span> <span className="text-sky-600 dark:text-sky-400">{product.productCode}</span></>
                           )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-neutral-500 dark:text-neutral-400">{formatMoney(Number(product.costPrice))}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-neutral-800 dark:text-white">{formatMoney(Number(product.price))}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${calculateMargin(Number(product.price), Number(product.costPrice)) > 50 ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'}`}>
                      {calculateMargin(Number(product.price), Number(product.costPrice)).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 w-48">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                         <span>{product.stock} units</span>
                         <span className={product.stock < 20 ? 'text-red-500 font-bold' : 'text-green-500'}>{product.stock < 20 ? 'CRITICAL' : 'OPTIMAL'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 relative ${product.stock < 20 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-sky-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`} 
                          style={{ width: `${Math.min(100, (product.stock / 150) * 100)}%` }}
                        >
                           <div className="absolute inset-0 bg-white/30 w-full animate-[shine_2s_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleViewLedger(product)}
                        className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View Stock Ledger"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => handleEditClick(product)}
                        className="p-2 text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      {/* Only Users with granular 'inventory.delete' permission can delete */}
                      <AccessGate requiredPermission="inventory.delete" fallback={
                          <span className="p-2 text-neutral-200 dark:text-neutral-800 cursor-not-allowed" title={t('accessDenied')}>
                              <Trash2 className="w-4 h-4" />
                          </span>
                      }>
                        <button 
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Item"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </AccessGate>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-neutral-400 dark:text-neutral-600">
                    <div className="flex flex-col items-center">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-mono uppercase tracking-widest">No matching records found in database.</p>
                        <button 
                            onClick={() => {setSearchTerm(''); setCategoryFilter('All'); setStockFilter('All');}}
                            className="mt-4 text-sky-500 hover:underline text-xs"
                        >
                            Reset Filters
                        </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Futuristic Pagination */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center text-xs font-mono text-neutral-500 dark:text-neutral-400">
          <span>DISPLAYING {filteredProducts.length} RECORDS</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 hover:border-sky-500 hover:text-sky-500 transition-colors disabled:opacity-50 uppercase font-bold" disabled>Prev</button>
            <button className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 hover:border-sky-500 hover:text-sky-500 transition-colors uppercase font-bold">Next</button>
          </div>
        </div>
      </Card>

      {/* Holographic Modal for Add Product */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-lg rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 flex flex-col relative bg-white dark:bg-neutral-900">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500"></div>
            
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
               <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                 <Package className="w-5 h-5 text-sky-500" /> 
                 <span className="uppercase tracking-wide text-sm">{t('addProduct')}</span>
               </h3>
               <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-5 bg-white dark:bg-neutral-950 max-h-[70vh] overflow-y-auto">
              {/* Image Upload Area */}
              <div className="flex justify-center mb-4">
                 <div className="flex flex-col items-center gap-2">
                   <div
                     className="w-32 h-32 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:border-sky-500 transition-colors bg-neutral-50 dark:bg-neutral-900"
                     onClick={() => addImageInputRef.current?.click()}
                   >
                     {isUploadingAddImage ? (
                       <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                     ) : newProduct.image ? (
                       <img src={newProduct.image} className="w-full h-full object-cover" alt="Preview" onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/product/200/200'; }} />
                     ) : (
                       <ImageIcon className="w-8 h-8 text-neutral-400 group-hover:text-sky-500 transition-colors" />
                     )}
                   </div>
                   <div className="flex gap-2">
                     <button
                       type="button"
                       disabled={isUploadingAddImage}
                       onClick={() => addImageInputRef.current?.click()}
                       className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg transition-colors font-bold"
                     >
                       {isUploadingAddImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                       Upload
                     </button>
                     <button
                       type="button"
                       disabled={isUploadingAddImage}
                       className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                       onClick={() => setNewProduct({...newProduct, image: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`})}
                     >
                       <RefreshCw className="w-3 h-3" /> Random
                     </button>
                   </div>
                   <input
                     ref={addImageInputRef}
                     type="file"
                     accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                     className="hidden"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) handleImageUpload(file, (url) => setNewProduct({...newProduct, image: url}), setIsUploadingAddImage);
                       e.target.value = '';
                     }}
                   />
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('productName')}</label>
                  <input 
                    type="text" 
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="e.g. Quantum Processor Unit"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400" 
                  />
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('category')}</label>
                   <Dropdown
                     options={categories.map(c => ({ value: c.name, label: c.name }))}
                     value={newProduct.category}
                     onChange={(val) => setNewProduct({...newProduct, category: val})}
                     placeholder={t('category')}
                     size="md"
                     buttonClassName="rounded-xl py-3"
                   />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('sku')}</label>
                  <input 
                    type="text" 
                    value={newProduct.sku}
                    onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                    placeholder="e.g. QPU-001"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-sm text-neutral-900 dark:text-white" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Product Code <span className="font-normal lowercase text-neutral-400">(auto if blank)</span></label>
                  <input 
                    type="text" 
                    value={newProduct.productCode}
                    onChange={e => setNewProduct({...newProduct, productCode: e.target.value})}
                    placeholder="e.g. PRD-000001"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-sm text-neutral-900 dark:text-white" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Barcode <span className="font-normal lowercase text-neutral-400">(optional)</span></label>
                  <input 
                    type="text" 
                    value={newProduct.barcode}
                    onChange={e => setNewProduct({...newProduct, barcode: e.target.value})}
                    placeholder="e.g. 4006381333931"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-sm text-neutral-900 dark:text-white" 
                  />
                </div>

                <div>
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('price')}</label>
                   <input 
                     type="number" 
                     value={newProduct.price}
                     onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                     className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-neutral-900 dark:text-white" 
                   />
                </div>

                 <div>
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Cost Price ($)</label>
                   <input 
                     type="number" 
                     value={newProduct.costPrice}
                     onChange={e => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value)})}
                     className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-neutral-900 dark:text-white" 
                   />
                </div>

                <div>
                  <div className="text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Margin %</div>
                  <div className={`w-full px-4 py-3 rounded-xl font-mono text-sm font-bold text-center border ${
                    calculateMargin(Number(newProduct.price), Number(newProduct.costPrice)) > 0
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                  }`}>
                    {calculateMargin(Number(newProduct.price), Number(newProduct.costPrice)).toFixed(1)}%
                  </div>
                </div>

                <div className="col-span-2">
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Initial Stock</label>
                   <div className="flex items-center gap-4">
                        <input 
                            type="range" 
                            min="0" 
                            max="500" 
                            value={newProduct.stock} 
                            onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                            className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                        <input 
                            type="number" 
                            value={newProduct.stock}
                            onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                            className="w-24 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center font-mono font-bold" 
                        />
                   </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Image URL</label>
                    <input 
                    type="text" 
                    value={newProduct.image}
                    onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-xs text-neutral-500 font-mono" 
                    />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
               <button 
                 onClick={() => setIsAddModalOpen(false)}
                 className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
               >
                 {t('cancel')}
               </button>
               <button 
                 onClick={handleAddProduct}
                 className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm uppercase text-xs tracking-wider"
               >
                 <Save className="w-4 h-4" /> {t('save')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal (Similar Styling) */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-lg rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 flex flex-col relative bg-white dark:bg-neutral-900">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500"></div>
            
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
               <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                 <Edit2 className="w-5 h-5 text-sky-500" /> 
                 <span className="uppercase tracking-wide text-sm">{t('editProduct')}</span>
               </h3>
               <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-4 bg-white dark:bg-neutral-950 max-h-[70vh] overflow-y-auto">
              {/* Image Upload Area */}
              <div className="flex justify-center mb-2">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-28 h-28 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-sky-500 transition-colors bg-neutral-50 dark:bg-neutral-900"
                    onClick={() => editImageInputRef.current?.click()}
                  >
                    {isUploadingEditImage ? (
                      <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                    ) : editingProduct?.image ? (
                      <img src={editingProduct.image} className="w-full h-full object-cover" alt="Preview" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${editingProduct.sku}/200/200`; }} />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-neutral-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isUploadingEditImage}
                    onClick={() => editImageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg transition-colors font-bold"
                  >
                    {isUploadingEditImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Upload Image
                  </button>
                  <input
                    ref={editImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && editingProduct)
                        handleImageUpload(file, (url) => setEditingProduct({...editingProduct, image: url}), setIsUploadingEditImage);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
              {/* Similar fields to Add Modal but binding to editingProduct */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Product Name</label>
                  <input 
                    type="text" 
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-neutral-900 dark:text-white" 
                  />
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Category</label>
                   <Dropdown
                     options={categories.map(c => ({ value: c.name, label: c.name }))}
                     value={editingProduct.category}
                     onChange={(val) => setEditingProduct({...editingProduct, category: val})}
                     placeholder="Category"
                     size="md"
                     buttonClassName="rounded-xl py-3"
                   />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">SKU</label>
                  <input 
                    type="text" 
                    value={editingProduct.sku}
                    onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-sm text-neutral-900 dark:text-white" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Product Code</label>
                  <input 
                    type="text" 
                    value={editingProduct.productCode || ''}
                    onChange={e => setEditingProduct({...editingProduct, productCode: e.target.value})}
                    placeholder="e.g. PRD-000001"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-sm text-neutral-900 dark:text-white" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Barcode <span className="font-normal lowercase text-neutral-400">(optional)</span></label>
                  <input 
                    type="text" 
                    value={editingProduct.barcode || ''}
                    onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})}
                    placeholder="e.g. 4006381333931"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-sm text-neutral-900 dark:text-white" 
                  />
                </div>

                <div>
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Sale Price ($)</label>
                   <input 
                     type="number" 
                     value={editingProduct.price}
                     onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                     className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-neutral-900 dark:text-white" 
                   />
                </div>

                 <div>
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Cost Price ($)</label>
                   <input 
                     type="number" 
                     value={editingProduct.costPrice}
                     onChange={e => setEditingProduct({...editingProduct, costPrice: parseFloat(e.target.value) || 0})}
                     className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-neutral-900 dark:text-white" 
                   />
                </div>

                <div>
                  <div className="text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Margin %</div>
                  <div className={`w-full px-4 py-3 rounded-xl font-mono text-sm font-bold text-center border ${
                    calculateMargin(Number(editingProduct.price), Number(editingProduct.costPrice)) > 0
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                  }`}>
                    {calculateMargin(Number(editingProduct.price), Number(editingProduct.costPrice)).toFixed(1)}%
                  </div>
                </div>

                <div className="col-span-2">
                   <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">Stock Qty</label>
                   <div className="flex items-center gap-4">
                        <input 
                            type="range" 
                            min="0" 
                            max="500" 
                            value={editingProduct.stock} 
                            onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})}
                            className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                        <input 
                            type="number" 
                            value={editingProduct.stock}
                            onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})}
                            className="w-24 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center font-mono font-bold" 
                        />
                   </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
               <button 
                 onClick={() => setIsEditModalOpen(false)}
                 className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSaveEdit}
                 className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm uppercase text-xs tracking-wider"
               >
                 <Save className="w-4 h-4" /> {t('save')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full shadow-xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-white">{t('category')}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{t('loading')}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Electronics, Clothing, Food..."
                  className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreatingCategory) {
                      handleCreateCategory();
                    }
                  }}
                />
              </div>

              {/* Existing Categories Preview */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                    Existing Categories ({categories.length})
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-700/50">
                    {categories.map(cat => (
                      <span 
                        key={cat.id} 
                        className="px-2.5 py-1 bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-600"
                      >
                        {cat.name}
                        {cat._count?.products !== undefined && (
                          <span className="ml-1.5 text-neutral-400 dark:text-neutral-500">({cat._count.products})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/50 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
                className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm uppercase text-xs tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingCategory ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Create Category
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Ledger Modal */}
      {isLedgerModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-1">Stock Ledger</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedProduct.name} (SKU: {selectedProduct.sku})
                  </p>
                </div>
                <button 
                  onClick={() => setIsLedgerModalOpen(false)} 
                  className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Date Filters */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">From:</label>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                    className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">To:</label>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                    className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white text-sm"
                  />
                </div>
                <button
                  onClick={refreshLedger}
                  disabled={ledgerLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${ledgerLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setLedgerStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                    setLedgerEndDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="text-sm text-sky-600 dark:text-sky-400 hover:underline font-medium"
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Stock Summary */}
            {ledgerData && (
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase">Opening Stock</div>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-white">{ledgerData.openingStock}</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">Stock In</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      +{ledgerData.movements.reduce((sum: number, m: any) => sum + m.quantityIn, 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Stock Out</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      -{ledgerData.movements.reduce((sum: number, m: any) => sum + m.quantityOut, 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Closing Stock</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ledgerData.closingStock}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Ledger Table */}
            <div className="flex-1 overflow-auto">
              {ledgerLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">Loading ledger...</p>
                  </div>
                </div>
              ) : ledgerData && ledgerData.movements.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 sticky top-0">
                    <tr className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-right">Stock In</th>
                      <th className="px-4 py-3 text-right">Stock Out</th>
                      <th className="px-4 py-3 text-right">Opening</th>
                      <th className="px-4 py-3 text-right">Closing</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {ledgerData.movements.map((movement: any) => (
                      <tr key={movement.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-800 dark:text-neutral-200">
                          {new Date(movement.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            movement.type === 'SALE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            movement.type === 'RESTOCK' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            movement.type === 'RETURN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                          }`}>
                            {movement.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                          {movement.quantityIn > 0 ? `+${movement.quantityIn}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-semibold">
                          {movement.quantityOut > 0 ? `-${movement.quantityOut}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400 font-mono">
                          {movement.openingStock}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-mono font-bold">
                          {movement.closingStock}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                          {movement.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">No stock movements found for this period</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end">
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="px-6 py-2.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-white font-bold rounded-lg transition-colors uppercase text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
