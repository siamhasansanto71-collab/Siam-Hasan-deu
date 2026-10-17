import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  Users, 
  PhoneCall, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({ isOpen, onClose }) => {
  const { customers, userStoreProfile, stats } = useLedger();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [customNote, setCustomNote] = useState('');

  if (!isOpen) return null;

  const customersWithDue = customers.filter((c) => c.totalDue > 0);
  const selectedCustomer = customersWithDue.find((c) => c.id === selectedCustomerId) || customersWithDue[0] || customers[0];

  const storeName = userStoreProfile.storeName || 'Siam Pharma Due Management';
  const phone = userStoreProfile.contactPhone || '01846793071';

  const defaultMessage = selectedCustomer
    ? `আসসালামু আলাইকুম ${selectedCustomer.name} ভাই,\n${storeName} থেকে বিনীত অনুরোধ—আপনার ফার্মেসির বর্তমান মোট বাকি ৳${selectedCustomer.totalDue.toLocaleString()}। অনুগ্রহ করে সুবিধাজনক সময়ে পরিশোধ করবেন।\n\nযোগাযোগ / বিকাশ / নগদ: ${phone}\nধন্যবাদ, সিয়াম ফার্মা।`
    : `আসসালামু আলাইকুম,\n${storeName} এর পক্ষ থেকে শুভেচ্ছা।\nযোগাযোগ: ${phone}`;

  const messageToSend = customNote ? `${defaultMessage}\n\nবিশেষ নোট: ${customNote}` : defaultMessage;

  const handleSendWhatsApp = () => {
    if (!selectedCustomer) return;
    let cleanPhone = selectedCustomer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '88' + cleanPhone;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageToSend)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageToSend);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-3xl bg-[#051c14] border border-emerald-500/40 shadow-2xl p-4 sm:p-5 text-left max-h-[90vh] overflow-y-auto backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-900/60">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-[#25d366]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">WhatsApp Reminder Hub</h3>
              <p className="text-xs text-emerald-400/80">Send automated due alerts to customers</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3.5 mt-3.5">
          {/* Target Customer Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Select Customer With Due ({customersWithDue.length} available)
            </label>
            {customersWithDue.length > 0 ? (
              <select
                value={selectedCustomerId || (selectedCustomer ? selectedCustomer.id : '')}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#04150f] border border-emerald-600/40 text-white text-sm focus:outline-none focus:border-[#00e676]"
              >
                {customersWithDue.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.serialNumber || '0'} {c.name} — ৳{c.totalDue.toLocaleString()} Due ({c.phone})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
                All customers currently have ৳0 due! You can still message any customer or support.
              </div>
            )}
          </div>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Message Preview (Bangla / English)
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                {copied ? <Check className="w-3 h-3 text-[#00e676]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-[#03120d] border border-emerald-800/50 text-slate-200 text-xs whitespace-pre-wrap font-sans leading-relaxed">
              {messageToSend}
            </div>
          </div>

          {/* Add custom note option */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Optional Note (e.g. invoice no, discount):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g., ইনভয়েস #1042 এর বাকি"
              className="w-full px-3 py-2 rounded-xl bg-[#04150f] border border-emerald-800/50 text-white text-xs focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleSendWhatsApp}
              disabled={!selectedCustomer}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] hover:from-[#2bf075] hover:to-[#17a594] text-black font-extrabold text-sm shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all active:scale-98 disabled:opacity-50"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Send WhatsApp Reminder ({selectedCustomer?.name || 'Customer'})</span>
            </button>

            {/* Direct WhatsApp to Developer / Pharmacy Support */}
            <a
              href="https://wa.me/8801846793071?text=Hello%20Md%20Siam%20Hasan%20Santo%2C%20regarding%20Siam%20Pharma%20Due%20Management"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 font-bold text-xs transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#00e676]" />
              <span>Direct Support / Developer WhatsApp: 01846793071</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
