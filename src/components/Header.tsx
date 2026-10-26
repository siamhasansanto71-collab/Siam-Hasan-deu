import React, { useState } from 'react';
import { 
  Bell, 
  Globe, 
  Store, 
  Info,
  Home,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Phone,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLedger } from '../context/LedgerContext';
import { GlossySLogo } from './GlossySLogo';
import { SyncStatusIndicator } from './SyncStatusIndicator';

interface HeaderProps {
  onOpenAuthModal: () => void;
  onOpenAboutModal: () => void;
  onOpenProfileModal: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenAuthModal, 
  onOpenAboutModal, 
  onOpenProfileModal,
  onOpenSettings,
  onGoHome
}) => {
  const { user } = useAuth();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { userStoreProfile, setSelectedCustomer, stats, syncStats } = useLedger();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleHomeClick = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      setSelectedCustomer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const unreadCount = stats.customersWithDue > 0 ? Math.min(stats.customersWithDue, 9) : 3;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#061712]/95 border-b border-[rgba(255,255,255,0.15)] px-4 sm:px-6 py-2.5 sm:py-3 transition-all shadow-lg shadow-black/40 box-border">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3 w-full">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={handleHomeClick}
          className="flex items-center gap-2.5 cursor-pointer select-none group min-w-0 flex-1 active:scale-98 transition-transform"
          title="Siam Pharma Due Management - Home"
        >
          {/* Glowing Neon Emblem */}
          <div className="relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a3d28] via-[#062417] to-[#02140d] border border-emerald-400/60 shadow-[0_0_15px_rgba(0,230,118,0.25)] ring-2 ring-emerald-500/20 group-hover:border-emerald-300 transition-all overflow-hidden p-0.5">
            <GlossySLogo size={36} className="w-full h-full object-cover" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e676] border border-[#061712]"></span>
            </span>
          </div>

          {/* App Title */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white group-hover:text-emerald-300 transition-colors truncate">
                Siam Pharma Due Management
              </h1>
            </div>
            <p className="text-[11px] text-emerald-400/90 font-medium truncate flex items-center gap-1">
              <span>সিয়াম ফার্মা</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Bogura, BD</span>
            </p>
          </div>
        </div>

        {/* Action Controls: Dexie Sync, Notification Bell, Language Toggle, Store/About Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          
          {/* Service Worker & Cloud Synchronization Status Indicator */}
          <SyncStatusIndicator />

          {/* Notification Bell with Badge */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all active:scale-95 shadow-sm"
              title="Notifications & Alerts"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-black bg-[#00e676] rounded-full shadow-[0_0_8px_rgba(0,230,118,0.8)] border-2 border-[#061712]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {showNotifications && (
              <div 
                className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#04150f]/95 border border-emerald-500/40 shadow-2xl p-3 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-900/50">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00e676]"></span>
                    Due Alerts & Updates
                  </span>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-[10px] text-emerald-400 hover:underline font-semibold"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00e676] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-200">System Ready & Cloud Synced</p>
                      <p className="text-[11px] text-slate-400">DGDA REG-PH-0924 ledger active.</p>
                    </div>
                  </div>

                  {stats.customersWithDue > 0 ? (
                    <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1.5"></span>
                      <div>
                        <p className="font-semibold text-rose-200">{stats.customersWithDue} Customers with Due</p>
                        <p className="text-[11px] text-rose-300/80">Total Outstanding: ৳{stats.totalDues.toLocaleString()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-slate-300">
                      All customer dues are cleared!
                    </div>
                  )}

                  <a
                    href="https://wa.me/8801846793071?text=Hello%20Siam%20Pharma%20Support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-[#062418] hover:bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 font-semibold transition-colors mt-1"
                  >
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <MessageCircle className="w-3.5 h-3.5 text-[#00e676]" />
                      Direct WhatsApp: 01846793071
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher Dropdown */}
          <div className="flex items-center">
            <select
              id="languageSelect"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'bn')}
              className="lang-select bg-[#0b141a] hover:bg-[#121e28] text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
              title="Change Language / ভাষা পরিবর্তন"
            >
              <option value="en" className="bg-[#0b141a] text-white">English</option>
              <option value="bn" className="bg-[#0b141a] text-white">বাংলা</option>
            </select>
          </div>

          {/* About Modal Quick Action */}
          <button
            onClick={onOpenAboutModal}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all active:scale-95 shadow-sm"
            title="About Developer & App Info"
          >
            <Info className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Settings & Account Menu Quick Action */}
          <button
            onClick={onOpenSettings || onOpenProfileModal}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all active:scale-95 shadow-sm"
            title="Settings, Account & Log Out"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

      </div>
    </header>
  );
};
