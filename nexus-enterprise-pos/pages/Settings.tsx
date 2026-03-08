
import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency, type Currency } from '../context/CurrencyContext';
import { Store, User, CreditCard, Bell, Shield, Smartphone, Save, ToggleRight, ToggleLeft, CheckCircle, Monitor, Laptop, Phone, Database, Globe, Users, Edit, X, Plus, Trash2, FileText, BarChart3, Sun, Moon } from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';
import { Role, User as UserType } from '../types';

// AVAILABLE PERMISSIONS CONSTANT
const AVAILABLE_PERMISSIONS = [
  { id: 'inventory.view', label: 'View Inventory', category: 'Inventory' },
  { id: 'inventory.manage', label: 'Manage Inventory (Add/Edit)', category: 'Inventory' },
  { id: 'inventory.delete', label: 'Delete Inventory Items', category: 'Inventory' },
  { id: 'pos.operate', label: 'Operate POS', category: 'POS' },
  { id: 'pos.refund', label: 'Process Refunds', category: 'POS' },
  { id: 'customers.view', label: 'View Customers', category: 'Customers' },
  { id: 'customers.manage', label: 'Manage Customers', category: 'Customers' },
  { id: 'suppliers.view', label: 'View Suppliers', category: 'Suppliers' },
  { id: 'suppliers.manage', label: 'Manage Suppliers', category: 'Suppliers' },
  { id: 'reports.view', label: 'View Reports', category: 'Reports' },
  { id: 'financials.view', label: 'View Financials', category: 'Accounting' },
  { id: 'settings.manage', label: 'Manage Settings', category: 'System' },
  { id: 'users.manage', label: 'Manage Users', category: 'System' },
];

