import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  ShoppingBag, 
  Receipt, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Plus,
  Search, 
  UserPlus, 
  Coffee, 
  Zap, 
  Home, 
  Users, 
  Truck, 
  Package, 
  Wrench, 
  HelpCircle, 
  Clock, 
  ArrowUpRight, 
  ArrowLeft,
  Paperclip,
  Paperclip as PaperclipIcon,
  Check,
  Tag,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { 
  useLedger, 
  getSalesStorageKey, 
  getInventoryStorageKey, 
  getMetricsStorageKey 
} from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Customer } from '../types/ledger';
import { GlossySLogo } from './GlossySLogo';
import { PharmacyInfoCard } from './PharmacyInfoCard';
import { sanitizeSalesRecords } from '../lib/formatDateTime';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddCustomer?: () => void;
  onOpenProfileModal?: () => void;
  onOpenAboutModal?: () => void;
  initialTab?: 'sales' | 'expenses';
}

const EXPENSE_CATEGORIES = [
  { id: 'Tea & Snacks', labelEn: 'Tea & Snacks', labelBn: 'চা-নাস্তা / আপ্যায়ন', icon: Coffee },
  { id: 'Electricity & Utility', labelEn: 'Electricity & Utility', labelBn: 'বিদ্যুৎ ও বিল', icon: Zap },
  { id: 'Shop Rent', labelEn: 'Shop Rent', labelBn: 'দোকান ভাড়া', icon: Home },
  { id: 'Staff Salary', labelEn: 'Staff Salary', labelBn: 'কর্মচারীর বেতন', icon: Users },
  { id: 'Medicine Transport', labelEn: 'Transport / Delivery', labelBn: 'ওষুধ পরিবহন', icon: Truck },
  { id: 'Packaging', labelEn: 'Packaging & Bags', labelBn: 'প্যাকেট ও ব্যাগ', icon: Package },
  { id: 'Maintenance', labelEn: 'Maintenance', labelBn: 'মেরামত ও যন্ত্রাংশ', icon: Wrench },
  { id: 'Other', labelEn: 'Other Expense', labelBn: 'অন্যান্য খরচ', icon: HelpCircle }
];

