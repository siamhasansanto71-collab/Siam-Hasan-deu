import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Customer, Transaction, LedgerStats, PharmacyProfile, DailySale, Expense } from '../types/ledger';
import { dexieSyncManager, type SyncStats } from '../lib/dexieSync';
import { dexieDb } from '../lib/dexieDb';
import { sanitizeSalesRecords } from '../lib/formatDateTime';

interface LedgerContextType {
  customers: Customer[];
  loading: boolean;
  isCloudSynced: boolean;
  stats: LedgerStats;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  customerTransactions: Transaction[];
  allTransactions: Transaction[];
  loadingTransactions: boolean;
  userStoreProfile: PharmacyProfile;
  updateUserStoreProfile: (profile: Partial<PharmacyProfile>) => Promise<void>;
  pharmacyProfile: PharmacyProfile;
  updatePharmacyProfile: (profile: Partial<PharmacyProfile>) => Promise<void>;
  addCustomer: (data: { name: string; phone: string; initialDue?: number; address?: string; notes?: string }) => Promise<string>;
  updateCustomer: (id: string, data: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'notes'>>) => Promise<void>;
  addDueTransaction: (customerId: string, amount: number, description?: string, customDate?: string) => Promise<void>;
  recordPayment: (customerId: string, amount: number, description?: string, customDate?: string) => Promise<void>;
  adjustBalance: (customerId: string, newTotalDue: number, reason: string) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  reloadTransactions: (customerId: string) => Promise<void>;
  // Daily Sales & Pharmacy Expenses tracking
  dailySales: DailySale[];
  expenses: Expense[];
  addDailySale: (amount: number, note?: string, customDate?: string, extra?: { type?: 'CASH' | 'DUE' | 'PAID_SALE' | 'DUE_SALE'; customerId?: string; customerName?: string; items?: any[]; total?: number; id?: string; isDue?: boolean; dueAmount?: number; paidAmount?: number; medicineDetails?: string; itemNote?: string; customer?: any; time?: string }) => Promise<void>;
  deleteDailySale: (id: string) => Promise<void>;
  addExpense: (category: string, amount: number, note?: string, customDate?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  todaySalesAmount: number;
  todayExpensesAmount: number;
  totalSalesAmount: number;
  totalExpensesAmount: number;
  // Dexie.js + Firestore synchronization extensions
  syncStats: SyncStats;
  triggerManualSync: () => Promise<void>;
  pullLatestFromCloud: () => Promise<void>;
  dexieStorageStats: { customerCount: number; transactionCount: number; pendingQueueCount: number };
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

// Key generators strictly scoped by user ID or 'demo'
export const getCustomerStorageKey = (uid: string | null | undefined) => 
  uid ? `ss_pharma_customers_${uid}` : 'ss_pharma_customers_demo';
export const getTxStorageKey = (uid: string | null | undefined, custId: string) => 
  uid ? `ss_pharma_tx_${uid}_${custId}` : `ss_pharma_tx_demo_${custId}`;
export const getAllTxStorageKey = (uid: string | null | undefined) => 
  uid ? `ss_pharma_all_tx_${uid}` : 'ss_pharma_all_tx_demo';
export const getProfileStorageKey = (uid: string | null | undefined) => 
  uid ? `ss_pharma_profile_${uid}` : 'ss_pharma_profile_demo';
export const getSalesStorageKey = (uid: string | null | undefined) => 
  uid ? `ss_pharma_sales_${uid}` : 'ss_pharma_sales_demo';
export const getExpensesStorageKey = (uid: string | null | undefined) => 
  uid ? `ss_pharma_expenses_${uid}` : 'ss_pharma_expenses_demo';
export const getInventoryStorageKey = (uid: string | null | undefined) => 
  uid ? `ss_pharma_inventory_${uid}` : 'ss_pharma_inventory_demo';
export const getMetricsStorageKey = (uid: string | null | undefined, metric: string) => 
  uid ? `ss_pharma_${metric}_${uid}` : `ss_pharma_${metric}_demo`;

export const purgeLegacyUnscopedStorage = () => {
  try {
    localStorage.removeItem('ss_pharma_sales');
    localStorage.removeItem('ss_pharma_sales_records');
    localStorage.removeItem('totalSales');
    localStorage.removeItem('cashSales');
    localStorage.removeItem('dueSales');
    localStorage.removeItem('pharmacyInventory');
  } catch {}
};

export const DEFAULT_PHARMACY_PROFILE: PharmacyProfile = {
  storeName: '',
  storeNameBn: '',
  address: '',
  contactPhone: '',
  proprietorName: '',
  licenseNumber: '',
  dgdaRegNumber: '',
  email: '',
  tagline: '',
  logoUrl: '',
};

export const sanitizePharmacyProfile = (
  raw: Partial<PharmacyProfile> | null | undefined,
  base: PharmacyProfile = DEFAULT_PHARMACY_PROFILE
): PharmacyProfile => {
  if (!raw) return { ...base };

  return {
    storeName: raw.storeName ? String(raw.storeName).trim() : (base.storeName || ''),
    storeNameBn: raw.storeNameBn ? String(raw.storeNameBn).trim() : (base.storeNameBn || ''),
    address: raw.address ? String(raw.address).trim() : (base.address || ''),
    contactPhone: raw.contactPhone ? String(raw.contactPhone).trim() : (base.contactPhone || ''),
    proprietorName: raw.proprietorName ? String(raw.proprietorName).trim() : (base.proprietorName || ''),
    licenseNumber: raw.licenseNumber ? String(raw.licenseNumber).trim() : (base.licenseNumber || ''),
    dgdaRegNumber: raw.dgdaRegNumber ? String(raw.dgdaRegNumber).trim() : (base.dgdaRegNumber || ''),
    email: raw.email ? String(raw.email).trim() : (base.email || ''),
    tagline: raw.tagline ? String(raw.tagline).trim() : (base.tagline || ''),
    logoUrl: raw.logoUrl ? String(raw.logoUrl).trim() : (base.logoUrl || ''),
    ownerId: raw.ownerId || base.ownerId,
    updatedAt: raw.updatedAt || base.updatedAt || new Date().toISOString()
  };
};

/**
 * Strict Document Sanitizers for Firestore Security Rules compliance
 * Guarantees schema validity against isValidCustomer, isValidTransaction, isValidDailySale
 */
export const cleanCustomerForFirestore = (c: Customer, ownerId: string) => {
  const clean: any = {
    name: String(c.name || '').substring(0, 100),
    phone: String(c.phone || '').substring(0, 20),
    totalDue: Math.max(0, Number(c.totalDue) || 0),
    ownerId: ownerId,
  };
  if (c.id) clean.id = String(c.id);
  if (typeof c.serialNumber === 'number') clean.serialNumber = c.serialNumber;
  if (c.address) clean.address = String(c.address).substring(0, 200);
  if (c.notes) clean.notes = String(c.notes).substring(0, 300);
  if (c.createdAt) clean.createdAt = String(c.createdAt);
  clean.updatedAt = c.updatedAt || new Date().toISOString();
  return clean;
};

export const cleanTxForFirestore = (tx: Transaction, ownerId: string) => {
  const clean: any = {
    id: String(tx.id),
    customerId: String(tx.customerId),
    type: tx.type, // 'due' | 'payment' | 'adjustment'
    amount: Number(tx.amount) || 0,
    previousBalance: Number(tx.previousBalance) || 0,
    newBalance: Math.max(0, Number(tx.newBalance) || 0),
    date: String(tx.date || '').substring(0, 50),
    ownerId: ownerId,
    createdAt: tx.createdAt || new Date().toISOString()
  };
  if (tx.description) {
    clean.description = String(tx.description).substring(0, 200);
  }
  return clean;
};

export const cleanDailySaleForFirestore = (sale: DailySale, ownerId: string) => {
  const clean: any = {
    amount: Number(sale.amount || sale.total || 0),
    ownerId: ownerId,
    createdAt: sale.createdAt || new Date().toISOString()
  };
  if (sale.id) clean.id = String(sale.id);
  if (sale.date) clean.date = String(sale.date).substring(0, 50);
  if (sale.note) clean.note = String(sale.note).substring(0, 300);
  if (sale.type) clean.type = sale.type;
  if (sale.customerId) clean.customerId = String(sale.customerId);
  if (sale.customerName) clean.customerName = String(sale.customerName).substring(0, 100);
  if (typeof sale.isDue === 'boolean') clean.isDue = sale.isDue;
  if (typeof sale.dueAmount === 'number') clean.dueAmount = sale.dueAmount;
  if (typeof sale.paidAmount === 'number') clean.paidAmount = sale.paidAmount;
  if (typeof sale.total === 'number') clean.total = sale.total;
  if (sale.itemNote) clean.itemNote = String(sale.itemNote).substring(0, 300);
  if (sale.medicineDetails) clean.medicineDetails = String(sale.medicineDetails).substring(0, 500);
  if (sale.time) clean.time = String(sale.time);
  return clean;
};

// Initial sample data ONLY used for unauthenticated Demo Mode
const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'demo_cust_1',
    serialNumber: 1,
    name: 'মোঃ রহিম উল্লাহ (Md. Rahim Ullah)',
    phone: '01712345678',
    totalDue: 450,
    address: 'মিরপুর-১০, ঢাকা (Mirpur-10, Dhaka)',
    notes: 'নিয়মিত গ্যাস্ট্রিক ও প্রেশারের ওষুধ নেন',
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'demo_cust_2',
    serialNumber: 2,
    name: 'আনোয়ার হোসেন (Anwar Hossain)',
    phone: '01819876543',
    totalDue: 1450,
    address: 'কাজীপাড়া, ঢাকা (Kazipara)',
    notes: 'ইনসুলিন ল্যান্টাস ও ডায়াবেটিস সাপ্লাই',
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'demo_cust_3',
    serialNumber: 3,
    name: 'ফাতেমা বেগম (Fatema Begum)',
    phone: '01911223344',
    totalDue: 220,
    address: 'সেনপাড়া পর্বতা (Senpara)',
    notes: 'অ্যাজমা ইনহেলার ও মন্টেয়ার',
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo_cust_4',
    serialNumber: 4,
    name: 'রফিকুল ইসলাম (Rafiqul Islam)',
    phone: '01678998877',
    totalDue: 0,
    address: 'শেওড়াপাড়া (Shewrapara)',
    notes: 'গতকাল সব বকেয়া পরিশোধ করেছেন',
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo_cust_5',
    serialNumber: 5,
    name: 'কামরুল হাসান (Kamrul Hasan)',
    phone: '01552443322',
    totalDue: 890,
    address: 'ইব্রাহিমপুর (Ibrahimpur)',
    notes: 'অ্যান্টিবায়োটিক কোর্স',
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_DEMO_TX: Record<string, Transaction[]> = {
  demo_cust_1: [
    {
      id: 'tx_demo_101',
      customerId: 'demo_cust_1',
      type: 'due',
      amount: 650,
      previousBalance: 0,
      newBalance: 650,
      description: 'সারজেল ২০ (২ পাতা) + নাপা এক্সট্রা',
      date: new Date(Date.now() - 5 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'tx_demo_102',
      customerId: 'demo_cust_1',
      type: 'payment',
      amount: 200,
      previousBalance: 650,
      newBalance: 450,
      description: 'নগদ ক্যাশ আংশিক জমা',
      date: new Date(Date.now() - 1 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ],
  demo_cust_2: [
    {
      id: 'tx_demo_201',
      customerId: 'demo_cust_2',
      type: 'due',
      amount: 1950,
      previousBalance: 0,
      newBalance: 1950,
      description: 'ইনসুলিন ল্যান্টাস সলোস্টার ১ বক্স + সিরিঞ্জ',
      date: new Date(Date.now() - 8 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    {
      id: 'tx_demo_202',
      customerId: 'demo_cust_2',
      type: 'payment',
      amount: 500,
      previousBalance: 1950,
      newBalance: 1450,
      description: 'বিকাশ পেমেন্ট জমা',
      date: new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],
  demo_cust_3: [
    {
      id: 'tx_demo_301',
      customerId: 'demo_cust_3',
      type: 'due',
      amount: 520,
      previousBalance: 0,
      newBalance: 520,
      description: 'অ্যাজমা ইনহেলার ও মন্টেয়ার ১০মিগ্রা',
      date: new Date(Date.now() - 5 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'tx_demo_302',
      customerId: 'demo_cust_3',
      type: 'payment',
      amount: 300,
      previousBalance: 520,
      newBalance: 220,
      description: 'নগদ জমা পরিশোধ',
      date: new Date(Date.now() - 1 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ],
  demo_cust_4: [
    {
      id: 'tx_demo_401',
      customerId: 'demo_cust_4',
      type: 'due',
      amount: 450,
      previousBalance: 0,
      newBalance: 450,
      description: 'প্যারাসিটামল + এন্টাসিড সিরাপ',
      date: new Date(Date.now() - 6 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    {
      id: 'tx_demo_402',
      customerId: 'demo_cust_4',
      type: 'payment',
      amount: 450,
      previousBalance: 450,
      newBalance: 0,
      description: 'সম্পূর্ণ বকেয়া পরিশোধ',
      date: new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],
  demo_cust_5: [
    {
      id: 'tx_demo_501',
      customerId: 'demo_cust_5',
      type: 'due',
      amount: 1190,
      previousBalance: 0,
      newBalance: 1190,
      description: 'অ্যান্টিবায়োটিক অ্যাজিথ্রোমাইসিন + ড্রপস',
      date: new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'tx_demo_502',
      customerId: 'demo_cust_5',
      type: 'payment',
      amount: 300,
      previousBalance: 1190,
      newBalance: 890,
      description: 'আংশিক পেমেন্ট জমা',
      date: new Date(Date.now() - 1 * 86400000).toLocaleDateString('en-GB'),
      ownerId: 'demo_user',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ]
};

const INITIAL_DEMO_SALES: DailySale[] = [
  {
    id: 'sale_demo_1',
    amount: 1450,
    note: 'ক্যাশ বিক্রি - নাপা এক্সট্রা ও সেব্যুলক (Napa Extra, Seclo 20)',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'sale_demo_2',
    amount: 820,
    note: 'ক্যাশ বিক্রি - ওরস্যালাইন ও ভিটামিন সি (Orsaline, Ceevit)',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

const INITIAL_DEMO_EXPENSES: Expense[] = [
  {
    id: 'exp_demo_1',
    category: 'Tea & Snacks',
    title: 'চা-নাস্তা ও আপ্যায়ন খরচ',
    amount: 180,
    note: 'দোকানের সকাল ও বিকালের চা-বিস্কুট',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'exp_demo_2',
    category: 'Packaging',
    title: 'ওষুধের পলিথিন ব্যাগ ক্রয়',
    amount: 350,
    note: '১ কেজি ছোট ও মাঝারি সাইজ ব্যাগ',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    ownerId: 'demo_user',
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString()
  }
];

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const previousUidRef = useRef<string | null | undefined>(undefined);

  // Load from local storage helper (strictly scoped by user UID)
  const getLocalCustomers = (): Customer[] => {
    if (!user) {
      // Demo mode only
      try {
        const saved = localStorage.getItem(getCustomerStorageKey(null));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
      return INITIAL_DEMO_CUSTOMERS;
    }

    // Authenticated user: local cached data for this user only
    try {
      const saved = localStorage.getItem(getCustomerStorageKey(user.uid));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  };

  // Load all transactions from local cache helper
  const getLocalAllTransactions = (): Transaction[] => {
    try {
      const key = getAllTxStorageKey(user ? user.uid : null);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  };

  const saveLocalAllTransactions = (txs: Transaction[]) => {
    try {
      const key = getAllTxStorageKey(user ? user.uid : null);
      localStorage.setItem(key, JSON.stringify(txs));
    } catch {
      // ignore
    }
  };

  const [customers, setCustomers] = useState<Customer[]>(() => getLocalCustomers());
  const [allUserTransactions, setAllUserTransactions] = useState<Transaction[]>(() => getLocalAllTransactions());
  const [dailySales, setDailySales] = useState<DailySale[]>(() => {
    try {
      const saved = localStorage.getItem(getSalesStorageKey(user ? user.uid : null));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeSalesRecords(parsed);
      }
    } catch {}
    return user ? [] : INITIAL_DEMO_SALES;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(getExpensesStorageKey(user ? user.uid : null));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return user ? [] : INITIAL_DEMO_EXPENSES;
  });

  const [loading, setLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [pharmacyProfile, setPharmacyProfile] = useState<PharmacyProfile>(DEFAULT_PHARMACY_PROFILE);

  // Dexie.js IndexedDB Sync State
  const [syncStats, setSyncStats] = useState<SyncStats>({
    state: 'idle',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const [dexieStorageStats, setDexieStorageStats] = useState({
    customerCount: 0,
    transactionCount: 0,
    pendingQueueCount: 0,
  });

  // 0. Account Switch & Identity Change Guard:
  // ONLY reset in-memory state when switching between different accounts, NOT on initial load or reload.
  useEffect(() => {
    const currentUid = user ? user.uid : null;
    const isFirstMount = previousUidRef.current === undefined;
    const isDifferentUser = !isFirstMount && previousUidRef.current !== currentUid;

    if (isDifferentUser) {
      // Genuine account switch: wipe states so no cross-account data leaks
      setCustomers([]);
      setAllUserTransactions([]);
      setDailySales([]);
      setExpenses([]);
      setSelectedCustomer(null);
      setPharmacyProfile(DEFAULT_PHARMACY_PROFILE);
      setLoading(true);
      setIsCloudSynced(false);
    }
    previousUidRef.current = currentUid;

    if (user) {
      // Authenticated account: purge legacy un-namespaced keys and wipe demo data from Dexie
      purgeLegacyUnscopedStorage();
      dexieDb.clearDemoData().catch(() => {});
    }
  }, [user?.uid]);

  // Track Dexie sync manager events and IndexedDB storage stats (debounced to avoid heavy repeated IndexedDB scans)
  useEffect(() => {
    dexieSyncManager.setActiveUser(user);
    const ownerId = user ? user.uid : 'demo_user';
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchStatsDebounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!isMounted) return;
        dexieDb.getStorageStats(ownerId).then((stats) => {
          if (isMounted) setDexieStorageStats(stats);
        }).catch(() => {});
      }, 250);
    };

    const unsubscribe = dexieSyncManager.subscribe((stats) => {
      setSyncStats(stats);
      fetchStatsDebounced();
    });
    dexieDb.getStorageStats(ownerId).then((st) => {
      if (isMounted) setDexieStorageStats(st);
    }).catch(() => {});

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [user]);

  const triggerManualSync = useCallback(async () => {
    if (!user) return;
    await dexieSyncManager.processSyncQueue(user);
    const stats = await dexieDb.getStorageStats(user.uid);
    setDexieStorageStats(stats);
  }, [user]);

  const pullLatestFromCloud = useCallback(async () => {
    if (!user) return;
    await dexieSyncManager.fullPullFromFirestore(user);
    const stats = await dexieDb.getStorageStats(user.uid);
    setDexieStorageStats(stats);
  }, [user]);

  const getLocalTransactions = (custId: string): Transaction[] => {
    const key = getTxStorageKey(user?.uid, custId);
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
      if (!user && INITIAL_DEMO_TX[custId]) return INITIAL_DEMO_TX[custId];
    } catch {
      // ignore
    }
    return [];
  };

  const saveLocalTransactions = (custId: string, txs: Transaction[]) => {
    const key = getTxStorageKey(user?.uid, custId);
    try {
      localStorage.setItem(key, JSON.stringify(txs));
    } catch {
      // ignore
    }
  };

  // Sync Pharmacy Profile with Firestore and Dexie IndexedDB cache
  useEffect(() => {
    const ownerId = user ? user.uid : 'demo_user';
    // Immediate zero-latency read from Dexie IndexedDB cache
    dexieSyncManager.getCachedProfile(ownerId).then((cached) => {
      if (cached) {
        setPharmacyProfile(sanitizePharmacyProfile(cached));
      }
    }).catch(() => {});

    if (!user) {
      // Demo mode profile
      try {
        const saved = localStorage.getItem(getProfileStorageKey(null));
        if (saved) {
          const profile = sanitizePharmacyProfile(JSON.parse(saved));
          setPharmacyProfile(profile);
          dexieSyncManager.writeProfile(profile, 'demo_user').catch(() => {});
          return;
        }
      } catch {
        // ignore
      }
      setPharmacyProfile(DEFAULT_PHARMACY_PROFILE);
      return;
    }

    // Authenticated user profile: users/{user.uid}/profile/pharmacy
    const profileDocPath = `users/${user.uid}/profile/pharmacy`;
    const unsubscribe = onSnapshot(
      doc(db, profileDocPath),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as PharmacyProfile;
          const merged = sanitizePharmacyProfile(cloudData, {
            ...DEFAULT_PHARMACY_PROFILE,
            storeName: '',
            storeNameBn: '',
            address: '',
            contactPhone: '',
            proprietorName: '',
            licenseNumber: '',
            dgdaRegNumber: '',
            email: user.email || '',
            ownerId: user.uid
          });
          setPharmacyProfile(merged);
          // Rehydrate Dexie IndexedDB cache with latest cloud profile
          dexieSyncManager.rehydrateProfile(user.uid, merged).catch(() => {});
          try {
            localStorage.setItem(getProfileStorageKey(user.uid), JSON.stringify(merged));
          } catch {
            // ignore
          }
        } else {
          // New user: initialize clean customized profile in Firestore
          // Incorporate any profile details provided during direct registration
          let pendingProfileData: Partial<PharmacyProfile> = {};
          try {
            const rawPending = localStorage.getItem('siam_pharma_pending_profile');
            if (rawPending) {
              pendingProfileData = JSON.parse(rawPending);
              localStorage.removeItem('siam_pharma_pending_profile');
            }
          } catch {
            // ignore
          }

          const initialProfile: PharmacyProfile = {
            storeName: pendingProfileData.storeName || '',
            storeNameBn: pendingProfileData.storeNameBn || '',
            address: pendingProfileData.address || '',
            contactPhone: pendingProfileData.contactPhone || '',
            proprietorName: pendingProfileData.proprietorName || '',
            licenseNumber: pendingProfileData.licenseNumber || '',
            dgdaRegNumber: pendingProfileData.dgdaRegNumber || '',
            email: user.email || pendingProfileData.email || '',
            tagline: pendingProfileData.tagline || '',
            logoUrl: pendingProfileData.logoUrl || '',
            ownerId: user.uid,
            updatedAt: new Date().toISOString()
          };
          setPharmacyProfile(initialProfile);
          try {
            localStorage.setItem(getProfileStorageKey(user.uid), JSON.stringify(initialProfile));
          } catch {
            // ignore
          }
          setDoc(doc(db, profileDocPath), initialProfile).catch((err) => {
            console.error('Failed to init profile in firestore:', err);
          });
        }
      },
      (error) => {
        console.error('Firestore profile listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sync customers with real-time listener and Dexie IndexedDB cache when user is active
  useEffect(() => {
    setSelectedCustomer(null);
    const ownerId = user ? user.uid : 'demo_user';

    // 1. Immediately read customers from Dexie IndexedDB cache for instant display
    dexieSyncManager.getCachedCustomers(ownerId).then((cached) => {
      if (cached && cached.length > 0) {
        setCustomers(cached);
        setLoading(false);
      }
    }).catch(() => {});

    if (!user) {
      // Offline / Local demo mode only
      const local = getLocalCustomers();
      setCustomers(local);
      setIsCloudSynced(false);
      setLoading(false);
      local.forEach((c) => dexieSyncManager.writeCustomer(c, 'create').catch(() => {}));
      return;
    }

    setLoading(true);
    // Path: users/{user.uid}/customers
    const customersPath = `users/${user.uid}/customers`;
    const q = query(collection(db, customersPath), orderBy('serialNumber', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Customer);
        });

        const remoteCustIds = new Set(list.map((c) => c.id));
        setCustomers((prev) => {
          const pendingLocal = prev.filter((c) => !remoteCustIds.has(c.id) && (!c.ownerId || c.ownerId === user.uid));
          const merged = [...list, ...pendingLocal];
          try {
            localStorage.setItem(getCustomerStorageKey(user.uid), JSON.stringify(merged));
          } catch (e) {
            console.error('Failed to cache customers locally:', e);
          }
          return merged;
        });

        // Rehydrate Dexie IndexedDB cache with latest cloud customers
        dexieSyncManager.rehydrateCustomers(user.uid, list).catch(() => {});
        setIsCloudSynced(true);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore customers listener error:', error);
        // Fallback to local Dexie/local cache data for this user
        dexieSyncManager.getCachedCustomers(user.uid).then((cached) => {
          if (cached && cached.length > 0) {
            setCustomers(cached);
          } else {
            setCustomers(getLocalCustomers());
          }
        }).catch(() => {
          setCustomers(getLocalCustomers());
        }).finally(() => {
          setIsCloudSynced(false);
          setLoading(false);
        });
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Keep selectedCustomer updated in state if modified
  useEffect(() => {
    if (selectedCustomer) {
      const found = customers.find((c) => c.id === selectedCustomer.id);
      if (found) {
        setSelectedCustomer(found);
      }
    }
  }, [customers]);

  // Listen to all transactions under users/{user.uid}/transactions in real-time & Dexie cache
  useEffect(() => {
    const ownerId = user ? user.uid : 'demo_user';

    // 1. Immediately seed from Dexie IndexedDB cache for instant offline visibility
    dexieSyncManager.getCachedTransactions(ownerId).then((cached) => {
      if (cached && cached.length > 0) {
        setAllUserTransactions(cached);
      }
    }).catch(() => {});

    if (!user) {
      const local = getLocalAllTransactions();
      setAllUserTransactions(local);
      local.forEach((t) => dexieSyncManager.writeTransaction(t).catch(() => {}));
      return;
    }

    // Path: users/{user.uid}/transactions
    const txsPath = `users/${user.uid}/transactions`;
    const q = query(collection(db, txsPath), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Transaction);
        });
        const remoteTxIds = new Set(list.map((t) => t.id));
        setAllUserTransactions((prev) => {
          const pendingLocal = prev.filter((t) => !remoteTxIds.has(t.id) && (!t.ownerId || t.ownerId === user.uid));
          const merged = [...list, ...pendingLocal];
          saveLocalAllTransactions(merged);
          return merged;
        });
        // Rehydrate Dexie IndexedDB cache
        dexieSyncManager.rehydrateTransactions(user.uid, list).catch(() => {});
      },
      (error) => {
        console.warn('Firestore user transactions listener status:', error);
        dexieSyncManager.getCachedTransactions(user.uid).then((cached) => {
          if (cached && cached.length > 0) {
            setAllUserTransactions(cached);
          } else {
            const fallback = getLocalAllTransactions();
            if (fallback.length > 0) setAllUserTransactions(fallback);
          }
        }).catch(() => {});
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Synchronize Daily Sales & Pharmacy Expenses with Dexie & Firestore
  // Synchronize Daily Sales & Pharmacy Expenses with Dexie & Firestore
  useEffect(() => {
    if (!user) {
      try {
        const savedSales = localStorage.getItem(getSalesStorageKey(null));
        if (savedSales) {
          const parsed = JSON.parse(savedSales);
          if (Array.isArray(parsed) && parsed.length > 0) setDailySales(parsed);
          else setDailySales(INITIAL_DEMO_SALES);
        } else {
          setDailySales(INITIAL_DEMO_SALES);
        }
        const savedExp = localStorage.getItem(getExpensesStorageKey(null));
        if (savedExp) {
          const parsed = JSON.parse(savedExp);
          if (Array.isArray(parsed) && parsed.length > 0) setExpenses(parsed);
          else setExpenses(INITIAL_DEMO_EXPENSES);
        } else {
          setExpenses(INITIAL_DEMO_EXPENSES);
        }
      } catch {
        setDailySales(INITIAL_DEMO_SALES);
        setExpenses(INITIAL_DEMO_EXPENSES);
      }
      return;
    }

    // 1. Initial load from Dexie IndexedDB cache for authenticated user only
    dexieDb.getDailySales(user.uid).then((cached) => {
      if (cached && cached.length > 0) {
        setDailySales(cached.filter((s) => !s.ownerId || s.ownerId === user.uid));
      } else {
        try {
          const savedSales = localStorage.getItem(getSalesStorageKey(user.uid));
          if (savedSales) {
            const parsed = JSON.parse(savedSales);
            if (Array.isArray(parsed)) setDailySales(parsed.filter((s: any) => !s.ownerId || s.ownerId === user.uid));
          }
        } catch {}
      }
    }).catch(() => {});

    dexieDb.getExpenses(user.uid).then((cached) => {
      if (cached && cached.length > 0) {
        setExpenses(cached.filter((e) => !e.ownerId || e.ownerId === user.uid));
      } else {
        try {
          const savedExp = localStorage.getItem(getExpensesStorageKey(user.uid));
          if (savedExp) {
            const parsed = JSON.parse(savedExp);
            if (Array.isArray(parsed)) setExpenses(parsed.filter((e: any) => !e.ownerId || e.ownerId === user.uid));
          }
        } catch {}
      }
    }).catch(() => {});

    // 2. Real-time Firestore sync for authenticated user
    const salesPath = `users/${user.uid}/dailySales`;
    const expPath = `users/${user.uid}/expenses`;

    const unsubsSales = onSnapshot(
      query(collection(db, salesPath), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: DailySale[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as DailySale;
          if (!item.ownerId || item.ownerId === user.uid) {
            list.push({ ...item, ownerId: user.uid });
          }
        });
        const remoteSaleIds = new Set(list.map((s) => s.id));
        setDailySales((prev) => {
          const pendingLocal = prev.filter((s) => !remoteSaleIds.has(s.id) && (!s.ownerId || s.ownerId === user.uid));
          const merged = sanitizeSalesRecords([...list, ...pendingLocal]);
          try {
            localStorage.setItem(getSalesStorageKey(user.uid), JSON.stringify(merged));
          } catch {}
          return merged;
        });
        list.forEach((s) => dexieDb.saveDailySale(s).catch(() => {}));
      },
      () => {
        dexieDb.getDailySales(user.uid).then((cached) => {
          if (cached && cached.length > 0) setDailySales(cached.filter((s) => !s.ownerId || s.ownerId === user.uid));
        }).catch(() => {});
      }
    );

    const unsubsExpenses = onSnapshot(
      query(collection(db, expPath), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Expense;
          if (!item.ownerId || item.ownerId === user.uid) {
            list.push({ ...item, ownerId: user.uid });
          }
        });
        const remoteExpIds = new Set(list.map((e) => e.id));
        setExpenses((prev) => {
          const pendingLocal = prev.filter((e) => !remoteExpIds.has(e.id) && (!e.ownerId || e.ownerId === user.uid));
          const merged = [...list, ...pendingLocal];
          try {
            localStorage.setItem(getExpensesStorageKey(user.uid), JSON.stringify(merged));
          } catch {}
          return merged;
        });
        list.forEach((e) => dexieDb.saveExpense(e).catch(() => {}));
      },
      () => {
        dexieDb.getExpenses(user.uid).then((cached) => {
          if (cached && cached.length > 0) setExpenses(cached.filter((e) => !e.ownerId || e.ownerId === user.uid));
        }).catch(() => {});
      }
    );

    return () => {
      unsubsSales();
      unsubsExpenses();
    };
  }, [user]);

  // Filter or load transactions for the selected customer
  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];

    if (!user) {
      // Demo mode
      return getLocalTransactions(selectedCustomer.id);
    }

    // From authenticated user's transactions: users/{user.uid}/transactions
    const txs = allUserTransactions.filter((t) => t.customerId === selectedCustomer.id);
    if (txs.length > 0) return txs;
    // Fallback to customer-specific local cache if available
    return getLocalTransactions(selectedCustomer.id);
  }, [selectedCustomer, user, allUserTransactions]);

  // All transactions across all customers (for full ledger date range viewing)
  const allTransactions = useMemo(() => {
    if (user) {
      if (allUserTransactions.length > 0) return allUserTransactions;
      return getLocalAllTransactions();
    }
    // Demo mode: gather all transactions for all customers
    const result: Transaction[] = [];
    customers.forEach((c) => {
      const txs = getLocalTransactions(c.id);
      result.push(...txs);
    });
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [user, allUserTransactions, customers]);

  const reloadTransactions = async (customerId: string) => {
    if (!user) return;
    try {
      const txsPath = `users/${user.uid}/transactions`;
      const q = query(collection(db, txsPath), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: Transaction[] = [];
      snap.forEach((d) => list.push(d.data() as Transaction));
      setAllUserTransactions(list);
      saveLocalAllTransactions(list);
    } catch (e) {
      console.warn('Failed to reload transactions (offline/cache used):', e);
      const fallback = getLocalAllTransactions();
      if (fallback.length > 0) {
        setAllUserTransactions(fallback);
      }
    }
  };

  // Safe Firestore write with timeout guard so offline/transient network states never hang the caller
  const safeFirestoreWrite = async (writeFn: () => Promise<any>, timeoutMs = 2500): Promise<void> => {
    try {
      // If client is currently offline, fire write directly into Firestore IndexedDB cache without network wait
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        writeFn().catch((e) => console.info('Queued in offline localCache:', e));
        return;
      }
      // When online or flaky connection, run writeFn with catch and a short timeout race
      // Since Firestore persistentLocalCache writes to IndexedDB immediately,
      // background sync will deliver to server even if network is slow.
      const writePromise = writeFn().catch((e) => console.warn('Queued for background Firestore sync:', e));
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err) {
      // With offline persistence enabled, Firestore caches writes locally and syncs automatically when online.
      console.warn('Firestore write queued or operating in offline mode:', err);
    }
  };

  // Update Pharmacy Profile
  const updatePharmacyProfile = async (updates: Partial<PharmacyProfile>) => {
    const sanitized = sanitizePharmacyProfile(
      {
        ...updates,
        updatedAt: new Date().toISOString()
      },
      pharmacyProfile
    );

    setPharmacyProfile(sanitized);
    const ownerId = user ? user.uid : 'demo_user';
    // Persist into Dexie IndexedDB cache immediately
    dexieSyncManager.writeProfile(sanitized, ownerId).catch(() => {});

    try {
      localStorage.setItem(getProfileStorageKey(user?.uid), JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to save profile to localStorage:', e);
    }

    if (user) {
      const profileDocPath = `users/${user.uid}/profile/pharmacy`;
      await safeFirestoreWrite(async () => {
        await setDoc(doc(db, profileDocPath), {
          ...sanitized,
          ownerId: user.uid
        }, { merge: true });
      });
    }
  };

  // Add Customer (under users/{user.uid}/customers and users/{user.uid}/transactions)
  const addCustomer = async (data: {
    name: string;
    phone: string;
    initialDue?: number;
    address?: string;
    notes?: string;
  }): Promise<string> => {
    const custId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const nextSerial = customers.length > 0 ? Math.max(...customers.map((c) => c.serialNumber || 0)) + 1 : 1;
    const initialDue = Math.max(0, Number(data.initialDue) || 0);

    const newCustomer: Customer = {
      id: custId,
      serialNumber: nextSerial,
      name: data.name.trim(),
      phone: data.phone.trim(),
      totalDue: initialDue,
      address: data.address?.trim() || '',
      notes: data.notes?.trim() || '',
      ownerId: user ? user.uid : 'demo_user',
      createdAt: now,
      updatedAt: now
    };

    // Optimistically update in-memory state and local cache immediately
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === custId);
      const updated = exists ? prev : [...prev, newCustomer];
      try {
        localStorage.setItem(getCustomerStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // Write to Dexie IndexedDB cache & outbox queue
    dexieSyncManager.writeCustomer(newCustomer, 'create').catch((e) => console.warn('Dexie save error:', e));

    let initTx: Transaction | null = null;
    if (initialDue > 0) {
      const txId = `tx_${Date.now()}_init`;
      const txDate = new Date().toLocaleDateString('en-GB');
      initTx = {
        id: txId,
        customerId: custId,
        type: 'due',
        amount: initialDue,
        previousBalance: 0,
        newBalance: initialDue,
        description: 'হিসাব খোলার প্রাথমিক বকেয়া (Initial Opening Due)',
        date: txDate,
        ownerId: user ? user.uid : 'demo_user',
        createdAt: now
      };

      setAllUserTransactions((prev) => {
        const updated = [initTx!, ...prev.filter((t) => t.id !== initTx!.id)];
        saveLocalAllTransactions(updated);
        return updated;
      });
      const currentCustTxs = getLocalTransactions(custId);
      saveLocalTransactions(custId, [initTx, ...currentCustTxs]);

      // Write initial transaction into Dexie IndexedDB
      dexieSyncManager.writeTransaction(initTx).catch((e) => console.warn('Dexie tx save error:', e));
    }

    if (!user) {
      return custId;
    }

    // Authenticated User: Persist to Firestore with safety timeout (offline queue)
    const docPath = `users/${user.uid}/customers/${custId}`;
    const rootTxPath = initTx ? `users/${user.uid}/transactions/${initTx.id}` : '';
    const custTxPath = initTx ? `users/${user.uid}/customers/${custId}/transactions/${initTx.id}` : '';

    await safeFirestoreWrite(async () => {
      const batch = writeBatch(db);
      batch.set(doc(db, docPath), cleanCustomerForFirestore(newCustomer, user.uid));
      if (initTx && rootTxPath) {
        batch.set(doc(db, rootTxPath), cleanTxForFirestore(initTx, user.uid));
        batch.set(doc(db, custTxPath), cleanTxForFirestore(initTx, user.uid));
      }
      await batch.commit();
    }, 2500);

    return custId;
  };

  // Update Customer Details
  const updateCustomer = async (
    id: string,
    data: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'notes'>>
  ) => {
    const now = new Date().toISOString();
    const cleanData: Record<string, any> = { updatedAt: now };
    if (data.name !== undefined) cleanData.name = data.name.trim();
    if (data.phone !== undefined) cleanData.phone = data.phone.trim();
    if (data.address !== undefined) cleanData.address = data.address.trim();
    if (data.notes !== undefined) cleanData.notes = data.notes.trim();

    // Optimistically update in-memory state and local cache
    setCustomers((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...cleanData } : c));
      try {
        localStorage.setItem(getCustomerStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    const targetCust = customers.find((c) => c.id === id);
    if (targetCust) {
      const updatedCust = { ...targetCust, ...cleanData };
      dexieSyncManager.writeCustomer(updatedCust, 'update').catch(() => {});

      if (user) {
        const docPath = `users/${user.uid}/customers/${id}`;
        await safeFirestoreWrite(async () => {
          await setDoc(doc(db, docPath), cleanCustomerForFirestore(updatedCust, user.uid));
        }, 2500);
      }
    }

    if (selectedCustomer?.id === id) {
      setSelectedCustomer((prev) => (prev ? { ...prev, ...cleanData } : null));
    }
  };

  // Add Due to Customer (saves to users/{user.uid}/transactions and updates customer balance)
  const addDueTransaction = async (
    customerId: string,
    amount: number,
    description?: string,
    customDate?: string
  ) => {
    if (amount <= 0) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const prevBalance = customer.totalDue;
    const newBalance = prevBalance + amount;
    const now = new Date().toISOString();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const txDate = customDate || new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

    const tx: Transaction = {
      id: txId,
      customerId,
      type: 'due',
      amount,
      previousBalance: prevBalance,
      newBalance,
      description: description?.trim() || 'বাকি ওষুধ ক্রয় (Medicine purchase)',
      date: txDate,
      ownerId: user ? user.uid : 'demo_user',
      createdAt: now
    };

    const updatedCustomer: Customer = {
      ...customer,
      totalDue: newBalance,
      updatedAt: now
    };

    // Optimistically update customers in-memory state & storage immediately
    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === customerId ? updatedCustomer : c
      );
      try {
        localStorage.setItem(getCustomerStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // Optimistically update transactions in-memory state & central storage immediately
    setAllUserTransactions((prev) => {
      const updated = [tx, ...prev.filter((t) => t.id !== tx.id)];
      saveLocalAllTransactions(updated);
      return updated;
    });
    const existingTxs = getLocalTransactions(customerId);
    saveLocalTransactions(customerId, [tx, ...existingTxs.filter((t) => t.id !== tx.id)]);

    // Write transaction and updated customer balance to Dexie IndexedDB
    dexieSyncManager.writeTransaction(tx).catch(() => {});
    dexieSyncManager.writeCustomer(updatedCustomer, 'update').catch(() => {});

    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, totalDue: newBalance, updatedAt: now } : null));
    }

    if (!user) {
      return;
    }

    const custDocPath = `users/${user.uid}/customers/${customerId}`;
    const rootTxPath = `users/${user.uid}/transactions/${txId}`;
    const custTxPath = `users/${user.uid}/customers/${customerId}/transactions/${txId}`;

    await safeFirestoreWrite(async () => {
      const batch = writeBatch(db);
      batch.set(doc(db, custDocPath), cleanCustomerForFirestore(updatedCustomer, user.uid));
      batch.set(doc(db, rootTxPath), cleanTxForFirestore(tx, user.uid));
      batch.set(doc(db, custTxPath), cleanTxForFirestore(tx, user.uid));
      await batch.commit();
    }, 2500);
  };

  // Record Payment
  const recordPayment = async (
    customerId: string,
    amount: number,
    description?: string,
    customDate?: string
  ) => {
    if (amount <= 0) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const prevBalance = customer.totalDue;
    const newBalance = Math.max(0, prevBalance - amount);
    const now = new Date().toISOString();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const txDate = customDate || new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

    const tx: Transaction = {
      id: txId,
      customerId,
      type: 'payment',
      amount,
      previousBalance: prevBalance,
      newBalance,
      description: description?.trim() || 'নগদ জমা (Payment received)',
      date: txDate,
      ownerId: user ? user.uid : 'demo_user',
      createdAt: now
    };

    const updatedCustomer: Customer = {
      ...customer,
      totalDue: newBalance,
      updatedAt: now
    };

    // Optimistically update customers in-memory state & storage immediately
    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === customerId ? updatedCustomer : c
      );
      try {
        localStorage.setItem(getCustomerStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // Optimistically update transactions in-memory state & central storage immediately
    setAllUserTransactions((prev) => {
      const updated = [tx, ...prev.filter((t) => t.id !== tx.id)];
      saveLocalAllTransactions(updated);
      return updated;
    });
    const existingTxs = getLocalTransactions(customerId);
    saveLocalTransactions(customerId, [tx, ...existingTxs.filter((t) => t.id !== tx.id)]);

    // Write transaction and updated customer balance to Dexie IndexedDB
    dexieSyncManager.writeTransaction(tx).catch(() => {});
    dexieSyncManager.writeCustomer(updatedCustomer, 'update').catch(() => {});

    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, totalDue: newBalance, updatedAt: now } : null));
    }

    // --- SUCCESSFULLY ADD DUE PAYMENT TO SALES DASHBOARD & TOTAL SALES ---
    // When a customer makes a due payment, record it as a cash collection / paid sale
    const today = new Date();
    const todayLocalIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let saleDateIso = todayLocalIso;
    if (customDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
        saleDateIso = customDate;
      } else {
        const parsed = new Date(customDate);
        if (!isNaN(parsed.getTime())) {
          saleDateIso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
        }
      }
    }

    const paymentSaleId = `sale_pay_${txId}`;
    const paymentNote = description?.trim() 
      ? `বকেয়া আদায়: ${customer.name} (${description.trim()})`
      : `বকেয়া আদায় (Due payment: ${customer.name})`;

    const newPaymentSale: DailySale = {
      id: paymentSaleId,
      amount: amount,
      total: amount,
      note: paymentNote,
      date: saleDateIso,
      ownerId: user ? user.uid : 'demo_user',
      createdAt: now,
      type: 'PAID_SALE',
      customerId,
      customerName: customer.name,
      isDue: false,
      paidAmount: amount,
      dueAmount: 0,
      itemNote: paymentNote,
      medicineDetails: `Due payment received from ${customer.name}`,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        serialNumber: customer.serialNumber
      },
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    setDailySales((prev) => {
      const updated = sanitizeSalesRecords([newPaymentSale, ...prev.filter((s) => s.id !== paymentSaleId)]);
      try {
        localStorage.setItem(getSalesStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    dexieDb.saveDailySale(newPaymentSale).catch(() => {});
    dexieSyncManager.writeDailySale(newPaymentSale).catch(() => {});

    if (!user) {
      return;
    }

    const custDocPath = `users/${user.uid}/customers/${customerId}`;
    const rootTxPath = `users/${user.uid}/transactions/${txId}`;
    const custTxPath = `users/${user.uid}/customers/${customerId}/transactions/${txId}`;
    const saleDocPath = `users/${user.uid}/dailySales/${paymentSaleId}`;

    await safeFirestoreWrite(async () => {
      const batch = writeBatch(db);
      batch.set(doc(db, custDocPath), cleanCustomerForFirestore(updatedCustomer, user.uid));
      batch.set(doc(db, rootTxPath), cleanTxForFirestore(tx, user.uid));
      batch.set(doc(db, custTxPath), cleanTxForFirestore(tx, user.uid));
      batch.set(doc(db, saleDocPath), cleanDailySaleForFirestore(newPaymentSale, user.uid));
      await batch.commit();
    }, 2500);
  };

  // Adjust Balance
  const adjustBalance = async (customerId: string, newTotalDue: number, reason: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const prevBalance = customer.totalDue;
    const cleanNewBalance = Math.max(0, Number(newTotalDue) || 0);
    const diff = cleanNewBalance - prevBalance;
    const now = new Date().toISOString();
    const txId = `tx_${Date.now()}_adj`;
    const txDate = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

    const tx: Transaction = {
      id: txId,
      customerId,
      type: 'adjustment',
      amount: Math.abs(diff),
      previousBalance: prevBalance,
      newBalance: cleanNewBalance,
      description: reason.trim() || 'হিসাব সমন্বয় (Manual balance adjustment)',
      date: txDate,
      ownerId: user ? user.uid : 'demo_user',
      createdAt: now
    };

    const updatedCustomer: Customer = {
      ...customer,
      totalDue: cleanNewBalance,
      updatedAt: now
    };

    // Optimistically update customers in-memory state & storage immediately
    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === customerId ? updatedCustomer : c
      );
      try {
        localStorage.setItem(getCustomerStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // Optimistically update transactions in-memory state & central storage immediately
    setAllUserTransactions((prev) => {
      const updated = [tx, ...prev.filter((t) => t.id !== tx.id)];
      saveLocalAllTransactions(updated);
      return updated;
    });
    const existingTxs = getLocalTransactions(customerId);
    saveLocalTransactions(customerId, [tx, ...existingTxs.filter((t) => t.id !== tx.id)]);

    // Write adjustment transaction and updated customer balance to Dexie IndexedDB
    dexieSyncManager.writeTransaction(tx).catch(() => {});
    dexieSyncManager.writeCustomer(updatedCustomer, 'update').catch(() => {});

    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, totalDue: cleanNewBalance, updatedAt: now } : null));
    }

    if (!user) {
      return;
    }

    const custDocPath = `users/${user.uid}/customers/${customerId}`;
    const rootTxPath = `users/${user.uid}/transactions/${txId}`;
    const custTxPath = `users/${user.uid}/customers/${customerId}/transactions/${txId}`;

    await safeFirestoreWrite(async () => {
      const batch = writeBatch(db);
      batch.set(doc(db, custDocPath), cleanCustomerForFirestore(updatedCustomer, user.uid));
      batch.set(doc(db, rootTxPath), cleanTxForFirestore(tx, user.uid));
      batch.set(doc(db, custTxPath), cleanTxForFirestore(tx, user.uid));
      await batch.commit();
    }, 2500);
  };

  // Delete Customer Record permanently
  const deleteCustomer = async (customerId: string) => {
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== customerId);
      try {
        localStorage.setItem(getCustomerStorageKey(user ? user.uid : null), JSON.stringify(updated));
        localStorage.removeItem(getTxStorageKey(user ? user.uid : null, customerId));
      } catch {
        // ignore
      }
      return updated;
    });

    setAllUserTransactions((prev) => {
      const updated = prev.filter((t) => t.customerId !== customerId);
      saveLocalAllTransactions(updated);
      return updated;
    });

    // Delete customer and their transactions from Dexie IndexedDB
    dexieSyncManager.deleteCustomer(customerId, user ? user.uid : 'demo_user').catch(() => {});

    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
    }

    if (!user) {
      return;
    }

    const custDocPath = `users/${user.uid}/customers/${customerId}`;
    await safeFirestoreWrite(async () => {
      // Delete customer transactions from users/{user.uid}/transactions
      const relatedTxs = allUserTransactions.filter((t) => t.customerId === customerId);
      const batch = writeBatch(db);
      
      relatedTxs.forEach((t) => {
        batch.delete(doc(db, `users/${user.uid}/transactions/${t.id}`));
      });

      // Delete customer doc
      batch.delete(doc(db, custDocPath));
      await batch.commit();
    }, 2500);
  };

  // Daily Sales & Expenses handlers
  const addDailySale = async (
    amount: number, 
    note?: string, 
    customDate?: string,
    extra?: { type?: 'CASH' | 'DUE' | 'PAID_SALE' | 'DUE_SALE'; customerId?: string; customerName?: string; items?: any[]; total?: number; id?: string; isDue?: boolean; dueAmount?: number; paidAmount?: number; medicineDetails?: string; itemNote?: string; customer?: any; time?: string }
  ) => {
    const rawVal = (typeof amount === 'number' && !isNaN(amount) && amount > 0)
      ? amount
      : (extra?.total !== undefined && Number(extra.total) > 0 ? extra.total : amount);
    const finalAmount = typeof rawVal === 'number'
      ? (isNaN(rawVal) ? 0 : rawVal)
      : (parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0);

    if (finalAmount <= 0) return;
    const now = new Date().toISOString();
    const today = new Date();
    const todayLocalIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const saleId = extra?.id || `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const saleType = extra?.type || (extra?.customerId ? 'DUE_SALE' : 'PAID_SALE');
    const isDueVal = extra?.isDue !== undefined ? extra.isDue : (saleType === 'DUE' || saleType === 'DUE_SALE');
    const newSale: DailySale = {
      id: saleId,
      amount: finalAmount,
      total: finalAmount,
      note: note?.trim() || (saleType === 'DUE' || saleType === 'DUE_SALE' ? 'ফার্মেসি বাকী বিক্রি (Due Sale)' : 'সাধারণ ক্যাশ বিক্রি (Direct Paid Sale)'),
      date: customDate || todayLocalIso,
      ownerId: user ? user.uid : 'demo_user',
      createdAt: now,
      type: saleType,
      customerId: extra?.customerId,
      customerName: extra?.customerName,
      items: extra?.items,
      isDue: isDueVal,
      dueAmount: extra?.dueAmount !== undefined ? extra.dueAmount : (isDueVal ? finalAmount : 0),
      medicineDetails: extra?.medicineDetails,
      itemNote: extra?.itemNote,
      customer: extra?.customer,
      time: extra?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setDailySales((prev) => {
      const updated = sanitizeSalesRecords([newSale, ...prev.filter((s) => s.id !== saleId)]);
      try {
        localStorage.setItem(getSalesStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    await dexieDb.saveDailySale(newSale);
    dexieSyncManager.writeDailySale(newSale).catch(() => {});

    if (user) {
      safeFirestoreWrite(async () => {
        await setDoc(doc(db, `users/${user.uid}/dailySales/${saleId}`), cleanDailySaleForFirestore(newSale, user.uid));
      }, 2500).catch((e) => console.warn('Firestore daily sale write warning:', e));
    }
  };

  const deleteDailySale = async (id: string) => {
    setDailySales((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(getSalesStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {}
      return updated;
    });
    await dexieDb.deleteDailySale(id);
    dexieSyncManager.deleteDailySale(id).catch(() => {});
    if (user) {
      safeFirestoreWrite(async () => {
        await deleteDoc(doc(db, `users/${user.uid}/dailySales/${id}`));
      }, 2500).catch(() => {});
    }
  };

  const addExpense = async (category: string, amount: number, note?: string, customDate?: string) => {
    if (amount <= 0) return;
    const now = new Date().toISOString();
    const today = new Date();
    const todayLocalIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const expId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newExpense: Expense = {
      id: expId,
      category,
      title: note?.trim() || category,
      amount,
      note: note?.trim() || '',
      date: customDate || todayLocalIso,
      ownerId: user ? user.uid : 'demo_user',
      createdAt: now
    };

    setExpenses((prev) => {
      const updated = [newExpense, ...prev.filter((e) => e.id !== expId)];
      try {
        localStorage.setItem(getExpensesStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    await dexieDb.saveExpense(newExpense);

    if (user) {
      safeFirestoreWrite(async () => {
        await setDoc(doc(db, `users/${user.uid}/expenses/${expId}`), newExpense);
      }).catch((e) => console.warn('Firestore expense write warning:', e));
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem(getExpensesStorageKey(user ? user.uid : null), JSON.stringify(updated));
      } catch {}
      return updated;
    });
    await dexieDb.deleteExpense(id);
    if (user) {
      safeFirestoreWrite(async () => {
        await deleteDoc(doc(db, `users/${user.uid}/expenses/${id}`));
      }).catch(() => {});
    }
  };

  // Calculate totals for Daily Sales and Expenses
  const { todaySalesAmount, todayExpensesAmount, totalSalesAmount, totalExpensesAmount } = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-GB');
    const todayIsoPrefix = new Date().toISOString().split('T')[0];
    const todayFormatted = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const isToday = (item: { date?: string; createdAt?: string }) => {
      if (item.date) {
        if (item.date === todayIsoPrefix || item.date.startsWith(todayIsoPrefix)) return true;
        if (item.date.includes(todayStr) || item.date.includes(todayFormatted)) return true;
        const ddmmyyyy = item.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (ddmmyyyy) {
          const iso = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
          if (iso === todayIsoPrefix) return true;
        }
        const parsed = new Date(item.date);
        if (!isNaN(parsed.getTime()) && parsed.toISOString().split('T')[0] === todayIsoPrefix) {
          return true;
        }
        return false;
      }
      if (item.createdAt && item.createdAt.substring(0, 10) === todayIsoPrefix) return true;
      return false;
    };

    let todaySales = 0;
    let totalSales = 0;
    let todayCash = 0;
    let totalCash = 0;
    let todayDue = 0;
    let totalDue = 0;

    dailySales.forEach((s) => {
      const amt = s.amount || s.total || 0;
      const isDue = (s.type === 'DUE' || s.type === 'DUE_SALE' || Boolean(s.customerId && s.type !== 'PAID_SALE' && s.type !== 'CASH' && s.type !== 'Paid Sale')) && s.isDue !== false && (s.dueAmount === undefined || Number(s.dueAmount) > 0);

      if (isDue) {
        // Save to customer ledger due, DO NOT add to immediate cash sales balance
        totalDue += amt;
        if (isToday(s)) {
          todayDue += amt;
        }
      } else {
        // Case 1: Direct Sale & Due Payments (PAID_SALE) -> Add to immediate cash sales balance
        totalSales += amt;
        totalCash += amt;
        if (isToday(s)) {
          todaySales += amt;
          todayCash += amt;
        }
      }
    });

    try {
      const uid = user ? user.uid : null;
      localStorage.setItem(getMetricsStorageKey(uid, 'totalSales'), (totalSales + totalDue).toString());
      localStorage.setItem(getMetricsStorageKey(uid, 'cashSales'), totalCash.toString());
      localStorage.setItem(getMetricsStorageKey(uid, 'dueSales'), totalDue.toString());
    } catch {
      // ignore
    }

    let todayExp = 0;
    let totalExp = 0;
    expenses.forEach((e) => {
      totalExp += (e.amount || 0);
      if (isToday(e)) {
        todayExp += (e.amount || 0);
      }
    });

    return {
      todaySalesAmount: todaySales,
      todayExpensesAmount: todayExp,
      totalSalesAmount: totalSales,
      totalExpensesAmount: totalExp
    };
  }, [dailySales, expenses]);

  // Calculate statistics accurately
  const stats: LedgerStats = useMemo(() => {
    let totalDues = 0;
    let customersWithDue = 0;
    let clearedCustomers = 0;

    customers.forEach((c) => {
      const due = Number(c.totalDue) || 0;
      totalDues += due;
      if (due > 0) {
        customersWithDue++;
      } else {
        clearedCustomers++;
      }
    });

    // Today's summary calculated across all transactions of the user
    const todayStr = new Date().toLocaleDateString('en-GB');
    const todayIsoPrefix = new Date().toISOString().split('T')[0];
    let todayCollections = 0;
    let todayDuesAdded = 0;

    const txSource = allTransactions;
    txSource.forEach((tx) => {
      const isTxToday = (tx.date && (tx.date.includes(todayStr) || tx.date.startsWith(todayIsoPrefix))) || 
                        (tx.createdAt && tx.createdAt.startsWith(todayIsoPrefix));
      if (isTxToday) {
        if (tx.type === 'payment') todayCollections += tx.amount;
        if (tx.type === 'due') todayDuesAdded += tx.amount;
      }
    });

    return {
      totalDues,
      customersWithDue,
      clearedCustomers,
      totalCustomers: customers.length,
      todayCollections,
      todayDuesAdded,
      todaySales: todaySalesAmount,
      todayExpenses: todayExpensesAmount,
      totalSales: totalSalesAmount,
      totalExpenses: totalExpensesAmount
    };
  }, [customers, allUserTransactions, customerTransactions, user, selectedCustomer, todaySalesAmount, todayExpensesAmount, totalSalesAmount, totalExpensesAmount]);

  // Memoize context value object so consumers don't re-render on unrelated state ticks
  const contextValue = useMemo(() => ({
    customers,
    loading,
    isCloudSynced,
    stats,
    selectedCustomer,
    setSelectedCustomer,
    customerTransactions,
    allTransactions,
    loadingTransactions,
    userStoreProfile: pharmacyProfile,
    updateUserStoreProfile: updatePharmacyProfile,
    pharmacyProfile,
    updatePharmacyProfile,
    addCustomer,
    updateCustomer,
    addDueTransaction,
    recordPayment,
    adjustBalance,
    deleteCustomer,
    reloadTransactions,
    dailySales,
    expenses,
    addDailySale,
    deleteDailySale,
    addExpense,
    deleteExpense,
    todaySalesAmount,
    todayExpensesAmount,
    totalSalesAmount,
    totalExpensesAmount,
    syncStats,
    triggerManualSync,
    pullLatestFromCloud,
    dexieStorageStats
  }), [
    customers,
    loading,
    isCloudSynced,
    stats,
    selectedCustomer,
    customerTransactions,
    allTransactions,
    loadingTransactions,
    pharmacyProfile,
    dailySales,
    expenses,
    todaySalesAmount,
    todayExpensesAmount,
    totalSalesAmount,
    totalExpensesAmount,
    syncStats,
    dexieStorageStats,
    triggerManualSync,
    pullLatestFromCloud
  ]);

  return (
    <LedgerContext.Provider value={contextValue}>
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
