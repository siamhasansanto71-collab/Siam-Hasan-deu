import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Calendar, CreditCard, Sparkles } from 'lucide-react';
import { Customer } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';

interface QuickPayModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export const QuickPayModal: React.FC<QuickPayModalProps> = ({ customer, onClose }) => {
  const { recordPayment } = useLedger();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('নগদ ক্যাশ জমা (Cash Payment)');
  const [dateStr, setDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!customer) return null;

  const currentDue = customer.totalDue;
  const payAmount = parseFloat(amount) || 0;
  const remainingDue = Math.max(0, currentDue - payAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      setError('Please enter an amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const safetyTimer = setTimeout(() => {
      setIsSubmitting(false);
    }, 3500);

    try {
      const formattedDate = new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      await recordPayment(customer.id, payAmount, description, formattedDate);
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('Error recording payment:', err);
      setError('Failed to record payment. Please try again.');
    } finally {
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
    }
  };

  const handleFullPayment = () => {
    setAmount(String(currentDue));
    setDescription('সম্পূর্ণ বকেয়া পরিশোধ (Full Payment Cleared)');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-[92%] max-w-[440px] mx-auto rounded-2xl sm:rounded-3xl bg-[#062217] border border-emerald-500/50 shadow-2xl shadow-emerald-950 p-4 sm:p-6 overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-emerald-900/60">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Record Payment</span>
            </h3>
            <p className="text-sm text-slate-300 mt-0.5">
              {customer.name} • #{customer.serialNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-950 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Due vs Remaining Live Preview */}
        <div className="my-3.5 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/70 to-[#041a10] border border-emerald-700/50 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">{t.currentDue}</p>
            <p className="text-xl font-bold text-rose-300">
              {t.currency}{currentDue.toLocaleString()}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase">Remaining</p>
            <p className={`text-xl font-bold ${remainingDue === 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
              {t.currency}{remainingDue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Full Pay Quick Action Button */}
        {currentDue > 0 && (
          <button
            type="button"
            onClick={handleFullPayment}
            className="w-full mb-3.5 min-h-[42px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-600/60 text-emerald-200 text-sm font-bold transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Full Payment ({t.currency}{currentDue.toLocaleString()})</span>
          </button>
        )}

        {error && (
          <div className="mb-3.5 p-3 rounded-xl bg-rose-900/60 border border-rose-600/70 text-sm text-rose-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              {t.amount} *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-emerald-400">
                {t.currency}
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full h-[50px] pl-10 pr-4 rounded-xl bg-[#04160f] border border-emerald-600/70 text-2xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 shadow-inner"
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    const current = parseFloat(amount) || 0;
                    setAmount(String(current + preset));
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-800/70 text-emerald-300 transition-colors"
                >
                  +{t.currency}{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{t.date}</span>
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full h-[46px] px-3.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] text-slate-200 focus:outline-none focus:border-emerald-400 shadow-inner"
            />
          </div>

          {/* Description / Mode */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Payment Note / Method</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cash, bKash, Nagad"
              className="w-full h-[46px] px-3.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 shadow-inner"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-900/60">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
