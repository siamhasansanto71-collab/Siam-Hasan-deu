import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit2, AlertCircle, Phone, MapPin, FileText } from 'lucide-react';
import { Customer } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';

interface CustomerModalProps {
  customerToEdit: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded?: (customerId: string) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  customerToEdit,
  isOpen,
  onClose,
  onCustomerAdded
}) => {
  const { addCustomer, updateCustomer } = useLedger();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialDue, setInitialDue] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setAddress(customerToEdit.address || '');
      setNotes(customerToEdit.notes || '');
      setInitialDue('');
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setInitialDue('');
    }
    setError('');
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!phone.trim()) {
      setError('Mobile phone number is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const safetyTimer = setTimeout(() => {
      setIsSubmitting(false);
    }, 3500);

    try {
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim()
        });
      } else {
        const newId = await addCustomer({
          name: name.trim(),
          phone: phone.trim(),
          initialDue: parseFloat(initialDue) || 0,
          address: address.trim(),
          notes: notes.trim()
        });
        if (onCustomerAdded && newId) {
          onCustomerAdded(newId);
        }
      }
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('Error saving customer:', err);
      setError('An error occurred while saving. Please try again.');
    } finally {
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Modal Dialog: width 92% (max-width: 440px) centered */}
      <div className="relative w-[92%] max-w-[440px] mx-auto rounded-2xl sm:rounded-3xl bg-[#062217] border border-emerald-600/50 shadow-2xl shadow-emerald-950 p-4 sm:p-6 overflow-hidden max-h-[92vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-emerald-900/60">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              {customerToEdit ? (
                <>
                  <Edit2 className="w-5 h-5 text-emerald-400" />
                  <span>{t.editCustomerBtn}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <span>+ Add Customer</span>
                </>
              )}
            </h3>
            <p className="text-sm text-slate-300 mt-0.5">
              {customerToEdit ? `Updating profile for ${customerToEdit.name}` : 'Create a credit ledger for a new customer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-950 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-900/60 border border-rose-600/70 text-sm text-rose-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-3.5 overflow-y-auto pr-1">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              {t.customerName} *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. মোঃ শামীম আহমেদ (Shamim Ahmed)"
              className="w-full h-[46px] px-3.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 shadow-inner"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>{t.customerPhone} *</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full h-[46px] px-3.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] font-mono text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 shadow-inner"
            />
          </div>

          {/* Initial Due (only when adding new customer) */}
          {!customerToEdit && (
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                {t.initialDue}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-rose-400">
                  {t.currency}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={initialDue}
                  onChange={(e) => setInitialDue(e.target.value)}
                  placeholder="0 (Optional starting due)"
                  className="w-full h-[46px] pl-9 pr-3.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 shadow-inner"
                />
              </div>
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{t.customerAddress}</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. রোড ৩, বগুড়া (Road 3, Bogura)"
              className="w-full h-[46px] px-3.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 shadow-inner"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{t.notes}</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. নিয়মিত গ্রাহক, ডায়াবেটিস রোগী"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/70 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 resize-none shadow-inner"
            />
          </div>

          {/* Bottom Action Buttons: Fully visible, aligned, and not clipped */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-900/60 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'Saving...'
              ) : customerToEdit ? (
                t.saveChanges
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add Customer</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
