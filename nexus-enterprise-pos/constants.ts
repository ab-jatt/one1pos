
import { Product, Order, PaymentMethod, OrderStatus, Transaction } from './types';

// Added costPrice (Purchase Price) to calculate P&L
// Margin = price - costPrice
export const PRODUCTS: Product[] = [
  { id: '1', name: 'Espresso', price: 3.50, costPrice: 0.80, category: 'Drinks', stock: 150, sku: 'DRK-001', image: 'https://picsum.photos/200/200?random=1' },
  { id: '2', name: 'Cappuccino', price: 4.50, costPrice: 1.20, category: 'Drinks', stock: 80, sku: 'DRK-002', image: 'https://picsum.photos/200/200?random=2' },
  { id: '3', name: 'Latte', price: 4.75, costPrice: 1.30, category: 'Drinks', stock: 90, sku: 'DRK-003', image: 'https://picsum.photos/200/200?random=3' },
  { id: '4', name: 'Croissant', price: 3.00, costPrice: 0.90, category: 'Food', stock: 40, sku: 'FOD-001', image: 'https://picsum.photos/200/200?random=4' },
  { id: '5', name: 'Bagel & Cream Cheese', price: 5.50, costPrice: 1.50, category: 'Food', stock: 30, sku: 'FOD-002', image: 'https://picsum.photos/200/200?random=5' },
  { id: '6', name: 'Blueberry Muffin', price: 3.25, costPrice: 0.85, category: 'Dessert', stock: 25, sku: 'DST-001', image: 'https://picsum.photos/200/200?random=6' },
  { id: '7', name: 'Cheesecake Slice', price: 6.00, costPrice: 2.00, category: 'Dessert', stock: 15, sku: 'DST-002', image: 'https://picsum.photos/200/200?random=7' },
  { id: '8', name: 'Potato Chips', price: 2.00, costPrice: 0.50, category: 'Snacks', stock: 200, sku: 'SNK-001', image: 'https://picsum.photos/200/200?random=8' },
  { id: '9', name: 'Branded T-Shirt', price: 25.00, costPrice: 8.00, category: 'Merch', stock: 50, sku: 'MRC-001', image: 'https://picsum.photos/200/200?random=9' },
  { id: '10', name: 'Iced Tea', price: 3.00, costPrice: 0.40, category: 'Drinks', stock: 120, sku: 'DRK-004', image: 'https://picsum.photos/200/200?random=10' },
  { id: '11', name: 'Club Sandwich', price: 8.50, costPrice: 3.50, category: 'Food', stock: 20, sku: 'FOD-003', image: 'https://picsum.photos/200/200?random=11' },
  { id: '12', name: 'Chocolate Cookie', price: 2.50, costPrice: 0.60, category: 'Dessert', stock: 60, sku: 'DST-003', image: 'https://picsum.photos/200/200?random=12' },
];

// Added discounts to demonstrate P&L impact
export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-7829',
    items: [{ ...PRODUCTS[0], quantity: 1 }, { ...PRODUCTS[3], quantity: 1 }],
    total: 6.50,
    subtotal: 6.50,
    tax: 0.52,
    discount: 0,
    paymentMethod: PaymentMethod.CASH,
    status: OrderStatus.COMPLETED,
    date: '2023-10-25T10:30:00',
    customerId: '1'
  },
  {
    id: 'ORD-7830',
    items: [{ ...PRODUCTS[1], quantity: 2 }, { ...PRODUCTS[6], quantity: 1 }],
    total: 13.50, 
    subtotal: 15.00,
    tax: 1.08,
    discount: 1.50, // Discount applied
    paymentMethod: PaymentMethod.CARD,
    status: OrderStatus.COMPLETED,
    date: '2023-10-25T11:15:00',
    customerId: '2'
  },
  {
    id: 'ORD-7831',
    items: [{ ...PRODUCTS[2], quantity: 1 }, { ...PRODUCTS[11], quantity: 2 }],
    total: 9.75,
    subtotal: 9.75,
    tax: 0.78,
    discount: 0,
    paymentMethod: PaymentMethod.WALLET,
    status: OrderStatus.COMPLETED,
    date: '2023-10-25T11:45:00',
    customerId: '3'
  }
];

export const SALES_DATA = [
  { name: '08:00', sales: 120 },
  { name: '10:00', sales: 450 },
  { name: '12:00', sales: 890 },
  { name: '14:00', sales: 600 },
  { name: '16:00', sales: 300 },
  { name: '18:00', sales: 550 },
  { name: '20:00', sales: 400 },
];

export const TOP_PRODUCTS_DATA = [
  { name: 'Espresso', sales: 120 },
  { name: 'Latte', sales: 98 },
  { name: 'Croissant', sales: 86 },
  { name: 'Muffin', sales: 55 },
  { name: 'Iced Tea', sales: 40 },
];

export const TRANSACTIONS: Transaction[] = [
  { id: 'TRX-9901', description: 'Daily Sales - POS', amount: 1250.00, type: 'Income', category: 'Sales', date: '2023-10-24' },
  { id: 'TRX-9902', description: 'Bean Co. Roasters Invoice', amount: 1200.00, type: 'Expense', category: 'COGS', date: '2023-10-24' },
  { id: 'TRX-9903', description: 'Utility Bill - Electric', amount: 350.00, type: 'Expense', category: 'Utilities', date: '2023-10-23' },
  { id: 'TRX-9904', description: 'Daily Sales - POS', amount: 1420.50, type: 'Income', category: 'Sales', date: '2023-10-23' },
  { id: 'TRX-9905', description: 'Monthly Rent', amount: 2000.00, type: 'Expense', category: 'Rent', date: '2023-10-01' },
];
