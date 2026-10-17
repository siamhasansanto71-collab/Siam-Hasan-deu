import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { Customer } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';

interface AdjustBalanceModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({ customer, onClose }) => {
  const { adjustBalance } = useLedger();
  const { t } = useLanguage();
  const [newBalance, setNewBalance] = useState(() => (customer ? String(customer.totalDue) : '0'));
  const [reason, setReason] = useState('ভুল হিসাব সংশোধন (Ledger correction)');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!customer) return null;

  const currentDue = customer.totalDue;
  const numNewBalance = parseFloat(newBalance);
  const diff = isNaN(numNewBalance) ? 0 : numNewBalance - currentDue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numNewBalance) || numNewBalance < 0) {
      setError('Please enter a valid non-negative balance.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const safetyTimer = setTimeout(() => {
      setIsSubmitting(false);
    }, 3500);

    try {
      await adjustBalance(customer.id, numNewBalance, reason.trim());
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('Error adjusting balance:', err);
      setError('Failed to adjust balance. Please try again.');
    } finally {
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#062217] border border-cyan-500/40 shadow-2xl shadow-cyan-950/40 p-4 sm:p-6 overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-900/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>Edit / Adjust Balance</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {customer.name} • #{customer.serialNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-emerald-950 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current vs New comparison */}
        <div className="my-4 p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block">Current Balance</span>
            <span className="text-base font-bold text-slate-200">
              {t.currency}{currentDue.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Net Adjustment</span>
            <span className={`text-base font-bold ${
              diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-300'
            }`}>
              {diff > 0 ? `+${t.currency}${diff}` : diff < 0 ? `-${t.currency}${Math.abs(diff)}` : '৳0'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-900/50 border border-rose-600/60 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Balance */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              New Correct Due Balance (৳) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-cyan-400">
                {t.currency}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#04160f] border border-cyan-700/60 text-2xl font-black text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Reason / Remark for Correction *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Return medicine adjustment, wrong entry fix"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm text-slate-200 focus:outline-none focus:border-emerald-400"
            />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[
                'ওষুধ ফেরত (Medicine Return)',
                'হিসাবের ভুল সংশোধন (Calculation fix)',
                'বিশেষ ডিসকাউন্ট (Special Discount)'
              ].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  className="px-2 py-0.5 rounded text-[11px] bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/50"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-emerald-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Adjusting...' : 'Confirm Balance Adjustment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
