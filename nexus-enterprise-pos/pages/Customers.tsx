
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { Search, Plus, Mail, Phone, Star, Filter, X, Save, User, Users, Trophy, TrendingUp, Zap, Gift, Calculator, Wallet, ArrowUpRight, ArrowDownRight, Loader2, FileText, Calendar } from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';
import { Customer } from '../types';

interface LedgerEntry {
  date: string;
  type: string;
  invoiceId: string | null;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

const Customers: React.FC = () => {
  const { t = (key: string) => key } = useLanguage() || {};
  const { formatMoney = (val: number) => `$${val.toFixed(2)}` } = useCurrency() || {};
  const { showSuccess, showError, showWarning } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Customer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Loyalty Modal State
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointsAdjustment, setPointsAdjustment] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState('Manual Adjustment');
  const [purchaseValue, setPurchaseValue] = useState<string>('');
  
  // Balance (Credit/Debit) Modal State
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceTransactionType, setBalanceTransactionType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [balanceNote, setBalanceNote] = useState('');

  // Credit Activity (Ledger) Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState<{
    entries: LedgerEntry[];
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
  } | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerStartDate, setLedgerStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [ledgerEndDate, setLedgerEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [tierFilter, setTierFilter] = useState('All');

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const data = await Api.customers.getAll();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const getTier = (points: number) => {
    if (points > 200) return 'Platinum';
    if (points > 100) return 'Gold';
    return 'Silver';
  };

  const filteredCustomers = customers.filter(
    (c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (c.phone || '').includes(searchTerm);
      const matchesTier = tierFilter === 'All' || getTier(c.points) === tierFilter;
      return matchesSearch && matchesTier;
    }
  );

  // Stats
  const totalPoints = customers.reduce((acc, c) => acc + c.points, 0);
  const activeCustomers = customers.length; 
  const newThisMonth = 12; 

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      showWarning('Name is required');
      return;
    }

    try {
      const createdCustomer = await Api.customers.create({
        name: newCustomer.name,
        email: newCustomer.email || undefined,
        phone: newCustomer.phone || undefined,
      });
      setCustomers(prev => [createdCustomer, ...prev]);
      setIsAddModalOpen(false);
      setNewCustomer({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Error creating customer:', error);
      showError('Failed to create customer');
    }
  };

  const openPointsModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPointsAdjustment('');
    setPurchaseValue('');
    setAdjustmentReason('Purchase Reward');
    setIsPointsModalOpen(true);
  };

  const openBalanceModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setBalanceAmount('');
    setBalanceNote('');
    setBalanceTransactionType('CREDIT'); // Default to adding funds
    setIsBalanceModalOpen(true);
  };

  const openLedgerModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsLedgerModalOpen(true);
    await fetchLedger(customer.id, ledgerStartDate, ledgerEndDate);
  };

  const fetchLedger = async (customerId: number | string, startDate: string, endDate: string) => {
    setLedgerLoading(true);
    try {
      const data = await Api.customers.getLedger(customerId, startDate, endDate);
      setLedgerData(data);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      showError('Failed to fetch credit activity');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleLedgerDateChange = async (start: string, end: string) => {
    setLedgerStartDate(start);
    setLedgerEndDate(end);
    if (selectedCustomer) {
      await fetchLedger(selectedCustomer.id, start, end);
    }
  };

  const handleCalculatePoints = () => {
      const value = parseFloat(purchaseValue);
      if(!isNaN(value)) {
          // 1 Point per $1 spent
          setPointsAdjustment(Math.floor(value).toString());
      }
  };

  const handleSavePoints = async () => {
      if (!selectedCustomer || !pointsAdjustment) return;
      
      const points = parseInt(pointsAdjustment);
      if (isNaN(points)) return;

      try {
        const updatedCustomer = await Api.customers.adjustPoints(
          selectedCustomer.id, 
          points, 
          adjustmentReason
        );
        setCustomers(prev => prev.map(c => 
          c.id === selectedCustomer.id ? updatedCustomer : c
        ));
        setIsPointsModalOpen(false);
        setSelectedCustomer(null);
      } catch (error) {
        console.error('Error adjusting points:', error);
        showError('Failed to adjust points');
      }
  };

  const handleBalanceAdjustment = async () => {
      if (!selectedCustomer || !balanceAmount) return;

      const amount = parseFloat(balanceAmount);
      if (isNaN(amount) || amount <= 0) return;

      try {
        const updatedCustomer = await Api.customers.adjustBalance(
          selectedCustomer.id,
          amount,
          balanceTransactionType,
          balanceNote
        );
        setCustomers(prev => prev.map(c => 
          c.id === selectedCustomer.id ? updatedCustomer : c
        ));
        setIsBalanceModalOpen(false);
        setSelectedCustomer(null);
      } catch (error) {
        console.error('Error adjusting balance:', error);
        showError('Failed to adjust balance');
      }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="relative pl-4 border-l-4 border-sky-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('customers')} <span className="text-sky-500">{t('loading')}</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono text-sm tracking-wider">
            {t('manageCustomerRelationships')}
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-md transition-all group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> <span className="font-bold tracking-wide text-sm">{t('addCustomer')}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Users className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('customers')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{customers.length}</h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" /> +{newThisMonth} {t('thisMonth')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-500"></div>
         </div>

         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Trophy className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('loyaltyPoints')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{totalPoints.toLocaleString()}</h3>
               <div className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                  <Star className="w-3 h-3" /> {t('totalCirculation')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
         </div>

         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Zap className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('activeStatus')}</p>
               <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">98.2%</h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {t('systemOperational')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500"></div>
         </div>
      </div>

      <Card className="!p-0 overflow-hidden border-t-4 border-t-sky-500">
        {/* Toolbar */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between bg-neutral-50 dark:bg-neutral-900">
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
          
          <Dropdown
            options={[
              { value: 'All', label: t('allLoyaltyTiers') },
              { value: 'Platinum', label: t('platinum') },
              { value: 'Gold', label: t('gold') },
              { value: 'Silver', label: t('silver') },
            ]}
            value={tierFilter}
            onChange={(val) => setTierFilter(val)}
            icon={<Trophy className="w-4 h-4" />}
            className="min-w-[160px]"
            size="sm"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-100 dark:bg-neutral-950 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800 font-mono">
              <tr>
                <th className="px-6 py-4">{t('customerName')}</th>
                <th className="px-6 py-4">{t('contact')}</th>
                <th className="px-6 py-4">{t('loyaltyPoints')}</th>
                <th className="px-6 py-4">{t('balance')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold text-sm group-hover:scale-105 transition-transform">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-800 dark:text-white group-hover:text-sky-500 transition-colors">{customer.name}</div>
                        <div className="text-xs text-neutral-500 font-mono">ID: {customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        <Mail className="w-3 h-3 text-sky-400" /> {customer.email || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        <Phone className="w-3 h-3 text-sky-400" /> {customer.phone || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/30">
                          <Trophy className="w-3 h-3" />
                          <span className="font-mono">{customer.points}</span>
                       </div>
                       <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                          {t(getTier(customer.points).toLowerCase())}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${customer.balance > 0 ? 'bg-red-100/10 text-red-600 dark:text-red-400 border-red-500/30' : 'bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'}`}>
                          {customer.balance > 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span className="font-mono">{formatMoney(Math.abs(customer.balance))}</span>
                      </div>
                      {customer.balance > 0 && (
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider pl-1">
                          Payable by Customer
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => openLedgerModal(customer)}
                            className="text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-50 dark:bg-sky-900/20 p-2 rounded-lg transition-all"
                            title="View Credit Activity"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => openBalanceModal(customer)}
                            className="text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-50 dark:bg-sky-900/20 p-2 rounded-lg transition-all"
                            title="Manage Credit/Debit"
                        >
                            <Wallet className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => openPointsModal(customer)}
                            className="text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg transition-all"
                            title="Manage Points"
                        >
                            <Gift className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                       <div className="flex flex-col items-center">
                          <Search className="w-12 h-12 mb-4 opacity-20" />
                          <p className="font-mono uppercase tracking-widest">{t('noMatchingRecords')}</p>
                       </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center text-xs font-mono text-neutral-500 dark:text-neutral-400">
          <span>{t('displaying')} {filteredCustomers.length} {t('records')}</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 hover:border-sky-500 hover:text-sky-500 transition-colors disabled:opacity-50 uppercase font-bold" disabled>{t('prev')}</button>
            <button className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 hover:border-sky-500 hover:text-sky-500 transition-colors uppercase font-bold">{t('next')}</button>
          </div>
        </div>
      </Card>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col relative bg-white dark:bg-neutral-900">
            
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
               <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                 <User className="w-5 h-5 text-sky-500" /> 
                 <span className="uppercase tracking-wide text-sm">{t('addCustomer')}</span>
               </h3>
               <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-4 bg-white dark:bg-neutral-900">
               <div>
                  <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('customerName')}</label>
                  <input 
                    type="text" 
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                  />
               </div>
               
               <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('email')}</label>
                  <input 
                    type="email" 
                    value={newCustomer.email}
                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                  />
               </div>

               <div>
                  <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('phone')}</label>
                  <input 
                    type="tel" 
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="(555) 000-0000"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                  />
               </div>
            </div>

            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
               <button 
                 onClick={() => setIsAddModalOpen(false)}
                 className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleAddCustomer}
                 className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-sm uppercase text-xs tracking-wider"
               >
                 <Save className="w-4 h-4" /> {t('save')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit/Debit Balance Management Modal */}
      {isBalanceModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col relative bg-white dark:bg-neutral-900">
               
               <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                   <div>
                       <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                           <Wallet className="w-5 h-5 text-sky-500" /> 
                           <span className="uppercase tracking-wide text-sm">{t('financialLedgerAdjustment')}</span>
                       </h3>
                       <p className="text-xs text-neutral-500 mt-1">{t('client')}: <span className="font-bold">{selectedCustomer.name}</span></p>
                   </div>
                   <button onClick={() => setIsBalanceModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                       <X className="w-5 h-5" />
                   </button>
               </div>

               <div className="p-6 bg-white/60 dark:bg-neutral-950/80 backdrop-blur-xl space-y-6">
                   <div className={`flex flex-col p-4 rounded-xl border ${selectedCustomer.balance > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'}`}>
                       <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase">
                           {selectedCustomer.balance > 0 ? 'Payable by Customer' : t('currentBalance')}
                         </span>
                         <div className={`flex items-center gap-2 text-2xl font-black font-mono ${selectedCustomer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {formatMoney(Math.abs(selectedCustomer.balance))}
                         </div>
                       </div>
                       {selectedCustomer.balance > 0 && (
                         <p className="text-xs text-red-500/80 mt-1">Customer owes this amount</p>
                       )}
                   </div>

                   <div>
                       <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl mb-4">
                           <button 
                               onClick={() => setBalanceTransactionType('CREDIT')}
                               className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${balanceTransactionType === 'CREDIT' ? 'bg-emerald-500 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'}`}
                           >
                               {t('addFunds')}
                           </button>
                           <button 
                               onClick={() => setBalanceTransactionType('DEBIT')}
                               className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${balanceTransactionType === 'DEBIT' ? 'bg-red-500 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'}`}
                           >
                               {t('chargeDebit')}
                           </button>
                       </div>

                       <div className="relative mb-4">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</div>
                           <input 
                               type="number" 
                               value={balanceAmount}
                               onChange={(e) => setBalanceAmount(e.target.value)}
                               placeholder="0.00"
                               autoFocus
                               className="w-full pl-8 pr-4 py-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-2xl font-bold font-mono text-neutral-900 dark:text-white"
                           />
                       </div>

                       <input 
                           type="text" 
                           value={balanceNote}
                           onChange={(e) => setBalanceNote(e.target.value)}
                           placeholder={t('transactionNote')}
                           className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-sm text-neutral-900 dark:text-white"
                       />
                   </div>
                   
                   {/* Preview Calculation */}
                   {balanceAmount && !isNaN(parseFloat(balanceAmount)) && (
                       <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                           <p className="text-xs text-neutral-500 uppercase font-bold mb-1">{t('projectedBalance')}</p>
                           <p className="text-lg font-mono font-bold text-neutral-800 dark:text-white">
                               {formatMoney(selectedCustomer.balance + (balanceTransactionType === 'CREDIT' ? parseFloat(balanceAmount) : -parseFloat(balanceAmount)))}
                           </p>
                       </div>
                   )}
               </div>

               <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
                   <button 
                       onClick={() => setIsBalanceModalOpen(false)}
                       className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                   >
                       Cancel
                   </button>
                   <button 
                       onClick={handleBalanceAdjustment}
                       className={`flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl transition-all shadow-sm uppercase text-xs tracking-wider ${balanceTransactionType === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                   >
                       <Save className="w-4 h-4" /> {t('confirmTransaction')}
                   </button>
               </div>
            </div>
        </div>
      )}

      {/* Points Management Modal */}
      {isPointsModalOpen && selectedCustomer && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
             <div className="w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col relative bg-white dark:bg-neutral-900">
                
                <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                    <div>
                        <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" /> 
                            <span className="uppercase tracking-wide text-sm">{t('loyaltyManagement')}</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">{t('adjustingFor')}: <span className="font-bold">{selectedCustomer.name}</span></p>
                    </div>
                    <button onClick={() => setIsPointsModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 bg-white dark:bg-neutral-950 space-y-6">
                    <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
                        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase">{t('currentBalance')}</span>
                        <div className="flex items-center gap-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                             <Star className="w-6 h-6 fill-current" />
                             {selectedCustomer.points}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-1 sm:col-span-2">
                             <label className="block text-xs font-bold text-neutral-500 dark:text-amber-400/80 mb-1.5 uppercase tracking-wider">{t('adjustmentReason')}</label>
                             <Dropdown
                               options={[
                                 { value: t('purchaseReward'), label: t('purchaseReward') },
                                 { value: t('manualBonus'), label: t('manualBonus') },
                                 { value: t('correctionAdd'), label: t('correctionAdd') },
                                 { value: t('correctionDeduct'), label: t('correctionDeduct') },
                               ]}
                               value={adjustmentReason}
                               onChange={(val) => setAdjustmentReason(val)}
                               size="md"
                               buttonClassName="rounded-xl py-3"
                             />
                        </div>
                        
                        <div className="col-span-2 relative">
                             <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                                <Calculator className="w-24 h-24" />
                             </div>
                             <div className="relative z-10">
                                <label className="block text-xs font-bold text-neutral-500 dark:text-amber-400/80 mb-1.5 uppercase tracking-wider">{t('awardBasedOnPurchase')}</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={purchaseValue}
                                        onChange={(e) => setPurchaseValue(e.target.value)}
                                        placeholder="0.00"
                                        className="flex-1 px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-neutral-900 dark:text-white"
                                    />
                                    <button 
                                        onClick={handleCalculatePoints}
                                        className="px-4 bg-neutral-200 dark:bg-neutral-800 rounded-xl font-bold text-xs uppercase hover:bg-neutral-300 dark:hover:bg-neutral-700"
                                    >
                                        Calc
                                    </button>
                                </div>
                                <p className="text-[10px] text-neutral-400 mt-1 text-right">Rate: 1 Point per $1.00</p>
                             </div>
                        </div>

                        <div className="col-span-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                             <label className="block text-xs font-bold text-neutral-500 dark:text-amber-400/80 mb-1.5 uppercase tracking-wider">{t('pointsAdjustment')}</label>
                             <input 
                                type="number" 
                                value={pointsAdjustment}
                                onChange={(e) => setPointsAdjustment(e.target.value)}
                                placeholder="e.g. 50 or -20"
                                className="w-full px-4 py-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-center text-2xl font-bold font-mono text-neutral-900 dark:text-white"
                             />
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsPointsModalOpen(false)}
                        className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSavePoints}
                        className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-sm uppercase text-xs tracking-wider"
                    >
                        <Save className="w-4 h-4" /> {t('applyPoints')}
                    </button>
                </div>
             </div>
         </div>
      )}

      {/* Credit Activity (Ledger) Modal */}
      {isLedgerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col relative bg-white dark:bg-neutral-900">
            
            {/* Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
              <div>
                <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-500" />
                  <span className="uppercase tracking-wide text-sm">Credit Activity Ledger</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-1">Customer: <span className="font-bold">{selectedCustomer.name}</span></p>
              </div>
              <button 
                onClick={() => { setIsLedgerModalOpen(false); setLedgerData(null); }}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date Filters */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase">From:</span>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => handleLedgerDateChange(e.target.value, ledgerEndDate)}
                    className="px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase">To:</span>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => handleLedgerDateChange(ledgerStartDate, e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                {/* Quick Filters */}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth(), 1);
                      handleLedgerDateChange(start.toISOString().split('T')[0], now.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/50"
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const end = new Date(now.getFullYear(), now.getMonth(), 0);
                      handleLedgerDateChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    Last Month
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {ledgerData && !ledgerLoading && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/60 dark:bg-neutral-950/50">
                <div className="bg-neutral-100 dark:bg-neutral-900/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-neutral-500 font-bold">Opening Balance</p>
                  <p className={`text-lg font-bold font-mono ${ledgerData.openingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatMoney(Math.abs(ledgerData.openingBalance))}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-red-500 font-bold">Total Debit (Credit Sales)</p>
                  <p className="text-lg font-bold font-mono text-red-600">{formatMoney(ledgerData.totalDebit)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-emerald-500 font-bold">Total Credit (Payments)</p>
                  <p className="text-lg font-bold font-mono text-emerald-600">{formatMoney(ledgerData.totalCredit)}</p>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-900/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-neutral-500 font-bold">Closing Balance</p>
                  <p className={`text-lg font-bold font-mono ${ledgerData.closingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatMoney(Math.abs(ledgerData.closingBalance))}
                    {ledgerData.closingBalance > 0 && <span className="text-[10px] ml-1">DR</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Ledger Table */}
            <div className="flex-1 overflow-auto bg-white/60 dark:bg-neutral-950/80">
              {ledgerLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                </div>
              ) : ledgerData && ledgerData.entries.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-100 dark:bg-neutral-900/50 text-xs uppercase tracking-wider text-neutral-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {ledgerData.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10">
                        <td className="px-4 py-3 font-mono text-xs">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-sky-600 dark:text-sky-400">
                          {entry.invoiceId || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            entry.type === 'CREDIT' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                            entry.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                          {entry.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-red-600 dark:text-red-400">
                          {entry.debit > 0 ? formatMoney(entry.debit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? formatMoney(entry.credit) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${entry.runningBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formatMoney(Math.abs(entry.runningBalance))}
                          {entry.runningBalance > 0 && <span className="text-[10px] ml-0.5">DR</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-mono uppercase tracking-widest text-sm">No activity in selected period</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end">
              <button
                onClick={() => { setIsLedgerModalOpen(false); setLedgerData(null); }}
                className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors"
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

export default Customers;
