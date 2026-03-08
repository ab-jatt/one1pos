
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Grid, Trash2, Plus, Minus, User, Tag, Wifi, Printer, RefreshCw, Percent, X, RotateCcw, Check, FileText, ScanLine, Box, ChevronRight, Zap, Calculator, Hexagon, Star, Users, Phone, Loader2 } from 'lucide-react';
import { Api, Category } from '../services/api';
import { Product, CartItem, Customer, PaymentMethod, Order } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import SuccessModal from '../components/ui/SuccessModal';

// ─── QZ Tray helpers ──────────────────────────────────────────────────────────
// QZ Tray is a locally-installed desktop app that bridges the browser to USB /
// network receipt printers.  We lazy-load its JS client from the official CDN
// the first time the POS screen mounts; if QZ Tray is not running on the
// operator's machine the helpers fail silently — the transaction still goes
// through without blocking the POS flow.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qz: any;
  }
}

function loadQzScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.qz) { resolve(); return; }
    const existing = document.getElementById('qz-tray-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.id = 'qz-tray-script';
    script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => resolve(); // fail silently
    document.head.appendChild(script);
  });
}

async function sendDrawerOpenCommand(base64Command: string): Promise<void> {
  await loadQzScript();
  const qz = window.qz;
  if (!qz) return;
  try {
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }
    const printers = await qz.printers.find();
    if (!printers || printers.length === 0) return;

    const config = qz.configs.create(printers[0]);
    const data = [{ type: 'raw', format: 'base64', data: base64Command }];
    await qz.print(config, data);
  } catch {
    // QZ Tray not running or no printer — fail silently so POS flow is unaffected
  }
}
// ─────────────────────────────────────────────────────────────────────────────

interface TransactionSnapshot {
    items: CartItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    date: Date;
    orderId: string;
    customer: Customer;
    pointsEarned: number;
    pointsRedeemed: number;
    pointsBalance: number;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    change: number;
}

// Default walk-in customer
const WALK_IN_CUSTOMER: Customer = {
  id: 'walk-in',
  name: 'Walk-in Customer',
  email: '',
  phone: '',
  points: 0,
  balance: 0,
};