const NewSaleModalComponent: React.FC<NewSaleModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenAddCustomer,
  onOpenProfileModal,
  onOpenAboutModal,
  initialTab = 'sales'
}) => {
  const { 
    customers, 
    addDueTransaction, 
    dailySales, 
    expenses, 
    addDailySale, 
    deleteDailySale,
    addExpense, 
    deleteExpense,
    stats,
    allTransactions,
    todaySalesAmount,
    todayExpensesAmount,
    totalSalesAmount,
    totalExpensesAmount,
    pullLatestFromCloud
  } = useLedger();
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();

  const getTodayLocalIso = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  // Date range filter states for OVERVIEW METRICS (default to today)
  const [startDateFilter, setStartDateFilter] = useState(getTodayLocalIso);
  const [endDateFilter, setEndDateFilter] = useState(getTodayLocalIso);

  // Daily Sales Tab States
  const [salesAmount, setSalesAmount] = useState('');
  const [medicineNote, setMedicineNote] = useState('');
  const salesNote = medicineNote;
  const setSalesNote = setMedicineNote;
  const [salesDate, setSalesDate] = useState(getTodayLocalIso);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [salesListTypeFilter, setSalesListTypeFilter] = useState<'all' | 'cash' | 'due' | 'paid'>('all');
  const saleAmount = salesAmount;
  const setSaleAmount = setSalesAmount;

  // Local Sales Records state strictly isolated by user UID
  const [localSalesRecords, setLocalSalesRecords] = useState<any[]>([]);

  // Synchronize localSalesRecords with central dailySales / storage whenever active account, modal open state, or dailySales change
  useEffect(() => {
    const currentOwnerId = user ? user.uid : 'demo_user';
    if (dailySales && dailySales.length > 0) {
      setLocalSalesRecords(sanitizeSalesRecords(dailySales.filter((r: any) => !r.ownerId || r.ownerId === currentOwnerId)));
      return;
    }
    try {
      const key = getSalesStorageKey(user ? user.uid : null);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLocalSalesRecords(sanitizeSalesRecords(parsed.filter((r: any) => !r.ownerId || r.ownerId === currentOwnerId)));
          return;
        }
      }
      setLocalSalesRecords([]);
    } catch {
      setLocalSalesRecords([]);
    }
  }, [user?.uid, isOpen, dailySales]);

  const setSalesRecords = (updater: any) => {
    setLocalSalesRecords((prevRecords) => {
      const updatedRecords = sanitizeSalesRecords(typeof updater === 'function' ? updater(prevRecords) : updater);
      try {
        const key = getSalesStorageKey(user ? user.uid : null);
        localStorage.setItem(key, JSON.stringify(updatedRecords));
      } catch (e) {
        console.error("Storage save error", e);
      }
      return updatedRecords;
    });
  };

  // Cart / Selected Medicine Items States
  const [cartItems, setCartItems] = useState<Array<{ name: string; medicineName?: string; qty: number; quantity?: number; price: number }>>([]);
  const [itemInputName, setItemInputName] = useState('');
  const [itemInputQty, setItemInputQty] = useState('1');
  const [itemInputPrice, setItemInputPrice] = useState('');

  const handleAddCartItem = () => {
    if (!itemInputName.trim()) return;
    const qty = parseInt(itemInputQty) || 1;
    const price = parseFloat(itemInputPrice) || 0;
    const newItem = {
      name: itemInputName.trim(),
      medicineName: itemInputName.trim(),
      quantity: qty,
      qty: qty,
      price: price
    };
    const updated = [...cartItems, newItem];
    setCartItems(updated);
    setItemInputName('');
    setItemInputQty('1');
    setItemInputPrice('');

    const newTotal = updated.reduce((sum, it) => sum + (it.price * (it.quantity || it.qty || 1)), 0);
    if (newTotal > 0) {
      setSalesAmount(newTotal.toString());
    }
  };

  const handleRemoveCartItem = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    const newTotal = updated.reduce((sum, it) => sum + (it.price * (it.quantity || it.qty || 1)), 0);
    setSalesAmount(newTotal > 0 ? newTotal.toString() : '');
  };

  // Pharmacy Expenses Tab States
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayLocalIso);
  const [expenseListFilter, setExpenseListFilter] = useState<string>('all');

  // Submission & Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Keyboard Navigation: Double Enter (Instant Sale) vs Single Enter (Next Step)
  const lastEnterTimeRef = useRef<number>(0);
  const singleEnterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (singleEnterTimerRef.current) {
        clearTimeout(singleEnterTimerRef.current);
      }
    };
  }, []);

  // Close customer search dropdown when clicking or tapping outside the search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Sync initialTab and reset customer selection when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = getTodayLocalIso();
      setActiveTab(initialTab);
      setError('');
      setSuccessMessage('');
      setSalesDate(today);
      setExpenseDate(today);
      setStartDateFilter(today);
      setEndDateFilter(today);
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setIsSearchFocused(false);
      setSalesListTypeFilter('all');
      setExpenseListFilter('all');

      // Sanitize stored sales records in localStorage for current user
      try {
        const key = getSalesStorageKey(user ? user.uid : null);
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = sanitizeSalesRecords(parsed);
            localStorage.setItem(key, JSON.stringify(sanitized));
          }
        }
      } catch (e) {}
    }
  }, [isOpen, initialTab]);

  // Mutable state refs to allow window POS helpers to always read the latest state
  // without re-binding listeners or overriding document.getElementById on every keystroke
  const salesAmountRef = useRef(salesAmount);
  salesAmountRef.current = salesAmount;
  const expenseAmountRef = useRef(expenseAmount);
  expenseAmountRef.current = expenseAmount;
  const expenseCategoryRef = useRef(expenseCategory);
  expenseCategoryRef.current = expenseCategory;
  const expenseTitleRef = useRef(expenseTitle);
  expenseTitleRef.current = expenseTitle;
  const expenseDateRef = useRef(expenseDate);
  expenseDateRef.current = expenseDate;
  const selectedCustomerRef = useRef(selectedCustomer);
  selectedCustomerRef.current = selectedCustomer;
  const languageRef = useRef(language);
  languageRef.current = language;
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;
  const matchedSalesRecordsRef = useRef<any[]>([]);

  // Memoized matching customers (capped at 15 items for high-performance instant rendering)
  const matchingCustomers = useMemo(() => {
    const trimmed = customerSearchQuery.trim();
    if (!trimmed) {
      return customers.slice(0, 10);
    }
    const q = trimmed.toLowerCase();
    const results: Customer[] = [];
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      if (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        String(c.serialNumber).includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
      ) {
        results.push(c);
        if (results.length >= 15) break;
      }
    }
    return results;
  }, [customerSearchQuery, customers]);

  const todayIso = getTodayLocalIso();

  // Helper: Format date string (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    const parts = dateString.split("-"); // YYYY-MM-DD ke vangbe
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY format-e rupantor korbe
    }
    return dateString;
  };

  // Helper to extract comparable YYYY-MM-DD string from date/createdAt fields
  const parseItemDate = (item: { createdAt?: string; date?: string }): string => {
    if (item.date) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return item.date;
      const ddmmyyyy = item.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
      }
      const parsed = new Date(item.date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    if (item.createdAt && item.createdAt.length >= 10) {
      const iso = item.createdAt.substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
      const parsed = new Date(item.createdAt);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    return '';
  };

  // Helper to format exact date and time (e.g., 10/24/2026 at 03:04 PM)
  const formatSaleDateTime = (sale: any): string => {
    if (sale.createdAt) {
      const d = new Date(sale.createdAt);
      if (!isNaN(d.getTime())) {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${month}/${day}/${year} at ${timeStr}`;
      }
    }

    const rawDate = parseItemDate(sale) || sale.date;
    let dateFormatted = '';
    if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-');
      dateFormatted = `${m}/${d}/${y}`;
    } else if (rawDate) {
      dateFormatted = rawDate;
    } else {
      const now = new Date();
      dateFormatted = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    }

    const timeFormatted = sale.time || (sale.createdAt ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '12:00 PM');
    return `${dateFormatted} at ${timeFormatted}`;
  };

  const isItemInRange = useCallback((item: { createdAt?: string; date?: string }): boolean => {
    const itemDate = parseItemDate(item);
    if (!itemDate) return false;
    if (startDateFilter && itemDate < startDateFilter) return false;
    if (endDateFilter && itemDate > endDateFilter) return false;
    return true;
  }, [startDateFilter, endDateFilter]);

  // Filtered sales and expenses for the selected date or date range strictly scoped to current tenant
  const allSalesCombined = useMemo(() => {
    const currentOwnerId = user ? user.uid : 'demo_user';
    const map = new Map<string, any>();
    for (const s of sanitizeSalesRecords(dailySales)) {
      if (!s.ownerId || s.ownerId === currentOwnerId) {
        map.set(String(s.id), { ...s, ownerId: currentOwnerId });
      }
    }
    for (const s of sanitizeSalesRecords(localSalesRecords)) {
      if ((!s.ownerId || s.ownerId === currentOwnerId) && !map.has(String(s.id))) {
        map.set(String(s.id), { ...s, ownerId: currentOwnerId });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const dateA = a.date || a.createdAt || '';
      const dateB = b.date || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [dailySales, localSalesRecords, user?.uid]);

  const matchedSalesRecords = useMemo(() => {
    return allSalesCombined.filter(isItemInRange);
  }, [allSalesCombined, isItemInRange]);

  matchedSalesRecordsRef.current = matchedSalesRecords;

  const matchedExpensesRecords = useMemo(() => {
    return expenses.filter(isItemInRange);
  }, [expenses, isItemInRange]);

  // 1. Filtered Sales for date range: Direct Paid Sales & Due Payments (immediate cash sales balance)
  const rangeSales = useMemo(() => {
    return matchedSalesRecords
      .filter((s: any) => {
        const isDue = (s.type === 'DUE' || s.type === 'DUE_SALE' || s.type === 'Due Sale' || s.isDue === true || Boolean(s.dueAmount && Number(s.dueAmount) > 0) || Boolean(s.customerId && s.type !== 'PAID_SALE' && s.type !== 'CASH' && s.type !== 'Paid Sale')) && s.isDue !== false;
        return !isDue;
      })
      .reduce((sum: number, s: any) => sum + Number(s.amount !== undefined ? s.amount : (s.total || 0)), 0);
  }, [matchedSalesRecords]);

  // Filtered Cash Sales for date range
  const rangeCashSales = rangeSales;

  // 2. Filtered Expenses for date range
  const rangeExpenses = useMemo(() => {
    return matchedExpensesRecords
      .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  }, [matchedExpensesRecords]);

  // 3. Filtered Due for date range (Due Sales + customer ledger dues)
  const salesDueSum = useMemo(() => {
    return matchedSalesRecords
      .filter((s: any) => s.type === 'DUE' || s.type === 'DUE_SALE' || s.type === 'Due Sale' || Boolean(s.customerId && s.type !== 'PAID_SALE' && s.type !== 'Paid Sale'))
      .reduce((sum: number, s: any) => sum + Number(s.amount !== undefined ? s.amount : (s.total || 0)), 0);
  }, [matchedSalesRecords]);

  const rangeDue = useMemo(() => {
    const txDueSum = (allTransactions || [])
      .filter((t: any) => t.type === 'due' && isItemInRange(t))
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    return salesDueSum > 0 ? salesDueSum : txDueSum;
  }, [salesDueSum, allTransactions, isItemInRange]);

  // Filter tabs counts & filtered sales records for Recorded Sales History
  const { dueCount, paidCount } = useMemo(() => {
    let due = 0;
    let paid = 0;
    matchedSalesRecords.forEach((s: any) => {
      const isDue = s.type === 'DUE_SALE' || s.type === 'Due Sale' || s.type === 'due' || s.isDue === true || Boolean(s.dueAmount && Number(s.dueAmount) > 0);
      const rawDue = s.dueAmount !== undefined ? s.dueAmount : (isDue ? Number(s.amount || s.total || 0) : 0);
      const dueAmount = typeof rawDue === 'number' ? rawDue : (parseFloat(String(rawDue).replace(/[^0-9.]/g, '')) || 0);
      if (dueAmount > 0) {
        due++;
      } else {
        paid++;
      }
    });
    return { dueCount: due, paidCount: paid };
  }, [matchedSalesRecords]);

  const filteredSalesRecords = useMemo(() => {
    return matchedSalesRecords.filter((sale: any) => {
      const isDue = sale.type === 'DUE_SALE' || sale.type === 'Due Sale' || sale.type === 'due' || sale.isDue === true || Boolean(sale.dueAmount && Number(sale.dueAmount) > 0);
      const rawDue = sale.dueAmount !== undefined ? sale.dueAmount : (isDue ? Number(sale.amount || sale.total || 0) : 0);
      const dueAmount = typeof rawDue === 'number' ? rawDue : (parseFloat(String(rawDue).replace(/[^0-9.]/g, '')) || 0);

      if (salesListTypeFilter === 'due') {
        return dueAmount > 0;
      }
      if (salesListTypeFilter === 'paid' || salesListTypeFilter === 'cash') {
        return dueAmount <= 0;
      }
      return true; // 'all'
    });
  }, [matchedSalesRecords, salesListTypeFilter]);

  // Dynamic categories and filtered records for Recorded Expense History
  const availableExpenseCategories = useMemo(() => {
    const cats = new Set<string>();
    matchedExpensesRecords.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats);
  }, [matchedExpensesRecords]);

  const filteredExpensesRecords = useMemo(() => {
    if (expenseListFilter === 'all') return matchedExpensesRecords;
    return matchedExpensesRecords.filter((e) => e.category === expenseListFilter);
  }, [matchedExpensesRecords, expenseListFilter]);

  // Helper: Generate Unique ID
  const generateUniqueId = (): string => {
    return `sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Helper: Update Inventory
  const updateInventory = (items?: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return;
    try {
      const invKey = getInventoryStorageKey(user ? user.uid : null);
      const stored = localStorage.getItem(invKey);
      const inv = stored ? JSON.parse(stored) : [];
      const updated = inv.map((invItem: any) => {
        const sold = items.find((it: any) => it.id === invItem.id || it.name === invItem.name);
        if (sold && typeof invItem.stock === 'number') {
          const qty = Number(sold.quantity || sold.qty || 1);
          return { ...invItem, stock: Math.max(0, invItem.stock - qty) };
        }
        return invItem;
      });
      localStorage.setItem(invKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('updateInventory error:', e);
    }
  };

  // Helper: Save to Sales Record only (PAID_SALE)
  const saveToSalesRecord = async (paidSaleRecord: {
    id: string;
    type: string;
    items?: any[];
    total: number;
    date: string;
    note?: string;
  }) => {
    await addDailySale(
      paidSaleRecord.total,
      paidSaleRecord.note || 'সাধারণ সরাসরি বিক্রি (Direct Paid Sale)',
      paidSaleRecord.date,
      {
        type: 'PAID_SALE',
        id: paidSaleRecord.id,
        items: paidSaleRecord.items,
        total: paidSaleRecord.total
      }
    );
  };

  // Helper: Save to Customer Ledger due (DUE_SALE)
  const saveToCustomerLedger = async (
    customerId: string,
    dueSaleRecord: {
      id: string;
      type: string;
      customerId: string;
      items?: any[];
      total: number;
      date: string;
      note?: string;
    }
  ) => {
    const targetCust = customers.find((c) => c.id === customerId);
    const custName = targetCust?.name || 'Customer';
    const desc = dueSaleRecord.note || (language === 'bn' ? `বাকী বিক্রি: ${custName}` : `Due Sale: ${custName}`);

    // Save to customer ledger due
    await addDueTransaction(
      customerId,
      dueSaleRecord.total,
      desc,
      dueSaleRecord.date
    );

    // Save as DUE_SALE record in daily sales (DO NOT add to immediate cash sales balance)
    await addDailySale(
      dueSaleRecord.total,
      desc,
      dueSaleRecord.date,
      {
        type: 'DUE_SALE',
        id: dueSaleRecord.id,
        customerId,
        customerName: custName,
        items: dueSaleRecord.items,
        total: dueSaleRecord.total
      }
    );
  };

  // Helper: Update Customer Due Balance
  const updateCustomerDueBalance = async (customerId: string, totalAmount: number) => {
    console.log(`Updated customer due balance for ${customerId}: +৳${totalAmount}`);
  };

  // Helper: Update Customer Due Ledger
  const updateCustomerDueLedger = async (customerId?: string | null, amount?: number) => {
    if (!customerId) return;
    const num = Number(amount) || 0;
    if (num <= 0) return;
    const targetCust = customers.find((c) => c.id === customerId);
    const custName = targetCust?.name || 'Customer';
    const desc = salesNote?.trim() || (language === 'bn' ? `বাকী বিক্রি: ${custName}` : `Due Sale: ${custName}`);
    await addDueTransaction(customerId, num, desc, salesDate || new Date().toISOString());
  };

  // Helper: Save to Transaction History (Daily Sales List & History)
  const saveToTransactionHistory = async (txData: {
    amount: number;
    type: string;
    date?: string;
    customerId?: string | null;
    customerName?: string | null;
    note?: string;
    items?: any[];
  }) => {
    const isDue = (txData.type || '').toString().toLowerCase() === 'due' || (txData.type || '') === 'DUE_SALE';
    const targetCust = txData.customerId ? customers.find((c) => c.id === txData.customerId) : null;
    const custName = txData.customerName || targetCust?.name || (isDue ? 'Due Customer' : 'Walk-in Customer');
    const desc = txData.note?.trim() || (isDue 
      ? (language === 'bn' ? `বাকী বিক্রি: ${custName}` : `Due Sale: ${custName}`) 
      : (language === 'bn' ? 'সাধারণ ক্যাশ বিক্রি' : 'Direct Cash Sale'));

    await addDailySale(
      txData.amount,
      desc,
      txData.date || new Date().toISOString(),
      {
        type: isDue ? 'DUE' : 'CASH',
        id: generateUniqueId(),
        customerId: txData.customerId || undefined,
        customerName: custName,
        total: txData.amount,
        items: txData.items,
        isDue: isDue,
        dueAmount: isDue ? txData.amount : 0
      }
    );
  };

  // Complete Sale handler ensuring exact amount, paid/due separation, persistence and reset
  const handleCompleteSale = async (saleData?: any) => {
    // Sothikvabe parse kora jate extra 0 ba string concat na hoy
    const rawValue = saleData?.amount !== undefined 
      ? saleData.amount 
      : (saleData?.totalAmount !== undefined 
          ? saleData.totalAmount 
          : salesAmount);

    const amountValue = typeof rawValue === 'number' 
      ? (isNaN(rawValue) ? 0 : rawValue) 
      : (parseFloat(String(rawValue)) || 0);
    
    if (amountValue <= 0) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert("Doya kore sothik amount din.");
      }
      setError(language === 'bn' ? "দয়া করে সঠিক বিক্রির পরিমাণ দিন!" : "Doya kore sothik amount din.");
      return;
    }

    const targetCustomer = saleData?.customerId 
      ? customers.find(c => c.id === saleData.customerId) || selectedCustomer 
      : selectedCustomer;

    const isDueSale = Boolean(
      targetCustomer || 
      saleData?.type === 'due' || 
      saleData?.type === 'Due Sale' || 
      saleData?.type === 'DUE_SALE' || 
      saleData?.isDue || 
      salesListTypeFilter === 'due'
    );

    const finalPaid = isDueSale ? 0 : amountValue;
    const finalDue = isDueSale ? amountValue : (saleData?.dueAmount || 0);

    const effectiveNote = (saleData?.itemNote || saleData?.medicineDetails || medicineNote || salesNote || "").trim();

    const itemsSource = (saleData?.items && saleData.items.length > 0) ? saleData.items : cartItems;
    const mappedItems = itemsSource.length > 0
      ? itemsSource.map((item: any) => ({
          name: item.name || item.medicineName,
          quantity: Number(item.qty || item.quantity || 1),
          price: Number(item.price !== undefined ? item.price : 0)
        }))
      : (effectiveNote ? [{
          name: effectiveNote,
          medicineName: effectiveNote,
          quantity: 1,
          qty: 1,
          price: amountValue
        }] : []);

    const recordId = saleData?.id ? String(saleData.id) : `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newSaleRecord = {
      id: recordId,
      customerId: targetCustomer ? targetCustomer.id : undefined,
      customerName: selectedCustomer ? selectedCustomer.name : (targetCustomer?.name || saleData?.customerName || "Walk-in Customer"),
      amount: amountValue, // Ensures exact amount is stored (e.g. 50 BDT remains exactly 50 BDT)
      total: amountValue,
      paidAmount: finalPaid,
      dueAmount: finalDue,
      itemNote: medicineNote || effectiveNote || "No medicine details found",
      medicineDetails: effectiveNote || "No medicine details found",
      date: saleData?.date || salesDate || getTodayLocalIso(),
      type: isDueSale ? "Due Sale" : "Paid Sale",
      isDue: isDueSale,
      items: mappedItems,
      ownerId: user ? user.uid : 'demo_user'
    };

    setIsSubmitting(true);
    try {
      // ১. মোট বিক্রির সাথে সবসময়ই এন্ট্রি যোগ হবে, যাতে অ্যামাউন্ট কমে না যায়
      const uid = user ? user.uid : null;
      let currentTotalSales = parseFloat(localStorage.getItem(getMetricsStorageKey(uid, 'totalSales')) || '0') || 0;
      currentTotalSales += amountValue;
      localStorage.setItem(getMetricsStorageKey(uid, 'totalSales'), currentTotalSales.toString());

      // ২. ক্যাশ এবং ডিউ সেল আলাদাভাবে রেকর্ড বা লেজারে আপডেট করা
      if (!isDueSale) {
        let cashSales = parseFloat(localStorage.getItem(getMetricsStorageKey(uid, 'cashSales')) || '0') || 0;
        cashSales += amountValue;
        localStorage.setItem(getMetricsStorageKey(uid, 'cashSales'), cashSales.toString());
      } else {
        let dueSales = parseFloat(localStorage.getItem(getMetricsStorageKey(uid, 'dueSales')) || '0') || 0;
        dueSales += amountValue;
        localStorage.setItem(getMetricsStorageKey(uid, 'dueSales'), dueSales.toString());

        if (targetCustomer?.id) {
          await updateCustomerDueLedger(targetCustomer.id, amountValue);
        }
      }

      // State update and persistent storage save (localStorage / Firebase)
      setSalesRecords((prevRecords: any[]) => {
        const filtered = (prevRecords || []).filter((r: any) => String(r.id) !== recordId);
        const updatedRecords = sanitizeSalesRecords([newSaleRecord, ...filtered]);
        
        try {
          const key = getSalesStorageKey(user ? user.uid : null);
          localStorage.setItem(key, JSON.stringify(updatedRecords));
        } catch (e) {
          console.error("Storage save error", e);
        }
        
        return updatedRecords;
      });

      // Daily Sales (LedgerContext / Cloud DB) update
      const desc = effectiveNote || (isDueSale 
        ? (language === 'bn' ? `বাকী বিক্রি: ${newSaleRecord.customerName}` : `Due Sale: ${newSaleRecord.customerName}`) 
        : (language === 'bn' ? 'সাধারণ ক্যাশ বিক্রি' : 'Direct Paid Sale'));

      await addDailySale(
        amountValue,
        desc,
        newSaleRecord.date,
        {
          type: isDueSale ? 'DUE_SALE' : 'PAID_SALE',
          id: recordId,
          customerId: newSaleRecord.customerId,
          customerName: newSaleRecord.customerName,
          total: amountValue,
          paidAmount: finalPaid,
          dueAmount: finalDue,
          itemNote: newSaleRecord.itemNote,
          medicineDetails: newSaleRecord.medicineDetails,
          isDue: isDueSale,
          items: mappedItems
        }
      );

      if (mappedItems && mappedItems.length > 0) {
        updateInventory(mappedItems);
      }

      // Input fields reset
      setSaleAmount("");
      setSalesAmount("");
      setMedicineNote("");
      setSelectedCustomer(null);
      setCustomerSearchQuery("");

      setIsSearchFocused(false);
      setCartItems([]);
      setStartDateFilter(newSaleRecord.date.substring(0, 10));
      setEndDateFilter(newSaleRecord.date.substring(0, 10));

      if (!isDueSale) {
        setSuccessMessage(
          language === 'bn'
            ? `সরাসরি ক্যাশ বিক্রি সফল হয়েছে! পরিমাণ: ৳${amountValue.toLocaleString()}`
            : `Sale recorded successfully! Amount: ৳${amountValue.toLocaleString()}`
        );
      } else {
        setSuccessMessage(
          language === 'bn'
            ? `৳${amountValue.toLocaleString()} বাকী সফলভাবে ${newSaleRecord.customerName}-এর খাতায় যোগ হয়েছে!`
            : `Due sale of ৳${amountValue.toLocaleString()} added to ${newSaleRecord.customerName}'s credit ledger!`
        );
      }

      await refreshMetrics();
      setTimeout(() => setSuccessMessage(''), 3500);
      return newSaleRecord;
    } catch (err) {
      console.error("Error completing sale:", err);
      setError("Failed to record sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aliases ensuring any caller routes through handleCompleteSale
  const handleSaveSale = async (saleData?: any) => {
    return handleCompleteSale(saleData);
  };

  const saveRecordToDatabase = async (salePayload: any) => {
    return handleCompleteSale(salePayload);
  };

  const handleDeleteSale = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSalesRecords((prevRecords: any[]) => {
      const updated = prevRecords.filter((r) => String(r.id) !== String(id));
      try {
        const key = getSalesStorageKey(user ? user.uid : null);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (deleteDailySale) {
      await deleteDailySale(id);
    }
    await refreshMetrics();
  };

  const updateCustomerDue = async (customerId: string, amount: number) => {
    await updateCustomerDueLedger(customerId, amount);
  };

  const saveSalesRecord = async (dueSaleRecord: {
    id: string;
    type: string;
    customerId: string;
    customerName?: string;
    amount: number;
    date: string;
  }) => {
    await saveToTransactionHistory({
      amount: dueSaleRecord.amount,
      type: 'due',
      customerId: dueSaleRecord.customerId,
      customerName: dueSaleRecord.customerName,
      date: dueSaleRecord.date
    });
  };

  const refreshMetrics = async () => {
    try {
      if (pullLatestFromCloud) {
        await pullLatestFromCloud();
      }
    } catch (e) {
      console.log('Metrics refreshed locally');
    }
  };

  // Due Sale Submit Handler
  const handleDueSaleSubmit = async (customPayload?: { amount?: number; [key: string]: any }) => {
    if (!selectedCustomer) {
      setError(language === 'bn' ? "বাকী বিক্রির জন্য কাস্টমার নির্বাচন করুন!" : "Please select a customer for due sale!");
      return;
    }

    const inputEl = (
      document.getElementById("saleAmount") || 
      document.getElementById("amountInput") || 
      document.getElementById("salesInput") || 
      document.getElementById("salesAmount") || 
      document.getElementById("salesAmountInput")
    ) as HTMLInputElement | null;
    const currentVal = customPayload?.amount !== undefined ? customPayload.amount : (inputEl?.value !== undefined && inputEl.value.trim() !== "" ? inputEl.value.trim() : salesAmount);
    const numAmount = parseFloat(String(currentVal).replace(/[^0-9.]/g, '')) || 0;

    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === 'bn' ? 'সঠিক বিক্রির টাকা লিখুন' : 'Please enter a valid sales amount');
      return;
    }

    await handleSaveSale({
      amount: numAmount,
      type: 'due',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      date: salesDate || new Date().toISOString()
    });
  };

  const handleSaveTransaction = async (data?: any) => {
    return handleSaveSale(data);
  };

  // Handle Due Sale submission with Customer Ledger + Sales List persistence
  const handleSubmitDueSale = async (customSaleData?: any) => {
    if (customSaleData) {
      const currentVal = customSaleData?.amount !== undefined ? customSaleData.amount : customSaleData?.totalAmount;
      const numAmount = parseFloat(String(currentVal).replace(/[^0-9.]/g, '')) || 0;
      await handleSaveSale({
        ...customSaleData,
        type: 'due',
        customerId: customSaleData.customerId,
        amount: numAmount
      });
      return;
    }
    await handleDueSaleSubmit();
  };

  const submitData = async (newRecord: any) => {
    if (selectedCustomer) {
      await handleDueSaleSubmit(newRecord);
    } else {
      await handleSaveSale(newRecord);
    }
  };

  // Daily Sale Submit Logic
  const handleDailySaleSubmit = async (e?: React.FormEvent | { amount?: number | string; total?: number | string; [key: string]: any }) => {
    if (e && 'preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    // Direct conversion of salesAmount to a pure number without string concatenation
    const rawValue = (e && typeof e === 'object' && 'amount' in e && e.amount !== undefined) 
      ? e.amount 
      : ((e && typeof e === 'object' && 'total' in e && e.total !== undefined) ? e.total : salesAmount);
    
    const amountValue = typeof rawValue === 'number'
      ? (isNaN(rawValue) ? 0 : rawValue)
      : (parseFloat(String(rawValue)) || 0);

    if (amountValue <= 0 || isNaN(amountValue)) {
      setError(language === 'bn' ? "সঠিক পরিমাণ লিখুন!" : "Doya kore sothik amount din.");
      return;
    }

    const extraData = (typeof e === 'object' && e !== null && !('preventDefault' in e)) ? e : {};
    const newRecord = {
      ...extraData,
      amount: amountValue,
      total: amountValue
    };

    await submitData(newRecord);
    // Reset salesAmount to "" immediately after submission
    setSalesAmount('');
  };

  const handleSaleSubmit = handleDailySaleSubmit;

  const executeInstantSale = async () => {
    if (singleEnterTimerRef.current) {
      clearTimeout(singleEnterTimerRef.current);
      singleEnterTimerRef.current = null;
    }
    const inputEl = (document.getElementById("saleAmount") || document.getElementById("salesInput")) as HTMLInputElement | null;
    const rawVal = inputEl?.value ?? salesAmount;
    const amountValue = parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0;
    if (amountValue <= 0 || isNaN(amountValue)) {
      setError(language === 'bn' ? "সঠিক পরিমাণ লিখুন!" : "Doya kore sothik amount din.");
      return;
    }
    await handleDailySaleSubmit({ amount: amountValue, total: amountValue });
  };

  const handleSelectPreset = (presetValue: number) => {
    // Clicking preset buttons directly sets setSalesAmount(presetValue.toString()) without adding to existing text
    setSalesAmount(presetValue.toString());
    setError('');
  };

  const goToNextStep = () => {
    // If a customer is already chosen, advance directly to the Medicine Note input
    if (selectedCustomer) {
      const noteInput = (
        document.getElementById("medicineNote") ||
        document.getElementById("salesNoteInput")
      ) as HTMLInputElement | null;
      if (noteInput) {
        noteInput.focus();
        setIsSearchFocused(false);
        return;
      }
    }

    // Otherwise, move focus to the customer search input field
    const searchInput = (
      document.getElementById("searchCustomer") ||
      document.getElementById("customerSearchInput")
    ) as HTMLInputElement | null;
    if (searchInput) {
      searchInput.focus();
      setIsSearchFocused(true);
    } else {
      const noteInput = (
        document.getElementById("medicineNote") ||
        document.getElementById("salesNoteInput")
      ) as HTMLInputElement | null;
      if (noteInput) {
        noteInput.focus();
        setIsSearchFocused(false);
      }
    }
  };

  const handleAmountKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const isEnterKey = 
      event.key === "Enter" || 
      event.keyCode === 13 || 
      event.which === 13 || 
      event.code === "Enter" || 
      event.code === "NumpadEnter";

    if (isEnterKey) {
      event.preventDefault(); // Prevent standard form submit & unwanted page jumps
      
      const currentTime = Date.now();
      const timeDifference = currentTime - lastEnterTimeRef.current;
      const DOUBLE_PRESS_WINDOW = 300; // 300ms window for double press

      if (timeDifference > 0 && timeDifference < DOUBLE_PRESS_WINDOW) {
        // --- 1. DOUBLE ENTER (pressed twice quickly): TRIGGER COMPLETE SALE ---
        if (singleEnterTimerRef.current) {
          clearTimeout(singleEnterTimerRef.current);
          singleEnterTimerRef.current = null;
        }
        lastEnterTimeRef.current = 0;
        executeInstantSale();
      } else {
        // --- 2. SINGLE ENTER: WAIT FOR DOUBLE-PRESS WINDOW; IF NO SECOND PRESS, MOVE FOCUS TO NEXT FIELD ---
        lastEnterTimeRef.current = currentTime;

        if (singleEnterTimerRef.current) {
          clearTimeout(singleEnterTimerRef.current);
        }

        singleEnterTimerRef.current = setTimeout(() => {
          goToNextStep();
          singleEnterTimerRef.current = null;
          lastEnterTimeRef.current = 0;
        }, DOUBLE_PRESS_WINDOW);
      }
    }
  };

  // Handle Save Expense with direct date string and global filter date auto-sync
  const handleSaveExpense = async (data?: { amount?: number; category?: string; note?: string; date?: string }) => {
    setError('');
    setSuccessMessage('');

    const currentVal = data?.amount !== undefined ? data.amount : expenseAmount;
    const numAmount = parseFloat(String(currentVal).replace(/[^0-9.]/g, '')) || 0;
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === 'bn' ? 'সঠিক খরচের টাকা লিখুন' : 'Please enter a valid expense amount');
      return;
    }

    const categoryToUse = data?.category || expenseCategory;
    const noteToUse = data?.note !== undefined ? data.note : expenseTitle;
    // input type="date" থেকে সরাসরি string ব্যবহার করা (যেমন: "2026-10-19")
    const dateToUse = data?.date || expenseDate || getTodayLocalIso();

    setIsSubmitting(true);
    try {
      // ১. ডেটাবেজে খরচ সেভ করুন
      await addExpense(categoryToUse, numAmount, noteToUse, dateToUse);

      // ২. সেভ হওয়ার পর গ্লোবাল ফিল্টার ডেটটি আপডেট করে দিন (যাতে ফিল্টারটিও এই তারিখ হয়ে যায়!)
      setStartDateFilter(dateToUse);
      setEndDateFilter(dateToUse);

      setSuccessMessage(t.successExpenseAdded || (language === 'bn' ? 'খরচ সফলভাবে সংরক্ষিত হয়েছে!' : 'Pharmacy expense recorded successfully!'));
      setExpenseAmount('');
      setExpenseTitle('');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error saving expense:', err);
      setError('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSaveExpense();
  };

  // Window helper registration for direct POS integration & element aliasing
  // Bound stably to [isOpen] using mutable refs to avoid tearing down & rebuilding on every keystroke
  useEffect(() => {
    if (!isOpen) return;

    (window as any).changeLanguage = (newLang?: 'en' | 'bn') => {
      const select = document.getElementById('languageSelect') as HTMLSelectElement | null;
      const targetLang = newLang || (select ? (select.value as 'en' | 'bn') : (languageRef.current === 'bn' ? 'en' : 'bn'));
      if (targetLang === 'en' || targetLang === 'bn') {
        setLanguage(targetLang);
      }
    };

    (window as any).submitData = (customData?: any) => {
      const rawValue = customData?.amount !== undefined 
        ? customData.amount 
        : (customData?.total !== undefined 
            ? customData.total 
            : salesAmountRef.current);

      const amountValue = typeof rawValue === 'number' 
        ? (isNaN(rawValue) ? 0 : rawValue) 
        : (parseFloat(String(rawValue)) || 0);

      if (amountValue <= 0) {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert("Doya kore sothik amount din.");
        }
        setError(languageRef.current === 'bn' ? "সঠিক পরিমাণ লিখুন!" : "Doya kore sothik amount din.");
        return;
      }

      const newRecord = {
        ...(typeof customData === 'object' && customData !== null ? customData : {}),
        amount: amountValue,
        total: amountValue
      };

      handleDailySaleSubmit(newRecord);
      setSalesAmount('');
    };

    (window as any).handleSaleSubmit = (e?: any) => {
      return handleSaleSubmit(e);
    };

    (window as any).handleSaveExpense = (newExpense?: any) => {
      if (newExpense) {
        const currentVal = newExpense.amount !== undefined ? newExpense.amount : 0;
        const parsedAmount = parseFloat(String(currentVal).replace(/[^0-9.]/g, '')) || 0;
        return handleSaveExpense({
          amount: parsedAmount,
          category: newExpense.category,
          note: newExpense.note || newExpense.title,
          date: newExpense.date
        });
      }
      return handleSaveExpense();
    };

    (window as any).generateUniqueId = () => {
      return `sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    };

    (window as any).updateInventory = (items?: any[]) => {
      return updateInventory(items);
    };

    (window as any).saveToSalesRecord = (paidSaleRecord: any) => {
      return saveToSalesRecord(paidSaleRecord);
    };

    (window as any).saveToCustomerLedger = (customerId: string, dueSaleRecord: any) => {
      return saveToCustomerLedger(customerId, dueSaleRecord);
    };

    (window as any).updateCustomerDueBalance = (customerId: string, totalAmount: number) => {
      return updateCustomerDueBalance(customerId, totalAmount);
    };

    (window as any).handleCompleteSale = (saleData?: any) => {
      return handleCompleteSale(saleData);
    };

    try {
      Object.defineProperty(window, 'cartItems', {
        get: () => cartItemsRef.current,
        set: (v) => setCartItems(v),
        configurable: true
      });
    } catch {}

    (window as any).setCartItems = setCartItems;
    (window as any).saveRecordToDatabase = (salePayload: any) => {
      return saveRecordToDatabase(salePayload);
    };

    (window as any).handleSaveSale = (saleData?: any) => {
      return handleSaveSale(saleData);
    };

    (window as any).updateCustomerDueLedger = (customerId: string, amount: number) => {
      return updateCustomerDueLedger(customerId, amount);
    };

    (window as any).saveToTransactionHistory = (txData: { amount: number; type: string; date?: string; customerId?: string }) => {
      return saveToTransactionHistory(txData);
    };

    (window as any).handleSubmitDueSale = (saleData?: any) => {
      if (saleData) {
        const currentVal = saleData.amount !== undefined ? saleData.amount : saleData.totalAmount;
        const parsedAmount = parseFloat(String(currentVal).replace(/[^0-9.]/g, '')) || 0;
        return handleSubmitDueSale({
          amount: parsedAmount,
          customerId: saleData.customerId,
          customerName: saleData.customerName,
          note: saleData.note,
          date: saleData.date
        });
      }
      return handleSubmitDueSale();
    };

    (window as any).handleSaveTransaction = (transactionData?: any) => {
      if (transactionData) {
        const currentVal = transactionData.amount !== undefined ? transactionData.amount : transactionData.totalAmount;
        const parsedAmount = parseFloat(String(currentVal).replace(/[^0-9.]/g, '')) || 0;
        return handleSaveTransaction({
          amount: parsedAmount,
          type: transactionData.type,
          customerId: transactionData.customerId,
          customerName: transactionData.customerName,
          note: transactionData.note,
          date: transactionData.date
        });
      }
      return handleSaveTransaction();
    };

    (window as any).handleDueSaleSubmit = () => {
      return handleDueSaleSubmit();
    };

    (window as any).updateCustomerDue = (customerId: string, amount: number) => {
      return updateCustomerDue(customerId, amount);
    };

    (window as any).saveSalesRecord = (dueSaleRecord: any) => {
      return saveSalesRecord(dueSaleRecord);
    };

    (window as any).refreshMetrics = () => {
      return refreshMetrics();
    };

    (window as any).setMedicineNote = (note: string) => {
      setMedicineNote(note);
    };

    try {
      Object.defineProperty(window, 'salesData', {
        get: () => matchedSalesRecordsRef.current,
        configurable: true
      });
    } catch {}

    (window as any).saveSalesToStorage = (records: any[]) => {
      try {
        const key = getSalesStorageKey(user ? user.uid : null);
        localStorage.setItem(key, JSON.stringify(records));
      } catch (e) {}
    };
    (window as any).renderRecordedSales = () => {
      refreshMetrics();
    };

    const origGetElementById = document.getElementById.bind(document);
    document.getElementById = function(id: string) {
      if (id === 'salesInput' || id === 'salesAmount' || id === 'saleAmount' || id === 'amountInput' || id === 'salesAmountInput') {
        return origGetElementById('saleAmount') || origGetElementById('amountInput') || origGetElementById(id);
      }
      if (id === 'searchCustomer' || id === 'customerSearchInput') {
        return origGetElementById('searchCustomer') || origGetElementById('customerSearchInput') || origGetElementById(id);
      }
      if (id === 'medicineNote' || id === 'salesNoteInput') {
        return origGetElementById('medicineNote') || origGetElementById('salesNoteInput') || origGetElementById(id);
      }
      if (id === 'completeSaleBtn' || id === 'btnSubmit' || id === 'btnSubmitSale') {
        return origGetElementById('completeSaleBtn') || origGetElementById('btnSubmit') || origGetElementById(id);
      }
      return origGetElementById(id);
    };

    return () => {
      delete (window as any).changeLanguage;
      delete (window as any).submitData;
      delete (window as any).handleSaveExpense;
      delete (window as any).handleSaveSale;
      delete (window as any).updateCustomerDueLedger;
      delete (window as any).saveToTransactionHistory;
      delete (window as any).handleSubmitDueSale;
      delete (window as any).handleSaveTransaction;
      delete (window as any).generateUniqueId;
      delete (window as any).updateInventory;
      delete (window as any).saveToSalesRecord;
      delete (window as any).saveToCustomerLedger;
      delete (window as any).updateCustomerDueBalance;
      delete (window as any).handleCompleteSale;
      delete (window as any).handleDueSaleSubmit;
      delete (window as any).updateCustomerDue;
      delete (window as any).saveSalesRecord;
      delete (window as any).refreshMetrics;
      delete (window as any).setMedicineNote;
      delete (window as any).cartItems;
      delete (window as any).setCartItems;
      delete (window as any).salesData;
      delete (window as any).saveSalesToStorage;
      delete (window as any).renderRecordedSales;
      document.getElementById = origGetElementById;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 w-full h-full bg-slate-950/95 bg-gradient-to-b from-[#072419] via-[#051c14] to-[#040f0c] text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-150"
    >
      {/* Background radial gradient glow accents matching the main app */}
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Dedicated Page Top Sticky Header */}
      <header className="sticky top-0 z-30 w-full bg-[#061712]/95 backdrop-blur-xl border-b border-[rgba(255,255,255,0.12)] px-4 sm:px-6 py-4 flex-shrink-0 shadow-lg shadow-black/30">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Back to Home Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-slate-200 hover:text-white hover:bg-emerald-950 hover:border-emerald-400 transition-all cursor-pointer shadow-sm active:scale-95 flex-shrink-0"
            title={language === 'bn' ? 'হোমে ফিরে যান' : 'Back to Home'}
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
          </button>

          {/* Logo & Page Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 justify-center sm:justify-start">
            {/* Glowing Neon Emblem matching main app Header */}
            <div className="relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a3d28] via-[#062417] to-[#02140d] border border-emerald-400/60 shadow-[0_0_15px_rgba(0,230,118,0.25)] ring-2 ring-emerald-500/20 p-0.5">
              <GlossySLogo size={36} className="w-full h-full object-cover" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e676] border border-[#061712]"></span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 id="txtTitle" className="text-sm sm:text-base md:text-lg font-extrabold text-white tracking-tight truncate">
                {language === 'bn' ? 'দ্রুত বিক্রয় সিস্টেম' : 'Fast POS System'}
              </h1>
              <p className="text-[11px] sm:text-xs text-emerald-400/90 font-medium truncate">
                {language === 'bn' ? 'সিয়াম ফার্মা • দৈনিক ক্যাশ ও খরচ লেজার' : 'Siam Pharma • Daily Cash & Expense Ledger'}
              </p>
            </div>
          </div>

          {/* Language Switcher Dropdown & Close 'X' Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              id="languageSelect"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'bn')}
              className="lang-select bg-[#0b141a] text-white border border-[#2a3b4d] hover:border-emerald-500/50 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all shadow-sm"
              title="Change Language / ভাষা পরিবর্তন"
            >
              <option value="en" className="bg-[#0b141a] text-white">English</option>
              <option value="bn" className="bg-[#0b141a] text-white">বাংলা</option>
            </select>

            {/* Close 'X' Button */}
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-slate-300 hover:text-white hover:bg-rose-950/60 hover:border-rose-500 transition-colors cursor-pointer flex-shrink-0"
              title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Full-Page Scrollable Content Container with clean, balanced vertical margins */}
      <main className="flex-1 w-full overflow-y-auto px-4 sm:px-6 py-6 relative z-10 pb-28">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Section 1: Top Pharmacy Profile Header clearly separated inside subtle card container */}
          <section className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-3.5 sm:p-4 shadow-md backdrop-blur-sm">
            <PharmacyInfoCard 
              onOpenProfileModal={onOpenProfileModal || (() => {})}
              onOpenAboutModal={onOpenAboutModal}
            />
          </section>

          {/* DATE RANGE FILTER SYSTEM */}
          <div className="mb-3 bg-slate-900/90 p-3 rounded-xl border border-emerald-500/40 shadow-md">
            <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>📅</span> {language === 'bn' ? 'তারিখ ভিত্তিক রিপোর্ট ফিল্টার' : 'DATE RANGE REPORT FILTER'}
              </span>
              {(startDateFilter !== todayIso || endDateFilter !== todayIso) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter(todayIso);
                    setEndDateFilter(todayIso);
                  }}
                  className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'আজকে' : 'Reset to Today'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">
                  {language === 'bn' ? 'শুরুর তারিখ' : 'Start Date'}
                </label>
                <input 
                  type="date" 
                  id="startDateFilter" 
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full bg-slate-800 text-emerald-400 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/50 focus:outline-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">
                  {language === 'bn' ? 'শেষ তারিখ' : 'End Date'}
                </label>
                <input 
                  type="date" 
                  id="endDateFilter" 
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full bg-slate-800 text-emerald-400 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/50 focus:outline-none cursor-pointer"
                />
              </div>
            </div>
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-emerald-500/20 text-[10px] font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setStartDateFilter(todayIso);
                  setEndDateFilter(todayIso);
                }}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  startDateFilter === todayIso && endDateFilter === todayIso
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-emerald-500/30'
                }`}
              >
                {language === 'bn' ? 'আজকে' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  const y = d.toISOString().split('T')[0];
                  setStartDateFilter(y);
                  setEndDateFilter(y);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'গতকাল' : 'Yesterday'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  setStartDateFilter(d.toISOString().split('T')[0]);
                  setEndDateFilter(todayIso);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'গত ৭ দিন' : 'Last 7 Days'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                  setStartDateFilter(first);
                  setEndDateFilter(todayIso);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'এই মাস' : 'This Month'}
              </button>
            </div>
          </div>

          {/* OVERVIEW METRICS SECTION */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span id="rangeTitle" className="text-xs text-emerald-400 font-bold tracking-wider">
                ● RANGE METRICS
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {/* SALES CARD */}
              <div 
                onClick={() => { setActiveTab('sales'); setError(''); setSuccessMessage(''); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { setActiveTab('sales'); setError(''); setSuccessMessage(''); } }}
                className={`bg-slate-900/90 border-2 border-emerald-500 rounded-xl p-2 flex flex-col justify-between shadow-lg shadow-emerald-950/40 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  activeTab === 'sales' ? 'ring-2 ring-emerald-400/80 shadow-emerald-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-sm">🛍️</span>
                  <span className="text-[10px] font-extrabold text-emerald-400 tracking-wide uppercase truncate">
                    {language === 'bn' ? 'বিক্রি' : 'SALES'}
                  </span>
                </div>
                <div className="mt-1.5">
                  <span id="rangeSales" className="text-sm font-black text-white block tracking-tight">
                    ৳ <span id="rangeSalesValue">{rangeSales.toLocaleString('en-US')}</span>
                  </span>
                  <p className="text-[9px] font-bold text-emerald-300 mt-0.5 flex items-center gap-0.5">
                    <span>📈</span> Range Total
                  </p>
                </div>
              </div>

              {/* EXPENSES CARD */}
              <div 
                onClick={() => { setActiveTab('expenses'); setError(''); setSuccessMessage(''); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { setActiveTab('expenses'); setError(''); setSuccessMessage(''); } }}
                className={`bg-slate-900/90 border-2 border-rose-500 rounded-xl p-2 flex flex-col justify-between shadow-lg shadow-rose-950/40 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  activeTab === 'expenses' ? 'ring-2 ring-rose-400/80 shadow-rose-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-sm">💳</span>
                  <span className="text-[10px] font-extrabold text-rose-400 tracking-wide uppercase truncate">
                    {language === 'bn' ? 'খরচ' : 'EXPENSES'}
                  </span>
                </div>
                <div className="mt-1.5">
                  <span id="rangeExpenses" className="text-sm font-black text-white block tracking-tight">
                    ৳ {rangeExpenses.toLocaleString('en-US')}
                  </span>
                  <p className="text-[9px] font-bold text-rose-300 mt-0.5 flex items-center gap-0.5">
                    <span>📅</span> Range Total
                  </p>
                </div>
              </div>

              {/* DUE CARD */}
              <div 
                className="bg-slate-900/90 border-2 border-amber-400 rounded-xl p-2 flex flex-col justify-between shadow-lg shadow-amber-950/40 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-1">
                  <span className="text-sm">⚠️</span>
                  <span className="text-[10px] font-extrabold text-amber-300 tracking-wide uppercase truncate">
                    {language === 'bn' ? 'বকেয়া' : 'DUE'}
                  </span>
                </div>
                <div className="mt-1.5">
                  <span id="rangeDue" className="text-sm font-black text-amber-300 block tracking-tight">
                    ৳ <span id="rangeDueValue">{rangeDue.toLocaleString('en-US')}</span>
                  </span>
                  <p className="text-[9px] font-bold text-amber-400 mt-0.5 flex items-center gap-0.5">
                    <span>⏰</span> Range Total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: TOP TABS ("Daily Sales" & "Pharmacy Expenses") with rounded-full styling */}
          <section className="bg-slate-950/80 p-1.5 rounded-full border border-emerald-500/20 grid grid-cols-2 gap-2 shadow-inner flex-shrink-0">
            {/* Active / Inactive Tab: Daily Sales */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('sales');
                setError('');
                setSuccessMessage('');
              }}
              className={`py-2.5 px-6 rounded-full flex items-center justify-center gap-2 text-sm transition-all cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                  : 'border border-emerald-500/20 text-slate-300 font-semibold hover:text-white hover:bg-emerald-950/30'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.dailySalesTab || "Daily Sales"}</span>
            </button>

            {/* Active / Inactive Tab: Pharmacy Expenses */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('expenses');
                setError('');
                setSuccessMessage('');
              }}
              className={`py-2.5 px-6 rounded-full flex items-center justify-center gap-2 text-sm transition-all cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                  : 'border border-emerald-500/20 text-slate-300 font-semibold hover:text-white hover:bg-emerald-950/30'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>{t.pharmacyExpensesTab || "Pharmacy Expenses"}</span>
            </button>
          </section>

          {/* Feedback & Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-700 text-sm text-rose-200 flex items-center gap-2.5 animate-in fade-in shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Result / Success feedback box */}
          <div 
            id="resultBox" 
            className="result-box p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/70 text-sm text-emerald-100 flex items-center gap-2.5 shadow-[0_0_18px_rgba(0,230,118,0.25)] transition-all animate-in fade-in"
            style={{ display: successMessage ? 'flex' : 'none' }}
          >
            <CheckCircle2 className="w-4 h-4 text-[#00e676] flex-shrink-0" />
            <span id="txtSuccess" className="font-bold">
              {successMessage || (language === 'bn' ? 'সফলভাবে বিক্রি সম্পন্ন হয়েছে!' : 'Sale completed successfully!')}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* Section 4: TAB 1: DAILY SALES FORM CONTAINER (High-Contrast Emerald Glassmorphic Card) */}
          {/* ========================================================================= */}
          {activeTab === 'sales' && (
            <div className="rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-2xl p-5 sm:p-7 space-y-5 backdrop-blur-xl">
                <form onSubmit={handleDailySaleSubmit} className="space-y-5">
                  {/* Mode Selector Bar */}
                  {selectedCustomer ? (
                    <div className="bg-emerald-950/20 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <Tag className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-rose-200">
                          {language === 'bn' ? 'Mode: কাস্টমার বাকী বিক্রি (+Due Sale)' : 'Mode: Customer Credit / Due Sale (+Due)'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-rose-400" />
                    </div>
                  ) : (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Tag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-emerald-200">
                          Mode: Regular Cash Sale (নগদ বিক্রি)
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}

                  {/* 1. SALES AMOUNT */}
                  <div className="form-group">
                    <label 
                      id="txtLabel" 
                      htmlFor="amountInput" 
                      className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase"
                    >
                      {language === 'bn' ? 'বিক্রয়ের পরিমাণ (টাকা):' : 'Sales Amount (BDT):'} *
                    </label>
                    <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl p-2 sm:px-3 sm:py-2.5 shadow-inner transition-all w-full">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <input
                        id="saleAmount"
                        name="saleAmount"
                        data-alias="amountInput salesInput salesAmount salesAmountInput"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        required
                        autoFocus
                        value={salesAmount}
                        onChange={(e) => setSalesAmount(e.target.value)}
                        onKeyDown={handleAmountKeyDown}
                        placeholder={language === 'bn' ? 'পরিমাণ লিখুন...' : 'Enter amount...'}
                        className="bg-transparent border-none outline-none flex-1 min-w-0 text-xl sm:text-2xl font-bold font-mono text-emerald-300 placeholder:text-slate-500 p-0 focus:ring-0 focus:outline-none tracking-tight"
                      />
                      {/* Visible 1-Tap 'Complete Sale' Button in the right corner */}
                      <button
                        type="button"
                        id="quickCompleteSaleBtn"
                        data-alias="completeSaleButton instantSaleBtn submitSaleButton quickSubmitBtn"
                        onClick={executeInstantSale}
                        disabled={isSubmitting}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                        title={language === 'bn' ? '১-ট্যাপে বিক্রি সম্পন্ন করুন' : '1-Tap Complete Sale'}
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                        <span>{language === 'bn' ? 'Complete Sale' : 'Complete Sale'}</span>
                      </button>
                    </div>
                    {/* Keyboard Shortcut Indicator & 1-Tap Info */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium flex-wrap">
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                        ↵↵ Enter (x2)
                      </span>
                      <span className="text-emerald-300/90 font-semibold">{language === 'bn' ? 'দ্রুত বিক্রি (বা ডানের বোতামে ১-ট্যাপ)' : 'Instant Sale (or 1-Tap button)'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{language === 'bn' ? '১ বার Enter: কাস্টমার / নোট' : '1x Enter: Customer & Note'}</span>
                    </div>
                  </div>

                  {/* 2. QUICK SELECT AMOUNT PILLS (5 pill buttons with active bright emerald state) */}
                  <div>
                    <span className="block text-xs font-semibold text-slate-300 tracking-wider mb-2 uppercase">
                      {language === 'bn' ? 'দ্রুত অ্যামাউন্ট নির্বাচন করুন:' : 'QUICK SELECT AMOUNT:'}
                    </span>
                    <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                      {[50, 100, 250, 500, 1000].map((preset) => {
                        const isSelected = salesAmount === preset.toString();
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`py-2 px-2 sm:px-4 rounded-full text-xs sm:text-sm transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                                : 'bg-slate-900/60 border border-emerald-500/30 text-emerald-300 font-semibold hover:border-emerald-400 hover:text-white'
                            }`}
                          >
                            ৳{preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. SEARCH CUSTOMER (With '+ Add Customer' green pill button on right of label) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300 tracking-wider uppercase">
                        {language === 'bn' ? 'SEARCH CUSTOMER' : 'SEARCH CUSTOMER'}
                      </label>
                      {onOpenAddCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAddCustomer();
                          }}
                          className="bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-900/60 transition cursor-pointer flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Add Customer</span>
                        </button>
                      )}
                    </div>

                    {selectedCustomer ? (
                      /* Customer Selected Card */
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/40 shadow-md space-y-3 animate-in fade-in">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 font-bold font-mono text-sm sm:text-base flex-shrink-0">
                              #{selectedCustomer.serialNumber || '0'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-base text-white truncate">{selectedCustomer.name}</h4>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400/40">
                                  {language === 'bn' ? 'বাকীর খাতা' : 'Due Ledger'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-mono">{selectedCustomer.phone}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerSearchQuery('');
                            }}
                            className="px-3 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer flex-shrink-0"
                            title="Remove customer and revert to Cash Sale"
                          >
                            <X className="w-4 h-4" />
                            <span>{language === 'bn' ? 'নগদে পরিবর্তন' : 'Clear (Cash)'}</span>
                          </button>
                        </div>

                        <div className="pt-2.5 border-t border-emerald-900/60 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-xs block uppercase font-medium">
                              {language === 'bn' ? 'বর্তমান বাকি:' : 'Current Due:'}
                            </span>
                            <span className="font-bold font-mono text-rose-300 text-base">
                              ৳{selectedCustomer.totalDue.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 text-xs block uppercase font-medium">
                              {language === 'bn' ? 'বিক্রির পর মোট বাকি:' : 'New Total Due:'}
                            </span>
                            <span className="font-bold font-mono text-amber-300 text-base">
                              ৳{(selectedCustomer.totalDue + (parseFloat(String(salesAmount).replace(/[^0-9.]/g, '')) || 0)).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Customer Search Input */
                      <div ref={searchContainerRef} className="relative w-full">
                        <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <input
                            id="searchCustomer"
                            name="searchCustomer"
                            data-alias="customerSearchInput searchCustomer customerInput"
                            type="text"
                            value={customerSearchQuery}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setIsSearchFocused(true);
                            }}
                            onFocus={() => setIsSearchFocused(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.keyCode === 13) {
                                e.preventDefault();
                                setIsSearchFocused(false);
                                const noteInput = (
                                  document.getElementById("medicineNote") ||
                                  document.getElementById("salesNoteInput")
                                ) as HTMLInputElement | null;
                                if (noteInput) {
                                  noteInput.focus();
                                }
                              } else if (e.key === 'Tab' || e.key === 'Escape') {
                                setIsSearchFocused(false);
                              }
                            }}
                            placeholder={language === 'bn' ? 'কাস্টমারের নাম বা ফোন নাম্বার দিয়ে খুঁজুন...' : 'Search customer by name or phone...'}
                            className="bg-transparent border-none outline-none w-full text-base text-emerald-300 placeholder:text-slate-500 p-0 focus:ring-0 focus:outline-none"
                          />
                          {customerSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setCustomerSearchQuery('')}
                              className="text-slate-400 hover:text-white p-1 ml-auto flex-shrink-0 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Customer Search Dropdown */}
                        {isSearchFocused && (
                          <div className="absolute z-30 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-slate-950 border border-emerald-500/50 shadow-2xl p-2 space-y-1.5 animate-in fade-in">
                            <div className="flex items-center justify-between px-3 py-1.5 text-xs font-bold text-emerald-300/80 border-b border-emerald-900/60">
                              <span>
                                {customerSearchQuery 
                                  ? (language === 'bn' ? `খোঁজের ফলাফল (${matchingCustomers.length})` : `Matches (${matchingCustomers.length})`)
                                  : (language === 'bn' ? 'কাস্টমার নির্বাচন করুন:' : 'Select customer:')}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => setIsSearchFocused(false)} 
                                className="text-emerald-400 hover:text-emerald-200 font-bold"
                              >
                                Close
                              </button>
                            </div>

                            {matchingCustomers.length === 0 ? (
                              <div className="p-4 text-center text-sm text-slate-400">
                                <p>{language === 'bn' ? 'কোন কাস্টমার পাওয়া যায়নি' : 'No matching customers found'}</p>
                                {onOpenAddCustomer && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onOpenAddCustomer();
                                    }}
                                    className="mt-2 text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1.5"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    {language === 'bn' ? 'নতুন কাস্টমার তৈরি করুন' : 'Create new customer'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              matchingCustomers.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(c);
                                    setCustomerSearchQuery('');
                                    setIsSearchFocused(false);
                                    setTimeout(() => {
                                      const noteInput = (
                                        document.getElementById("medicineNote") ||
                                        document.getElementById("salesNoteInput")
                                      ) as HTMLInputElement | null;
                                      if (noteInput) {
                                        noteInput.focus();
                                      }
                                    }, 50);
                                  }}
                                  className="w-full text-left p-3 rounded-lg hover:bg-emerald-950/60 border border-transparent hover:border-emerald-500/30 flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="w-8 h-8 rounded-lg bg-slate-900 border border-emerald-800 text-emerald-300 font-mono text-xs flex items-center justify-center font-bold flex-shrink-0">
                                        #{c.serialNumber || '0'}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-white group-hover:text-emerald-300 truncate">
                                          {c.name}
                                        </p>
                                        <p className="text-xs text-slate-400 font-mono truncate">{c.phone}</p>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-800/60 font-mono">
                                        ৳{c.totalDue.toLocaleString()} Due
                                      </span>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MEDICINE / ITEM NOTE (OPTIONAL) SECTION ONLY */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase">
                      {language === 'bn' ? 'MEDICINE / ITEM NOTE (OPTIONAL)' : 'MEDICINE / ITEM NOTE (OPTIONAL)'}
                    </label>
                    <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <input
                        id="medicineNote"
                        name="medicineNote"
                        data-alias="salesNoteInput medicineNoteInput"
                        type="text"
                        value={medicineNote}
                        onChange={(e) => setMedicineNote(e.target.value)}
                        onFocus={() => {
                          setIsSearchFocused(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setIsSearchFocused(false);
                            handleDailySaleSubmit();
                          }
                        }}
                        placeholder="e.g. Napa Extra, Napa syrup, OTC cash sale"
                        className="bg-transparent border-none outline-none w-full text-base text-emerald-300 placeholder:text-slate-500 p-0 focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 5. SALE DATE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase">
                      {language === 'bn' ? 'SALE DATE' : 'SALE DATE'}
                    </label>
                    <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <input
                        type="date"
                        value={salesDate}
                        onChange={(e) => setSalesDate(e.target.value)}
                        onFocus={() => setIsSearchFocused(false)}
                        className="bg-transparent border-none outline-none w-full text-base text-emerald-300 p-0 focus:ring-0 focus:outline-none cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* 6. ACTION BUTTONS: Cancel (Dark Pill) + Submit Sale (Large Glowing Emerald Pill) */}
                  <div className="pt-2 flex items-center gap-3">
                    {/* Cancel Button */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="bg-slate-900 border border-emerald-500/30 text-slate-200 font-semibold rounded-full py-3 px-6 flex-1 items-center justify-center flex gap-2 active:scale-95 transition-all hover:bg-slate-800 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                      <span>{t.cancel || 'Cancel'}</span>
                    </button>

                    {/* Submit Sale Button */}
                    <button
                      type="submit"
                      id="completeSaleBtn"
                      data-alias="btnSubmit btnSubmitSale"
                      disabled={isSubmitting}
                      className="btn-action btn-submit bg-emerald-500 text-slate-950 font-bold rounded-full py-3 px-6 flex-1 items-center justify-center flex gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                      <span>
                        {isSubmitting
                          ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Recording...')
                          : selectedCustomer
                            ? (language === 'bn' 
                                ? `বাকী খাতায় যুক্ত করুন${salesAmount ? ` (+৳${salesAmount})` : ''}` 
                                : `Submit Due Sale${salesAmount ? ` (+৳${salesAmount})` : ''}`)
                            : (language === 'bn' ? 'বিক্রি সম্পন্ন করুন' : 'Complete Sale')}
                      </span>
                    </button>
                  </div>
                </form>

                {/* BRAND NEW HIGHLY VISIBLE "RECORDED SALES HISTORY" SECTION */}
                <div className="pt-6 border-t-2 border-emerald-900/80 space-y-4">
                  {/* Header with Title and Range Summary Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/40">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                          <span>{language === 'bn' ? 'বিক্রির ইতিহাস' : 'Recorded Sales History'}</span>
                          <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                            {matchedSalesRecords.length}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          {startDateFilter === endDateFilter
                            ? (startDateFilter === todayIso 
                                ? (language === 'bn' ? 'আজকের বিক্রিসমূহ' : "Today's sales") 
                                : `${formatDate(startDateFilter)}`)
                            : `${formatDate(startDateFilter)} - ${formatDate(endDateFilter)}`}
                        </p>
                      </div>
                    </div>

                    {/* Quick Range Summary Totals */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono shadow-sm">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block leading-none mb-0.5">Total</span>
                        <span className="font-extrabold text-white text-sm">৳{(rangeSales + salesDueSum).toLocaleString('en-US')}</span>
                      </div>
                      <div className="bg-emerald-950/90 border border-emerald-500/50 px-3 py-1.5 rounded-xl text-xs font-mono shadow-sm">
                        <span className="text-emerald-400 text-[10px] uppercase font-bold block leading-none mb-0.5">Paid</span>
                        <span className="font-extrabold text-emerald-300 text-sm">৳{rangeCashSales.toLocaleString('en-US')}</span>
                      </div>
                      <div className="bg-amber-950 border-2 border-amber-400/80 px-3 py-1.5 rounded-xl text-xs font-mono shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                        <span className="text-amber-400 text-[10px] uppercase font-black block leading-none mb-0.5">Due</span>
                        <span className="font-black text-amber-300 text-sm">৳{salesDueSum.toLocaleString('en-US')}</span>
                      </div>
                    </div>
                  </div>

                  {/* 1. FILTER TABS: All, Paid, Has Due */}
                  <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-inner">
                    <button
                      type="button"
                      id="filterTabAll"
                      onClick={() => setSalesListTypeFilter('all')}
                      className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        salesListTypeFilter === 'all'
                          ? 'bg-slate-700 text-white shadow-lg border-2 border-slate-400 scale-[1.02]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent'
                      }`}
                    >
                      <span>{language === 'bn' ? 'সকল' : 'All'}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 font-mono">
                        {matchedSalesRecords.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="filterTabPaid"
                      onClick={() => setSalesListTypeFilter('paid')}
                      className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        salesListTypeFilter === 'paid' || salesListTypeFilter === 'cash'
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 border-2 border-emerald-300 scale-[1.02]'
                          : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-transparent'
                      }`}
                    >
                      <span>{language === 'bn' ? 'পরিশোধিত' : 'Paid'}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        salesListTypeFilter === 'paid' || salesListTypeFilter === 'cash'
                          ? 'bg-slate-950 text-emerald-300'
                          : 'bg-emerald-950/80 border border-emerald-500/40'
                      }`}>
                        {paidCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="filterTabDue"
                      onClick={() => setSalesListTypeFilter('due')}
                      className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        salesListTypeFilter === 'due'
                          ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/40 border-2 border-amber-200 scale-[1.02]'
                          : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border border-transparent'
                      }`}
                    >
                      <span>{language === 'bn' ? 'বাকি আছে' : 'Has Due'}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                        salesListTypeFilter === 'due'
                          ? 'bg-slate-950 text-amber-300'
                          : 'bg-amber-950/80 border border-amber-500/50'
                      }`}>
                        {dueCount}
                      </span>
                    </button>
                  </div>

                  {/* 2. SALES HISTORY LIST (Larger Font, Larger Card, Highlighted Badges) */}
                  {filteredSalesRecords.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                      <p className="text-base font-bold text-slate-300">
                        {salesListTypeFilter === 'due'
                          ? (language === 'bn' ? 'এই তারিখে কোনো বাকি বিক্রি নেই' : 'No due sales found for this date range')
                          : salesListTypeFilter === 'paid'
                            ? (language === 'bn' ? 'এই তারিখে কোনো নগদ বা পরিশোধিত বিক্রি নেই' : 'No paid sales found for this date range')
                            : (language === 'bn' ? 'নির্বাচিত তারিখে কোনো বিক্রির রেকর্ড পাওয়া যায়নি' : 'No sales recorded for the selected date range')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'bn' ? 'অন্য ফিল্টার বা তারিখ নির্বাচন করে দেখতে পারেন' : 'Try selecting another tab or date filter above'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                      {filteredSalesRecords.map((sale: any) => {
                        const isDue = sale.type === 'DUE_SALE' || sale.type === 'Due Sale' || sale.type === 'due' || sale.isDue === true || Boolean(sale.dueAmount && Number(sale.dueAmount) > 0);
                        
                        // Strict numerical parsing to prevent extra zeros or string append issues
                        const totalSaleAmount = typeof sale.amount === 'number' 
                          ? sale.amount 
                          : (parseFloat(String(sale.amount || sale.total || sale.totalAmount || 0).replace(/[^0-9.]/g, '')) || 0);

                        const rawPaid = sale.paidAmount !== undefined ? sale.paidAmount : (isDue ? 0 : totalSaleAmount);
                        const paidAmount = typeof rawPaid === 'number'
                          ? rawPaid
                          : (parseFloat(String(rawPaid).replace(/[^0-9.]/g, '')) || 0);

                        const rawDue = sale.dueAmount !== undefined ? sale.dueAmount : (isDue ? totalSaleAmount : 0);
                        const dueAmount = typeof rawDue === 'number'
                          ? rawDue
                          : (parseFloat(String(rawDue).replace(/[^0-9.]/g, '')) || 0);

                        const customerName = sale.customerName || 'Walk-in Customer';
                        const dateTimeStr = formatSaleDateTime(sale);

                        return (
                          <div
                            key={sale.id || `${sale.date}_${Math.random()}`}
                            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-3.5 ${
                              dueAmount > 0
                                ? 'bg-slate-900/95 border-amber-500/60 hover:border-amber-400 shadow-xl shadow-amber-950/30'
                                : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 shadow-md'
                            }`}
                          >
                            {/* Top Line: Customer Name, Tag & Total Sale Amount */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-white text-base sm:text-xl truncate tracking-tight">
                                    {customerName}
                                  </h4>
                                  {sale.customerId ? (
                                    <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                                      Customer
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                                      Cash
                                    </span>
                                  )}
                                </div>

                                {/* Formatted Date & Time */}
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs sm:text-sm text-slate-300 font-bold">
                                  <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                  <span>{dateTimeStr}</span>
                                </div>
                              </div>

                              {/* Big Total Sale Amount */}
                              <div className="text-right flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase block tracking-wider mb-0.5">
                                  Sale Amount
                                </span>
                                <span className="font-mono font-black text-white text-xl sm:text-2xl block tracking-tight">
                                  ৳{totalSaleAmount.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>

                            {/* Optional Note / Medicine item */}
                            {sale.itemNote && sale.itemNote !== 'No medicine details found' && (
                              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs sm:text-sm text-slate-300 italic flex items-center gap-2">
                                <span className="font-semibold text-emerald-400 not-italic flex-shrink-0">📝 Note:</span>
                                <span className="truncate">{sale.itemNote}</span>
                              </div>
                            )}

                            {/* Bottom Row: High-Contrast Big Badges for Paid & Due */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                              {/* Large Paid Badge (Green) */}
                              <div className="py-2.5 px-3 sm:px-4 rounded-xl bg-emerald-950 border-2 border-emerald-500/80 text-emerald-300 font-mono flex items-center justify-between shadow-md shadow-emerald-950/40">
                                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                                  Paid
                                </span>
                                <span className="text-sm sm:text-lg font-black tracking-tight">
                                  ৳{paidAmount.toLocaleString('en-US')}
                                </span>
                              </div>

                              {/* Large Due Badge (Bright Orange / Amber High-Contrast) */}
                              <div
                                className={`py-2.5 px-3 sm:px-4 rounded-xl font-mono flex items-center justify-between transition-all ${
                                  dueAmount > 0
                                    ? 'bg-amber-950/95 border-2 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40'
                                    : 'bg-slate-950/80 border border-slate-800 text-slate-400'
                                }`}
                              >
                                <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${
                                  dueAmount > 0 ? 'text-amber-400 flex items-center gap-1' : 'text-slate-400'
                                }`}>
                                  {dueAmount > 0 && <span>⚠️</span>} Due
                                </span>
                                <span className={`text-sm sm:text-lg font-black tracking-tight ${
                                  dueAmount > 0 ? 'text-amber-200' : 'text-slate-400'
                                }`}>
                                  ৳{dueAmount.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
          )}

          {/* ========================================================================= */}
          {/* Section 5: TAB 2: PHARMACY EXPENSES FORM CONTAINER (High-Contrast Emerald Glassmorphic Card) */}
          {/* ========================================================================= */}
          {activeTab === 'expenses' && (
            <div className="rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-2xl p-5 sm:p-7 space-y-5 backdrop-blur-xl">
              <form onSubmit={handleExpenseSubmit} className="space-y-5">
                {/* Expense Categories */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-2 uppercase">
                    {t.expenseCategoryLabel || "EXPENSE CATEGORY"} *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = expenseCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setExpenseCategory(cat.id)}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20 border-emerald-400'
                              : 'bg-slate-900/60 border-emerald-500/20 text-slate-300 hover:bg-emerald-950/40 hover:border-emerald-400'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`} />
                          <span className="text-xs font-bold leading-tight">
                            {language === 'bn' ? cat.labelBn : cat.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expense Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase">
                    {t.expenseAmountLabel || "EXPENSE AMOUNT"} *
                  </label>
                  <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="৳ 250"
                      className="bg-transparent border-none outline-none w-full text-xl font-bold font-mono text-emerald-300 placeholder:text-slate-500 p-0 focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Expense Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase">
                    {t.expenseTitleLabel || "EXPENSE NOTE / DESCRIPTION"}
                  </label>
                  <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                    <input
                      type="text"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      placeholder={language === 'bn' ? 'যেমন: দোকানের জন্য নাস্তা ও চা' : 'e.g. Tea & snacks for shop guests'}
                      className="bg-transparent border-none outline-none w-full text-base text-emerald-300 placeholder:text-slate-500 p-0 focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Expense Date Input Field */}
                <div className="mb-4">
                  <label 
                    htmlFor="expenseDate"
                    className="block text-xs sm:text-sm font-semibold text-slate-300 tracking-wider mb-1.5 uppercase"
                  >
                    {language === 'bn' ? 'খরচের তারিখ (Expense Date)' : 'Expense Date'}
                  </label>
                  <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      type="date"
                      id="expenseDate"
                      name="expenseDate"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-base text-emerald-300 p-0 focus:ring-0 focus:outline-none cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-slate-900 border border-emerald-500/30 text-slate-200 font-semibold rounded-full py-3 px-6 flex-1 items-center justify-center flex gap-2 active:scale-95 transition-all hover:bg-slate-800 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                    <span>{t.cancel || 'Cancel'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-500 text-slate-950 font-bold rounded-full py-3 px-6 flex-1 items-center justify-center flex gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>{isSubmitting ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'খরচ সংরক্ষণ করুন' : 'Save Expense')}</span>
                  </button>
                </div>
              </form>

              {/* BRAND NEW HIGHLY VISIBLE "RECORDED EXPENSE HISTORY" SECTION */}
              <div className="pt-6 border-t-2 border-emerald-900/80 space-y-4">
                {/* Header with Title and Range Summary Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-md shadow-rose-950/40">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                        <span>{language === 'bn' ? 'খরচের ইতিহাস' : 'Recorded Expense History'}</span>
                        <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300">
                          {matchedExpensesRecords.length}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        {startDateFilter === endDateFilter
                          ? (startDateFilter === todayIso 
                              ? (language === 'bn' ? 'আজকের খরচসমূহ' : "Today's expenses") 
                              : `${formatDate(startDateFilter)}`)
                          : `${formatDate(startDateFilter)} - ${formatDate(endDateFilter)}`}
                      </p>
                    </div>
                  </div>

                  {/* Quick Range Summary Totals */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono shadow-sm">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block leading-none mb-0.5">Entries</span>
                      <span className="font-extrabold text-white text-sm">{matchedExpensesRecords.length} Items</span>
                    </div>
                    <div className="bg-rose-950 border-2 border-rose-500/80 px-3 py-1.5 rounded-xl text-xs font-mono shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                      <span className="text-rose-400 text-[10px] uppercase font-black block leading-none mb-0.5">Total Expense</span>
                      <span className="font-black text-rose-300 text-sm">৳{matchedExpensesRecords.reduce((acc, e) => acc + (Number(e.amount) || 0), 0).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                </div>

                {/* 1. Category Filter Tabs if categories exist */}
                {availableExpenseCategories.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-inner no-scrollbar">
                    <button
                      type="button"
                      id="filterExpenseAll"
                      onClick={() => setExpenseListFilter('all')}
                      className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                        expenseListFilter === 'all'
                          ? 'bg-slate-700 text-white shadow-lg border-2 border-slate-400 scale-[1.02]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent'
                      }`}
                    >
                      <span>{language === 'bn' ? 'সকল খরচ' : 'All Expenses'}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 font-mono">
                        {matchedExpensesRecords.length}
                      </span>
                    </button>
                    {availableExpenseCategories.map((cat) => {
                      const count = matchedExpensesRecords.filter((e) => e.category === cat).length;
                      const isSelected = expenseListFilter === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setExpenseListFilter(cat)}
                          className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                            isSelected
                              ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/30 border-2 border-rose-300 scale-[1.02]'
                              : 'text-rose-300/80 hover:text-rose-200 hover:bg-rose-950/40 border border-transparent'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            isSelected ? 'bg-slate-950 text-rose-300' : 'bg-rose-950/80 border border-rose-500/40'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. EXPENSES HISTORY LIST (Larger Font, Larger Card, Highlighted Badges) */}
                <div id="recordedExpensesContainer">
                  {filteredExpensesRecords.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                      <p className="text-base font-bold text-slate-300">
                        {expenseListFilter !== 'all'
                          ? (language === 'bn' ? `"${expenseListFilter}" ক্যাটাগরিতে কোনো খরচের রেকর্ড নেই` : `No expenses found for "${expenseListFilter}"`)
                          : (language === 'bn' ? 'নির্বাচিত তারিখে কোনো খরচের রেকর্ড পাওয়া যায়নি' : 'No expenses recorded for the selected date range')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'bn' ? 'অন্য ফিল্টার বা তারিখ নির্বাচন করে দেখতে পারেন' : 'Try selecting another category or date filter above'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                      {filteredExpensesRecords.map((item) => {
                        const expenseAmount = Number(item.amount || 0);
                        const dateTimeStr = formatSaleDateTime(item);
                        const itemTitle = item.title ? `${item.category} (${item.title})` : item.category;

                        return (
                          <div
                            key={item.id}
                            className="p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-3.5 bg-slate-900/90 border-slate-800 hover:border-rose-500/50 shadow-md"
                          >
                            {/* Top Line: Category / Title Name & Big Expense Amount */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-white text-base sm:text-xl truncate tracking-tight">
                                    {itemTitle}
                                  </h4>
                                  <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-rose-950 border border-rose-500/50 text-rose-300">
                                    {item.category}
                                  </span>
                                </div>

                                {/* Formatted Date & Time */}
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs sm:text-sm text-slate-300 font-bold">
                                  <Clock className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                  <span>{dateTimeStr}</span>
                                </div>
                              </div>

                              {/* Big Total Expense Amount */}
                              <div className="text-right flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase block tracking-wider mb-0.5">
                                  Expense
                                </span>
                                <span className="font-mono font-black text-rose-400 text-xl sm:text-2xl block tracking-tight">
                                  ৳{expenseAmount.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>

                            {/* Optional Note / Title description */}
                            {item.title && (
                              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs sm:text-sm text-slate-300 italic flex items-center gap-2">
                                <span className="font-semibold text-rose-400 not-italic flex-shrink-0">📝 Note:</span>
                                <span className="truncate">{item.title}</span>
                              </div>
                            )}

                            {/* Bottom Row: High-Contrast Large Badges for Category & Cost */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                              {/* Large Category Badge */}
                              <div className="py-2.5 px-3 sm:px-4 rounded-xl bg-slate-950/90 border-2 border-slate-700 text-slate-300 font-mono flex items-center justify-between shadow-sm">
                                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                                  Type
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px]">
                                  {item.category}
                                </span>
                              </div>

                              {/* Large Expense Amount Badge (Bright Rose High-Contrast) */}
                              <div className="py-2.5 px-3 sm:px-4 rounded-xl bg-rose-950/95 border-2 border-rose-500 text-rose-300 font-mono flex items-center justify-between shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/40">
                                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                                  💸 Cost
                                </span>
                                <span className="text-sm sm:text-lg font-black tracking-tight text-rose-200">
                                  ৳{expenseAmount.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export const NewSaleModal = React.memo(NewSaleModalComponent);
