export type TransactionType = 'due' | 'payment' | 'adjustment';

export interface Customer {
  id: string;
  serialNumber: number;
  name: string;
  phone: string;
  totalDue: number;
  address?: string;
  notes?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  description?: string;
  date: string; // ISO string or YYYY-MM-DD
  ownerId: string;
  createdAt: string;
}

export interface DailySale {
  id: string;
  amount: number;
  note?: string;
  date: string; // ISO string or formatted date
  ownerId: string;
  createdAt: string; // ISO timestamp
  type?: 'CASH' | 'DUE' | 'PAID_SALE' | 'DUE_SALE';
  customerId?: string;
  customerName?: string;
  items?: any[];
  total?: number;
  isDue?: boolean;
  dueAmount?: number;
  paidAmount?: number;
  medicineDetails?: string;
  itemNote?: string;
  customer?: any;
  time?: string;
}

export interface Expense {
  id: string;
  category: string;
  title?: string;
  amount: number;
  note?: string;
  date: string; // ISO string or formatted date
  ownerId: string;
  createdAt: string; // ISO timestamp
}

export interface LedgerStats {
  totalDues: number;
  customersWithDue: number;
  clearedCustomers: number;
  totalCustomers: number;
  todayCollections: number;
  todayDuesAdded: number;
  todaySales?: number;
  todayExpenses?: number;
  totalSales?: number;
  totalExpenses?: number;
}

export interface PharmacyProfile {
  storeName: string;
  storeNameBn: string;
  address: string;
  contactPhone: string;
  proprietorName: string;
  licenseNumber?: string;
  dgdaRegNumber?: string;
  email?: string;
  tagline?: string;
  logoUrl?: string;
  ownerId?: string;
  updatedAt?: string;
}