const POS: React.FC = () => {
  const { t, language } = useLanguage();
  const { formatCurrency, currencySymbol } = useCurrency();
  const formatMoney = (value: number) => formatCurrency(Number(value) || 0);
  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH:
        return t('cash');
      case PaymentMethod.CARD:
        return t('card');
      case PaymentMethod.CREDIT:
        return t('credit');
      default:
        return method;
    }
  };
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [customers, setCustomers] = useState<Customer[]>([WALK_IN_CUSTOMER]);
  const [isLoading, setIsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(WALK_IN_CUSTOMER);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amountGivenInput, setAmountGivenInput] = useState('');
  const [isReceiptPromptOpen, setIsReceiptPromptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionSnapshot | null>(null);

  // Discount State
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(0);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  
  // Loyalty State
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const POINT_CONVERSION_RATE = 0.1; // 10 Points = $1
  const POINTS_EARN_RATE = 1; // $1 Spent = 1 Point

  // Temporary state for discount modal inputs
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  const [tempDiscountType, setTempDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

  // Refund State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundSearchQuery, setRefundSearchQuery] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [selectedRefundItems, setSelectedRefundItems] = useState<Set<string>>(new Set());
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({}); // itemId -> quantity
  const [refundReason, setRefundReason] = useState('Defective');
  const [refundAction, setRefundAction] = useState<'REFUND' | 'EXCHANGE'>('REFUND');
  const [refundMethod, setRefundMethod] = useState<string>('Original Payment');

  // Exchange State
  const [exchangeIssuedItems, setExchangeIssuedItems] = useState<Array<{ productId: string; name: string; quantity: number; price: number }>>([]);
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');
  
  // Exchange Amount Adjustment State
  const [exchangeAdjustEnabled, setExchangeAdjustEnabled] = useState(false);
  const [exchangeAdjustedAmount, setExchangeAdjustedAmount] = useState<string>('');
  const [exchangeAdjustmentReason, setExchangeAdjustmentReason] = useState('');

  // Success Modal State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{ title: string; message: string; amount?: string }>({ title: '', message: '' });

  // Refs for Auto-Focus & Keyboard Navigation
  const refundInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountGivenRef = useRef<HTMLInputElement>(null);
  const confirmPaymentRef = useRef<HTMLButtonElement>(null);
  const paymentCashRef = useRef<HTMLButtonElement>(null);
  const paymentCardRef = useRef<HTMLButtonElement>(null);
  const paymentCreditRef = useRef<HTMLButtonElement>(null);
  const paymentModalRef = useRef<HTMLDivElement>(null);
  const receiptModalRef = useRef<HTMLDivElement>(null);
  const discountModalRef = useRef<HTMLDivElement>(null);
  const customerModalRef = useRef<HTMLDivElement>(null);
  const refundModalRef = useRef<HTMLDivElement>(null);

  // Invoice Template from Settings
  const [invoiceTemplate, setInvoiceTemplate] = useState(() => {
    return localStorage.getItem('invoiceTemplate') || 'thermal';
  });

  const [storeProfile, setStoreProfile] = useState(() => ({
    name: localStorage.getItem('storeName') || 'one1pos Cafe - Downtown',
    address: localStorage.getItem('storeAddress') || '123 Business Street',
    phone: localStorage.getItem('storePhone') || '(555) 123-4567',
  }));

  const receiptLocale = useMemo(() => {
    const localeMap = {
      en: 'en-US',
      es: 'es-ES',
      ru: 'ru-RU',
      de: 'de-DE',
    } as const;
    return localeMap[language] || 'en-US';
  }, [language]);

  // Listen for storage changes to update template in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      setInvoiceTemplate(localStorage.getItem('invoiceTemplate') || 'thermal');
      setStoreProfile({
        name: localStorage.getItem('storeName') || 'one1pos Cafe - Downtown',
        address: localStorage.getItem('storeAddress') || '123 Business Street',
        phone: localStorage.getItem('storePhone') || '(555) 123-4567',
      });
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch products, categories, and customers on mount
  useEffect(() => {
    // Pre-load QZ Tray script in the background so the first payment doesn't
    // trigger a network round-trip.
    loadQzScript();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsData, categoriesData, customersData] = await Promise.all([
          Api.products.getAll(),
          Api.categories.getAll(),
          Api.customers.getAll(),
        ]);
        setProducts(productsData);
        setCategories(['All', ...categoriesData.map((c: Category) => c.name)]);
        setCustomers([WALK_IN_CUSTOMER, ...customersData]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-Focus Effects
  useEffect(() => {
    if (isRefundModalOpen && refundInputRef.current) {
        setTimeout(() => refundInputRef.current?.focus(), 100);
    }
  }, [isRefundModalOpen]);

  useEffect(() => {
    if (isDiscountModalOpen && discountInputRef.current) {
        setTimeout(() => discountInputRef.current?.focus(), 100);
    }
  }, [isDiscountModalOpen]);

  useEffect(() => {
    if (isCustomerModalOpen && customerSearchInputRef.current) {
        setTimeout(() => customerSearchInputRef.current?.focus(), 100);
    }
  }, [isCustomerModalOpen]);

  // Cart calculations - MUST be defined before useEffects that use them
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculate Discount
  const baseDiscountAmount = discountType === 'PERCENTAGE' 
    ? subtotal * (discountValue / 100) 
    : discountValue;

  // Add Points Discount
  const pointsDiscountValue = pointsRedeemed * POINT_CONVERSION_RATE;
  
  // Total Discount
  const totalDiscountAmount = baseDiscountAmount + pointsDiscountValue;
    
  // Ensure discount doesn't exceed subtotal
  const effectiveDiscount = Math.min(totalDiscountAmount, subtotal);
  const subtotalAfterDiscount = subtotal - effectiveDiscount;
  
  const taxRate = 0.08;
  const tax = subtotalAfterDiscount * taxRate;
  const total = subtotalAfterDiscount + tax;

  // Auto-focus search input on mount and when modals close
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isPaymentModalOpen && !isDiscountModalOpen && !isRefundModalOpen && !isCustomerModalOpen && !isReceiptPromptOpen) {
        searchInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isPaymentModalOpen, isDiscountModalOpen, isRefundModalOpen, isCustomerModalOpen, isReceiptPromptOpen]);

  useEffect(() => {
    if (isPaymentModalOpen) {
      setSelectedPaymentMethod(PaymentMethod.CASH);
      setAmountGivenInput(total.toFixed(2));
      // Focus the amount-given input after modal renders
      setTimeout(() => {
        amountGivenRef.current?.focus();
        amountGivenRef.current?.select();
      }, 150);
    }
  }, [isPaymentModalOpen, total]);

  // Focus trap for modals — keeps TAB cycling within the active modal
  const trapFocus = (e: React.KeyboardEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
    if (e.key !== 'Tab' || !containerRef.current) return;
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  // When payment method changes, shift focus accordingly
  useEffect(() => {
    if (!isPaymentModalOpen) return;
    if (selectedPaymentMethod === PaymentMethod.CASH) {
      setTimeout(() => {
        amountGivenRef.current?.focus();
        amountGivenRef.current?.select();
      }, 50);
    } else {
      setTimeout(() => confirmPaymentRef.current?.focus(), 50);
    }
  }, [selectedPaymentMethod, isPaymentModalOpen]);

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setPointsRedeemed(0);
  };

  const openDiscountModal = () => {
    setTempDiscountValue(discountValue === 0 ? '' : discountValue.toString());
    setTempDiscountType(discountType);
    setIsDiscountModalOpen(true);
  };

  const handlePrint = (type: 'RECEIPT' | 'INVOICE') => {
    // Add specific class to body to control which print view is shown
    document.body.classList.add(type === 'RECEIPT' ? 'printing-receipt' : 'printing-invoice');
    
    // Slight delay to ensure DOM update (though usually synchronous for class addition)
    setTimeout(() => {
        window.print();
        // Cleanup after print dialog closes (or user cancels)
        // Note: This execution resumes immediately in some browsers, or after dialog in others.
        // It's safer to remove it on a timeout or event, but for simplicity:
        document.body.classList.remove('printing-receipt', 'printing-invoice');
    }, 100);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 's': // Save - Prevent default browser save
            e.preventDefault();
            break;
          case 'p': // Pay
            e.preventDefault(); 
            // Trigger Pay modal only if other modals aren't open
            if (cart.length > 0 && !isPaymentModalOpen && !isDiscountModalOpen && !isRefundModalOpen && !isReceiptPromptOpen && !isCustomerModalOpen) {
               setIsPaymentModalOpen(true);
            }
            break;
          case 'd': // Discount
            e.preventDefault(); 
            if (cart.length > 0 && !isPaymentModalOpen && !isRefundModalOpen && !isReceiptPromptOpen && !isCustomerModalOpen) {
               openDiscountModal();
            }
            break;
          case 'c': // Clear Cart
            // Only trigger if not in an input field to avoid blocking Copy command
            if (!isInput && cart.length > 0 && !isPaymentModalOpen && !isDiscountModalOpen && !isRefundModalOpen && !isReceiptPromptOpen && !isCustomerModalOpen) {
               e.preventDefault();
               clearCart();
            }
            break;
          case 'r': // Refund
            e.preventDefault(); // Prevent refresh
            if (!isPaymentModalOpen && !isDiscountModalOpen && !isRefundModalOpen && !isReceiptPromptOpen && !isCustomerModalOpen) {
                setIsRefundModalOpen(true);
            }
            break;
          case 'u': // User/Customer Change
             e.preventDefault();
             if (!isPaymentModalOpen && !isDiscountModalOpen && !isRefundModalOpen && !isReceiptPromptOpen) {
                setIsCustomerModalOpen(true);
             }
             break;
        }
      } else if (e.key === 'F12') {
        // F12 to Complete Transaction (Open Payment Modal)
        e.preventDefault();
        if (cart.length > 0 && !isPaymentModalOpen && !isDiscountModalOpen && !isRefundModalOpen && !isReceiptPromptOpen && !isCustomerModalOpen) {
          setIsPaymentModalOpen(true);
        }
      } else if (e.key === 'Escape') {
          if (isPaymentModalOpen) setIsPaymentModalOpen(false);
          if (isDiscountModalOpen) setIsDiscountModalOpen(false);
          if (isRefundModalOpen) setIsRefundModalOpen(false);
          if (isCustomerModalOpen) setIsCustomerModalOpen(false);
          // Allow closing receipt prompt with Escape, treating it as "No Receipt"
          if (isReceiptPromptOpen) finalizeTransaction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen, isDiscountModalOpen, isRefundModalOpen, isReceiptPromptOpen, isCustomerModalOpen, discountValue, discountType]);


  // Filter products based on category and search
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        product.name.toLowerCase().includes(q) ||
        (product.sku?.toLowerCase() || '').includes(q) ||
        (product.productCode?.toLowerCase() || '').includes(q) ||
        (product.barcode?.toLowerCase() || '').includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, products]);

  // Filter customers for modal
  const filteredCustomers = useMemo(() => {
      return customers.filter(c => 
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(customerSearchTerm.toLowerCase()) ||
        (c.phone || '').includes(customerSearchTerm)
      );
  }, [customerSearchTerm, customers]);

  // Preview Calculations for Modal
  const previewDiscountAmount = tempDiscountType === 'PERCENTAGE'
    ? subtotal * (parseFloat(tempDiscountValue || '0') / 100)
    : parseFloat(tempDiscountValue || '0');
  
  const previewEffectiveDiscount = Math.min(previewDiscountAmount, subtotal);
  const previewNewSubtotal = subtotal - previewEffectiveDiscount;
  const previewTax = previewNewSubtotal * taxRate;
  const previewTotal = previewNewSubtotal + previewTax;

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("This item is out of stock!");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Only ${product.stock} items in stock.`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const product = products.find(p => p.id === id);
          if (!product) return item;

          const newQty = item.quantity + delta;
          
          if (newQty > product.stock) {
             alert(`Cannot add more. Only ${product.stock} items in stock.`);
             return item;
          }
          
          const finalQty = Math.max(1, newQty);
          return { ...item, quantity: finalQty };
        }
        return item;
      });
    });
  };

  const toggleRedeemPoints = () => {
    if (pointsRedeemed > 0) {
        setPointsRedeemed(0);
    } else {
        // Calculate max redeemable points based on total order value
        // We can't redeem more value than the subtotal minus existing discounts
        const remainingSubtotal = subtotal - baseDiscountAmount;
        if (remainingSubtotal <= 0) {
            alert("Order total is too low to redeem points.");
            return;
        }

        const maxPointsValue = remainingSubtotal;
        const maxPoints = Math.ceil(maxPointsValue / POINT_CONVERSION_RATE);
        const pointsToUse = Math.min(selectedCustomer.points, maxPoints);

        if (pointsToUse <= 0) {
            alert("Insufficient points balance.");
            return;
        }
        setPointsRedeemed(pointsToUse);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
      setSelectedCustomer(customer);
      setPointsRedeemed(0); // Reset points redemption when customer changes
      setIsCustomerModalOpen(false);
      setCustomerSearchTerm('');
  };

  const handleCheckout = async (method: PaymentMethod, amountPaid: number = total, changeAmount: number = 0) => {
    // Validate credit sales - only allow for registered customers
    if (method === PaymentMethod.CREDIT && selectedCustomer.id === 'walk-in') {
      alert('Credit sales are only available for registered customers. Please select a customer.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create order via API
      const orderPayload = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        customerId: selectedCustomer.id !== 'walk-in' ? selectedCustomer.id : undefined,
        cashierId: 'cashier-user-id', // Default cashier from seed data
        paymentMethod: method,
        discount: effectiveDiscount,
        pointsRedeemed: pointsRedeemed,
      };

      const createdOrder = await Api.orders.create(orderPayload);
      
      // Calculate new points earned
      const earned = Math.floor(subtotalAfterDiscount * POINTS_EARN_RATE);
      const previousBalance = selectedCustomer.points;
      const newBalance = previousBalance - pointsRedeemed + earned;
      
      // For non-walk-in customers, update points only (balance is auto-calculated from ledger on backend)
      if (selectedCustomer.id !== 'walk-in') {
        try {
          await Api.customers.update(selectedCustomer.id, {
            points: newBalance,
          });
        } catch (updateError) {
          console.error('Error updating customer points:', updateError);
          // Continue with transaction even if customer update fails
        }
      }
      
      // Snapshot the transaction data for the receipt
      const transactionSnapshot: TransactionSnapshot = {
          items: [...cart],
          subtotal,
          tax,
          discount: effectiveDiscount,
          total,
          date: new Date(),
          orderId: createdOrder.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
          customer: selectedCustomer,
          pointsEarned: earned,
          pointsRedeemed: pointsRedeemed,
          pointsBalance: newBalance,
            paymentMethod: method,
            amountPaid,
            change: changeAmount,
      };
      setLastTransaction(transactionSnapshot);

      // Close payment modal and show receipt prompt first
      setIsPaymentModalOpen(false);
      setIsReceiptPromptOpen(true);

      // Open the cash drawer via QZ Tray (non-blocking — fires-and-forgets)
      Api.pos.openDrawer()
        .then(({ command }) => sendDrawerOpenCommand(command))
        .catch(() => { /* QZ Tray unavailable — ignore */ });

      // Refresh products to get updated stock (non-blocking)
      try {
        const updatedProducts = await Api.products.getAll();
        setProducts(updatedProducts);
      } catch (refreshError) {
        console.error('Error refreshing products:', refreshError);
      }

      // Refresh customer to get updated points (non-blocking)
      if (selectedCustomer.id !== 'walk-in') {
        try {
          const updatedCustomers = await Api.customers.getAll();
          setCustomers([WALK_IN_CUSTOMER, ...updatedCustomers]);
        } catch (refreshError) {
          console.error('Error refreshing customers:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to process order. Please try again.');
      setIsPaymentModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const parsedAmountGiven = parseFloat(amountGivenInput || '0');
  const validAmountGiven = Number.isFinite(parsedAmountGiven) ? parsedAmountGiven : 0;
  const calculatedChange = Math.max(0, validAmountGiven - total);

  const confirmPayment = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Please add items before payment.');
      return;
    }

    if (selectedPaymentMethod === PaymentMethod.CARD) {
      await handleCheckout(PaymentMethod.CARD, total, 0);
      return;
    }

    if (selectedPaymentMethod === PaymentMethod.CREDIT) {
      await handleCheckout(PaymentMethod.CREDIT, total, 0);
      return;
    }

    if (validAmountGiven < total) {
      alert('Amount given is less than total amount.');
      return;
    }

    await handleCheckout(PaymentMethod.CASH, validAmountGiven, calculatedChange);
  };

  const finalizeTransaction = (printType: 'RECEIPT' | 'INVOICE' | null) => {
    if (printType) {
        handlePrint(printType);
    }
    // We keep lastTransaction in state in case they want to print again later, 
    // or we can clear it. For now, we leave it, but we clear the active cart.
    setIsReceiptPromptOpen(false);
    clearCart();
    setSelectedCustomer(WALK_IN_CUSTOMER); // Reset to Walk-in after transaction
  };

  const applyDiscount = () => {
    const val = parseFloat(tempDiscountValue);
    if (isNaN(val) || val < 0) {
      setDiscountValue(0);
    } else {
      setDiscountValue(val);
    }
    setDiscountType(tempDiscountType);
    setIsDiscountModalOpen(false);
  };

  // Refund Logic
  const handleRefundSearch = async () => {
    if (!refundSearchQuery.trim()) return;
    
    try {
      const order: any = await Api.orders.getByOrderNumber(refundSearchQuery.trim());
      if (order) {
        // Transform API order to match the component's expected structure
        const orderItems = order.items || order.orderItems || [];
        const transformedOrder = {
          id: order.id,  // Use actual UUID for API calls
          orderNumber: order.orderNumber,  // Keep orderNumber for display
          customerId: order.customerId || 'WALK-IN',
          items: orderItems.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            name: item.product?.name || 'Unknown Product',
            quantity: item.quantity,
            price: item.unitPrice || item.price
          })),
          total: order.total,
          paymentMethod: order.payments?.[0]?.method || 'Cash',
          timestamp: new Date(order.createdAt || order.date).getTime(),
          status: order.status
        };
        setFoundOrder(transformedOrder);
        setSelectedRefundItems(new Set());
        // Initialize refund quantities to full quantities
        const initialQuantities: Record<string, number> = {};
        transformedOrder.items.forEach((item: any) => {
          initialQuantities[item.id] = item.quantity;
        });
        setRefundQuantities(initialQuantities);
        setExchangeIssuedItems([]); // Reset exchange items
      } else {
        setFoundOrder(null);
        alert('Order not found');
      }
    } catch (error) {
      console.error('Error searching order:', error);
      setFoundOrder(null);
      alert('Order not found');
    }
  };

  const toggleRefundItem = (itemId: string, maxQty: number) => {
    const newSet = new Set(selectedRefundItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
      // Set to max quantity when selecting
      setRefundQuantities(prev => ({ ...prev, [itemId]: maxQty }));
    }
    setSelectedRefundItems(newSet);
  };

  const updateRefundQuantity = (itemId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(qty, maxQty));
    setRefundQuantities(prev => ({ ...prev, [itemId]: validQty }));
  };

  const calculateRefundTotal = () => {
    if (!foundOrder) return 0;
    return foundOrder.items
      .filter(item => selectedRefundItems.has(item.id))
      .reduce((sum, item) => {
        const qty = refundQuantities[item.id] || item.quantity;
        return sum + (item.price * qty);
      }, 0);
  };

  // Exchange: Calculate issued items total
  const calculateIssuedTotal = () => {
    return exchangeIssuedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Exchange: Add product to issued items
  const addExchangeIssuedItem = (product: Product) => {
    const existing = exchangeIssuedItems.find(item => item.productId === product.id);
    if (existing) {
      setExchangeIssuedItems(prev => 
        prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      );
    } else {
      setExchangeIssuedItems(prev => [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: Number(product.price)
      }]);
    }
  };

  // Exchange: Update issued item quantity
  const updateExchangeIssuedQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setExchangeIssuedItems(prev => prev.filter(item => item.productId !== productId));
    } else {
      setExchangeIssuedItems(prev => 
        prev.map(item => item.productId === productId ? { ...item, quantity: qty } : item)
      );
    }
  };

  // Exchange: Remove issued item
  const removeExchangeIssuedItem = (productId: string) => {
    setExchangeIssuedItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Filtered products for exchange search
  const exchangeFilteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(exchangeSearchQuery.toLowerCase()) ||
    (p.sku?.toLowerCase() || '').includes(exchangeSearchQuery.toLowerCase()) ||
    (p.productCode?.toLowerCase() || '').includes(exchangeSearchQuery.toLowerCase()) ||
    (p.barcode?.toLowerCase() || '').includes(exchangeSearchQuery.toLowerCase())
  ).slice(0, 10);

  const handleProcessRefund = async () => {
     if (selectedRefundItems.size === 0) {
        alert("Select items for refund.");
        return;
     }

     if (!foundOrder) {
        alert("No order selected for refund.");
        return;
     }

     setIsProcessing(true);
     
     try {
       // Build items array with quantities
       const itemsToRefund = foundOrder.items
         .filter((item: any) => selectedRefundItems.has(item.id))
         .map((item: any) => ({
           itemId: item.id,
           quantity: refundQuantities[item.id] || item.quantity
         }));

       await Api.orders.refund(foundOrder.id, itemsToRefund, 'REFUND - Customer Request');

       const totalRefund = calculateRefundTotal();
       
       // Show animated success modal
       setSuccessModalData({
         title: 'Refund Successful!',
         message: 'The refund has been processed and stock has been updated.',
         amount: formatMoney(totalRefund),
       });
       setIsSuccessModalOpen(true);
       
       // Refresh products to update stock
       const productsData = await Api.products.getAll();
       setProducts(productsData);
       
       // Close refund modal and reset state
       setIsRefundModalOpen(false);
       setFoundOrder(null);
       setRefundSearchQuery('');
       setSelectedRefundItems(new Set());
       setRefundQuantities({});
       setRefundMethod('Original Payment');
       
     } catch (error: any) {
       console.error('Refund error:', error);
       const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';
       alert(`Failed to process refund: ${errorMessage}`);
     } finally {
       setIsProcessing(false);
     }
  };

  const handleProcessExchange = async () => {
    if (selectedRefundItems.size === 0) {
      alert("Select items to return for exchange.");
      return;
    }

    if (exchangeIssuedItems.length === 0) {
      alert("Add items to issue in exchange.");
      return;
    }

    if (!foundOrder) {
      alert("No order selected for exchange.");
      return;
    }

    setIsProcessing(true);

    try {
      // Build returned items
      const returnedItems = foundOrder.items
        .filter((item: any) => selectedRefundItems.has(item.id))
        .map((item: any) => ({
          productId: item.productId,
          quantity: refundQuantities[item.id] || item.quantity,
          unitPrice: Number(item.price)
        }));

      // Build issued items
      const issuedItems = exchangeIssuedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price
      }));

      const result = await Api.exchanges.create({
        originalOrderId: foundOrder.id,
        customerId: foundOrder.customerId !== 'WALK-IN' ? foundOrder.customerId : undefined,
        returnedItems,
        issuedItems,
        notes: `Exchange from order ${foundOrder.orderNumber}`
      });

      const difference = result.summary.difference;
      const differenceType = result.summary.differenceType;

      // Show animated success modal
      setSuccessModalData({
        title: 'Exchange Successful!',
        message: differenceType === 'CUSTOMER_PAYS' 
          ? `Customer owes: ${formatMoney(difference)}`
          : differenceType === 'REFUND_DUE'
            ? `Refund due to customer: ${formatMoney(Math.abs(difference))}`
            : 'Exchange completed with even value.',
        amount: formatMoney(Math.abs(difference)),
      });
      setIsSuccessModalOpen(true);

      // Refresh products to update stock
      const productsData = await Api.products.getAll();
      setProducts(productsData);

      // Close modal and reset state
      setIsRefundModalOpen(false);
      setFoundOrder(null);
      setRefundSearchQuery('');
      setSelectedRefundItems(new Set());
      setRefundQuantities({});
      setExchangeIssuedItems([]);
      setExchangeSearchQuery('');
      setRefundMethod('Original Payment');

    } catch (error: any) {
      console.error('Exchange error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';
      alert(`Failed to process exchange: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
    {/* Loading State */}
    {isLoading && (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-7rem)] gap-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
      </div>
    )}

    {!isLoading && (
    <>
    {/* CSS for printing logic and custom scrollbar */}
    <style>{`
      @page {
        size: 80mm auto;
        margin: 0;
      }
      
      @media print {
        /* Default hide everything */
        body * { visibility: hidden; }
        
        /* Show thermal receipt if that mode is active */
        body.printing-receipt #printable-receipt,
        body.printing-receipt #printable-receipt * { 
          visibility: visible; 
        }
        body.printing-receipt #printable-receipt {
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 80mm; 
          max-width: 80mm;
          margin: 0; 
          padding: 2mm; 
          display: block !important;
        }

        /* Show A4 Invoice if that mode is active */
        body.printing-invoice #printable-invoice,
        body.printing-invoice #printable-invoice * { 
          visibility: visible; 
        }
        body.printing-invoice #printable-invoice {
          position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; display: block !important;
        }
        
        /* Ensure the modal overlay doesn't block printing */
        .fixed { position: static !important; }
      }
      
      /* Custom scrollbar for category section */
      .category-scroll {
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
        padding-bottom: 2px;
      }
      
      .category-scroll:hover {
        scrollbar-color: rgba(14, 165, 233, 0.3) transparent;
      }
      
      .category-scroll::-webkit-scrollbar {
        height: 4px;
      }
      
      .category-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .category-scroll::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 10px;
        transition: all 0.3s ease;
      }
      
      .category-scroll:hover::-webkit-scrollbar-thumb {
        background: rgba(14, 165, 233, 0.3);
      }
      
      .category-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(14, 165, 233, 0.5);
      }
    `}</style>

    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-7rem)] gap-4 overflow-visible lg:overflow-hidden pb-20 lg:pb-0 print:hidden">
      
      {/* LEFT SIDE: PRODUCT CATALOG (GRID) */}
      <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden min-h-[500px] lg:min-h-0 relative shadow-sm">

        {/* Top Command Bar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-4 items-center bg-neutral-50 dark:bg-neutral-900 relative z-10">
           <div className="relative flex-1 w-full">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5 z-20" />
             <input 
               ref={searchInputRef}
               type="text" 
               placeholder={t('searchProducts')}
               className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 font-mono text-sm relative z-10"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key !== 'Enter') return;
                 const q = searchQuery.trim();
                 if (!q) return;
                 // Exact match by barcode, productCode, or sku (barcode scanner input)
                 const exact = products.find(p =>
                   p.barcode === q || p.productCode === q || p.sku === q
                 );
                 if (exact) {
                   addToCart(exact);
                   setSearchQuery('');
                   e.preventDefault();
                 }
               }}
             />
           </div>
           
           {/* Futuristic Category Chips */}
           <div className="flex gap-2 overflow-x-auto w-full md:w-auto md:max-w-[60%] items-center category-scroll">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-mono tracking-wider uppercase transition-all duration-200 border whitespace-nowrap flex-shrink-0 ${
                    selectedCategory === cat 
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-500 text-sky-600 dark:text-sky-400' 
                    : 'bg-white dark:bg-transparent border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-sky-400 hover:text-sky-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* Product Grid - Compact Design */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide h-[400px] lg:h-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart(product); } }}
                tabIndex={product.stock > 0 ? 0 : -1}
                role="button"
                aria-label={`Add ${product.name} to cart — ${formatMoney(Number(product.price))} — ${product.stock} in stock`}
                className={`
                    relative bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 
                    hover:border-sky-500 cursor-pointer transition-all duration-200 group overflow-hidden
                    hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                    ${product.stock <= 0 ? 'opacity-60 pointer-events-none grayscale' : ''}
                `}
              >
                {/* Image Section - Reduced Height */}
                <div className="h-24 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  
                  {/* Stock Indicator Dot */}
                  <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full z-10 ${
                      product.stock <= 0 ? 'bg-red-500' : 
                      product.stock <= 10 ? 'bg-amber-500' : 
                      'bg-emerald-500'
                  }`}></div>
                </div>

                {/* Info Section */}
                <div className="p-3">
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs leading-tight mb-2 h-8 line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {product.name}
                  </h3>
                  <div className="flex justify-between items-end">
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-500 text-sm">
                      {formatMoney(Number(product.price))}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono tracking-tight">
                        Qty: {product.stock}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: TERMINAL (CART) */}
      <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden relative min-h-[500px] lg:min-h-0 shadow-sm">
        
        {/* Terminal Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-neutral-800 dark:bg-white rounded-lg relative">
                <User className="w-4 h-4 text-white dark:text-neutral-900" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-sky-500 rounded-full border border-white flex items-center justify-center">
                    <Star className="w-2 h-2 text-white fill-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-mono tracking-wider mb-0.5">{t('customers')}</div>
                <div className="flex items-center gap-2">
                    <div className="font-bold text-neutral-800 dark:text-white text-sm truncate max-w-[120px]">{selectedCustomer.name}</div>
                    <div className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/30 text-[9px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20 whitespace-nowrap">
                        {selectedCustomer.points} {t('pts')}
                    </div>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsCustomerModalOpen(true)}
                className="p-2 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-colors border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 group"
                title="Change Customer (Ctrl+U)"
             >
                <RefreshCw className="w-4 h-4 text-neutral-400 group-hover:text-sky-500 transition-colors" />
             </button>
             <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>
             <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-mono text-green-600 dark:text-green-400 font-bold">{t('loading')}</span>
             </div>
          </div>
        </div>

        {/* Cart Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-neutral-50 dark:bg-neutral-950 relative">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 py-12 lg:py-0">
              <div className="w-24 h-24 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-full flex items-center justify-center mb-4">
                 <ScanLine className="w-10 h-10" />
              </div>
              <p className="font-mono text-sm tracking-widest uppercase">{t('loading')}</p>
              <p className="text-xs opacity-60 mt-1">{t('loading')}</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div 
                key={item.id} 
                className="group relative flex gap-3 items-center bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-sky-500 shadow-sm transition-colors duration-200"
              >
                {/* Quantity Controls */}
                <div className="flex flex-col items-center gap-1 bg-neutral-50 dark:bg-neutral-800 rounded-md p-0.5 border border-neutral-200 dark:border-neutral-700">
                    <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} tabIndex={0} aria-label={`Increase quantity of ${item.name}`} className="p-0.5 hover:text-sky-500 transition-colors focus:outline-none focus:text-sky-500"><Plus className="w-3 h-3" /></button>
                    <span className="text-xs font-mono font-bold w-5 text-center" aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                    <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} tabIndex={0} aria-label={`Decrease quantity of ${item.name}`} className="p-0.5 hover:text-red-500 transition-colors focus:outline-none focus:text-red-500"><Minus className="w-3 h-3" /></button>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-neutral-800 dark:text-neutral-200 text-sm truncate">{item.name}</h4>
                  <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-2">
                    <span>SKU: {item.sku}</span>
                    <span className="text-sky-600 dark:text-sky-500">@ {formatMoney(Number(item.price))}</span>
                  </div>
                </div>
                
                <div className="text-right">
                    <div className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                    {formatMoney(Number(item.price) * item.quantity)}
                    </div>
                    <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-[10px] text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 mt-1 ml-auto"
                    >
                        <Trash2 className="w-3 h-3" /> REMOVE
                    </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Digital Readout / Totals */}
        <div className="bg-white dark:bg-neutral-900 p-5 border-t border-neutral-200 dark:border-neutral-800 relative z-20">

           <div className="space-y-3 mb-4">
              <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                <span>{t('subtotal')}</span>
                 <span>{formatMoney(subtotal)}</span>
              </div>
              
              {/* Discount Display */}
              {discountValue > 0 && (
                <div className="flex justify-between items-center text-xs font-mono text-sky-600 dark:text-sky-400 animate-in fade-in slide-in-from-right-5">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" /> 
                    DISCOUNT ({discountType === 'PERCENTAGE' ? `${discountValue}%` : formatMoney(discountValue)})
                  </span>
                  <span>-{formatMoney(baseDiscountAmount)}</span>
                </div>
              )}

              {/* Points Redemption Display */}
              <div className="flex justify-between items-center text-xs font-mono animate-in fade-in slide-in-from-right-5">
                 <button 
                    onClick={toggleRedeemPoints}
                    disabled={cart.length === 0 || (pointsRedeemed === 0 && selectedCustomer.points === 0)}
                    className={`flex items-center gap-1 transition-colors ${pointsRedeemed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400 hover:text-amber-500'}`}
                 >
                    {pointsRedeemed > 0 ? (
                        <Check className="w-3 h-3" />
                    ) : (
                        <div className={`w-3 h-3 border rounded-sm ${cart.length > 0 && selectedCustomer.points > 0 ? 'border-amber-500' : 'border-neutral-500'}`}></div>
                    )}
                    <span>USE POINTS ({pointsRedeemed > 0 ? `-${pointsRedeemed}` : selectedCustomer.points})</span>
                 </button>
                 <span className={pointsRedeemed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}>
                  -{formatMoney(pointsDiscountValue)}
                 </span>
              </div>

              <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                <span>{t('tax')}</span>
                <span>{formatMoney(tax)}</span>
              </div>
              
              <div className="flex justify-between text-2xl font-black text-neutral-900 dark:text-white pt-2 border-t border-dashed border-neutral-300 dark:border-neutral-800 font-mono tracking-tight">
                <span>{t('total')}</span>
                <span className="text-sky-600 dark:text-sky-500">{formatMoney(total)}</span>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-2 mb-3">
             <button 
               onClick={clearCart} 
               disabled={cart.length === 0}
               tabIndex={0}
               className="col-span-1 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 dark:border-red-500/20 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 group focus:outline-none focus:ring-2 focus:ring-red-500"
               title="Clear Cart (Ctrl+C)"
               aria-label="Clear cart"
             >
                <Trash2 className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase">{t('cancel')}</span>
             </button>

             <button 
               onClick={openDiscountModal}
               disabled={cart.length === 0}
               tabIndex={0}
               className={`col-span-1 py-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 ${discountValue > 0 ? 'bg-sky-600 text-white shadow-sm border-sky-600' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 hover:bg-sky-600 hover:text-white border-sky-200 dark:border-sky-500/20'}`}
               title="Discount (Ctrl+D)"
               aria-label="Apply discount"
             >
                <Percent className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase">{discountValue > 0 ? t('edit') : t('discount')}</span>
             </button>

             <button 
               onClick={() => setIsRefundModalOpen(true)}
               tabIndex={0}
               className="col-span-1 py-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200 dark:border-orange-500/20 transition-all flex flex-col items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
               title="Refund (Ctrl+R)"
               aria-label="Process refund"
             >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase">{t('cancel')}</span>
             </button>
           </div>

           <button 
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={cart.length === 0}
                tabIndex={0}
                className="w-full relative overflow-hidden group bg-sky-600 hover:bg-sky-700 text-white p-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:shadow-none transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                title="Pay (Ctrl+P or F12)"
                aria-label="Open payment — press F12 as shortcut"
            >
                <div className="relative flex items-center justify-between">
                    <span className="font-bold tracking-widest uppercase flex items-center gap-2">
                        <Zap className="w-5 h-5 fill-current" /> {t('payment')}
                    </span>
                    <span className="font-mono text-lg font-bold">{formatMoney(total)}</span>
                </div>
            </button>
        </div>
      </div>

      {/* MODALS */}
      
      {/* Receipt Prompt Modal */}
      {isReceiptPromptOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4" role="dialog" aria-modal="true" aria-label="Print receipt">
            <div
              ref={receiptModalRef}
              className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden text-center p-6 bg-white dark:bg-neutral-900"
              tabIndex={-1}
              onKeyDown={(e) => {
                trapFocus(e, receiptModalRef);
                if (e.key === 'Enter') { e.preventDefault(); finalizeTransaction('RECEIPT'); }
                if (e.key === '1') { e.preventDefault(); finalizeTransaction('RECEIPT'); }
                if (e.key === '2') { e.preventDefault(); finalizeTransaction('INVOICE'); }
                if (e.key === '3') { e.preventDefault(); finalizeTransaction(null); }
              }}
            >
                <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-500/30">
                    <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 uppercase tracking-wide">{t('success')}</h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">{t('loading')}</p>
                
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex gap-3">
                        <button 
                            onClick={() => finalizeTransaction('RECEIPT')}
                            autoFocus
                            tabIndex={0}
                            className="flex-1 py-3 px-4 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors uppercase text-xs tracking-wider flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                        >
                            <Printer className="w-4 h-4" /> <span className="font-mono text-sky-200 mr-1">[1]</span> Receipt
                        </button>
                        <button 
                            onClick={() => finalizeTransaction('INVOICE')}
                            tabIndex={0}
                            className="flex-1 py-3 px-4 rounded-lg bg-neutral-800 dark:bg-white text-white dark:text-neutral-900 font-bold hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors uppercase text-xs tracking-wider flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                        >
                            <FileText className="w-4 h-4" /> <span className="font-mono opacity-60 mr-1">[2]</span> Invoice
                        </button>
                    </div>
                    <button 
                        onClick={() => finalizeTransaction(null)}
                        tabIndex={0}
                        className="py-2.5 px-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-white transition-colors uppercase text-xs tracking-wider focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                    >
                        <span className="font-mono text-neutral-400 mr-1">[3]</span> {t('cancel')} <span className="text-xs font-mono text-neutral-400 ml-1">[Esc]</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Discount Modal with Impact Preview */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4" role="dialog" aria-modal="true" aria-label="Apply discount">
          <div
            ref={discountModalRef}
            className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden bg-white dark:bg-neutral-900"
            onKeyDown={(e) => trapFocus(e, discountModalRef)}
          >
             <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
               <h3 className="font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                 <Tag className="w-4 h-4 text-sky-500" /> {t('discount')}
               </h3>
               <button onClick={() => setIsDiscountModalOpen(false)} tabIndex={0} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 rounded" aria-label="Close discount modal"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="p-6 bg-white dark:bg-neutral-900">
                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg mb-6 border border-neutral-200 dark:border-neutral-700" role="radiogroup" aria-label="Discount type">
                     <button 
                       onClick={() => setTempDiscountType('PERCENTAGE')}
                       role="radio"
                       aria-checked={tempDiscountType === 'PERCENTAGE'}
                       tabIndex={0}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${tempDiscountType === 'PERCENTAGE' ? 'bg-sky-600 text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'}`}
                     >
                       {t('discount')} %
                     </button>
                     <button 
                       onClick={() => setTempDiscountType('FIXED')}
                       role="radio"
                       aria-checked={tempDiscountType === 'FIXED'}
                       tabIndex={0}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${tempDiscountType === 'FIXED' ? 'bg-sky-600 text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'}`}
                     >
                       {t('discount')} {currencySymbol}
                     </button>
                </div>
                
                <div className="mb-6 relative">
                    <input 
                       ref={discountInputRef}
                       type="number"
                       autoFocus
                       value={tempDiscountValue}
                       onChange={(e) => setTempDiscountValue(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                       className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-4 text-2xl font-mono text-center text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-700"
                       placeholder="0.00"
                    />
                </div>

                {/* Impact Preview */}
                <div className="mb-6 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono">
                    <Calculator className="w-3 h-3" /> {t('impactSimulation')}
                  </div>
                  <div className="space-y-1 font-mono text-sm">
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-500">
                       <span>{t('currentSubtotal')}</span>
                      <span>{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sky-600 dark:text-sky-500">
                       <span>{t('discount')}</span>
                      <span>-{formatMoney(previewEffectiveDiscount)}</span>
                    </div>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
                    <div className="flex justify-between text-neutral-900 dark:text-white font-bold">
                       <span>{t('newTotalWithTax')}</span>
                      <span>{formatMoney(previewTotal)}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                    onClick={applyDiscount}
                    tabIndex={0}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                >
                    {t('confirm')} <span className="text-xs font-mono opacity-75 ml-1">[Enter]</span>
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Refund/Exchange Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4" role="dialog" aria-modal="true" aria-label="Refund or exchange">
           <div
             ref={refundModalRef}
             className={`w-full ${refundAction === 'EXCHANGE' ? 'max-w-4xl' : 'max-w-lg'} rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col max-h-[90vh] bg-white dark:bg-neutral-900`}
             onKeyDown={(e) => trapFocus(e, refundModalRef)}
           >
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                 <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-500" /> 
                    <span className="text-amber-600 dark:text-amber-400">{t('returnProtocol')}</span>
                 </h3>
                 <button onClick={() => setIsRefundModalOpen(false)} tabIndex={0} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 rounded" aria-label="Close refund modal">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto bg-white dark:bg-neutral-900 flex-1">
                 {/* Mode Switcher */}
                 <div className="flex gap-4 mb-6" role="radiogroup" aria-label="Return type">
                     <button onClick={() => setRefundAction('REFUND')} tabIndex={0} role="radio" aria-checked={refundAction === 'REFUND'} className={`flex-1 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 ${refundAction === 'REFUND' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-600 dark:text-amber-400' : 'bg-neutral-50 dark:bg-neutral-800 border-transparent text-neutral-500'}`}>
                       <div className="text-xs font-bold uppercase tracking-wider">{t('refund')}</div>
                     </button>
                     <button onClick={() => setRefundAction('EXCHANGE')} tabIndex={0} role="radio" aria-checked={refundAction === 'EXCHANGE'} className={`flex-1 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${refundAction === 'EXCHANGE' ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-500 text-sky-600 dark:text-sky-400' : 'bg-neutral-50 dark:bg-neutral-800 border-transparent text-neutral-500'}`}>
                       <div className="text-xs font-bold uppercase tracking-wider">{t('exchange')}</div>
                     </button>
                 </div>

                 {/* Search Box with AutoFocus */}
                 <div className="mb-6">
                    <label className="block text-xs font-mono text-neutral-500 dark:text-neutral-400 mb-2 uppercase">{t('locateTransactionId')}</label>
                    <div className="relative">
                       <input 
                         ref={refundInputRef}
                         type="text" 
                         autoFocus
                         placeholder={t('scanReceiptOrTypeId')}
                         className="w-full pl-4 pr-12 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400"
                         value={refundSearchQuery}
                         onChange={(e) => setRefundSearchQuery(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleRefundSearch()}
                       />
                       <button 
                         onClick={handleRefundSearch}
                         tabIndex={0}
                         aria-label="Search order"
                         className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                       >
                          <ChevronRight className="w-4 h-4" />
                       </button>
                    </div>
                 </div>

                 {foundOrder ? (
                    <div className={`${refundAction === 'EXCHANGE' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
                       {/* Left Panel: Items to Return */}
                       <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                          <div className="bg-neutral-100 dark:bg-neutral-800/50 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                                <div>
                                   <span className="text-xs text-neutral-500 block">ID FOUND</span>
                                   <span className="font-mono font-medium text-neutral-900 dark:text-white">{foundOrder.orderNumber || foundOrder.id}</span>
                                </div>
                                <div className="text-right">
                                   <span className="text-xs text-neutral-500 block">DATE</span>
                                   <span className="text-sm text-neutral-700 dark:text-neutral-300">{new Date(foundOrder.timestamp).toLocaleDateString()}</span>
                                </div>
                          </div>

                          <div>
                             <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mb-2 uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                Items to {refundAction === 'REFUND' ? 'Refund' : 'Return'}
                             </p>
                             <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                {foundOrder.items.map(item => (
                                   <div 
                                     key={item.id} 
                                     className={`p-3 rounded-xl border transition-all ${selectedRefundItems.has(item.id) ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-transparent hover:border-neutral-300 dark:hover:border-neutral-600'}`}
                                   >
                                      <div className="flex items-center gap-3">
                                         <div 
                                           onClick={() => toggleRefundItem(item.id, item.quantity)}
                                           className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${selectedRefundItems.has(item.id) ? 'bg-orange-500 border-orange-500' : 'border-neutral-300 dark:border-neutral-600'}`}
                                         >
                                            {selectedRefundItems.has(item.id) && <Check className="w-3 h-3 text-white" />}
                                         </div>
                                         <div className="flex-1">
                                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{item.name}</p>
                                            <p className="text-xs text-neutral-500">Original qty: {item.quantity} × {formatMoney(item.price)}</p>
                                         </div>
                                      </div>
                                      
                                      {/* Quantity Selector - only show when item is selected */}
                                      {selectedRefundItems.has(item.id) && (
                                         <div className="mt-3 flex items-center justify-between pl-8">
                                            <div className="flex items-center gap-2">
                                               <span className="text-xs text-neutral-500">Return Qty:</span>
                                               <div className="flex items-center border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden">
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); updateRefundQuantity(item.id, (refundQuantities[item.id] || 1) - 1, item.quantity); }}
                                                    className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300"
                                                  >
                                                    <Minus className="w-3 h-3" />
                                                  </button>
                                                  <input 
                                                    type="number" 
                                                    min="1" 
                                                    max={item.quantity}
                                                    value={refundQuantities[item.id] || item.quantity}
                                                    onChange={(e) => updateRefundQuantity(item.id, parseInt(e.target.value) || 1, item.quantity)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-12 text-center py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm border-0 focus:outline-none"
                                                  />
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); updateRefundQuantity(item.id, (refundQuantities[item.id] || 1) + 1, item.quantity); }}
                                                    className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                  </button>
                                               </div>
                                            </div>
                                            <div className="font-mono font-bold text-orange-600 dark:text-orange-400">
                                               {formatMoney(Number(item.price) * (refundQuantities[item.id] || item.quantity))}
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                ))}
                             </div>
                             <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-between">
                                <span className="text-sm text-neutral-500">Return Total:</span>
                                <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{formatMoney(calculateRefundTotal())}</span>
                             </div>
                          </div>
                       </div>

                       {/* Right Panel: Items to Issue (Exchange Only) */}
                       {refundAction === 'EXCHANGE' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 border-l border-neutral-200 dark:border-neutral-700 pl-6">
                             <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mb-2 uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                Items to Issue
                             </p>
                             
                             {/* Product Search */}
                             <div className="relative">
                                <input 
                                  type="text" 
                                  placeholder="Search products to add..."
                                  className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400"
                                  value={exchangeSearchQuery}
                                  onChange={(e) => setExchangeSearchQuery(e.target.value)}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                             </div>
                             
                             {/* Product Search Results */}
                             {exchangeSearchQuery && (
                                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 max-h-[150px] overflow-y-auto">
                                   {exchangeFilteredProducts.map(product => (
                                      <div 
                                        key={product.id}
                                        onClick={() => { addExchangeIssuedItem(product); setExchangeSearchQuery(''); }}
                                        className="flex items-center justify-between p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer border-b border-neutral-100 dark:border-neutral-700 last:border-0"
                                      >
                                         <span className="text-sm text-neutral-700 dark:text-neutral-200">{product.name}</span>
                                         <span className="text-sm font-mono text-neutral-500">{formatMoney(Number(product.price))}</span>
                                      </div>
                                   ))}
                                   {exchangeFilteredProducts.length === 0 && (
                                      <p className="p-3 text-sm text-neutral-500 text-center">No products found</p>
                                   )}
                                </div>
                             )}
                             
                             {/* Issued Items List */}
                             <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {exchangeIssuedItems.length === 0 ? (
                                   <div className="text-center py-6 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                                      <Box className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                      <p className="text-xs font-mono">Search and add products</p>
                                   </div>
                                ) : (
                                   exchangeIssuedItems.map(item => (
                                      <div key={item.productId} className="flex items-center gap-3 p-3 bg-sky-50 dark:bg-sky-500/10 rounded-xl border border-sky-300 dark:border-sky-500/30">
                                         <div className="flex-1">
                                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{item.name}</p>
                                            <p className="text-xs text-neutral-500">{formatMoney(item.price)} each</p>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <div className="flex items-center border border-sky-300 dark:border-sky-500/50 rounded-lg overflow-hidden">
                                               <button 
                                                 onClick={() => updateExchangeIssuedQty(item.productId, item.quantity - 1)}
                                                 className="px-2 py-1 bg-sky-100 dark:bg-sky-900/30 hover:bg-sky-200 dark:hover:bg-sky-800/50 text-sky-600 dark:text-sky-300"
                                               >
                                                 <Minus className="w-3 h-3" />
                                               </button>
                                               <span className="px-3 py-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm font-mono">{item.quantity}</span>
                                               <button 
                                                 onClick={() => updateExchangeIssuedQty(item.productId, item.quantity + 1)}
                                                 className="px-2 py-1 bg-sky-100 dark:bg-sky-900/30 hover:bg-sky-200 dark:hover:bg-sky-800/50 text-sky-600 dark:text-sky-300"
                                               >
                                                 <Plus className="w-3 h-3" />
                                               </button>
                                            </div>
                                            <button 
                                              onClick={() => removeExchangeIssuedItem(item.productId)}
                                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                         </div>
                                         <div className="font-mono font-bold text-sky-600 dark:text-sky-400 w-20 text-right">
                                            {formatMoney(item.price * item.quantity)}
                                         </div>
                                      </div>
                                   ))
                                )}
                             </div>
                             
                             <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-between">
                                <span className="text-sm text-neutral-500">Issue Total:</span>
                                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{formatMoney(calculateIssuedTotal())}</span>
                             </div>
                             
                             {/* Difference Calculation */}
                             <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                                <div className="flex justify-between items-center">
                                   <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Difference:</span>
                                   <span className={`font-mono font-bold text-lg ${(calculateIssuedTotal() - calculateRefundTotal()) > 0 ? 'text-green-600 dark:text-green-400' : (calculateIssuedTotal() - calculateRefundTotal()) < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                      {(calculateIssuedTotal() - calculateRefundTotal()) > 0 ? '+' : ''}{formatMoney(calculateIssuedTotal() - calculateRefundTotal())}
                                   </span>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                   {(calculateIssuedTotal() - calculateRefundTotal()) > 0 
                                     ? 'Customer pays additional amount' 
                                     : (calculateIssuedTotal() - calculateRefundTotal()) < 0 
                                       ? 'Refund due to customer' 
                                       : 'Even exchange'}
                                </p>
                             </div>
                          </div>
                       )}
                    </div>
                 ) : (
                    <div className="text-center py-8 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                       <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                       <p className="text-xs font-mono">{t('awaitingInput')}</p>
                    </div>
                 )}
              </div>

              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex gap-3 justify-between items-center">
                 <div className="text-sm font-mono text-neutral-900 dark:text-white">
                    {refundAction === 'REFUND' ? (
                       <>
                          <span className="text-neutral-500 mr-2">REFUND:</span>
                          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatMoney(calculateRefundTotal())}</span>
                       </>
                    ) : (
                       <>
                          <span className="text-neutral-500 mr-2">NET:</span>
                          <span className={`text-lg font-bold ${(calculateIssuedTotal() - calculateRefundTotal()) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                             {(calculateIssuedTotal() - calculateRefundTotal()) > 0 ? '+' : ''}{formatMoney(calculateIssuedTotal() - calculateRefundTotal())}
                          </span>
                       </>
                    )}
                 </div>
                 <button 
                    onClick={refundAction === 'REFUND' ? handleProcessRefund : handleProcessExchange}
                    disabled={!foundOrder || selectedRefundItems.size === 0 || isProcessing || (refundAction === 'EXCHANGE' && exchangeIssuedItems.length === 0)}
                    className={`flex items-center gap-2 px-6 py-2.5 ${refundAction === 'REFUND' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-sky-600 hover:bg-sky-500'} text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                 >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {refundAction === 'REFUND' ? t('execute') : 'Process Exchange'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4" role="dialog" aria-modal="true" aria-label="Select customer">
           <div
             ref={customerModalRef}
             className="w-full max-w-lg rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col max-h-[85vh] bg-white dark:bg-neutral-900"
             onKeyDown={(e) => trapFocus(e, customerModalRef)}
           >
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                 <h3 className="font-bold text-lg text-neutral-800 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-500" /> 
                    <span className="text-sky-600 dark:text-sky-400 uppercase tracking-wide text-sm">Select Customer Profile</span>
                 </h3>
                 <button onClick={() => setIsCustomerModalOpen(false)} tabIndex={0} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 rounded" aria-label="Close customer modal">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                 <div className="relative">
                    <input 
                        ref={customerSearchInputRef}
                        type="text" 
                        autoFocus
                        tabIndex={0}
                        placeholder={t('search')}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-sm text-neutral-900 dark:text-white placeholder:text-neutral-500"
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && filteredCustomers.length > 0) {
                            e.preventDefault();
                            // Select first matching customer on Enter
                            const firstMatch = filteredCustomers.find(c => c.id !== '1') || WALK_IN_CUSTOMER;
                            handleSelectCustomer(firstMatch);
                          }
                        }}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-neutral-900 space-y-2" role="listbox" aria-label="Customer list">
                 {/* Quick Action: Walk-in */}
                 <div 
                    onClick={() => handleSelectCustomer(WALK_IN_CUSTOMER)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectCustomer(WALK_IN_CUSTOMER); } }}
                    role="option"
                    aria-selected={selectedCustomer.id === WALK_IN_CUSTOMER.id}
                    tabIndex={0}
                    className="flex items-center gap-4 p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-sky-500/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-all mb-4 group focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                 >
                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-sky-900/30 group-hover:text-sky-500 transition-colors">
                        <User className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-sky-600 dark:group-hover:text-white">{t('guestCheckout')}</h4>
                        <p className="text-xs text-neutral-500">{t('walkInProfile')}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 ml-auto group-hover:text-sky-500" />
                 </div>

                 {filteredCustomers.filter(c => c.id !== '1').map(customer => (
                    <div 
                        key={customer.id} 
                        onClick={() => handleSelectCustomer(customer)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectCustomer(customer); } }}
                        role="option"
                        aria-selected={selectedCustomer.id === customer.id}
                        tabIndex={0}
                        className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-sky-500 ${selectedCustomer.id === customer.id ? 'bg-sky-50 dark:bg-sky-600/10 border-sky-500' : 'bg-white dark:bg-neutral-800/50 border-neutral-100 dark:border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedCustomer.id === customer.id ? 'bg-sky-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
                            {customer.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-bold truncate ${selectedCustomer.id === customer.id ? 'text-sky-600 dark:text-sky-400' : 'text-neutral-800 dark:text-neutral-200'}`}>{customer.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                                {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>}
                                <span className="flex items-center gap-1 text-amber-500"><Star className="w-3 h-3" /> {customer.points} {t('pts')}</span>
                            </div>
                        </div>
                        {selectedCustomer.id === customer.id && <Check className="w-5 h-5 text-sky-500" />}
                    </div>
                 ))}

                 {filteredCustomers.length === 0 && (
                    <div className="text-center py-8 text-neutral-500">
                        <p>No customers found matching "{customerSearchTerm}"</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4" role="dialog" aria-modal="true" aria-label="Payment">
          <div
            ref={paymentModalRef}
            className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden bg-white dark:bg-neutral-900"
            onKeyDown={(e) => {
              trapFocus(e, paymentModalRef);
              // Enter to confirm when not focused on an input
              if (e.key === 'Enter' && (document.activeElement === confirmPaymentRef.current || document.activeElement?.tagName !== 'INPUT')) {
                e.preventDefault();
                if (!(cart.length === 0 || (selectedPaymentMethod === PaymentMethod.CASH && validAmountGiven < total))) {
                  confirmPayment();
                }
              }
              // Number shortcuts for payment method: 1=Cash, 2=Card, 3=Credit
              if (!e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement?.tagName !== 'INPUT') {
                if (e.key === '1') { e.preventDefault(); setSelectedPaymentMethod(PaymentMethod.CASH); }
                if (e.key === '2') { e.preventDefault(); setSelectedPaymentMethod(PaymentMethod.CARD); }
                if (e.key === '3' && selectedCustomer.id !== 'walk-in') { e.preventDefault(); setSelectedPaymentMethod(PaymentMethod.CREDIT); }
              }
            }}
          >
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                 <Zap className="w-5 h-5 text-sky-500" /> {t('payment')}
              </h2>
                <div className="text-xl font-mono font-bold text-sky-600 dark:text-sky-500">{formatMoney(total)}</div>
            </div>
            
            <div className="p-6 bg-white dark:bg-neutral-900">
              {isProcessing ? (
                <div className="w-full flex flex-col items-center justify-center space-y-6">
                   <div className="relative">
                      <div className="w-20 h-20 border-4 border-neutral-200 dark:border-neutral-800 rounded-full"></div>
                      <div className="w-20 h-20 border-4 border-sky-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                   </div>
                   <div className="text-center">
                      <p className="text-sky-600 dark:text-sky-500 font-mono text-sm animate-pulse">AUTHORIZING TRANSACTION...</p>
                      <p className="text-xs text-neutral-500 mt-2">Connecting to Secure Server</p>
                   </div>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-950">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">{t('total')}</span>
                      <span className="font-mono text-lg font-bold text-neutral-900 dark:text-white">{formatMoney(total)}</span>
                    </div>

                    <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                      <button
                        ref={paymentCashRef}
                        role="radio"
                        aria-checked={selectedPaymentMethod === PaymentMethod.CASH}
                        tabIndex={0}
                        onClick={() => setSelectedPaymentMethod(PaymentMethod.CASH)}
                        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); paymentCardRef.current?.focus(); } }}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedPaymentMethod === PaymentMethod.CASH ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
                      >
                        <span className="text-xs font-mono text-neutral-400 mr-2">[1]</span>{t('cash')}
                      </button>

                      <button
                        ref={paymentCardRef}
                        role="radio"
                        aria-checked={selectedPaymentMethod === PaymentMethod.CARD}
                        tabIndex={0}
                        onClick={() => setSelectedPaymentMethod(PaymentMethod.CARD)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') { e.preventDefault(); paymentCashRef.current?.focus(); }
                          if (e.key === 'ArrowDown' && selectedCustomer.id !== 'walk-in') { e.preventDefault(); paymentCreditRef.current?.focus(); }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedPaymentMethod === PaymentMethod.CARD ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
                      >
                        <span className="text-xs font-mono text-neutral-400 mr-2">[2]</span>{t('useCard')}
                      </button>

                      {selectedCustomer.id !== 'walk-in' && (
                        <button
                          ref={paymentCreditRef}
                          role="radio"
                          aria-checked={selectedPaymentMethod === PaymentMethod.CREDIT}
                          tabIndex={0}
                          onClick={() => setSelectedPaymentMethod(PaymentMethod.CREDIT)}
                          onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); paymentCardRef.current?.focus(); } }}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedPaymentMethod === PaymentMethod.CREDIT ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
                        >
                          <span className="text-xs font-mono text-neutral-400 mr-2">[3]</span>{t('credit')}
                        </button>
                      )}

                      {selectedPaymentMethod === PaymentMethod.CASH && (
                        <>
                          <div>
                            <label htmlFor="amount-given-input" className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">{t('amountGiven')}</label>
                            <input
                              id="amount-given-input"
                              ref={amountGivenRef}
                              type="number"
                              min="0"
                              step="0.01"
                              tabIndex={0}
                              value={amountGivenInput}
                              onChange={(e) => setAmountGivenInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (validAmountGiven >= total && cart.length > 0) {
                                    confirmPayment();
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono text-lg"
                              aria-describedby="change-display"
                            />
                          </div>
                          <div id="change-display" className="flex justify-between text-sm" aria-live="polite">
                            <span className="text-neutral-500 dark:text-neutral-400">{t('changeToReturn')}</span>
                            <span className={`font-mono font-bold ${validAmountGiven < total ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {formatMoney(calculatedChange)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setIsPaymentModalOpen(false)}
                      tabIndex={0}
                      className="px-4 py-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white transition-colors text-sm font-bold"
                    >
                      {t('cancel')} <span className="text-xs font-mono text-neutral-400 ml-1">[Esc]</span>
                    </button>
                    <button
                      ref={confirmPaymentRef}
                      onClick={confirmPayment}
                      tabIndex={0}
                      disabled={cart.length === 0 || (selectedPaymentMethod === PaymentMethod.CASH && validAmountGiven < total)}
                      className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                      aria-label="Confirm payment and print receipt"
                    >
                      {t('confirm')} & {t('print')} <span className="text-xs font-mono opacity-75 ml-1">[Enter]</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* HIDDEN PRINT RECEIPTS */}
    {lastTransaction && (
      <>
        {/* THERMAL RECEIPT - Changes based on template */}
        <div id="printable-receipt" className="hidden print:hidden bg-white text-black font-mono text-[10px] leading-relaxed mx-auto">
          {/* MODERN RECEIPT TEMPLATE */}
          {invoiceTemplate === 'modern' && (
            <>
              {/* Minimal-style Header */}
              <div className="text-center mb-4 pb-3" style={{ borderBottom: '3px solid #0ea5e9' }}>
                <div className="bg-neutral-900 text-white py-2 px-3 rounded mb-2">
                  <h1 className="font-bold text-sm tracking-tight">one1pos</h1>
                </div>
                <p className="uppercase text-[9px]">Enterprise Solutions</p>
                <p className="text-[9px]">123 Innovation Blvd, Tech City</p>
              </div>

              <div className="mb-3 p-2 bg-neutral-100 rounded text-[9px]">
                <div className="flex justify-between font-bold text-neutral-700">
                  <span>Order #{lastTransaction.orderId}</span>
                  <span>{lastTransaction.date.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>{lastTransaction.customer.name}</span>
                  <span>{lastTransaction.paymentMethod}</span>
                </div>
              </div>

              <div className="mb-3">
                {lastTransaction.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-dashed border-neutral-300">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-bold">{formatMoney(Number(item.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-sky-600 pt-2 mb-4">
                <div className="flex justify-between text-[9px]"><span>Subtotal</span><span>{formatMoney(lastTransaction.subtotal)}</span></div>
                {lastTransaction.discount > 0 && <div className="flex justify-between text-[9px] text-red-600"><span>Discount</span><span>-{formatMoney(lastTransaction.discount)}</span></div>}
                <div className="flex justify-between text-[9px]"><span>Tax</span><span>{formatMoney(lastTransaction.tax)}</span></div>
                <div className="flex justify-between font-bold text-sm mt-1 bg-sky-600 text-white px-2 py-1 rounded">
                  <span>TOTAL</span><span>{formatMoney(lastTransaction.total)}</span>
                </div>
              </div>

              <div className="text-center text-[9px]">
                <p className="font-bold text-sky-600">★ Thank You! ★</p>
                <p className="mt-1">{lastTransaction.orderId}</p>
              </div>
            </>
          )}

          {/* CLASSIC RECEIPT TEMPLATE */}
          {invoiceTemplate === 'classic' && (
            <>
              <div className="text-center mb-4 border-b-2 border-black pb-2">
                <h1 className="font-bold text-lg tracking-tight">one1pos</h1>
                <p className="uppercase text-[9px]">Enterprise Solutions</p>
                <p className="text-[9px]">123 Innovation Blvd, Tech City</p>
                <p className="text-[9px]">Tel: (555) 123-4567</p>
              </div>

              <div className="mb-3 text-[9px] border-b border-black pb-2">
                <div className="flex justify-between"><span>Date:</span><span>{lastTransaction.date.toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>Time:</span><span>{lastTransaction.date.toLocaleTimeString()}</span></div>
                <div className="flex justify-between font-bold"><span>Order #:</span><span>{lastTransaction.orderId}</span></div>
                <div className="flex justify-between"><span>Customer:</span><span>{lastTransaction.customer.name}</span></div>
                <div className="flex justify-between"><span>Payment:</span><span>{lastTransaction.paymentMethod}</span></div>
              </div>

              <div className="mb-3 border-b border-black pb-2">
                <div className="flex font-bold uppercase mb-1 border-b border-black pb-1 text-[9px]">
                  <span className="w-8">Qty</span><span className="flex-1">Item</span><span className="w-14 text-right">Price</span>
                </div>
                {lastTransaction.items.map((item, i) => (
                  <div key={i} className="flex text-[9px]">
                    <span className="w-8">{item.quantity}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="w-14 text-right">{formatMoney(Number(item.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="text-right mb-4 text-[9px]">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(lastTransaction.subtotal)}</span></div>
                {lastTransaction.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(lastTransaction.discount)}</span></div>}
                <div className="flex justify-between"><span>Tax (8%)</span><span>{formatMoney(lastTransaction.tax)}</span></div>
                <div className="flex justify-between font-bold text-sm border-t-2 border-black pt-1 mt-1">
                  <span>TOTAL</span><span>{formatMoney(lastTransaction.total)}</span>
                </div>
              </div>

              <div className="text-center border-t border-black pt-2">
                <p className="font-bold uppercase">Thank You!</p>
                <p className="text-[8px] mt-1">Please retain this receipt</p>
                <p className="text-[8px] tracking-widest mt-2">{lastTransaction.orderId}</p>
              </div>
            </>
          )}

          {/* MINIMAL RECEIPT TEMPLATE */}
          {invoiceTemplate === 'minimal' && (
            <>
              <div className="mb-4">
                <div className="border-l-4 border-emerald-500 pl-3 mb-3">
                  <h1 className="font-bold text-sm">one1pos</h1>
                  <p className="text-[9px] text-neutral-500">Enterprise Solutions</p>
                </div>
                <p className="text-[9px] font-mono text-neutral-400">{lastTransaction.orderId}</p>
              </div>

              <div className="mb-3 text-[9px]">
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">{lastTransaction.date.toLocaleDateString()} • {lastTransaction.date.toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{lastTransaction.customer.name}</span>
                  <span className="text-emerald-600 font-bold">{lastTransaction.paymentMethod}</span>
                </div>
              </div>

              <div className="mb-4 border-l-2 border-neutral-200 pl-3">
                {lastTransaction.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 text-[9px]">
                    <span>{item.quantity} × {item.name}</span>
                    <span>{formatMoney(Number(item.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-l-4 border-emerald-500 pl-3 mb-4">
                <div className="flex justify-between text-[9px]"><span>Subtotal</span><span>{formatMoney(lastTransaction.subtotal)}</span></div>
                {lastTransaction.discount > 0 && <div className="flex justify-between text-[9px] text-red-500"><span>Discount</span><span>-{formatMoney(lastTransaction.discount)}</span></div>}
                <div className="flex justify-between text-[9px]"><span>Tax</span><span>{formatMoney(lastTransaction.tax)}</span></div>
                <div className="flex justify-between font-bold text-sm mt-2">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatMoney(lastTransaction.total)}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-neutral-400">
                <p>Thank you • {lastTransaction.orderId}</p>
              </div>
            </>
          )}

          {/* THERMAL RECEIPT TEMPLATE */}
          {invoiceTemplate === 'thermal' && (
            <>
              <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                <h1 className="font-black text-[11px] tracking-wide leading-tight">{storeProfile.name}</h1>
                <p className="text-[8px] mt-1">{storeProfile.address}</p>
                <p className="text-[8px]">Tel: {storeProfile.phone}</p>
              </div>

              <div className="text-[9px] mb-2 border-b border-dashed border-black pb-2">
                <div className="flex justify-between"><span>{t('date')}:</span><span>{lastTransaction.date.toLocaleDateString(receiptLocale)}</span></div>
                <div className="flex justify-between"><span>{t('receiptTime')}:</span><span>{lastTransaction.date.toLocaleTimeString(receiptLocale)}</span></div>
                <div className="flex justify-between"><span>{t('receiptOrder')}:</span><span className="font-mono">{lastTransaction.orderId}</span></div>
                <div className="flex justify-between"><span>{t('customerName')}:</span><span>{lastTransaction.customer.name}</span></div>
                <div className="flex justify-between"><span>{t('payment')}:</span><span className="uppercase">{getPaymentMethodLabel(lastTransaction.paymentMethod)}</span></div>
              </div>

              <div className="mb-2 border-b border-dashed border-black pb-2">
                <div className="flex justify-between text-[8px] font-bold mb-1">
                  <span>ITEM</span>
                  <span>QTY × PRICE</span>
                  <span>TOTAL</span>
                </div>
                {lastTransaction.items.map((item, i) => (
                  <div key={i} className="mb-1">
                    <div className="text-[9px] font-medium">{item.name}</div>
                    <div className="flex justify-between text-[8px]">
                      <span></span>
                      <span>{item.quantity} × {formatMoney(Number(item.price))}</span>
                      <span className="font-bold">{formatMoney(Number(item.price) * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[9px] mb-2">
                <div className="flex justify-between"><span>{t('subtotal')}:</span><span>{formatMoney(lastTransaction.subtotal)}</span></div>
                {lastTransaction.discount > 0 && <div className="flex justify-between"><span>{t('discount')}:</span><span>-{formatMoney(lastTransaction.discount)}</span></div>}
                <div className="flex justify-between"><span>{t('tax')}:</span><span>{formatMoney(lastTransaction.tax)}</span></div>
                <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1 mt-1">
                  <span>{t('total').toUpperCase()}:</span>
                  <span>{formatMoney(lastTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-[8px] mt-1">
                  <span>{t('receiptPaid')}:</span>
                  <span>{formatMoney(lastTransaction.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>{t('change')}:</span>
                  <span>{formatMoney(lastTransaction.change)}</span>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-black pt-2">
                <p className="font-bold text-[9px]">{t('thankYouMessage').toUpperCase()}</p>
                <p className="text-[8px] mt-1">{t('pleaseRetainReceipt')}</p>
                <p className="text-[8px] mt-2">{t('visitAgainSoon')}</p>
                <p className="text-[7px] mt-2">{t('rightsReservedOne1pos')}</p>
                <p className="text-[7px]">www.one1pos.com</p>
                <p className="text-[7px] font-mono mt-2 tracking-widest">{lastTransaction.orderId}</p>
              </div>
            </>
          )}
        </div>

        {/* A4 INVOICE - Changes based on template */}
        <div id="printable-invoice" className="hidden print:hidden bg-white text-neutral-800 font-sans p-8 mx-auto w-full h-full">
          {/* MODERN INVOICE */}
          {invoiceTemplate === 'modern' && (
            <>
              <div className="mb-8">
                <div className="bg-neutral-900 text-white p-6 rounded-lg mb-6 border border-neutral-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold">INVOICE</h1>
                      <p className="text-neutral-300 mt-1">one1pos Enterprise</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatMoney(lastTransaction.total)}</p>
                      <p className="text-neutral-300 text-sm">{lastTransaction.orderId}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Billed To</h3>
                    <p className="text-lg font-bold">{lastTransaction.customer.name}</p>
                    {lastTransaction.customer.email && <p className="text-neutral-600">{lastTransaction.customer.email}</p>}
                    {lastTransaction.customer.phone && <p className="text-neutral-600">{lastTransaction.customer.phone}</p>}
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Details</h3>
                    <p>Date: {lastTransaction.date.toLocaleDateString()}</p>
                    <p>Payment: <span className="font-bold uppercase">{lastTransaction.paymentMethod}</span></p>
                    <p className="text-emerald-600 font-bold">PAID</p>
                  </div>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-sky-600">
                    <th className="py-3 text-left text-xs uppercase text-neutral-600">Item</th>
                    <th className="py-3 text-right text-xs uppercase text-neutral-600">Qty</th>
                    <th className="py-3 text-right text-xs uppercase text-neutral-600">Price</th>
                    <th className="py-3 text-right text-xs uppercase text-neutral-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastTransaction.items.map((item, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      <td className="py-3"><p className="font-medium">{item.name}</p><p className="text-xs text-neutral-400">SKU: {item.sku}</p></td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">{formatMoney(Number(item.price))}</td>
                      <td className="py-3 text-right font-bold">{formatMoney(Number(item.price) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-64">
                  <div className="flex justify-between py-2"><span>Subtotal</span><span>{formatMoney(lastTransaction.subtotal)}</span></div>
                  {lastTransaction.discount > 0 && <div className="flex justify-between py-2 text-red-600"><span>Discount</span><span>-{formatMoney(lastTransaction.discount)}</span></div>}
                  <div className="flex justify-between py-2"><span>Tax (8%)</span><span>{formatMoney(lastTransaction.tax)}</span></div>
                  <div className="flex justify-between py-3 bg-sky-600 text-white px-3 rounded-lg mt-2">
                    <span className="font-bold">Total</span><span className="font-bold text-xl">{formatMoney(lastTransaction.total)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-neutral-400 text-sm">
                <p className="font-bold text-sky-600 text-lg mb-1">Thank you for your business!</p>
                <p>one1pos.com</p>
              </div>
            </>
          )}

          {/* CLASSIC INVOICE */}
          {invoiceTemplate === 'classic' && (
            <>
              <div className="flex justify-between items-start mb-8 border-b-2 border-neutral-800 pb-6">
                <div>
                  <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">INVOICE</h1>
                  <div className="flex items-center gap-2 mt-4 text-neutral-600">
                    <Hexagon className="w-5 h-5 fill-neutral-800 text-neutral-800" />
                    <span className="font-bold text-lg">one1pos Enterprise</span>
                  </div>
                  <div className="text-sm mt-2 text-neutral-500">
                    <p>123 Innovation Blvd</p>
                    <p>Tech City, TC 90210</p>
                    <p>compliance@one1pos.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-4">
                    <p className="text-sm uppercase tracking-wide text-neutral-500 mb-1">Invoice Number</p>
                    <p className="text-xl font-mono font-bold">{lastTransaction.orderId}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm uppercase tracking-wide text-neutral-500 mb-1">Date of Issue</p>
                    <p className="text-lg font-medium">{lastTransaction.date.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-neutral-500 mb-1">Total Due</p>
                    <p className="text-2xl font-bold text-neutral-900">{formatMoney(lastTransaction.total)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Billed To</h3>
                  <p className="text-lg font-bold text-neutral-900">{lastTransaction.customer.name}</p>
                  {lastTransaction.customer.email && <p className="text-neutral-600">{lastTransaction.customer.email}</p>}
                  {lastTransaction.customer.phone && <p className="text-neutral-600">{lastTransaction.customer.phone}</p>}
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Payment Details</h3>
                  <p className="font-medium">Method: <span className="uppercase">{lastTransaction.paymentMethod}</span></p>
                  <p>Status: <span className="text-emerald-600 font-bold">PAID</span></p>
                </div>
              </div>

              <table className="w-full mb-8 text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-300">
                    <th className="py-3 px-2 font-bold text-xs uppercase text-neutral-500">Item</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase text-neutral-500 text-right">Qty</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase text-neutral-500 text-right">Unit Price</th>
                    <th className="py-3 px-2 font-bold text-xs uppercase text-neutral-500 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lastTransaction.items.map((item, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      <td className="py-3 px-2"><p className="font-bold">{item.name}</p><p className="text-xs text-neutral-500">SKU: {item.sku}</p></td>
                      <td className="py-3 px-2 text-right">{item.quantity}</td>
                      <td className="py-3 px-2 text-right">{formatMoney(Number(item.price))}</td>
                      <td className="py-3 px-2 text-right font-bold">{formatMoney(Number(item.price) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-12">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-neutral-100"><span>Subtotal</span><span>{formatMoney(lastTransaction.subtotal)}</span></div>
                  {lastTransaction.discount > 0 && <div className="flex justify-between py-2 border-b border-neutral-100 text-red-600"><span>Discount</span><span>-{formatMoney(lastTransaction.discount)}</span></div>}
                  <div className="flex justify-between py-2 border-b border-neutral-100"><span>Tax (8%)</span><span>{formatMoney(lastTransaction.tax)}</span></div>
                  <div className="flex justify-between py-3 border-b-2 border-neutral-800 mt-2">
                    <span className="font-bold text-xl">Total</span><span className="font-bold text-xl">{formatMoney(lastTransaction.total)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-8 flex justify-between items-center">
                <div className="text-xs text-neutral-400">
                  <p>Terms & Conditions apply.</p>
                  <p>Returns accepted within 14 days.</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg italic">Thank you for your business!</p>
                  <p className="text-xs text-neutral-400">one1pos.com</p>
                </div>
              </div>
            </>
          )}

          {/* MINIMAL INVOICE */}
          {invoiceTemplate === 'minimal' && (
            <>
              <div className="mb-12">
                <p className="text-sm font-mono text-neutral-400 mb-2">{lastTransaction.orderId}</p>
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h1 className="text-3xl font-bold text-neutral-900">Invoice</h1>
                  <p className="text-neutral-500">{lastTransaction.date.toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="border-l-2 border-neutral-200 pl-4">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">From</p>
                  <p className="font-bold">one1pos Enterprise</p>
                  <p className="text-neutral-600 text-sm">123 Innovation Blvd</p>
                  <p className="text-neutral-600 text-sm">Tech City, TC 90210</p>
                </div>
                <div className="border-l-2 border-emerald-500 pl-4">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">To</p>
                  <p className="font-bold">{lastTransaction.customer.name}</p>
                  {lastTransaction.customer.email && <p className="text-neutral-600 text-sm">{lastTransaction.customer.email}</p>}
                  {lastTransaction.customer.phone && <p className="text-neutral-600 text-sm">{lastTransaction.customer.phone}</p>}
                </div>
              </div>

              <div className="mb-12">
                {lastTransaction.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-4 border-b border-neutral-100">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-neutral-400">{item.quantity} × {formatMoney(Number(item.price))}</p>
                    </div>
                    <p className="font-bold">{formatMoney(Number(item.price) * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mb-12">
                <div className="w-72">
                  <div className="flex justify-between py-2 text-neutral-600"><span>Subtotal</span><span>{formatMoney(lastTransaction.subtotal)}</span></div>
                  {lastTransaction.discount > 0 && <div className="flex justify-between py-2 text-red-500"><span>Discount</span><span>-{formatMoney(lastTransaction.discount)}</span></div>}
                  <div className="flex justify-between py-2 text-neutral-600"><span>Tax</span><span>{formatMoney(lastTransaction.tax)}</span></div>
                  <div className="flex justify-between py-4 border-l-4 border-emerald-500 pl-4 mt-4">
                    <span className="text-xl">Total</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatMoney(lastTransaction.total)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-neutral-400 text-sm">Payment: <span className="font-bold text-emerald-600 uppercase">{lastTransaction.paymentMethod}</span> • <span className="text-emerald-600">PAID</span></p>
                <p className="text-neutral-300 text-sm mt-4">Thank you</p>
              </div>
            </>
          )}
        </div>
      </>
    )}

    {/* Success Modal for Refunds */}
    <SuccessModal
      isOpen={isSuccessModalOpen}
      onClose={() => setIsSuccessModalOpen(false)}
      title={successModalData.title}
      message={successModalData.message}
      amount={successModalData.amount}
      autoCloseDelay={5000}
    />
    </>
    )}
    </>
  );
};

export default POS;
