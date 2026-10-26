import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Receipt, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  Calendar,
  Layers
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';

interface SalesExpenseCardsProps {
  onOpenSales: () => void;
  onOpenExpenses: () => void;
  activeTab?: 'sales' | 'expenses';
}

const SalesExpenseCardsComponent: React.FC<SalesExpenseCardsProps> = ({
  onOpenSales,
  onOpenExpenses,
  activeTab,
}) => {
  const { 
    todaySalesAmount, 
    todayExpensesAmount, 
    totalSalesAmount, 
    totalExpensesAmount 
  } = useLedger();
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<'today' | 'all'>('today');

  const displaySales = period === 'today' ? todaySalesAmount : totalSalesAmount;
  const displayExpenses = period === 'today' ? todayExpensesAmount : totalExpensesAmount;

  return (
    <div className="w-full space-y-2.5 box-border">
      {/* Header with period toggle filter */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00e676]" />
          <span>{language === 'bn' ? 'দৈনিক হিসাব ও সারাংশ' : 'Daily Cash & Expense Ledger'}</span>
        </span>

        {/* Period Selector Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-inner">
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              period === 'today'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {language === 'bn' ? 'আজকের' : 'Today'}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              period === 'all'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {language === 'bn' ? 'সর্বমোট' : 'All Time'}
          </button>
        </div>
      </div>

      {/* 2 Side-by-Side Modern Metric Cards with Strict Horizontal Row Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full box-border">
        
        {/* CARD 1: Total Sales */}
        <div
          onClick={onOpenSales}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onOpenSales(); }}
          className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 border p-3.5 sm:p-4 shadow-xl shadow-emerald-950/40 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-between box-border ${
            activeTab === 'sales'
              ? 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_22px_rgba(0,230,118,0.35)]'
              : 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_18px_rgba(0,230,118,0.25)]'
          }`}
        >
          {/* Left Side: Icon + Text Content (Title, Amount, Subtitle) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* 1. Icon Box on LEFT */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>

            {/* 2. Text Content on RIGHT next to the icon */}
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">
                {t.totalSalesCardTitle || "SALE"}
              </p>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-baseline gap-1">
                <span className="text-emerald-400 text-sm font-extrabold">৳</span>
                <span id="dashSales" className="tabular-nums font-mono text-[#00e676]">
                  {displaySales.toLocaleString('en-US')}
                </span>
              </h3>
              <p className="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1 mt-0.5 truncate">
                <span>{period === 'today' ? (language === 'bn' ? "আজকের নগদ বিক্রি" : "Today's Cash Sale") : (t.allTimeTotalSales || "All Time")}</span>
              </p>
            </div>
          </div>

          {/* Far Right: Badge / Arrow */}
          <div className="flex-shrink-0 ml-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-200 bg-emerald-950/90 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 group-hover:border-emerald-400 group-hover:text-white transition-colors shadow-sm">
              <span>{language === 'bn' ? 'বিক্রি' : 'Sale'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#00e676] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>

          {/* Glowing bottom line accent */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00e676] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* CARD 2: Total Expenses */}
        <div
          onClick={onOpenExpenses}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onOpenExpenses(); }}
          className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 border p-3.5 sm:p-4 shadow-xl shadow-rose-950/40 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-between box-border ${
            activeTab === 'expenses'
              ? 'border-rose-400 ring-2 ring-rose-400/60 shadow-[0_0_22px_rgba(255,82,82,0.35)]'
              : 'border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_18px_rgba(255,82,82,0.25)]'
          }`}
        >
          {/* Left Side: Icon + Text Content (Title, Amount, Subtitle) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* 1. Icon Box on LEFT */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>

            {/* 2. Text Content on RIGHT next to the icon */}
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">
                {t.totalExpensesCardTitle || "EXPENSES"}
              </p>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-baseline gap-1">
                <span className="text-rose-400 text-sm font-extrabold">৳</span>
                <span id="dashExpenses" className="tabular-nums font-mono text-[#ff5252]">
                  {displayExpenses.toLocaleString('en-US')}
                </span>
              </h3>
              <p className="text-[10px] text-rose-400/90 font-medium flex items-center gap-1 mt-0.5 truncate">
                <Calendar className="w-3 h-3 text-[#ff5252] flex-shrink-0" />
                <span>{period === 'today' ? (language === 'bn' ? "আজকের খরচ" : "Range Total") : (t.allTimeTotalExpenses || "All Time")}</span>
              </p>
            </div>
          </div>

          {/* Far Right: Badge / Arrow */}
          <div className="flex-shrink-0 ml-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-200 bg-rose-950/90 px-2.5 py-1.5 rounded-xl border border-rose-500/40 group-hover:border-rose-400 group-hover:text-white transition-colors shadow-sm">
              <span>{language === 'bn' ? 'খরচ' : 'Expense'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#ff5252] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>

          {/* Glowing bottom line accent */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ff5252] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

      </div>
    </div>
  );
};

export const SalesExpenseCards = React.memo(SalesExpenseCardsComponent);
