
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Supplier } from '../types';
import { Search, Plus, MapPin, Phone, Mail, Filter, MoreHorizontal, Truck, X, Save, Edit2, Trash2, CreditCard } from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';
import { AccessGate } from '../components/ui/AccessGate';

const Suppliers: React.FC = () => {
  const { t } = useLanguage();
  const { showWarning } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [paymentTermFilter, setPaymentTermFilter] = useState('All');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const data = await Api.suppliers.getAll();
    setSuppliers(data);
  };

  const filteredSuppliers = suppliers.filter(
    (s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTerm = paymentTermFilter === 'All' || s.paymentTerms === paymentTermFilter;
      return matchesSearch && matchesTerm;
    }
  );

  const handleOpenAdd = () => {
    setCurrentSupplier({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        paymentTerms: 'Net 30'
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setCurrentSupplier({ ...supplier });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this supplier?')) {
        await Api.suppliers.delete(id);
        setSuppliers(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSave = async () => {
    if (!currentSupplier.name || !currentSupplier.email) {
        showWarning('Name and Email are required.');
        return;
    }

    if (isEditing && currentSupplier.id) {
        const updated = await Api.suppliers.update(currentSupplier as Supplier);
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
    } else {
        const { id, ...supplierData } = currentSupplier as Supplier;
        const newSupplier = await Api.suppliers.add(supplierData);
        setSuppliers(prev => [newSupplier, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-enter">
        <div className="relative pl-4 border-l-4 border-sky-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('suppliers')} <span className="text-sky-500">{t('loading')}</span>
          </h1>
          <p className="text-neutral-500 mt-1 font-mono text-sm tracking-wider">
            {t('manageSupplierRelationships')}
          </p>
        </div>
        
        <AccessGate requiredPermission="suppliers.manage">
            <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition-all group"
            >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> <span className="font-bold tracking-wide text-sm">{t('addSupplier')}</span>
            </button>
        </AccessGate>
      </div>

      <Card className="!p-0 overflow-hidden border-t-4 border-t-sky-500 animate-enter" style={{ animationDelay: '200ms' }}>
        {/* Toolbar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 font-mono transition-all"
            />
          </div>
          
          <Dropdown
            options={[
              { value: 'All', label: t('allPaymentTerms') },
              { value: 'Net 15', label: t('net15') },
              { value: 'Net 30', label: t('net30') },
              { value: 'Net 60', label: t('net60') },
              { value: 'Due on Receipt', label: t('dueOnReceipt') },
            ]}
            value={paymentTermFilter}
            onChange={(val) => setPaymentTermFilter(val)}
            icon={<CreditCard className="w-4 h-4" />}
            className="min-w-[180px]"
            size="sm"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-100 dark:bg-neutral-950 text-xs uppercase tracking-wider text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800 font-mono">
              <tr>
                <th className="px-6 py-4">{t('supplierName')}</th>
                <th className="px-6 py-4">{t('contactPerson')}</th>
                <th className="px-6 py-4">{t('contactInfo')}</th>
                <th className="px-6 py-4">{t('paymentTerms')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-neutral-800 dark:text-white group-hover:text-blue-500 transition-colors">{supplier.name}</div>
                        <div className="text-xs text-neutral-500 font-mono flex items-center gap-1"><MapPin className="w-3 h-3" /> {supplier.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{supplier.contactPerson}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        <Mail className="w-3 h-3 text-blue-400" /> {supplier.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        <Phone className="w-3 h-3 text-blue-400" /> {supplier.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 uppercase tracking-wide">
                        <CreditCard className="w-3 h-3 mr-1.5" />
                        {supplier.paymentTerms}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AccessGate requiredPermission="suppliers.manage">
                            <button 
                                onClick={() => handleOpenEdit(supplier)}
                                className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Edit Supplier"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDelete(supplier.id)}
                                className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete Supplier"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </AccessGate>
                        <button className="text-neutral-400 hover:text-blue-500 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                           <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                       <div className="flex flex-col items-center">
                          <Search className="w-12 h-12 mb-4 opacity-20" />
                          <p className="font-mono uppercase tracking-widest">{t('noMatchingVendors')}</p>
                       </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-lg rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500"></div>
            
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
               <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                 <Truck className="w-5 h-5 text-blue-500" /> 
                 <span className="uppercase tracking-wide text-sm">{isEditing ? t('editSupplier') : t('addSupplier')}</span>
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-4 bg-white dark:bg-neutral-950 max-h-[70vh] overflow-y-auto">
               <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-blue-400/80 mb-1.5 uppercase tracking-wider">{t('supplierName')}</label>
                  <input 
                    type="text" 
                    value={currentSupplier.name}
                    onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                    placeholder="e.g. Global Logistics Inc."
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                  />
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-blue-400/80 mb-1.5 uppercase tracking-wider">{t('contactPerson')}</label>
                        <input 
                            type="text" 
                            value={currentSupplier.contactPerson}
                            onChange={e => setCurrentSupplier({...currentSupplier, contactPerson: e.target.value})}
                            placeholder="Full Name"
                            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-blue-400/80 mb-1.5 uppercase tracking-wider">{t('paymentTerms')}</label>
                        <Dropdown
                          options={[
                            { value: t('net15'), label: t('net15') },
                            { value: t('net30'), label: t('net30') },
                            { value: t('net60'), label: t('net60') },
                            { value: t('dueOnReceipt'), label: t('dueOnReceipt') },
                          ]}
                          value={currentSupplier.paymentTerms}
                          onChange={(val) => setCurrentSupplier({...currentSupplier, paymentTerms: val})}
                          size="md"
                          buttonClassName="rounded-xl py-3"
                        />
                    </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-blue-400/80 mb-1.5 uppercase tracking-wider">{t('emailAddress')}</label>
                        <input 
                            type="email" 
                            value={currentSupplier.email}
                            onChange={e => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                            placeholder="vendor@example.com"
                            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-blue-400/80 mb-1.5 uppercase tracking-wider">{t('phoneNumber')}</label>
                        <input 
                            type="tel" 
                            value={currentSupplier.phone}
                            onChange={e => setCurrentSupplier({...currentSupplier, phone: e.target.value})}
                            placeholder="(555) 000-0000"
                            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                        />
                    </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-blue-400/80 mb-1.5 uppercase tracking-wider">{t('physicalAddress')}</label>
                  <input 
                    type="text" 
                    value={currentSupplier.address}
                    onChange={e => setCurrentSupplier({...currentSupplier, address: e.target.value})}
                    placeholder="123 Supply Chain Rd, City, State"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                  />
               </div>
            </div>

            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSave}
                 className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm uppercase text-xs tracking-wider"
               >
                 <Save className="w-4 h-4" /> {t('save')}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
