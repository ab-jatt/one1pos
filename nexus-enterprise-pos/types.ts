
export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
  WALLET = 'WALLET',
  SPLIT = 'SPLIT'
}

export enum OrderStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED'
}

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  permissions: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number; // Sale Price
  costPrice: number; // Purchase Price (for P&L)
  category: string;
  image: string;
  stock: number;
  sku: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  balance: number; // Positive = Store Credit, Negative = Amount Owed
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string; // e.g., "Net 30", "Due on Receipt"
}

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
  unitPrice?: number;
}

export interface Payment {
  id: string;
  method: string;
  amount: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  items: CartItem[] | OrderItem[];
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentMethod: PaymentMethod;
  payments?: Payment[];
  status: OrderStatus;
  date: string;
  createdAt?: string;
  customerId?: string;
  customer?: Customer;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
  status: 'Active' | 'On Leave';
  joinDate: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  items: number;
  total: number;
  status: 'Pending' | 'Received' | 'Cancelled';
  date: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  date: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  module: string;
  timestamp: string;
  details: string;
}
