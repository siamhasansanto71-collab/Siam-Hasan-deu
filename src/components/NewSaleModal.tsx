import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShoppingBag, 
  Receipt, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
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
  Check,
  Tag,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';
import { Customer } from '../types/ledger';
import { GlossySLogo } from './GlossySLogo';
import { PharmacyInfoCard } from './PharmacyInfoCard';

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

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ 
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
    totalExpensesAmount
  } = useLedger();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  // Date range filter states for OVERVIEW METRICS (default to today)
  const [startDateFilter, setStartDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDateFilter, setEndDateFilter] = useState(() => new Date().toISOString().split('T')[0]);

  // Daily Sales Tab States
  const [salesAmount, setSalesAmount] = useState('');
  const [salesNote, setSalesNote] = useState('');
  const [salesDate, setSalesDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Pharmacy Expenses Tab States
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Submission & Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync initialTab and reset customer selection when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
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
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const todayIso = new Date().toISOString().split('T')[0];

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
    if (item.createdAt && item.createdAt.length >= 10) {
      const iso = item.createdAt.substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    }
    if (item.date) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return item.date;
      const ddmmyyyy = item.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
      }
      const parsed = new Date(item.date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return '';
  };

  const isItemInRange = (item: { createdAt?: string; date?: string }): boolean => {
    const itemDate = parseItemDate(item);
    if (!itemDate) return false;
    if (startDateFilter && itemDate < startDateFilter) return false;
    if (endDateFilter && itemDate > endDateFilter) return false;
    return true;
  };

  // Filtered sales and expenses for the selected date or date range
  const matchedSalesRecords = dailySales.filter(isItemInRange);
  const matchedExpensesRecords = expenses.filter(isItemInRange);

  // 1. Filtered Sales for date range
  const rangeSales = dailySales
    .filter(isItemInRange)
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // 2. Filtered Expenses for date range
  const rangeExpenses = expenses
    .filter(isItemInRange)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // 3. Filtered Due for date range
  const rangeDue = (allTransactions || [])
    .filter((t) => t.type === 'due' && isItemInRange(t))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Handle Daily Sales Submit (Cash Sale or Due Sale if customer is selected)
  const handleDailySaleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');

    const numAmount = parseFloat(salesAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === 'bn' ? 'সঠিক বিক্রির টাকা লিখুন' : 'Please enter a valid sales amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = new Date(salesDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (selectedCustomer) {
        // Customer Due Sale: Record as Due transaction under customer's credit ledger
        await addDueTransaction(
          selectedCustomer.id,
          numAmount,
          salesNote.trim() || (language === 'bn' ? 'ফার্মেসি বাকী বিক্রি' : 'Pharmacy Due Sale'),
          formattedDate
        );
        setSuccessMessage(
          language === 'bn'
            ? `৳${numAmount.toLocaleString()} বাকী সফলভাবে ${selectedCustomer.name}-এর খাতায় যোগ হয়েছে!`
            : `Due sale of ৳${numAmount.toLocaleString()} added to ${selectedCustomer.name}'s credit ledger!`
        );
        setSelectedCustomer(null);
        setCustomerSearchQuery('');
        setIsSearchFocused(false);
      } else {
        // Direct Cash Sale without selecting a customer
        await addDailySale(numAmount, salesNote, formattedDate);
        setSuccessMessage(
          language === 'bn'
            ? `৳${numAmount.toLocaleString()} নগদ বিক্রি সফলভাবে রেকর্ড হয়েছে!`
            : (t.successSaleAdded || `Cash sale of ৳${numAmount.toLocaleString()} recorded successfully!`)
        );
      }

      setSalesAmount('');
      setSalesNote('');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3500);
    } catch (err) {
      console.error('Error saving sale:', err);
      setError('Failed to record sale. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard Navigation: Double Enter (Instant Sale) vs Single Enter (Next Step)
  const lastEnterTimeRef = useRef<number>(0);
  const singleEnterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (singleEnterTimerRef.current) {
        clearTimeout(singleEnterTimerRef.current);
      }
    };
  }, []);

  const executeInstantSale = async () => {
    if (singleEnterTimerRef.current) {
      clearTimeout(singleEnterTimerRef.current);
      singleEnterTimerRef.current = null;
    }
    const numAmount = parseFloat(salesAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === 'bn' ? 'সঠিক বিক্রির টাকা লিখুন' : 'Please enter a valid sales amount');
      return;
    }
    console.log("Double Enter pressed! Executing Direct Quick Sale...");
    await handleDailySaleSubmit();
  };

  const goToNextStep = () => {
    console.log("Moving to next step (Customer & Note)...");
    const searchInput = document.getElementById("customerSearchInput") as HTMLInputElement | null;
    const noteInput = document.getElementById("salesNoteInput") as HTMLInputElement | null;
    if (searchInput) {
      searchInput.focus();
      setIsSearchFocused(true);
    } else if (noteInput) {
      noteInput.focus();
    }
  };

  const handleAmountKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Default form submit bondho rakhar jonno
      
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - lastEnterTimeRef.current;
      const DOUBLE_PRESS_TIME = 400; // 400 millisecond (0.4 second) er modhye 2 bar enter marle

      if (timeDifference < DOUBLE_PRESS_TIME && timeDifference > 0) {
        // --- 1. DOUBLE ENTER DETECTED: INSTANT SALE ---
        console.log("Double Enter pressed! Executing Direct Quick Sale...");
        lastEnterTimeRef.current = 0; // Reset
        if (singleEnterTimerRef.current) {
          clearTimeout(singleEnterTimerRef.current);
          singleEnterTimerRef.current = null;
        }
        executeInstantSale();
      } else {
        // --- 2. SINGLE ENTER DETECTED: TIMER OR NEXT STEP ---
        console.log("Single Enter pressed. Waiting 2 seconds for next step...");
        lastEnterTimeRef.current = currentTime;

        if (singleEnterTimerRef.current) {
          clearTimeout(singleEnterTimerRef.current);
        }

        // 2 second pore next step-e jawar ba action neyar logic
        singleEnterTimerRef.current = setTimeout(() => {
          // Jodi 2 second-er modhye 2nd enter na pore, tahobe next step-e jabe
          if (lastEnterTimeRef.current === currentTime) {
            goToNextStep();
          }
        }, 2000);
      }
    }
  };

  // Handle Expense Submit
  const handleExpenseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');

    const numAmount = parseFloat(expenseAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === 'bn' ? 'সঠিক খরচের টাকা লিখুন' : 'Please enter a valid expense amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = new Date(expenseDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      await addExpense(expenseCategory, numAmount, expenseTitle, formattedDate);
      setSuccessMessage(t.successExpenseAdded || 'Pharmacy expense recorded successfully!');
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
              <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-white tracking-tight truncate">
                {language === 'bn' ? 'দৈনিক ক্যাশ ও খরচ লেজার' : 'Daily Cash & Expense Ledger'}
              </h1>
              <p className="text-[11px] sm:text-xs text-emerald-400/90 font-medium truncate">
                {language === 'bn' ? 'সিয়াম ফার্মা • দৈনিক নগদ বিক্রি ও খরচের হিসাব' : 'Siam Pharma • Daily Cash Sales & Expenses'}
              </p>
            </div>
          </div>

          {/* Close 'X' Button */}
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-slate-300 hover:text-white hover:bg-rose-950/60 hover:border-rose-500 transition-colors cursor-pointer flex-shrink-0"
            title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
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
                    ৳ {rangeSales.toLocaleString('en-US')}
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
                    ৳ {rangeDue.toLocaleString('en-US')}
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

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/70 text-sm text-emerald-100 flex items-center gap-2.5 animate-in fade-in shadow-[0_0_18px_rgba(0,230,118,0.25)]">
              <CheckCircle2 className="w-4 h-4 text-[#00e676] flex-shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* Section 4: TAB 1: DAILY SALES FORM CONTAINER (High-Contrast Emerald Glassmorphic Card) */}
          {/* ========================================================================= */}
          {activeTab === 'sales' && (() => {
            const matchingCustomers = customerSearchQuery.trim()
              ? customers.filter((c) => {
                  const q = customerSearchQuery.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    c.phone.toLowerCase().includes(q) ||
                    String(c.serialNumber).includes(q) ||
                    (c.address && c.address.toLowerCase().includes(q))
                  );
                })
              : customers.slice(0, 8);

            return (
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase">
                      {t.salesAmountLabel || "SALES AMOUNT"} *
                    </label>
                    <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <input
                        id="salesAmountInput"
                        type="number"
                        step="any"
                        min="1"
                        required
                        autoFocus
                        value={salesAmount}
                        onChange={(e) => setSalesAmount(e.target.value)}
                        onKeyDown={handleAmountKeyDown}
                        placeholder="৳ 450"
                        className="bg-transparent border-none outline-none w-full text-xl sm:text-2xl font-bold font-mono text-emerald-300 placeholder:text-slate-500 p-0 focus:ring-0 focus:outline-none tracking-tight"
                      />
                    </div>
                    {/* Keyboard Shortcut Indicator */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                        ↵↵ Enter (x2)
                      </span>
                      <span className="text-emerald-300/90 font-semibold">{language === 'bn' ? 'দ্রুত ক্যাশ বিক্রি (Direct Quick Sale)' : 'Instant Quick Sale'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{language === 'bn' ? '১ বার Enter: কাস্টমার / নোট নির্বাচন' : '1x Enter: Customer & Note'}</span>
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
                            onClick={() => setSalesAmount(preset.toString())}
                            className={`py-2 px-2 sm:px-4 rounded-full text-xs sm:text-sm transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                                : 'bg-slate-900/60 border border-emerald-500/30 text-emerald-300 font-semibold hover:border-emerald-400 hover:text-white'
                            }`}
                          >
                            +৳{preset}
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
                              ৳{(selectedCustomer.totalDue + (parseFloat(salesAmount) || 0)).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Customer Search Input */
                      <div className="relative w-full">
                        <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <input
                            id="customerSearchInput"
                            type="text"
                            value={customerSearchQuery}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setIsSearchFocused(true);
                            }}
                            onFocus={() => setIsSearchFocused(true)}
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
                          <>
                            <div 
                              className="fixed inset-0 z-20" 
                              onClick={() => setIsSearchFocused(false)} 
                            />
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
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. MEDICINE NOTE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase">
                      {t.salesNoteLabel || "MEDICINE NOTE"}
                    </label>
                    <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <input
                        id="salesNoteInput"
                        type="text"
                        value={salesNote}
                        onChange={(e) => setSalesNote(e.target.value)}
                        placeholder={
                          selectedCustomer
                            ? (language === 'bn' ? 'যেমন: নাপা এক্সট্রা, সেক্লো ২০ (বাকী বিক্রি)' : 'e.g. Napa Extra, Antibiotics (Due Sale)')
                            : (t.salesNotePlaceholder || "e.g. Napa Extra, Seclo 20 (Cash Sale)")
                        }
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
                      disabled={isSubmitting}
                      className="bg-emerald-500 text-slate-950 font-bold rounded-full py-3 px-6 flex-1 items-center justify-center flex gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                      <span>
                        {isSubmitting
                          ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Recording...')
                          : selectedCustomer
                            ? (language === 'bn' 
                                ? `বাকী খাতায় যুক্ত করুন${salesAmount ? ` (+৳${salesAmount})` : ''}` 
                                : `Submit Due Sale${salesAmount ? ` (+৳${salesAmount})` : ''}`)
                            : (language === 'bn' ? 'বিক্রি সম্পন্ন করুন' : 'Submit Sale')}
                      </span>
                    </button>
                  </div>
                </form>

                {/* 7. RECORDED SALES SECTION (Dynamic Filter with formatDate) */}
                <div className="pt-4 border-t border-emerald-900/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                      <span>
                        {startDateFilter === endDateFilter
                          ? (startDateFilter === todayIso 
                              ? (language === 'bn' ? `আজকের বিক্রির হিসাব (${matchedSalesRecords.length})` : `Today's Recorded Sales (${matchedSalesRecords.length})`)
                              : (language === 'bn' ? `বিক্রির হিসাব [${formatDate(startDateFilter)}] (${matchedSalesRecords.length})` : `Recorded Sales [${formatDate(startDateFilter)}] (${matchedSalesRecords.length})`))
                          : (language === 'bn' ? `বিক্রির হিসাব [${formatDate(startDateFilter)} - ${formatDate(endDateFilter)}] (${matchedSalesRecords.length})` : `Recorded Sales [${formatDate(startDateFilter)} - ${formatDate(endDateFilter)}] (${matchedSalesRecords.length})`)}
                      </span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Total: ৳{matchedSalesRecords.reduce((acc, s) => acc + s.amount, 0).toLocaleString()}
                    </span>
                  </div>

                  <div id="recordedSalesContainer">
                    {matchedSalesRecords.length === 0 ? (
                      <div className="text-center text-xs text-gray-500 py-4">
                        No sales recorded for this date.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {matchedSalesRecords.map((item) => {
                          const dateStr = parseItemDate(item);
                          const itemDate = formatDate(dateStr) || item.date;
                          const itemTime = item.createdAt && item.createdAt.includes('T')
                            ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                            : 'Cash Sale';
                          const itemTitle = item.note || (language === 'bn' ? 'নগদ বিক্রি' : 'Daily Sale');

                          return (
                            <div 
                              key={item.id}
                              className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg mb-2 flex justify-between items-center"
                            >
                              <div>
                                <p className="text-xs font-bold text-white">{itemTitle}</p>
                                <p className="text-[10px] text-gray-400">
                                  {itemDate} • <span className="text-emerald-400 font-semibold">{itemTime}</span>
                                </p>
                              </div>
                              {/* Delete button bad dewa hoyeche, tai shudhu amount thakbe */}
                              <div className="text-sm font-extrabold text-emerald-400">
                                ৳ {item.amount.toLocaleString('en-US')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

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

                {/* Expense Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 tracking-wider mb-1.5 uppercase">
                    {language === 'bn' ? 'EXPENSE DATE' : 'EXPENSE DATE'}
                  </label>
                  <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50 rounded-xl px-3.5 py-3 shadow-inner transition-all w-full">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      type="date"
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

              {/* Dynamic Recorded Expenses Preview with formatDate */}
              <div className="pt-4 border-t border-emerald-900/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span>
                      {startDateFilter === endDateFilter
                        ? (startDateFilter === todayIso 
                            ? (language === 'bn' ? `আজকের খরচের হিসাব (${matchedExpensesRecords.length})` : `Today's Recorded Expenses (${matchedExpensesRecords.length})`)
                            : (language === 'bn' ? `খরচের হিসাব [${formatDate(startDateFilter)}] (${matchedExpensesRecords.length})` : `Recorded Expenses [${formatDate(startDateFilter)}] (${matchedExpensesRecords.length})`))
                        : (language === 'bn' ? `খরচের হিসাব [${formatDate(startDateFilter)} - ${formatDate(endDateFilter)}] (${matchedExpensesRecords.length})` : `Recorded Expenses [${formatDate(startDateFilter)} - ${formatDate(endDateFilter)}] (${matchedExpensesRecords.length})`)}
                    </span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Total: ৳{matchedExpensesRecords.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}
                  </span>
                </div>

                <div id="recordedExpensesContainer">
                  {matchedExpensesRecords.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 py-4">
                      No expenses recorded for this date.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {matchedExpensesRecords.map((item) => {
                        const dateStr = parseItemDate(item);
                        const itemDate = formatDate(dateStr) || item.date;
                        const itemTime = item.createdAt && item.createdAt.includes('T')
                          ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                          : 'Expense';
                        const itemTitle = item.title ? `${item.category} (${item.title})` : item.category;

                        return (
                          <div 
                            key={item.id}
                            className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg mb-2 flex justify-between items-center"
                          >
                            <div>
                              <p className="text-xs font-bold text-white">{itemTitle}</p>
                              <p className="text-[10px] text-gray-400">
                                {itemDate} • <span className="text-rose-400 font-semibold">{itemTime}</span>
                              </p>
                            </div>
                            {/* Delete button removed */}
                            <div className="text-sm font-extrabold text-rose-400">
                              ৳ {item.amount.toLocaleString('en-US')}
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
