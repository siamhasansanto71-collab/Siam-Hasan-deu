import React from 'react';
import { Phone, MessageCircle, ArrowRight, Plus, CheckCircle, MapPin } from 'lucide-react';
import { Customer } from '../types/ledger';
import { useLanguage } from '../context/LanguageContext';

interface CustomerCardProps {
  customer: Customer;
  index: number;
  onOpenLedger: (customer: Customer) => void;
  onQuickPay: (customer: Customer) => void;
  onQuickDue: (customer: Customer) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  index,
  onOpenLedger,
  onQuickPay,
  onQuickDue
}) => {
  const { t } = useLanguage();
  const hasDue = customer.totalDue > 0;

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${customer.phone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '88' + cleanPhone;
    }
    const message = encodeURIComponent(t.whatsappTemplate(customer.name, customer.totalDue));
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div 
      onClick={() => onOpenLedger(customer)}
      className="customer-card group relative overflow-hidden rounded-[16px] bg-[#121e19] hover:bg-[#162720] border border-[rgba(255,255,255,0.15)] hover:border-emerald-500/50 p-4 mb-4 transition-all duration-200 shadow-[0_4px_6px_rgba(0,0,0,0.3)] hover:shadow-lg hover:shadow-emerald-950/30 cursor-pointer w-full max-w-full flex flex-col justify-between gap-3 box-border"
    >
      {/* Top Row: Customer Info + Due Amount Badge */}
      <div className="customer-card-header flex items-start sm:items-center justify-between gap-3 w-full min-w-0 flex-wrap sm:flex-nowrap">
        {/* Left: Serial + Customer name & phone */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          {/* Serial badge */}
          <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] flex items-center justify-center font-bold text-xs sm:text-sm border ${
            hasDue 
              ? 'bg-rose-950/50 text-rose-300 border-rose-800/40' 
              : 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40'
          }`}>
            #{customer.serialNumber || index + 1}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-200 transition-colors break-words">
                {customer.name}
              </h4>
              {customer.totalDue === 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-md flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.zeroDue}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 mt-1 flex-wrap">
              <span className="font-mono text-emerald-300 font-semibold">{customer.phone}</span>
              {customer.address && (
                <span className="flex items-center gap-1 text-slate-400 text-xs break-words">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>{customer.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Due Amount */}
        <div className="text-right flex-shrink-0 pl-1 min-w-[75px] self-start sm:self-center">
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap">
            {t.currentDue}
          </p>
          <div className={`text-lg sm:text-[22px] font-bold tracking-tight tabular-nums flex items-baseline justify-end gap-0.5 whitespace-nowrap ${
            hasDue ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            <span className="text-sm sm:text-base">{t.currency}</span>
            <span>{customer.totalDue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Row: Direct flexible action buttons matching .customer-card-actions */}
      <div 
        className="customer-card-actions flex flex-wrap items-center gap-2 pt-2.5 border-t border-[rgba(255,255,255,0.15)] w-full min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleCall}
          className="flex-1 min-w-[65px] min-h-[38px] px-3 py-2 rounded-[10px] text-xs sm:text-sm font-medium bg-[#1a2e25] hover:bg-[#223f33] text-[#34d399] hover:text-[#6ee7b7] transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          title="Call customer directly"
        >
          <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
          <span>Call</span>
        </button>

        {hasDue && (
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 min-w-[80px] min-h-[38px] px-3 py-2 rounded-[10px] text-xs sm:text-sm font-medium bg-[#1a2e25] hover:bg-[#223f33] text-[#34d399] hover:text-[#6ee7b7] transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            title="Send WhatsApp payment reminder"
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
            <span>WhatsApp</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onQuickDue(customer)}
          className="flex-1 min-w-[70px] min-h-[38px] px-3 py-2 rounded-[10px] text-xs sm:text-sm font-medium bg-[#28161a] hover:bg-[#341b21] text-rose-300 hover:text-rose-200 border border-rose-900/50 transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          title={t.addDue}
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 flex-shrink-0" />
          <span>+ Due</span>
        </button>

        <button
          type="button"
          onClick={() => onQuickPay(customer)}
          className="flex-1 min-w-[65px] min-h-[38px] px-3 py-2 rounded-[10px] text-xs sm:text-sm font-medium bg-[#1a2e25] hover:bg-[#223f33] text-[#34d399] hover:text-[#6ee7b7] border border-emerald-700/50 transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          title={t.quickPay}
        >
          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
          <span>Pay</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenLedger(customer)}
          className="min-w-[38px] min-h-[38px] px-2.5 py-2 rounded-[10px] bg-[#1a2e25] hover:bg-[#223f33] text-[#34d399] hover:text-[#6ee7b7] border border-emerald-700/50 inline-flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          title={t.viewLedger}
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
