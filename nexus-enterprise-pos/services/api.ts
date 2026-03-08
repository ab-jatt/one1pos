import axios from 'axios';
import { Product, Customer, Employee, Transaction, PurchaseOrder, AuditLog, Supplier, CartItem, Order, PaymentMethod } from '../types';

// Get API URL from environment variables.
// VITE_API_URL must include the /api prefix to match the NestJS global prefix (app.setGlobalPrefix('api')).
// Default points to the Docker-mapped host port (8081 → container 8080).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Attach JWT token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('nexus_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simulate network delay for mock endpoints
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Auth types (kept for backward compat)
export interface SignUpPayload {
  email: string;
  password: string;
  name: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

// Category type
export interface Category {
  id: string;
  name: string;
  _count?: {
    products: number;
  };
}

// Order creation payload
export interface CreateOrderPayload {
  items: { productId: string; quantity: number }[];
  customerId?: string;
  cashierId: string;
  paymentMethod: PaymentMethod;
  discount?: number;
  pointsRedeemed?: number;
}

export const Api = {
  // ==================== AUTH ====================
  auth: {
    login: async (email: string, password: string): Promise<{ access_token: string; user: { id: string; email: string; name: string; role: string; branchId: string; avatar?: string } }> => {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    },
    loginWithGoogle: async (idToken: string): Promise<{ access_token: string; user: { id: string; email: string; name: string; role: string; branchId: string; avatar?: string } }> => {
      const response = await apiClient.post('/auth/google', { idToken });
      return response.data;
    },
    me: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data;
    },
  },

