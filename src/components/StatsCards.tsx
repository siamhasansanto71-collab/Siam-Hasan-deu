import React from 'react';
import { 
  Users, 
  ShoppingBag, 
  Wallet, 
  CheckCircle2, 
  TrendingUp,
  Check
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';

interface StatsCardsProps {
  onOpenAddCustomerModal?: () => void;
  onSelectFilter?: (filter: 'all' | 'hasDue' | 'cleared' | 'highDue') => void;
  onOpenNewSale?: () => void;
  onScrollToReports?: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ 
  onOpenAddCustomerModal,
  onSelectFilter,
  onOpenNewSale,
}) => {
  const { stats, customers } = useLedger();

  const totalCust = customers.length;
  const newSaleTodayAmount = stats.todayCollections > 0 ? stats.todayCollections : 0;
  const dueTotal = stats.totalDues;
  const clearedCount = stats.clearedCustomers ?? customers.filter((c) => c.totalDue === 0).length;

  return (
    <div className="w-full box-border">
      {/* 4 Colorful Rounded Vertical Stat Cards - Perfectly Center-Aligned Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full box-border">
        
        {/* 1. Green Card: "TOTAL CUSTOMERS" */}
        <div 
          onClick={() => onSelectFilter && onSelectFilter('all')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-[#093522]/90 via-[#062417]/90 to-[#03150e]/95 border border-[rgba(255,255,255,0.15)] p-3.5 sm:p-4 shadow-lg shadow-emerald-950/40 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(0,230,118,0.25)] hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center text-center box-border min-w-0 min-h-[135px] sm:min-h-[145px] gap-1.5 sm:gap-2"
        >
          {/* TOP: Circular Icon Badge */}
          <div className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center text-[#00e676] shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(0,230,118,0.35)] transition-all flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>

          {/* MIDDLE: Card Title */}
          <span 
            className="text-[10px] sm:text-[11px] font-bold text-emerald-300 tracking-wider uppercase block text-center truncate w-full"
            title="TOTAL CUSTOMERS"
          >
            TOTAL CUSTOMERS
          </span>

          {/* LOWER: Main Numeric Value */}
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline justify-center gap-1 leading-none">
            <span className="tabular-nums">{totalCust}</span>
          </div>

          {/* BOTTOM: Subtitle / Status Text */}
          <p className="text-[10px] sm:text-[11px] text-emerald-400/80 font-medium truncate flex items-center justify-center gap-1 w-full text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] flex-shrink-0"></span>
            <span className="truncate">{stats.customersWithDue} with due</span>
          </p>

          {/* Glowing bottom line accent */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00e676] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* 2. Blue Card: "NEW SALE" */}
        <div 
          onClick={() => onOpenNewSale ? onOpenNewSale() : onOpenAddCustomerModal?.()}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-[#082a3d]/90 via-[#051c29]/90 to-[#021017]/95 border border-[rgba(255,255,255,0.15)] p-3.5 sm:p-4 shadow-lg shadow-cyan-950/40 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center text-center box-border min-w-0 min-h-[135px] sm:min-h-[145px] gap-1.5 sm:gap-2"
        >
          {/* TOP: Circular Icon Badge */}
          <div className="w-10 h-10 rounded-full bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center text-[#00e5ff] shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(0,229,255,0.35)] transition-all flex-shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>

          {/* MIDDLE: Card Title */}
          <span 
            className="text-[10px] sm:text-[11px] font-bold text-cyan-300 tracking-wider uppercase block text-center truncate w-full"
            title="NEW SALE"
          >
            NEW SALE
          </span>

          {/* LOWER: Main Numeric Value */}
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline justify-center gap-0.5 leading-none">
            <span className="text-cyan-400 font-bold text-sm flex-shrink-0">৳</span>
            <span className="tabular-nums">
              {newSaleTodayAmount > 0 ? newSaleTodayAmount.toLocaleString('en-US') : '0'}
            </span>
          </div>

          {/* BOTTOM: Subtitle / Status Text */}
          <p className="text-[10px] sm:text-[11px] text-cyan-300/80 font-medium truncate flex items-center justify-center gap-1 w-full text-center">
            <TrendingUp className="w-3 h-3 text-cyan-400 flex-shrink-0" />
            <span className="truncate">Today's Cash Sale</span>
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* 3. Purple Card: "DUE LIST" */}
        <div 
          onClick={() => onSelectFilter && onSelectFilter('hasDue')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-[#25103a]/90 via-[#180a26]/90 to-[#0f0417]/95 border border-[rgba(255,255,255,0.15)] p-3.5 sm:p-4 shadow-lg shadow-purple-950/40 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(179,136,255,0.25)] hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center text-center box-border min-w-0 min-h-[135px] sm:min-h-[145px] gap-1.5 sm:gap-2"
        >
          {/* TOP: Circular Icon Badge */}
          <div className="w-10 h-10 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-[#b388ff] shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(179,136,255,0.35)] transition-all flex-shrink-0">
            <Wallet className="w-5 h-5" />
          </div>

          {/* MIDDLE: Card Title */}
          <span 
            className="text-[10px] sm:text-[11px] font-bold text-purple-300 tracking-wider uppercase block text-center truncate w-full"
            title="DUE LIST"
          >
            DUE LIST
          </span>

          {/* LOWER: Main Numeric Value */}
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline justify-center gap-0.5 leading-none">
            <span className="text-purple-400 font-bold text-sm flex-shrink-0">৳</span>
            <span className="tabular-nums text-purple-100">
              {dueTotal > 0 ? dueTotal.toLocaleString('en-US') : '0'}
            </span>
          </div>

          {/* BOTTOM: Subtitle / Status Text */}
          <p className="text-[10px] sm:text-[11px] text-purple-300/80 font-medium truncate flex items-center justify-center gap-1 w-full text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"></span>
            <span className="truncate">{stats.customersWithDue} Accounts</span>
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#b388ff] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* 4. Dark Green / Teal Card: "CLEARED CUSTOMERS" */}
        <div 
          onClick={() => onSelectFilter && onSelectFilter('cleared')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-[#083329]/90 via-[#05241d]/90 to-[#031510]/95 border border-[rgba(255,255,255,0.15)] p-3.5 sm:p-4 shadow-lg shadow-teal-950/40 hover:border-teal-400 hover:shadow-[0_0_15px_rgba(20,184,166,0.25)] hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center text-center box-border min-w-0 min-h-[135px] sm:min-h-[145px] gap-1.5 sm:gap-2"
        >
          {/* TOP: Circular Icon Badge */}
          <div className="w-10 h-10 rounded-full bg-teal-900/40 border border-teal-500/30 flex items-center justify-center text-[#14b8a6] shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(20,184,166,0.35)] transition-all flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          {/* MIDDLE: Card Title */}
          <span 
            className="text-[10px] sm:text-[11px] font-bold text-teal-300 tracking-wider uppercase block text-center truncate w-full"
            title="CLEARED CUSTOMERS"
          >
            CLEARED CUSTOMERS
          </span>

          {/* LOWER: Main Numeric Value */}
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline justify-center gap-1 leading-none">
            <span className="tabular-nums">{clearedCount}</span>
          </div>

          {/* BOTTOM: Subtitle / Status Text */}
          <p className="text-[10px] sm:text-[11px] text-teal-300/80 font-medium truncate flex items-center justify-center gap-1 w-full text-center">
            <Check className="w-3 h-3 text-teal-400 flex-shrink-0" />
            <span className="truncate">{clearedCount} Due Cleared</span>
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#14b8a6] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

      </div>
    </div>
  );
};