const Settings: React.FC = () => {
  const { t, setLanguage } = useLanguage();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('general');

  // --- GENERAL SETTINGS STATE ---
  const [generalSettings, setGeneralSettings] = useState(() => ({
    storeName: localStorage.getItem('storeName') || 'one1pos Cafe - Downtown',
    currency: localStorage.getItem('currency') || 'USD',
    language: localStorage.getItem('language') || 'en',
    theme: localStorage.getItem('theme') || 'light',
    taxRate: localStorage.getItem('taxRate') || '8',
    address: localStorage.getItem('storeAddress') || '123 Innovation Blvd, Tech City, TC 90210'
  }));

  // --- ACCOUNT SETTINGS STATE ---
  const [accountSettings, setAccountSettings] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'admin@one1pos.com',
    currentPassword: '',
    newPassword: ''
  });

  // --- PAYMENT SETTINGS STATE ---
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, name: 'Credit & Debit Cards', icon: CreditCard, active: true },
    { id: 2, name: 'Cash on Delivery', icon: Save, active: true },
    { id: 3, name: 'Apple Pay / Google Pay', icon: Smartphone, active: false }
  ]);

  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    marketing: false
  });

  // --- SECURITY STATE ---
  const [activeSessions, setActiveSessions] = useState([
    { id: 1, device: 'MacBook Pro - Chrome', type: 'Laptop', location: 'New York, USA • 192.168.1.1', status: 'Current' },
    { id: 2, device: 'iPhone 13 - App', type: 'Phone', location: 'New York, USA • 10.0.0.5', status: 'Active' }
  ]);

  // --- DEVICES STATE ---
  const [connectedDevices, setConnectedDevices] = useState([
    { name: 'Counter 1', id: 'POS-001', status: 'Online', type: 'Tablet' },
    { name: 'Counter 2', id: 'POS-002', status: 'Offline', type: 'Desktop' },
    { name: 'Kitchen Display', id: 'KDS-001', status: 'Online', type: 'Monitor' },
  ]);

  // --- USERS STATE ---
  const [usersList, setUsersList] = useState<UserType[]>([
    { id: '1', name: 'John Admin', email: 'admin@one1pos.com', role: Role.OWNER, permissions: ['inventory.view', 'inventory.manage', 'inventory.delete', 'pos.operate', 'pos.refund', 'customers.view', 'customers.manage', 'suppliers.view', 'suppliers.manage', 'reports.view', 'financials.view', 'settings.manage', 'users.manage'] },
    { id: '2', name: 'Sarah Manager', email: 'manager@one1pos.com', role: Role.MANAGER, permissions: ['inventory.view', 'inventory.manage', 'pos.operate', 'pos.refund', 'customers.view', 'customers.manage', 'suppliers.view', 'suppliers.manage', 'reports.view'] },
    { id: '3', name: 'Kyle Cashier', email: 'cashier@one1pos.com', role: Role.CASHIER, permissions: ['pos.operate', 'customers.view', 'inventory.view'] },
  ]);

  // Modal States
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: Role.CASHIER
  });

  // Invoice & Report Template State - Load from localStorage
  const [selectedInvoiceTemplate, setSelectedInvoiceTemplate] = useState(() => {
    return localStorage.getItem('invoiceTemplate') || 'thermal';
  });
  const [selectedReportTemplate, setSelectedReportTemplate] = useState(() => {
    return localStorage.getItem('reportTemplate') || 'executive';
  });

  // Save template preferences to localStorage when they change
  const handleInvoiceTemplateChange = (template: string) => {
    setSelectedInvoiceTemplate(template);
    localStorage.setItem('invoiceTemplate', template);
  };

  const handleReportTemplateChange = (template: string) => {
    setSelectedReportTemplate(template);
    localStorage.setItem('reportTemplate', template);
  };

  // --- HANDLERS ---

  const handleGeneralChange = (field: string, value: string) => {
    setGeneralSettings(prev => ({ ...prev, [field]: value }));
    if (field === 'currency') {
      setCurrency(value as Currency);
      localStorage.setItem('currency', value);
    }
    if (field === 'language') {
      setLanguage(value as 'en' | 'es' | 'ru' | 'de');
      localStorage.setItem('language', value);
    }
    if (field === 'theme') {
      localStorage.setItem('theme', value);
      if (value === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleAccountChange = (field: string, value: string) => {
    setAccountSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveGeneralSettings = () => {
    localStorage.setItem('storeName', generalSettings.storeName);
    localStorage.setItem('storeAddress', generalSettings.address);
    localStorage.setItem('taxRate', generalSettings.taxRate);
    localStorage.setItem('currency', generalSettings.currency);
    localStorage.setItem('language', generalSettings.language);
    localStorage.setItem('theme', generalSettings.theme);
    window.dispatchEvent(new Event('storage'));
    alert(t('generalSettingsUpdated'));
  };

  const saveAccountSettings = () => {
    alert(t('profileUpdated'));
    setAccountSettings(prev => ({...prev, currentPassword: '', newPassword: ''}));
  };

  const togglePaymentMethod = (id: number) => {
    setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const revokeSession = (id: number) => {
    if(confirm('Are you sure you want to revoke this session?')) {
        setActiveSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const disconnectDevice = (id: string) => {
    if(confirm(`Disconnect device ${id}?`)) {
        setConnectedDevices(prev => prev.filter(d => d.id !== id));
    }
  };

  // User Management Handlers
  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
        alert('Please fill in all fields');
        return;
    }

    const user: UserType = {
        id: Math.random().toString(36).substr(2, 9),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions: [] // Default empty, admin can assign later
    };

    setUsersList([...usersList, user]);
    setIsAddUserModalOpen(false);
    setNewUser({ name: '', email: '', role: Role.CASHIER });
    alert('User added successfully. Please configure permissions.');
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to remove this user? Access will be revoked immediately.')) {
        setUsersList(prev => prev.filter(u => u.id !== userId));
    }
  };

  const openPermissionModal = (user: UserType) => {
    setSelectedUser({ ...user });
    setIsPermissionModalOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedUser) return;
    const currentPermissions = selectedUser.permissions || [];
    let newPermissions;
    if (currentPermissions.includes(permissionId)) {
        newPermissions = currentPermissions.filter(p => p !== permissionId);
    } else {
        newPermissions = [...currentPermissions, permissionId];
    }
    setSelectedUser({ ...selectedUser, permissions: newPermissions });
  };

  const savePermissions = () => {
    if (!selectedUser) return;
    setUsersList(prev => prev.map(u => u.id === selectedUser.id ? selectedUser : u));
    setIsPermissionModalOpen(false);
    setSelectedUser(null);
    alert('Access permissions updated.');
  };

  const tabs = [
    { id: 'general', label: t('general'), icon: Store },
    { id: 'account', label: t('account'), icon: User },
    { id: 'payment', label: t('paymentMethods'), icon: CreditCard },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'devices', label: t('devices'), icon: Smartphone },
    { id: 'users', label: t('usersAccess'), icon: Users },
    { id: 'invoices', label: t('invoicesReports'), icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-enter">
        <div className="relative pl-4 border-l-4 border-neutral-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('systemConfiguration').split(' ')[0]} <span className="text-neutral-500">{t('systemConfiguration').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono text-sm tracking-wider">
            {t('preferencesSetup')}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 animate-enter" style={{ animationDelay: '100ms' }}>
        {/* Navigation - Glass Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="rounded-lg p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-24">
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap group relative overflow-hidden ${
                    activeTab === tab.id
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-sky-100 dark:bg-sky-900/30' : 'bg-transparent group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800'}`}>
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-sky-600 dark:text-sky-400' : 'text-neutral-400'}`} />
                  </div>
                  <span className="relative z-10">{tab.label}</span>
                  {activeTab === tab.id && (
                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-500 rounded-r-full"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <Card title={tabs.find(t => t.id === activeTab)?.label} className="min-h-[500px] border-t-4 border-t-sky-500">
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('storeName')}</label>
                    <div className="relative group">
                        <Store className="absolute left-4 top-3 text-neutral-400 group-focus-within:text-sky-500 transition-colors w-5 h-5" />
                        <input 
                            type="text" 
                            value={generalSettings.storeName} 
                            onChange={(e) => handleGeneralChange('storeName', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all font-medium" 
                        />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="relative group">
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('currency')}</label>
                        <Dropdown
                          options={[
                            { value: 'USD', label: 'USD ($)' },
                            { value: 'EUR', label: 'EUR (€)' },
                            { value: 'RUB', label: 'RUB (₽)' },
                            { value: 'PKR', label: 'PKR (₨)' },
                          ]}
                          value={generalSettings.currency}
                          onChange={(val) => handleGeneralChange('currency', val)}
                          size="md"
                          buttonClassName="rounded-xl py-3"
                        />
                     </div>
                     <div className="relative group">
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Language</label>
                        <Dropdown
                          options={[
                            { value: 'en', label: '🇬🇧 English' },
                            { value: 'es', label: '🇪🇸 Español' },
                            { value: 'ru', label: '🇷🇺 Русский' },
                            { value: 'de', label: '🇩🇪 Deutsch' },
                          ]}
                          value={generalSettings.language}
                          onChange={(val) => handleGeneralChange('language', val)}
                          size="md"
                          buttonClassName="rounded-xl py-3"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Theme</label>
                     <div className="flex gap-3">
                        <button
                          onClick={() => handleGeneralChange('theme', 'light')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                            generalSettings.theme === 'light'
                              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                          }`}
                        >
                          <Sun className="w-5 h-5" />
                          <span className="font-medium">Light</span>
                        </button>
                        <button
                          onClick={() => handleGeneralChange('theme', 'dark')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                            generalSettings.theme === 'dark'
                              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                          }`}
                        >
                          <Moon className="w-5 h-5" />
                          <span className="font-medium">Dark</span>
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                     <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('taxRate')}</label>
                        <input 
                            type="number" 
                            value={generalSettings.taxRate}
                            onChange={(e) => handleGeneralChange('taxRate', e.target.value)}
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all font-mono" 
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('businessAddress')}</label>
                     <div className="relative group">
                        <Globe className="absolute left-4 top-3 text-neutral-400 group-focus-within:text-sky-500 transition-colors w-5 h-5" />
                        <textarea 
                            rows={3} 
                            value={generalSettings.address}
                            onChange={(e) => handleGeneralChange('address', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all" 
                        />
                     </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-neutral-800 flex justify-end">
                   <button 
                        onClick={saveGeneralSettings}
                        className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-500 shadow-sm transition-all font-bold text-sm tracking-wide uppercase"
                    >
                      <Save className="w-4 h-4" /> {t('saveChanges')}
                   </button>
                </div>
              </div>
            )}
            
            {activeTab === 'account' && (
              <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-6 mb-8 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="w-20 h-20 bg-neutral-800 dark:bg-neutral-700 rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                    {accountSettings.firstName.charAt(0)}{accountSettings.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-800 dark:text-white">{accountSettings.firstName} {accountSettings.lastName}</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 font-mono text-xs mt-1">ID: ADMIN-001</p>
                    <p className="text-sky-600 dark:text-sky-400 text-sm font-medium mt-1">{t('storeManager')}</p>
                  </div>
                  <button className="ml-auto px-4 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm font-medium hover:border-sky-500 transition-all">{t('changeAvatar')}</button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('firstName')}</label>
                        <input 
                            type="text" 
                            value={accountSettings.firstName}
                            onChange={(e) => handleAccountChange('firstName', e.target.value)}
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all" 
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('lastName')}</label>
                        <input 
                            type="text" 
                            value={accountSettings.lastName}
                            onChange={(e) => handleAccountChange('lastName', e.target.value)}
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all" 
                        />
                     </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t('emailAddress')}</label>
                    <input 
                        type="email" 
                        value={accountSettings.email}
                        onChange={(e) => handleAccountChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all font-mono" 
                    />
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100 dark:border-neutral-800">
                    <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-4 uppercase tracking-wide flex items-center gap-2">
                        <Shield className="w-4 h-4 text-sky-500" /> {t('securityCredentials')}
                    </h4>
                    <div className="space-y-4">
                       <input 
                            type="password" 
                            placeholder={t('currentPassword')} 
                            value={accountSettings.currentPassword}
                            onChange={(e) => handleAccountChange('currentPassword', e.target.value)}
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all" 
                       />
                       <input 
                            type="password" 
                            placeholder={t('newPassword')} 
                            value={accountSettings.newPassword}
                            onChange={(e) => handleAccountChange('newPassword', e.target.value)}
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-neutral-900 dark:text-white transition-all" 
                       />
                    </div>
                  </div>
                </div>
                
                 <div className="pt-6 border-t border-gray-100 dark:border-neutral-800 flex justify-end">
                   <button 
                        onClick={saveAccountSettings}
                        className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-500 shadow-sm transition-all font-bold text-sm tracking-wide uppercase"
                    >
                      <Save className="w-4 h-4" /> {t('saveProfile')}
                   </button>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-sky-50 dark:bg-sky-900/20 p-5 rounded-xl border border-sky-100 dark:border-sky-900/30 flex items-start gap-4">
                   <div className="p-2 bg-sky-100 dark:bg-sky-900/50 rounded-lg text-sky-600 dark:text-sky-400">
                        <Database className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-bold text-sky-900 dark:text-sky-200 text-sm uppercase tracking-wide">Connected to Stripe</h4>
                      <p className="text-sm text-sky-700 dark:text-sky-300 mt-1">Payments are processed securely via Stripe Connect. Account ID: <span className="font-mono bg-sky-200/50 dark:bg-sky-900/50 px-1 rounded">acct_1Hh5...</span></p>
                   </div>
                   <div className="ml-auto">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm uppercase tracking-wider">Accepted Payment Methods</h3>
                   {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900/30 border border-gray-200 dark:border-neutral-700 rounded-xl hover:border-sky-500/30 transition-all">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                               <method.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                            </div>
                            <span className="font-medium text-neutral-700 dark:text-neutral-200">{method.name}</span>
                         </div>
                         <button 
                            onClick={() => togglePaymentMethod(method.id)}
                            className={`text-2xl transition-colors ${method.active ? 'text-emerald-500' : 'text-neutral-300 dark:text-neutral-700'}`}
                         >
                           {method.active ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                         </button>
                      </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                     {[
                        { id: 'email', label: 'Email Notifications', desc: 'Receive daily sales reports and critical alerts.' },
                        { id: 'sms', label: 'SMS Alerts', desc: 'Get text messages for security logins and low stock.' },
                        { id: 'push', label: 'Push Notifications', desc: 'Real-time alerts on your dashboard and mobile app.' },
                        { id: 'marketing', label: 'Marketing Updates', desc: 'News about new features and promotions.' }
                     ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900/30 border border-gray-200 dark:border-neutral-700 rounded-xl hover:border-sky-500/30 transition-all">
                           <div>
                              <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">{item.label}</h4>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{item.desc}</p>
                           </div>
                           <button 
                             onClick={() => toggleNotification(item.id as keyof typeof notifications)}
                             className={`text-2xl transition-colors ${notifications[item.id as keyof typeof notifications] ? 'text-sky-500' : 'text-neutral-300 dark:text-neutral-700'}`}
                           >
                             {notifications[item.id as keyof typeof notifications] ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="p-5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-neutral-700 rounded-full shadow-sm">
                            <Shield className="w-6 h-6 text-sky-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-800 dark:text-neutral-200">Two-Factor Authentication</h4>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Add an extra layer of security to your account.</p>
                        </div>
                    </div>
                    <button className="px-5 py-2.5 bg-sky-600 text-white font-bold text-xs uppercase tracking-wide rounded-lg hover:bg-sky-500 transition-colors shadow-sm">
                       Enable 2FA
                    </button>
                 </div>

                 <div className="space-y-3">
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-xs uppercase tracking-wider">Active Sessions</h3>
                    {activeSessions.map(session => (
                        <div key={session.id} className="p-4 bg-white dark:bg-neutral-900/30 border border-gray-200 dark:border-neutral-700 rounded-xl flex items-center gap-4">
                            <div className={`p-3 rounded-full ${session.status === 'Current' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                                {session.type === 'Laptop' ? <Laptop className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">{session.device}</h4>
                                    {session.status === 'Current' ? (
                                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Current</span>
                                    ) : (
                                        <button onClick={() => revokeSession(session.id)} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wide">Revoke</button>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono">{session.location}</p>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'devices' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center">
                     <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-xs uppercase tracking-wider">{t('connectedTerminals')}</h3>
                     <button className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline uppercase tracking-wide">
                        <Smartphone className="w-4 h-4" /> {t('addNewTerminal')}
                     </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {connectedDevices.map((device) => (
                        <div key={device.id} className="p-5 bg-white dark:bg-neutral-900/30 border border-gray-200 dark:border-neutral-700 rounded-xl relative group overflow-hidden transition-all hover:border-sky-500/30">
                           <div className={`absolute top-0 left-0 w-1 h-full ${device.status === 'Online' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                           <div className="flex justify-between items-start mb-3 pl-2">
                              <div>
                                 <h4 className="font-bold text-neutral-800 dark:text-neutral-200">{device.name}</h4>
                                 <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{device.id}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${device.status === 'Online' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                 {device.status === 'Online' ? t('online') : t('offline')}
                              </span>
                           </div>
                           <div className="flex items-center gap-2 text-xs text-neutral-500 pl-2">
                              {device.type === 'Monitor' ? <Monitor className="w-4 h-4" /> : device.type === 'Tablet' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                              <span className="uppercase tracking-wide">{device.type}</span>
                           </div>
                           
                           <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800 pl-2 flex justify-end">
                              <button 
                                onClick={() => disconnectDevice(device.name)}
                                className="text-xs font-bold text-neutral-400 hover:text-red-500 transition-colors uppercase tracking-wide"
                              >
                                {t('disconnect')}
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-xs uppercase tracking-wider">{t('userAccessControl')}</h3>
                        <p className="text-xs text-neutral-500">{t('manageRolePermissions')}</p>
                    </div>
                    <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm transition-all text-xs font-bold uppercase tracking-wide"
                    >
                        <Plus className="w-4 h-4" /> {t('addUser')}
                    </button>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    {usersList.map((user) => (
                       <div key={user.id} className="p-5 bg-white dark:bg-neutral-900/30 border border-gray-200 dark:border-neutral-700 rounded-xl flex items-center justify-between group hover:border-sky-500/30 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold">
                                {user.avatar || user.name.charAt(0)}
                             </div>
                             <div>
                                <h4 className="font-bold text-neutral-800 dark:text-neutral-200">{user.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{user.email}</span>
                                   <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                      {user.role}
                                   </span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                                onClick={() => openPermissionModal(user)}
                                className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-all font-bold text-xs uppercase tracking-wider"
                            >
                                <Edit className="w-4 h-4" /> {t('access')}
                            </button>
                            {user.role !== Role.OWNER && (
                                <button 
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title={t('removeUser')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Invoice Templates Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm uppercase tracking-wider">Thermal Receipt Printer</h3>
                      <p className="text-xs text-neutral-500">80mm thermal receipt format for POS transactions</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    {/* Thermal Receipt Template - 80mm */}
                    <div 
                      onClick={() => handleInvoiceTemplateChange('thermal')}
                      className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden group ${
                        selectedInvoiceTemplate === 'thermal' 
                          ? 'border-sky-500 shadow-sm' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-sky-300'
                      }`}
                    >
                      {selectedInvoiceTemplate === 'thermal' && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {/* Thermal Receipt Preview - 80mm width (scaled) */}
                      <div className="p-6 bg-white dark:bg-neutral-900 flex justify-center">
                        <div className="w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 font-mono text-[8px] leading-tight">
                          {/* Header */}
                          <div className="text-center border-b-2 border-dashed border-neutral-300 dark:border-neutral-600 pb-2 mb-2">
                            <div className="font-bold text-[10px] mb-1">one1pos</div>
                            <div className="text-neutral-500 dark:text-neutral-400">123 Business St</div>
                            <div className="text-neutral-500 dark:text-neutral-400">Tel: (555) 123-4567</div>
                          </div>
                          {/* Receipt Info */}
                          <div className="mb-2 text-neutral-600 dark:text-neutral-400">
                            <div className="flex justify-between">
                              <span>Receipt #:</span>
                              <span>0001</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Date:</span>
                              <span>Jan 10, 2026</span>
                            </div>
                          </div>
                          {/* Items */}
                          <div className="border-t border-b border-neutral-300 dark:border-neutral-600 py-2 mb-2">
                            <div className="mb-1">
                              <div className="flex justify-between font-bold text-neutral-800 dark:text-white">
                                <span>Product A</span>
                                <span>{formatCurrency(25)}</span>
                              </div>
                              <div className="text-neutral-500 dark:text-neutral-400 ml-2">2 x {formatCurrency(12.5)}</div>
                            </div>
                            <div>
                              <div className="flex justify-between font-bold text-neutral-800 dark:text-white">
                                <span>Product B</span>
                                <span>{formatCurrency(15)}</span>
                              </div>
                              <div className="text-neutral-500 dark:text-neutral-400 ml-2">1 x {formatCurrency(15)}</div>
                            </div>
                          </div>
                          {/* Total */}
                          <div className="border-t-2 border-neutral-800 dark:border-neutral-200 pt-2 mb-2">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>TOTAL:</span>
                              <span>{formatCurrency(40)}</span>
                            </div>
                          </div>
                          {/* Footer */}
                          <div className="text-center text-neutral-500 dark:text-neutral-400 border-t border-dashed border-neutral-300 dark:border-neutral-600 pt-2">
                            <div>Thank you!</div>
                            <div>Visit again</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="font-bold text-sm text-neutral-800 dark:text-white">Thermal Receipt (80mm)</div>
                        <div className="text-[10px] text-neutral-500">Optimized for thermal receipt printers</div>
                      </div>
                    </div>

                    {/* Info Card */}
                    <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 bg-sky-500 rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-800 dark:text-white mb-1">Thermal Printer Info</h4>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">Standard 80mm thermal receipt format</p>
                        </div>
                      </div>
                      <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span>80mm (3.15") paper width</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span>Compact design for quick printing</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span>Works with most POS thermal printers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span>Auto-adjusts to paper length</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Report Templates Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm uppercase tracking-wider">{t('reportTemplates')}</h3>
                      <p className="text-xs text-neutral-500">{t('chooseReportStyle')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Report Template 1 - Executive */}
                    <div 
                      onClick={() => handleReportTemplateChange('executive')}
                      className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden group ${
                        selectedReportTemplate === 'executive' 
                          ? 'border-sky-500 shadow-sm' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-sky-300'
                      }`}
                    >
                      {selectedReportTemplate === 'executive' && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {/* Executive Report Preview */}
                      <div className="p-4 bg-white dark:bg-neutral-900">
                        <div className="bg-neutral-900 dark:bg-neutral-800 text-white p-3 rounded-lg mb-3">
                          <div className="text-[10px] font-bold tracking-wider">EXECUTIVE SUMMARY</div>
                          <div className="text-[8px] opacity-60">Q1 2026 Performance</div>
                        </div>
                        <div className="flex gap-2 mb-3">
                          <div className="flex-1 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-center">
                            <div className="text-[10px] font-bold text-emerald-600">↑ 24%</div>
                            <div className="text-[6px] text-neutral-400">Revenue</div>
                          </div>
                          <div className="flex-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center">
                            <div className="text-[10px] font-bold text-blue-600">↑ 12%</div>
                            <div className="text-[6px] text-neutral-400">Orders</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-6 w-2 bg-emerald-500 rounded-t"></div>
                          <div className="h-8 w-2 bg-emerald-500 rounded-t mt-auto"></div>
                          <div className="h-5 w-2 bg-emerald-500 rounded-t mt-auto"></div>
                          <div className="h-10 w-2 bg-emerald-500 rounded-t mt-auto"></div>
                          <div className="h-7 w-2 bg-emerald-500 rounded-t mt-auto"></div>
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="font-bold text-sm text-neutral-800 dark:text-white">{t('executive')}</div>
                        <div className="text-[10px] text-neutral-500">{t('darkHeaderKPI')}</div>
                      </div>
                    </div>

                    {/* Report Template 2 - Analytical */}
                    <div 
                      onClick={() => handleReportTemplateChange('analytical')}
                      className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden group ${
                        selectedReportTemplate === 'analytical' 
                          ? 'border-sky-500 shadow-sm' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-sky-300'
                      }`}
                    >
                      {selectedReportTemplate === 'analytical' && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {/* Analytical Report Preview */}
                      <div className="p-4 bg-white dark:bg-neutral-900">
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-[10px] font-bold text-neutral-800 dark:text-white">Sales Report</div>
                          <div className="text-[8px] px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-full">2026</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2 border border-neutral-100 dark:border-neutral-700 rounded">
                            <div className="text-[6px] text-neutral-400">Total Sales</div>
                            <div className="text-[10px] font-bold text-neutral-800 dark:text-white">{formatCurrency(45200)}</div>
                          </div>
                          <div className="p-2 border border-neutral-100 dark:border-neutral-700 rounded">
                            <div className="text-[6px] text-neutral-400">Transactions</div>
                            <div className="text-[10px] font-bold text-neutral-800 dark:text-white">1,234</div>
                          </div>
                        </div>
                        <div className="h-6 bg-sky-500 rounded-full"></div>
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="font-bold text-sm text-neutral-800 dark:text-white">{t('analytical')}</div>
                        <div className="text-[10px] text-neutral-500">{t('dataFocusedCharts')}</div>
                      </div>
                    </div>

                    {/* Report Template 3 - Visual */}
                    <div 
                      onClick={() => handleReportTemplateChange('visual')}
                      className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden group ${
                        selectedReportTemplate === 'visual' 
                          ? 'border-sky-500 shadow-sm' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-sky-300'
                      }`}
                    >
                      {selectedReportTemplate === 'visual' && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {/* Visual Report Preview */}
                      <div className="p-4 bg-neutral-900 dark:bg-neutral-800">
                        <div className="text-[10px] font-bold text-white/90 mb-1">Performance</div>
                        <div className="text-[8px] text-white/60 mb-3">Monthly Overview</div>
                        <div className="flex items-end gap-1 mb-2">
                          <div className="h-4 w-3 bg-white/30 rounded-sm"></div>
                          <div className="h-6 w-3 bg-white/40 rounded-sm"></div>
                          <div className="h-8 w-3 bg-white/50 rounded-sm"></div>
                          <div className="h-5 w-3 bg-white/40 rounded-sm"></div>
                          <div className="h-10 w-3 bg-white rounded-sm"></div>
                          <div className="h-7 w-3 bg-white/50 rounded-sm"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="text-[10px] font-bold text-white">{formatCurrency(52400)}</div>
                          <div className="text-[8px] text-emerald-300">↑ 18%</div>
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="font-bold text-sm text-neutral-800 dark:text-white">{t('simplified')}</div>
                        <div className="text-[10px] text-neutral-500">{t('lightweightEssential')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 border-t border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                  <div className="text-xs text-neutral-500">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">Selected:</span> {selectedInvoiceTemplate.charAt(0).toUpperCase() + selectedInvoiceTemplate.slice(1)} Invoice • {selectedReportTemplate.charAt(0).toUpperCase() + selectedReportTemplate.slice(1)} Report
                  </div>
                  <button 
                    onClick={() => alert(t('profileUpdated'))}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-500 shadow-sm transition-all font-bold text-sm tracking-wide uppercase"
                  >
                    <Save className="w-4 h-4" /> {t('saveChanges')}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Permissions Modal */}
      {isPermissionModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-200 p-4">
           <div className="w-full max-w-2xl rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col relative max-h-[90vh]">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                 <div>
                    <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                       <Shield className="w-5 h-5 text-sky-500" /> 
                       <span className="uppercase tracking-wide text-sm">Access Permissions</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">Editing rights for <span className="font-bold text-sky-600 dark:text-sky-400">{selectedUser.name}</span></p>
                 </div>
                 <button onClick={() => setIsPermissionModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto bg-white dark:bg-neutral-950">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['Inventory', 'POS', 'Customers', 'Suppliers', 'Reports', 'Accounting', 'System'].map((category) => (
                       <div key={category} className="space-y-3">
                          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-800 pb-1 mb-2">{category}</h4>
                          {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map((perm) => (
                             <label key={perm.id} className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-sky-200 dark:hover:border-sky-900/30">
                                <div className="relative flex items-center mt-0.5">
                                   <input 
                                      type="checkbox" 
                                      checked={selectedUser.permissions?.includes(perm.id)}
                                      onChange={() => togglePermission(perm.id)}
                                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 checked:bg-sky-500 checked:border-sky-500 transition-all"
                                   />
                                   <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                         <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                   </div>
                                </div>
                                <div className="flex-1">
                                   <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 block">{perm.label}</span>
                                   <span className="text-[10px] text-neutral-400 font-mono">{perm.id}</span>
                                </div>
                             </label>
                          ))}
                       </div>
                    ))}
                 </div>
              </div>

              <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
                 <button 
                    onClick={() => setIsPermissionModalOpen(false)}
                    className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                 >
                    {t('cancel')}
                 </button>
                 <button 
                    onClick={savePermissions}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm uppercase text-xs tracking-wider"
                 >
                    <Save className="w-4 h-4" /> {t('updatePermissions')}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-200 p-4">
           <div className="w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col relative">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500"></div>
              
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                 <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-sky-500" /> 
                    <span className="uppercase tracking-wide text-sm">{t('addUserAccount')}</span>
                 </h3>
                 <button onClick={() => setIsAddUserModalOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 bg-white dark:bg-neutral-950 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('fullName')}</label>
                    <input 
                        type="text" 
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        placeholder={t('enterEmployeeName')}
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('emailAddress')}</label>
                    <input 
                        type="email" 
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="user@one1pos.com"
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-500" 
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-neutral-500 dark:text-sky-400/80 mb-1.5 uppercase tracking-wider">{t('selectRole')}</label>
                    <Dropdown
                      options={[
                        { value: Role.CASHIER, label: 'Cashier (Restricted)' },
                        { value: Role.MANAGER, label: 'Manager (Operational)' },
                        { value: Role.OWNER, label: 'Administrator (Full Access)' },
                      ]}
                      value={newUser.role}
                      onChange={(val) => setNewUser({...newUser, role: val as Role})}
                      size="md"
                      buttonClassName="rounded-xl py-3"
                    />
                 </div>
              </div>

              <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
                 <button 
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold uppercase text-xs tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                 >
                    {t('cancel')}
                 </button>
                 <button 
                    onClick={handleAddUser}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow-sm uppercase text-xs tracking-wider"
                 >
                    <Save className="w-4 h-4" /> {t('createUser')}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
