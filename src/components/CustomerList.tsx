import React, { useState, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  Download, 
  FileText, 
  Plus, 
  SlidersHorizontal,
  Eye,
  EyeOff,
  Calendar,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  Users
} from 'lucide-react';
import { Customer, Transaction } from '../types/ledger';
import { CustomerCard } from './CustomerCard';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';
import { formatTransactionDateTime } from '../lib/formatDateTime';

interface CustomerListProps {
  onOpenLedger: (customer: Customer) => void;
  onQuickPay: (customer: Customer) => void;
  onQuickDue: (customer: Customer) => void;
  onOpenAddCustomerModal: () => void;
  onOpenExportModal: () => void;
  initialFilter?: 'all' | 'hasDue' | 'cleared' | 'highDue';
}

type FilterType = 'all' | 'hasDue' | 'cleared' | 'highDue';
type DatePreset = 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom';

// Helper to normalize dates for comparison (YYYY-MM-DD)
const parseTxDateToIso = (dateStr: string, createdAtStr?: string): string => {
  // If ISO already
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }
  // If DD/MM/YYYY format (en-GB: e.g. 09/10/2026)
  if (dateStr && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
    const parts = dateStr.split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  // Fallback to createdAt ISO
  if (createdAtStr && /^\d{4}-\d{2}-\d{2}/.test(createdAtStr)) {
    return createdAtStr.substring(0, 10);
  }
  return '';
};

// Helper to normalize any input date string (YYYY-MM-DD or MM/DD/YYYY or DD/MM/YYYY) for comparison
const toStandardDateStr = (raw: string): string => {
  if (!raw) return '';
  const val = raw.trim();
  // If ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  // If MM/DD/YYYY or DD/MM/YYYY
  const parts = val.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (parts[2].length === 4) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const year = parts[2];
      if (p1 > 12 && p2 <= 12) {
        // DD/MM/YYYY -> YYYY-MM-DD
        return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
      // MM/DD/YYYY -> YYYY-MM-DD
      return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
  }
  return val;
};

