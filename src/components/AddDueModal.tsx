import React, { useState } from 'react';
import { X, Plus, AlertCircle, Calendar, FileText } from 'lucide-react';
import { Customer } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';

interface AddDueModalProps {
  customer: Customer | null;
  onClose: () => void;
}

const COMMON_MEDICINES = [
  'Napa Extra (নাপা)',
  'Sergel 20 (সারজেল)',
  'Monas 10 (মোনাস)',
  'Seclo 20 (সেক্লো)',
  'Insulin (ইনসুলিন)',
  'Prescription medicines'
];

export const AddDueModal: React.FC<AddDueModalProps> = ({ customer, onClose }) => {
  const { addDueTransaction } = useLedger();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
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
      await addDueTransaction(customer.id, numAmount, description, formattedDate);
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('Error recording due:', err);
      setError('Failed to record due. Please try again.');
    } finally {
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = (preset: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + preset));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-[92%] max-w-[440px] mx-auto rounded-2xl sm:rounded-3xl bg-[#062217] border border-rose-500/50 shadow-2xl shadow-rose-950/40 p-4 sm:p-6 overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-emerald-900/60">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>+ Add Due</span>
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

        {/* Current Balance Reminder */}
        <div className="my-3.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-between text-sm">
          <span className="text-rose-300/90 font-medium">{t.currentDue}:</span>
          <span className="text-lg font-bold text-rose-300">
            {t.currency}{customer.totalDue.toLocaleString()}
          </span>
        </div>

        {error && (
          <div className="mb-3.5 p-3 rounded-xl bg-rose-900/60 border border-rose-600/70 text-sm text-rose-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Due Amount input */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              {t.amount} *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-rose-400">
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
                className="w-full h-[50px] pl-10 pr-4 rounded-xl bg-[#04160f] border border-rose-800/70 text-2xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 shadow-inner"
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {[50, 100, 200, 500, 1000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => handleQuickAdd(preset)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-800/70 text-emerald-300 transition-colors"
                >
                  +{t.currency}{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
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

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{t.itemDescription}</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Napa Extra 2 strips, Sergel"
              className="w-full h-[46px] px-3.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 shadow-inner"
            />
            {/* Common quick medicines */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              {COMMON_MEDICINES.slice(0, 3).map((med) => (
                <button
                  type="button"
                  key={med}
                  onClick={() => setDescription(med)}
                  className="px-2.5 py-1 rounded-md bg-[#041c13] hover:bg-emerald-900/40 border border-emerald-800/50 text-slate-300 whitespace-nowrap"
                >
                  {med}
                </button>
              ))}
            </div>
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
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : '+ Add Due'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