  // ==================== USERS ====================
  users: {
    getByEmail: async (email: string): Promise<{ id: string; role: string; name: string; email: string } | null> => {
      try {
        const response = await apiClient.get(`/users/by-email/${encodeURIComponent(email)}`);
        return response.data;
      } catch {
        return null;
      }
    },
    getAll: async () => {
      const response = await apiClient.get('/users');
      return response.data;
    },
    create: async (data: { name: string; email: string; password: string; role: string }) => {
      const response = await apiClient.post('/users', data);
      return response.data;
    },
    update: async (id: string, data: { name?: string; email?: string; password?: string; role?: string }) => {
      const response = await apiClient.patch(`/users/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
  },
  // ==================== PRODUCTS ====================
  products: {
    getAll: async (): Promise<Product[]> => {
      try {
        const response = await apiClient.get('/products');
        return response.data;
      } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
    },
    getOne: async (id: string): Promise<Product> => {
      try {
        const response = await apiClient.get(`/products/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
      }
    },
    create: async (product: Partial<Product>): Promise<Product> => {
      try {
        const response = await apiClient.post('/products', product);
        return response.data;
      } catch (error) {
        console.error('Error creating product:', error);
        throw error;
      }
    },
    update: async (id: string, product: Partial<Product>): Promise<Product> => {
      try {
        const response = await apiClient.patch(`/products/${id}`, product);
        return response.data;
      } catch (error) {
        console.error('Error updating product:', error);
        throw error;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/products/${id}`);
        return true;
      } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
      }
    },
    search: async (q: string): Promise<Product[]> => {
      try {
        const response = await apiClient.get(`/products/search?q=${encodeURIComponent(q)}`);
        return response.data;
      } catch (error) {
        console.error('Error searching products:', error);
        throw error;
      }
    },
    uploadImage: async (file: File): Promise<string> => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/products/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.url as string;
      } catch (error) {
        console.error('Error uploading product image:', error);
        throw error;
      }
    },
  },

  // ==================== CATEGORIES ====================
  categories: {
    getAll: async (): Promise<Category[]> => {
      try {
        const response = await apiClient.get('/categories');
        return response.data;
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    },
    create: async (name: string): Promise<Category> => {
      try {
        const response = await apiClient.post('/categories', { name });
        return response.data;
      } catch (error) {
        console.error('Error creating category:', error);
        throw error;
      }
    },
    update: async (id: string, name: string): Promise<Category> => {
      try {
        const response = await apiClient.patch(`/categories/${id}`, { name });
        return response.data;
      } catch (error) {
        console.error('Error updating category:', error);
        throw error;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/categories/${id}`);
        return true;
      } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
      }
    },
  },

  // ==================== CUSTOMERS ====================
  customers: {
    getAll: async (): Promise<Customer[]> => {
      try {
        const response = await apiClient.get('/customers');
        return response.data.map((c: any) => ({
          ...c,
          balance: Number(c.balance),
        }));
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
    getOne: async (id: string): Promise<Customer> => {
      try {
        const response = await apiClient.get(`/customers/${id}`);
        return { ...response.data, balance: Number(response.data.balance) };
      } catch (error) {
        console.error('Error fetching customer:', error);
        throw error;
      }
    },
    create: async (customer: { name: string; email?: string; phone?: string }): Promise<Customer> => {
      try {
        const response = await apiClient.post('/customers', customer);
        return { ...response.data, balance: Number(response.data.balance) };
      } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
      }
    },
    update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
      try {
        const response = await apiClient.patch(`/customers/${id}`, customer);
        return { ...response.data, balance: Number(response.data.balance) };
      } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/customers/${id}`);
        return true;
      } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
      }
    },
    adjustPoints: async (id: string, points: number, reason?: string): Promise<Customer> => {
      try {
        const response = await apiClient.post(`/customers/${id}/points`, { points, reason });
        return { ...response.data, balance: Number(response.data.balance) };
      } catch (error) {
        console.error('Error adjusting points:', error);
        throw error;
      }
    },
    adjustBalance: async (id: string, amount: number, type: 'CREDIT' | 'DEBIT', note?: string): Promise<Customer> => {
      try {
        const response = await apiClient.post(`/customers/${id}/balance`, { amount, type, note });
        return { ...response.data, balance: Number(response.data.balance) };
      } catch (error) {
        console.error('Error adjusting balance:', error);
        throw error;
      }
    },
    getLedger: async (id: number | string, startDate?: string, endDate?: string): Promise<{
      entries: Array<{
        id: string;
        date: string;
        orderId: string | null;
        invoiceId: string | null;
        type: string;
        debit: number;
        credit: number;
        description: string | null;
        runningBalance: number;
      }>;
      openingBalance: number;
      closingBalance: number;
      totalDebit: number;
      totalCredit: number;
    }> => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await apiClient.get(`/customers/${id}/ledger?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching customer ledger:', error);
        throw error;
      }
    },
  },

  // ==================== STOCK LEDGER ====================
  stockLedger: {
    getLedger: async (productId: string, startDate?: string, endDate?: string): Promise<{
      product: {
        id: string;
        name: string;
        sku: string;
      };
      currentStock: number;
      openingStock: number;
      closingStock: number;
      movements: Array<{
        id: string;
        date: string;
        type: string;
        quantityIn: number;
        quantityOut: number;
        openingStock: number;
        closingStock: number;
        reason: string | null;
        referenceId: string | null;
        createdBy: string;
      }>;
    }> => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await apiClient.get(`/products/${productId}/ledger?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching stock ledger:', error);
        throw error;
      }
    },
  },

  // ==================== STOCK REPORTS ====================
  stockReports: {
    getReport: async (startDate?: string, endDate?: string, productId?: string) => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (productId) params.append('productId', productId);
        const response = await apiClient.get(`/stock-reports?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching stock report:', error);
        throw error;
      }
    },

    getMovements: async (startDate?: string, endDate?: string, productId?: string, page?: number, limit?: number) => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (productId) params.append('productId', productId);
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());
        const response = await apiClient.get(`/stock-reports/movements?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching stock movements:', error);
        throw error;
      }
    },

    getDailySummary: async (date: string) => {
      try {
        const response = await apiClient.get(`/stock-reports/daily/${date}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching daily summary:', error);
        throw error;
      }
    },

    createAdjustment: async (data: {
      productId: string;
      adjustmentType: 'IN' | 'OUT';
      quantity: number;
      reason: string;
    }) => {
      try {
        const response = await apiClient.post('/stock-reports/adjustment', data);
        return response.data;
      } catch (error) {
        console.error('Error creating adjustment:', error);
        throw error;
      }
    },
  },

  // ==================== ORDERS ====================
  orders: {
    getAll: async (): Promise<Order[]> => {
      try {
        const response = await apiClient.get('/orders');
        return response.data;
      } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
    },
    getOne: async (id: string): Promise<Order> => {
      try {
        const response = await apiClient.get(`/orders/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching order:', error);
        throw error;
      }
    },
    getByOrderNumber: async (orderNumber: string): Promise<Order> => {
      try {
        const response = await apiClient.get(`/orders/number/${orderNumber}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching order by number:', error);
        throw error;
      }
    },
    create: async (payload: CreateOrderPayload): Promise<Order> => {
      try {
        const response = await apiClient.post('/orders', payload);
        return response.data;
      } catch (error) {
        console.error('Error creating order:', error);
        throw error;
      }
    },
    refund: async (
      id: string, 
      items: Array<{ itemId: string; quantity: number }>, 
      reason?: string
    ): Promise<{ order: Order; refundAmount: number; refundedItems: any[] }> => {
      try {
        const response = await apiClient.post(`/orders/${id}/refund`, { items, reason });
        return response.data;
      } catch (error) {
        console.error('Error processing refund:', error);
        throw error;
      }
    },
    getStats: async () => {
      try {
        const response = await apiClient.get('/orders/stats');
        return response.data;
      } catch (error) {
        console.error('Error fetching order stats:', error);
        throw error;
      }
    },
  },

  // ==================== EXCHANGES ====================
  exchanges: {
    create: async (payload: {
      originalOrderId: string;
      customerId?: string;
      processedById?: string;
      returnedItems: Array<{ productId: string; quantity: number; unitPrice: number }>;
      issuedItems: Array<{ productId: string; quantity: number; unitPrice: number }>;
      paymentMethod?: string;
      adjustedAmount?: number;
      adjustmentReason?: string;
      adjustedById?: string;
      notes?: string;
    }) => {
      try {
        const response = await apiClient.post('/exchanges', payload);
        return response.data;
      } catch (error) {
        console.error('Error creating exchange:', error);
        throw error;
      }
    },
    getAll: async (params?: {
      customerId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      try {
        const response = await apiClient.get('/exchanges', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching exchanges:', error);
        throw error;
      }
    },
    getOne: async (id: string) => {
      try {
        const response = await apiClient.get(`/exchanges/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching exchange:', error);
        throw error;
      }
    },
    getByExchangeNumber: async (exchangeNumber: string) => {
      try {
        const response = await apiClient.get(`/exchanges/number/${exchangeNumber}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching exchange:', error);
        throw error;
      }
    },
    cancel: async (id: string, reason: string, cancelledById?: string) => {
      try {
        const response = await apiClient.patch(`/exchanges/${id}/cancel`, { reason, cancelledById });
        return response.data;
      } catch (error) {
        console.error('Error cancelling exchange:', error);
        throw error;
      }
    },
    adjustAmount: async (id: string, adjustedAmount: number, adjustmentReason: string, adjustedById: string) => {
      try {
        const response = await apiClient.patch(`/exchanges/${id}/adjust`, { 
          adjustedAmount, 
          adjustmentReason, 
          adjustedById 
        });
        return response.data;
      } catch (error) {
        console.error('Error adjusting exchange amount:', error);
        throw error;
      }
    },
    processPayment: async (id: string, paymentMethod: 'CASH' | 'CARD' | 'CREDIT', processedById?: string) => {
      try {
        const response = await apiClient.patch(`/exchanges/${id}/payment`, { paymentMethod, processedById });
        return response.data;
      } catch (error) {
        console.error('Error processing exchange payment:', error);
        throw error;
      }
    },
  },

  // ==================== LEGACY/MOCK ENDPOINTS ====================
  // These remain as mocks for now - to be converted later

  inventory: {
    // Alias for products.getAll for backwards compatibility
    getAll: async (): Promise<Product[]> => {
      return Api.products.getAll();
    },
    update: async (product: Product): Promise<Product> => {
      return Api.products.update(product.id, product);
    },
    create: async (product: Omit<Product, 'id'>): Promise<Product> => {
      return Api.products.create(product);
    },
    delete: async (id: string): Promise<boolean> => {
      return Api.products.delete(id);
    },
  },

  suppliers: {
    getAll: async (): Promise<Supplier[]> => {
      try {
        const response = await apiClient.get('/suppliers');
        return response.data;
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        throw error;
      }
    },
    add: async (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
      try {
        const response = await apiClient.post('/suppliers', supplier);
        return response.data;
      } catch (error) {
        console.error('Error creating supplier:', error);
        throw error;
      }
    },
    update: async (supplier: Supplier): Promise<Supplier> => {
      try {
        const response = await apiClient.patch(`/suppliers/${supplier.id}`, supplier);
        return response.data;
      } catch (error) {
        console.error('Error updating supplier:', error);
        throw error;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/suppliers/${id}`);
        return true;
      } catch (error) {
        console.error('Error deleting supplier:', error);
        throw error;
      }
    },
  },

  // ==================== DASHBOARD ====================
  dashboard: {
    getStats: async () => {
      try {
        const response = await apiClient.get('/dashboard/stats');
        return response.data;
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
    },
    getSalesData: async () => {
      try {
        const response = await apiClient.get('/dashboard/sales-data');
        return response.data;
      } catch (error) {
        console.error('Error fetching sales data:', error);
        throw error;
      }
    },
    getTopProducts: async (startDate?: string, endDate?: string) => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await apiClient.get(`/dashboard/top-products?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching top products:', error);
        throw error;
      }
    },
    getRecentOrders: async (limit = 10) => {
      try {
        const response = await apiClient.get(`/dashboard/recent-orders?limit=${limit}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching recent orders:', error);
        throw error;
      }
    },
    getOverview: async (startDate?: string, endDate?: string) => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await apiClient.get(`/dashboard/overview?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching dashboard overview:', error);
        throw error;
      }
    },
    getSalesTrend: async (startDate?: string, endDate?: string) => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await apiClient.get(`/dashboard/sales-trend?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching sales trend:', error);
        throw error;
      }
    },
    getProfitTrend: async (startDate?: string, endDate?: string) => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await apiClient.get(`/dashboard/profit-trend?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching profit trend:', error);
        throw error;
      }
    },
    getStockDistribution: async () => {
      try {
        const response = await apiClient.get('/dashboard/stock-distribution');
        return response.data;
      } catch (error) {
        console.error('Error fetching stock distribution:', error);
        throw error;
      }
    },
  },

  hr: {
    getEmployees: async (): Promise<Employee[]> => {
      try {
        const response = await apiClient.get('/employees');
        return response.data;
      } catch (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
    },
    createEmployee: async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
      try {
        const response = await apiClient.post('/employees', employee);
        return response.data;
      } catch (error) {
        console.error('Error creating employee:', error);
        throw error;
      }
    },
    updateEmployee: async (id: string, employee: Partial<Employee>): Promise<Employee> => {
      try {
        const response = await apiClient.patch(`/employees/${id}`, employee);
        return response.data;
      } catch (error) {
        console.error('Error updating employee:', error);
        throw error;
      }
    },
    deleteEmployee: async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/employees/${id}`);
        return true;
      } catch (error) {
        console.error('Error deleting employee:', error);
        throw error;
      }
    },
    runPayroll: async (): Promise<boolean> => {
      try {
        await apiClient.post('/employees/payroll');
        return true;
      } catch (error) {
        console.error('Error running payroll:', error);
        throw error;
      }
    },
    getShifts: async (employeeId?: string): Promise<any[]> => {
      try {
        const params = employeeId ? { employeeId } : {};
        const response = await apiClient.get('/shifts', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching shifts:', error);
        throw error;
      }
    },
    createShift: async (shift: { employeeId: string; startTime: string; endTime: string; type?: string }): Promise<any> => {
      try {
        const response = await apiClient.post('/shifts', shift);
        return response.data;
      } catch (error) {
        console.error('Error creating shift:', error);
        throw error;
      }
    },
    updateShift: async (id: string, shift: { startTime?: string; endTime?: string; type?: string }): Promise<any> => {
      try {
        const response = await apiClient.patch(`/shifts/${id}`, shift);
        return response.data;
      } catch (error) {
        console.error('Error updating shift:', error);
        throw error;
      }
    },
    deleteShift: async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/shifts/${id}`);
        return true;
      } catch (error) {
        console.error('Error deleting shift:', error);
        throw error;
      }
    },
  },

  accounting: {
    getTransactions: async (): Promise<Transaction[]> => {
      try {
        const response = await apiClient.get('/transactions');
        return response.data;
      } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
    },
    createTransaction: async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
      try {
        const response = await apiClient.post('/transactions', transaction);
        return response.data;
      } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
      }
    },
    getFinancialStats: async () => {
      try {
        const response = await apiClient.get('/transactions/stats');
        return response.data;
      } catch (error) {
        console.error('Error fetching financial stats:', error);
        throw error;
      }
    },
  },

  purchasing: {
    getPurchaseOrders: async (): Promise<PurchaseOrder[]> => {
      try {
        const response = await apiClient.get('/purchase-orders');
        return response.data;
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        throw error;
      }
    },
    createPO: async (po: any): Promise<PurchaseOrder> => {
      try {
        const response = await apiClient.post('/purchase-orders', po);
        return response.data;
      } catch (error) {
        console.error('Error creating purchase order:', error);
        throw error;
      }
    },
    updateStatus: async (id: string, status: string): Promise<PurchaseOrder> => {
      try {
        const response = await apiClient.patch(`/purchase-orders/${id}/status`, { status });
        return response.data;
      } catch (error) {
        console.error('Error updating PO status:', error);
        throw error;
      }
    },
  },

  security: {
    getAuditLogs: async (): Promise<AuditLog[]> => {
      try {
        const response = await apiClient.get('/audit-logs');
        return response.data;
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }
    },
    createLog: async (log: Omit<AuditLog, 'id'>): Promise<AuditLog> => {
      try {
        const response = await apiClient.post('/audit-logs', log);
        return response.data;
      } catch (error) {
        console.error('Error creating audit log:', error);
        throw error;
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  warehouses: {
    getAll: async () => {
      const response = await apiClient.get('/warehouses');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/warehouses/${id}`);
      return response.data;
    },
    getStock: async (id: string) => {
      const response = await apiClient.get(`/warehouses/${id}/stock`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/warehouses', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.patch(`/warehouses/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/warehouses/${id}`);
      return response.data;
    },
    addLocation: async (warehouseId: string, data: any) => {
      const response = await apiClient.post(`/warehouses/${warehouseId}/locations`, data);
      return response.data;
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSE MOVEMENTS (Stock Ledger)
  // ═══════════════════════════════════════════════════════════════
  warehouseMovements: {
    getAll: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-movements', { params: filters });
      return response.data;
    },
    getBalances: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-movements/balances', { params: filters });
      return response.data;
    },
    createAdjustment: async (data: any) => {
      const response = await apiClient.post('/warehouse-movements/adjustment', data);
      return response.data;
    },
    transfer: async (data: any) => {
      const response = await apiClient.post('/warehouse-movements/transfer', data);
      return response.data;
    },
    getTransfers: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-movements/transfers', { params: filters });
      return response.data;
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCTION ORDERS
  // ═══════════════════════════════════════════════════════════════
  productionOrders: {
    getAll: async (filters?: any) => {
      const response = await apiClient.get('/production-orders', { params: filters });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/production-orders/${id}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/production-orders', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.patch(`/production-orders/${id}`, data);
      return response.data;
    },
    issueMaterials: async (id: string, data: any) => {
      const response = await apiClient.post(`/production-orders/${id}/issue`, data);
      return response.data;
    },
    receiveGoods: async (id: string, data: any) => {
      const response = await apiClient.post(`/production-orders/${id}/receive`, data);
      return response.data;
    },
    returnMaterials: async (id: string, data: any) => {
      const response = await apiClient.post(`/production-orders/${id}/return`, data);
      return response.data;
    },
    updateStatus: async (id: string, status: string) => {
      const response = await apiClient.patch(`/production-orders/${id}/status`, { status });
      return response.data;
    },
    cancel: async (id: string) => {
      const response = await apiClient.delete(`/production-orders/${id}`);
      return response.data;
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSE REPORTS
  // ═══════════════════════════════════════════════════════════════
  warehouseReports: {
    stockBalance: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-reports/stock-balance', { params: filters });
      return response.data;
    },
    movements: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-reports/movements', { params: filters });
      return response.data;
    },
    inventoryValuation: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-reports/inventory-valuation', { params: filters });
      return response.data;
    },
    productionConsumption: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-reports/production-consumption', { params: filters });
      return response.data;
    },
    finishedGoods: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-reports/finished-goods', { params: filters });
      return response.data;
    },
    lowStock: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-reports/low-stock', { params: filters });
      return response.data;
    },
    transfers: async (filters?: any) => {
      const response = await apiClient.get('/warehouse-reports/transfers', { params: filters });
      return response.data;
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // POS HARDWARE
  // ═══════════════════════════════════════════════════════════════
  pos: {
    /**
     * Request the ESC/POS cash drawer open command from the backend.
     * Returns { command: string (base64), encoding: 'base64' }.
     * The caller is responsible for forwarding the decoded bytes to the
     * receipt printer via QZ Tray.
     */
    openDrawer: async (): Promise<{ command: string; encoding: string }> => {
      const response = await apiClient.post('/pos/open-drawer');
      return response.data;
    },
  },
};