const CustomerListComponent: React.FC<CustomerListProps> = ({
  onOpenLedger,
  onQuickPay,
  onQuickDue,
  onOpenAddCustomerModal,
  onOpenExportModal,
  initialFilter = 'all'
}) => {
  const { customers, loading, allTransactions } = useLedger();
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // 150ms debounce for rapid responsive typing without UI stutter
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [forceShowEmptyState, setForceShowEmptyState] = useState(false);

  // Date-range filter states
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [activeDatePreset, setActiveDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'customers' | 'transactions'>('customers');

  // Hidden date picker input refs for native picker triggers
  const startDatePickerRef = React.useRef<HTMLInputElement>(null);
  const endDatePickerRef = React.useRef<HTMLInputElement>(null);

  // Sync when initialFilter prop changes
  React.useEffect(() => {
    if (initialFilter) {
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);

  // Set preset ranges
  const applyPreset = (preset: DatePreset) => {
    setActiveDatePreset(preset);
    const now = new Date();
    const toIso = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toIso(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now.getTime() - 6 * 86400000);
      setStartDate(toIso(past7));
      setEndDate(toIso(now));
    } else if (preset === '30days') {
      const past30 = new Date(now.getTime() - 29 * 86400000);
      setStartDate(toIso(past30));
      setEndDate(toIso(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toIso(firstDay));
      setEndDate(toIso(now));
    }
  };

  const handleClearDateFilter = () => {
    setActiveDatePreset('all');
    setStartDate('');
    setEndDate('');
    setViewMode('customers');
  };

  const isDateFilterActive = Boolean(startDate || endDate || activeDatePreset !== 'all');

  // Customer map for rapid lookup in transaction rows
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Filtered transactions for the selected date range & search term
  const filteredTransactions = useMemo(() => {
    let txs = [...allTransactions];
    const normStart = toStandardDateStr(startDate);
    const normEnd = toStandardDateStr(endDate);

    if (normStart) {
      txs = txs.filter((tx) => {
        const txIso = parseTxDateToIso(tx.date, tx.createdAt);
        return txIso ? txIso >= normStart : true;
      });
    }

    if (normEnd) {
      txs = txs.filter((tx) => {
        const txIso = parseTxDateToIso(tx.date, tx.createdAt);
        return txIso ? txIso <= normEnd : true;
      });
    }

    if (debouncedSearchTerm.trim()) {
      const q = debouncedSearchTerm.toLowerCase().trim();
      txs = txs.filter((tx) => {
        const cust = customerMap.get(tx.customerId);
        const nameMatch = cust?.name.toLowerCase().includes(q);
        const phoneMatch = cust?.phone.includes(q);
        const descMatch = tx.description?.toLowerCase().includes(q);
        return nameMatch || phoneMatch || descMatch;
      });
    }

    return txs;
  }, [allTransactions, startDate, endDate, debouncedSearchTerm, customerMap]);

  // Transaction period summary stats
  const dateRangeStats = useMemo(() => {
    let totalDuesAdded = 0;
    let totalPaymentsReceived = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'due') totalDuesAdded += tx.amount;
      if (tx.type === 'payment') totalPaymentsReceived += tx.amount;
    });
    return {
      totalDuesAdded,
      totalPaymentsReceived,
      txCount: filteredTransactions.length,
      netChange: totalDuesAdded - totalPaymentsReceived
    };
  }, [filteredTransactions]);

  // Set of customer IDs who have activity in this date range
  const activeCustomerIdsInRange = useMemo(() => {
    if (!isDateFilterActive) return null;
    return new Set(filteredTransactions.map((tx) => tx.customerId));
  }, [isDateFilterActive, filteredTransactions]);

  // Filtered customers by tab pill, search, and active date range
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // If date filter is active and we're filtering customers, show customers who had activity
    if (activeCustomerIdsInRange !== null) {
      result = result.filter((c) => activeCustomerIdsInRange.has(c.id));
    }

    if (activeFilter === 'hasDue') {
      result = result.filter((c) => c.totalDue > 0);
    } else if (activeFilter === 'cleared') {
      result = result.filter((c) => c.totalDue === 0);
    } else if (activeFilter === 'highDue') {
      result = result.filter((c) => c.totalDue >= 1000);
    }

    if (debouncedSearchTerm.trim()) {
      const q = debouncedSearchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }

    return result;
  }, [customers, activeFilter, debouncedSearchTerm, activeCustomerIdsInRange]);

  const hasDueCount = useMemo(() => customers.filter((c) => c.totalDue > 0).length, [customers]);
  const clearedCount = useMemo(() => customers.filter((c) => c.totalDue === 0).length, [customers]);
  const highDueCount = useMemo(() => customers.filter((c) => c.totalDue >= 1000).length, [customers]);

  return (
    <div className="space-y-3.5">
      {/* Primary Section Mode Tabs: Accounts vs Transactions */}
      <div className="w-full bg-[#041a12] p-1.5 sm:p-2 rounded-2xl border border-emerald-500/30 shadow-lg flex items-center gap-2 sm:gap-3">
        {/* Accounts Tab */}
        <button
          type="button"
          onClick={() => setViewMode('customers')}
          className={`flex-1 flex items-center justify-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
            viewMode === 'customers'
              ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/40'
              : 'bg-emerald-950/40 border border-emerald-900/50 hover:bg-emerald-950/70 hover:border-emerald-600/50 text-slate-300'
          }`}
        >
          {/* Boro ebong Spashto Icon */}
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500 text-black rounded-lg shadow-sm transition-colors flex-shrink-0">
            <Users className="w-5 h-5 font-bold" strokeWidth={2.5} />
          </div>

          {/* Text Label */}
          <span className={`text-xs sm:text-sm font-bold tracking-wide ${
            viewMode === 'customers' ? 'text-white' : 'text-emerald-200/90'
          }`}>
            {language === 'bn' ? 'কাস্টমার হিসাব' : 'Accounts'}
          </span>

          <span className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full font-extrabold ${
            viewMode === 'customers'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'bg-emerald-900/60 text-emerald-300'
          }`}>
            {customers.length}
          </span>
        </button>

        {/* Transactions Tab */}
        <button
          type="button"
          onClick={() => setViewMode('transactions')}
          className={`flex-1 flex items-center justify-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
            viewMode === 'transactions'
              ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/40'
              : 'bg-emerald-950/40 border border-emerald-900/50 hover:bg-emerald-950/70 hover:border-emerald-600/50 text-slate-300'
          }`}
        >
          {/* Boro ebong Spashto Icon */}
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500 text-black rounded-lg shadow-sm flex-shrink-0">
            <svg 
              className="w-5 h-5 text-black font-bold" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth={2.5} 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>

          {/* Text Label */}
          <span className={`text-xs sm:text-sm font-bold tracking-wide ${
            viewMode === 'transactions' ? 'text-white' : 'text-emerald-200/90'
          }`}>
            {language === 'bn' ? 'লেনদেন স্লিপ' : 'Transactions'}
          </span>

          <span className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full font-extrabold ${
            viewMode === 'transactions'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'bg-emerald-900/60 text-emerald-300'
          }`}>
            {allTransactions.length}
          </span>
        </button>
      </div>

      {/* Top Search Input Row with Export & Add Customer - Responsive Flex Wrap */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder || "Search by customer name or phone..."}
            className="w-full pl-10 sm:pl-11 pr-14 py-2.5 sm:py-3 rounded-xl bg-[#062016] border border-[rgba(255,255,255,0.15)] text-white placeholder-emerald-400/50 text-xs sm:text-sm focus:outline-none focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676] transition-all shadow-inner min-h-[44px] box-border"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Buttons Row with flexible wrap */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 w-full sm:w-auto">
          {/* Date Filter Toggle Button */}
          <button
            onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
            className={`flex-1 sm:flex-none min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm whitespace-nowrap ${
              isDateFilterActive
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-[#00e676] shadow-[0_0_14px_rgba(0,230,118,0.4)]'
                : 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-600/40 hover:border-emerald-500 text-emerald-200'
            }`}
            title="Filter transactions by Date Range"
          >
            <Calendar className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)] flex-shrink-0" />
            <span className="tracking-wide">{t.dateRangeFilter || "Date Filter"}</span>
            {isDateFilterActive && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676] animate-pulse" />
            )}
            {isDateFilterOpen ? (
              <ChevronUp className="w-4 h-4 ml-0.5 text-emerald-300" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-0.5 text-emerald-300" />
            )}
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex-1 sm:flex-none min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-[rgba(255,255,255,0.15)] text-emerald-300 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm whitespace-nowrap"
            title="Export Ledger"
          >
            <Download className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Export</span>
          </button>

          <button
            onClick={onOpenAddCustomerModal}
            className="flex-1 sm:flex-none min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#00e676] to-[#00c853] hover:from-[#00ff84] hover:to-[#00d859] text-black text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_0_15px_rgba(0,230,118,0.3)] whitespace-nowrap"
            title="Add Customer"
          >
            <Plus className="w-4 h-4 stroke-[2.5] flex-shrink-0" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Interface Panel (Collapsible / Expandable with Glassmorphism) */}
      {isDateFilterOpen && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-[#06261c] to-[#041a13] border border-emerald-500/40 shadow-xl backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-2 border-b border-emerald-900/60 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                <Calendar className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white">
                  {t.customDates || "Filter by Date Range"}
                </h4>
                <p className="text-[11px] text-emerald-300/80">
                  {language === 'bn' 
                    ? 'নির্দিষ্ট সময়সীমার কাস্টমার হিসাব ও লেনদেন তালিকা দেখুন' 
                    : 'View transactions and accounts for a specific custom time period'}
                </p>
              </div>
            </div>

            {isDateFilterActive && (
              <button
                onClick={handleClearDateFilter}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:text-white px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearDateFilter || "Clear"}</span>
              </button>
            )}
          </div>

          {/* Preset Buttons Row: All Dates, Today, Last 7 Days, Last 30 Days, This Month */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none text-xs">
            <button
              onClick={() => applyPreset('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                activeDatePreset === 'all'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#00e676] text-black border-[#00e676] font-black shadow-[0_0_14px_rgba(0,230,118,0.45)] ring-1 ring-white/30'
                  : 'bg-[#06241a] text-emerald-200 hover:text-white border-emerald-700/60 hover:border-emerald-500/80 hover:bg-[#0a3526]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeDatePreset === 'all' ? 'bg-black' : 'bg-emerald-400'}`} />
              <span>{t.allTimePreset || "All Dates"}</span>
            </button>
            <button
              onClick={() => applyPreset('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                activeDatePreset === 'today'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#00e676] text-black border-[#00e676] font-black shadow-[0_0_14px_rgba(0,230,118,0.45)] ring-1 ring-white/30'
                  : 'bg-[#06241a] text-emerald-200 hover:text-white border-emerald-700/60 hover:border-emerald-500/80 hover:bg-[#0a3526]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeDatePreset === 'today' ? 'bg-black' : 'bg-emerald-400'}`} />
              <span>{t.todayPreset || "Today"}</span>
            </button>
            <button
              onClick={() => applyPreset('7days')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                activeDatePreset === '7days'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#00e676] text-black border-[#00e676] font-black shadow-[0_0_14px_rgba(0,230,118,0.45)] ring-1 ring-white/30'
                  : 'bg-[#06241a] text-emerald-200 hover:text-white border-emerald-700/60 hover:border-emerald-500/80 hover:bg-[#0a3526]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeDatePreset === '7days' ? 'bg-black' : 'bg-emerald-400'}`} />
              <span>{t.last7DaysPreset || "Last 7 Days"}</span>
            </button>
            <button
              onClick={() => applyPreset('30days')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                activeDatePreset === '30days'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#00e676] text-black border-[#00e676] font-black shadow-[0_0_14px_rgba(0,230,118,0.45)] ring-1 ring-white/30'
                  : 'bg-[#06241a] text-emerald-200 hover:text-white border-emerald-700/60 hover:border-emerald-500/80 hover:bg-[#0a3526]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeDatePreset === '30days' ? 'bg-black' : 'bg-emerald-400'}`} />
              <span>{t.last30DaysPreset || "Last 30 Days"}</span>
            </button>
            <button
              onClick={() => applyPreset('thisMonth')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                activeDatePreset === 'thisMonth'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#00e676] text-black border-[#00e676] font-black shadow-[0_0_14px_rgba(0,230,118,0.45)] ring-1 ring-white/30'
                  : 'bg-[#06241a] text-emerald-200 hover:text-white border-emerald-700/60 hover:border-emerald-500/80 hover:bg-[#0a3526]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeDatePreset === 'thisMonth' ? 'bg-black' : 'bg-emerald-400'}`} />
              <span>{t.thisMonthPreset || "This Month"}</span>
            </button>
          </div>

          {/* Custom Date Inputs (From / To) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* From Date */}
            <div>
              <label className="block text-[11px] font-bold text-emerald-300/90 mb-1">
                {t.fromDate || "From Date"}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveDatePreset('custom');
                  }}
                  placeholder=""
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  translate="no"
                  className="notranslate w-full pl-3 pr-16 py-2 rounded-xl bg-[#03150f] border border-emerald-500/30 text-white text-xs font-mono focus:outline-none focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676]"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate('');
                        setActiveDatePreset('custom');
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                      title="Clear from date"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        startDatePickerRef.current?.showPicker();
                      } catch {
                        startDatePickerRef.current?.focus();
                      }
                    }}
                    className="p-1 text-emerald-400 hover:text-[#00e676] hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Open calendar picker"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
                <input
                  ref={startDatePickerRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.value) {
                      setStartDate(e.target.value);
                      setActiveDatePreset('custom');
                    }
                  }}
                />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[11px] font-bold text-emerald-300/90 mb-1">
                {t.toDate || "To Date"}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveDatePreset('custom');
                  }}
                  placeholder=""
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  translate="no"
                  className="notranslate w-full pl-3 pr-16 py-2 rounded-xl bg-[#03150f] border border-emerald-500/30 text-white text-xs font-mono focus:outline-none focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676]"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {endDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setEndDate('');
                        setActiveDatePreset('custom');
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                      title="Clear to date"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        endDatePickerRef.current?.showPicker();
                      } catch {
                        endDatePickerRef.current?.focus();
                      }
                    }}
                    className="p-1 text-emerald-400 hover:text-[#00e676] hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Open calendar picker"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
                <input
                  ref={endDatePickerRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.value) {
                      setEndDate(e.target.value);
                      setActiveDatePreset('custom');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics & View Mode Switcher for Filtered Time Period */}
          <div className="pt-2 border-t border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Summary badges */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-slate-400">
                {language === 'bn' ? 'মোট লেনদেন:' : 'Transactions:'}{' '}
                <strong className="text-white font-mono">{dateRangeStats.txCount}</strong>
              </span>
              <span className="text-emerald-900">•</span>
              <span className="text-rose-400">
                {language === 'bn' ? 'বাকি যোগ:' : 'New Due:'}{' '}
                <strong className="font-mono">৳{dateRangeStats.totalDuesAdded.toLocaleString()}</strong>
              </span>
              <span className="text-emerald-900">•</span>
              <span className="text-emerald-400">
                {language === 'bn' ? 'জমা আদায়:' : 'Collected:'}{' '}
                <strong className="font-mono">৳{dateRangeStats.totalPaymentsReceived.toLocaleString()}</strong>
              </span>
            </div>

            {/* Toggle View: Customers vs Individual Transactions */}
            <div className="flex items-center gap-1.5 bg-[#03150e] p-1.5 rounded-xl border border-emerald-500/40 shadow-inner self-start sm:self-auto">
              <button
                onClick={() => setViewMode('customers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
                  viewMode === 'customers'
                    ? 'bg-gradient-to-r from-emerald-600 to-[#00e676] text-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                    : 'text-emerald-300 hover:text-white hover:bg-emerald-950/50'
                }`}
              >
                <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${viewMode === 'customers' ? 'text-black' : 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]'}`} />
                <span>{language === 'bn' ? 'কাস্টমার হিসাব' : 'Accounts'}</span>
              </button>
              <button
                onClick={() => setViewMode('transactions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
                  viewMode === 'transactions'
                    ? 'bg-gradient-to-r from-emerald-600 to-[#00e676] text-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                    : 'text-emerald-300 hover:text-white hover:bg-emerald-950/50'
                }`}
              >
                <svg 
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${viewMode === 'transactions' ? 'text-black' : 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]'}`}
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth={2.5} 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                <span>{language === 'bn' ? 'লেনদেন স্লিপ' : 'Transactions'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Filter Tab Bar with Dedicated Horizontal Scroll Container & Chip/Pill Buttons */}
      {viewMode === 'customers' && (
        <div className="filter-tab-container w-full overflow-x-auto pb-1 scrollbar-none mb-3 sm:mb-3.5 flex items-center justify-between gap-2 box-border">
          <div className="flex items-center gap-2 whitespace-nowrap min-w-max flex-1">
            {/* 1. All Customers */}
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`filter-chip ${
                activeFilter === 'all'
                  ? 'active'
                  : ''
              }`}
            >
              <span>All Customers</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                activeFilter === 'all' 
                  ? 'bg-black/25 text-black' 
                  : 'bg-white/10 text-emerald-400'
              }`}>
                {isDateFilterActive ? filteredCustomers.length : customers.length}
              </span>
            </button>

            {/* 2. Has Due */}
            <button
              type="button"
              onClick={() => setActiveFilter('hasDue')}
              className={`filter-chip ${
                activeFilter === 'hasDue'
                  ? 'active !bg-rose-600 !border-rose-500 !text-white !shadow-[0_0_14px_rgba(244,63,94,0.4)]'
                  : ''
              }`}
            >
              <span>Has Due</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                activeFilter === 'hasDue' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-rose-950/60 text-rose-300'
              }`}>
                {hasDueCount}
              </span>
            </button>

            {/* 3. Fully Cleared */}
            <button
              type="button"
              onClick={() => setActiveFilter('cleared')}
              className={`filter-chip ${
                activeFilter === 'cleared'
                  ? 'active !bg-teal-500 !border-teal-400 !text-white !shadow-[0_0_14px_rgba(20,184,166,0.4)]'
                  : ''
              }`}
            >
              <span>Fully Cleared</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                activeFilter === 'cleared' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-teal-950/60 text-teal-300'
              }`}>
                {clearedCount}
              </span>
            </button>

            {/* 4. High Due */}
            <button
              type="button"
              onClick={() => setActiveFilter('highDue')}
              className={`filter-chip ${
                activeFilter === 'highDue'
                  ? 'active !bg-amber-500 !border-amber-400 !text-black !shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                  : ''
              }`}
            >
              <span>High Due</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                activeFilter === 'highDue' 
                  ? 'bg-black/25 text-black' 
                  : 'bg-amber-950/60 text-amber-300'
              }`}>
                {highDueCount}
              </span>
            </button>
          </div>

          {/* Optional preview toggle if customers are loaded */}
          {customers.length > 0 && (
            <button
              type="button"
              onClick={() => setForceShowEmptyState(!forceShowEmptyState)}
              className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-400/80 hover:text-emerald-300 px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 transition-colors active:scale-95"
              title="Toggle between Empty State Graphic & Customer List"
            >
              {forceShowEmptyState ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{forceShowEmptyState ? 'Show Accounts' : 'Preview Empty State'}</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content: Loading, Empty State, Transactions list, or Customer Cards */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-[#061e17] border border-emerald-500/30">
          <div className="w-8 h-8 mx-auto border-2 border-[#00e676] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-emerald-300 font-medium">Syncing customer credit accounts...</p>
        </div>
      ) : viewMode === 'transactions' ? (
        
        /* Direct Custom Period Transactions Ledger Table / List */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00e676]" />
              <span>{t.transactionsInPeriod || "Transactions in Selected Period"} ({filteredTransactions.length})</span>
            </span>
            {isDateFilterActive && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">
                {startDate || 'Start'} → {endDate || 'Now'}
              </span>
            )}
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#051c14] border border-emerald-800/40">
              <FileText className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No transactions found for this date period.</p>
              <p className="text-xs text-slate-400 mt-1">Try expanding the date range or selecting "All Time".</p>
              <button
                onClick={handleClearDateFilter}
                className="mt-3 text-xs font-bold text-[#00e676] hover:underline"
              >
                Reset Date Filter
              </button>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const cust = customerMap.get(tx.customerId);
              const isPayment = tx.type === 'payment';
              const isDue = tx.type === 'due';
              const formattedDT = formatTransactionDateTime(tx.date, tx.createdAt);

              return (
                <div
                  key={tx.id}
                  onClick={() => cust && onOpenLedger(cust)}
                  className={`p-3.5 rounded-xl border border-[rgba(255,255,255,0.15)] transition-all cursor-pointer ${
                    isPayment
                      ? 'bg-[#052117] hover:bg-[#07291d] hover:border-emerald-500'
                      : isDue
                      ? 'bg-[#1b0d13] hover:bg-[#25121b] hover:border-rose-600'
                      : 'bg-[#051f20] hover:border-cyan-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isPayment
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isDue
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {isPayment ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs sm:text-sm font-extrabold text-white truncate">
                            {cust ? cust.name : 'Customer'}
                          </h5>
                          {cust && (
                            <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/80 px-1.5 py-0.2 rounded">
                              #{cust.serialNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 truncate">
                          {tx.description || (isPayment ? 'Payment Received' : 'Due Added')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-sm sm:text-base font-black font-mono tabular-nums ${
                          isPayment ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPayment ? '-' : '+'}৳{tx.amount.toLocaleString()}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono mt-0.5">
                        <span className="text-slate-400">{formattedDT.date}</span>
                        {formattedDT.time && (
                          <>
                            <span className="text-slate-600 font-bold">•</span>
                            <span className="text-emerald-300/80 font-medium inline-flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-emerald-400/80" />
                              {formattedDT.time}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      ) : (filteredCustomers.length === 0 || forceShowEmptyState) ? (
        
        /* Ultra-modern Empty State Section with central document icon, green plus badge, subtle green dotted circular accent lines, Bengali guidance text, and glowing green button */
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#072419]/90 via-[#051c14]/95 to-[#02130e]/98 border border-emerald-500/40 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Central Document Icon with Subtle Green Dotted Circular Accent Lines & Green Plus Badge */}
          <div className="relative w-36 h-36 mx-auto flex items-center justify-center mb-6">
            
            {/* Concentric Subtle Green Dotted Circular Accent Lines */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none animate-[spin_60s_linear_infinite]"
              viewBox="0 0 160 160"
            >
              <circle
                cx="80"
                cy="80"
                r="74"
                fill="none"
                stroke="#00e676"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                strokeOpacity="0.25"
              />
              <circle
                cx="80"
                cy="80"
                r="56"
                fill="none"
                stroke="#00e676"
                strokeWidth="1.5"
                strokeDasharray="3 5"
                strokeOpacity="0.4"
              />
              <circle
                cx="80"
                cy="80"
                r="38"
                fill="none"
                stroke="#00e676"
                strokeWidth="1"
                strokeDasharray="2 4"
                strokeOpacity="0.5"
              />
            </svg>

            {/* Central Document Card */}
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0c442e] to-[#041d13] border-2 border-emerald-400/60 shadow-[0_0_25px_rgba(0,230,118,0.3)] flex items-center justify-center text-emerald-300">
              <FileText className="w-10 h-10 text-emerald-300 stroke-[1.75]" />
              
              {/* Green Plus Badge */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#00e676] border-2 border-[#061712] flex items-center justify-center text-black font-black shadow-[0_0_10px_rgba(0,230,118,0.8)]">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

          </div>

          {/* Title & Bengali Guidance Text */}
          <div className="max-w-md mx-auto space-y-2 mb-6">
            <h4 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Customer Credit Accounts
            </h4>
            
            {/* Bengali Guidance Text */}
            <p className="text-sm sm:text-base font-semibold text-emerald-300 leading-relaxed">
              কোনো বাকি খাতা পাওয়া যায়নি বা নতুন খাতা খুলতে চান? গ্রাহকের বাকির হিসাব ও ডিজিটাল রসিদ সহজে সংরক্ষণ করতে নিচের বাটনে চাপ দিন।
            </p>
            
            <p className="text-xs text-slate-400">
              Keep customer dues, payments, and automated WhatsApp reminder slips organized in one place.
            </p>
          </div>

          {/* Glowing Green Button Labeled "+ Add Customer" */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenAddCustomerModal}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-7 py-3 rounded-xl bg-gradient-to-r from-[#00e676] via-[#00c853] to-[#00e676] bg-[length:200%_auto] hover:bg-right text-black font-black text-sm tracking-wide shadow-[0_0_25px_rgba(0,230,118,0.5)] border border-emerald-300 transition-all active:scale-95"
            >
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
              <span>+ Add Customer</span>
            </button>

            {forceShowEmptyState && (
              <button
                onClick={() => setForceShowEmptyState(false)}
                className="text-xs text-emerald-400 hover:underline py-2 px-3"
              >
                Back to Customer List
              </button>
            )}

            {isDateFilterActive && (
              <button
                onClick={handleClearDateFilter}
                className="text-xs text-emerald-300 hover:underline py-2 px-3"
              >
                Clear Date Filter
              </button>
            )}
          </div>

        </div>

      ) : (
        /* Populated Customer List with clear gap spacing */
        <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
          {filteredCustomers.map((customer, idx) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              index={idx}
              onOpenLedger={onOpenLedger}
              onQuickPay={onQuickPay}
              onQuickDue={onQuickDue}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CustomerList = React.memo(CustomerListComponent);
