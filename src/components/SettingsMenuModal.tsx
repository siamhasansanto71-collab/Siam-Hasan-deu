import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Store, 
  Globe, 
  FileSpreadsheet, 
  MessageCircle, 
  Info, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  User, 
  Phone, 
  Mail,
  AlertCircle,
  Database,
  RefreshCw,
  Cloud,
  CheckCircle2,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLedger } from '../context/LedgerContext';
import { GlossySLogo } from './GlossySLogo';
import { ChangePasswordSection } from './ChangePasswordSection';

interface SettingsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditProfile: () => void;
  onOpenExportModal: () => void;
  onOpenAboutModal: () => void;
  onOpenWhatsAppModal: () => void;
}

export const SettingsMenuModal: React.FC<SettingsMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenEditProfile,
  onOpenExportModal,
  onOpenAboutModal,
  onOpenWhatsAppModal,
}) => {
  const { user, isDemoMode, signOut } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { 
    userStoreProfile, 
    syncStats, 
    triggerManualSync, 
    pullLatestFromCloud, 
    dexieStorageStats 
  } = useLedger();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    setSyncFeedback(null);
    try {
      await triggerManualSync();
      setSyncFeedback(language === 'bn' ? 'Dexie ডাটা সফলভাবে ক্লাউডে সিঙ্ক হয়েছে!' : 'Dexie cache synced with Firestore!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync error';
      setSyncFeedback(msg);
    } finally {
      setIsSyncingNow(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handlePullCloud = async () => {
    setIsSyncingNow(true);
    setSyncFeedback(null);
    try {
      await pullLatestFromCloud();
      setSyncFeedback(language === 'bn' ? 'ক্লাউড থেকে নতুন ডাটা রিলোড হয়েছে!' : 'Pulled latest data from Firestore!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pull error';
      setSyncFeedback(msg);
    } finally {
      setIsSyncingNow(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg sm:max-w-xl rounded-3xl bg-[#03150e]/95 border border-emerald-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Glow ambient background effects */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header (Fixed) */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-emerald-900/50 flex-shrink-0 relative z-10 bg-[#03150e]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600/30 via-teal-900/40 to-emerald-950 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>{language === 'bn' ? 'সেটিংস ও অ্যাকাউন্ট' : 'Settings & Account'}</span>
              </h3>
              <p className="text-[11px] text-emerald-400/80 font-medium">
                Siam Pharma Due Management System
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-slate-300 hover:text-white border border-emerald-800/50 transition-colors shadow-sm"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Settings Cards Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 relative z-10">
          
          {/* ========================================================
              CARD 1: User Profile
              Avatar, Name, Email, Mobile, and Verification status
             ======================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#06291d] via-[#041d14] to-[#02130c] border border-emerald-500/35 shadow-lg shadow-black/40">
            <div className="flex items-center gap-4">
              
              {/* Profile Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0a3d28] to-[#03180f] border-2 border-emerald-400/60 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md ring-2 ring-emerald-500/20">
                {userStoreProfile.logoUrl ? (
                  <img 
                    src={userStoreProfile.logoUrl} 
                    alt={userStoreProfile.storeName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <GlossySLogo size={38} />
                )}
              </div>

              {/* Profile Details */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-white truncate tracking-wide">
                    {userStoreProfile.storeName || 'Siam Pharma Due Management'}
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-bold text-emerald-300 shadow-sm">
                    <ShieldCheck className="w-3 h-3 text-[#00e676]" />
                    <span>Verified Pharmacy</span>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-300 pt-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{user?.email || (isDemoMode ? 'Demo Mode (Offline Preview)' : 'siamhasansanto71@gmail.com')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-emerald-300">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{userStoreProfile.contactPhone || '01846793071'}</span>
                  </div>
                </div>

                {userStoreProfile.address && (
                  <p className="text-[11px] text-slate-400 truncate">
                    {userStoreProfile.address}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* ========================================================
              CARD 2: Database & Sync
              Dexie.js cache stats and sync actions
             ======================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#052217] via-[#031a11] to-[#02110a] border border-emerald-700/40 shadow-lg shadow-black/30">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
                  <Database className="w-4 h-4 text-[#00e676]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Dexie.js IndexedDB Cache</span>
                  </h4>
                  <p className="text-[10px] text-emerald-400/80">
                    Zero-latency local database + real-time Firestore sync
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 shadow-sm flex-shrink-0">
                <span className={`w-2 h-2 rounded-full ${
                  syncStats.state === 'syncing' 
                    ? 'bg-amber-400 animate-ping' 
                    : (!syncStats.isOnline ? 'bg-amber-500' : 'bg-[#00e676]')
                }`} />
                <span>
                  {syncStats.state === 'syncing' 
                    ? 'Syncing...' 
                    : (!syncStats.isOnline ? 'Offline DB' : 'Synced')}
                </span>
              </div>
            </div>

            {/* Storage Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 py-3.5">
              <div className="p-2.5 sm:p-3 rounded-xl bg-[#02120b] border border-emerald-900/50 text-center shadow-inner">
                <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  {language === 'bn' ? 'কাস্টমার' : 'Customers'}
                </p>
                <p className="text-base sm:text-lg font-black text-white mt-0.5">
                  {dexieStorageStats.customerCount}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-[#02120b] border border-emerald-900/50 text-center shadow-inner">
                <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  {language === 'bn' ? 'লেনদেন' : 'Ledger Txs'}
                </p>
                <p className="text-base sm:text-lg font-black text-white mt-0.5">
                  {dexieStorageStats.transactionCount}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-[#02120b] border border-emerald-900/50 text-center shadow-inner">
                <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  {language === 'bn' ? 'পেন্ডিং কিউ' : 'Pending'}
                </p>
                <p className={`text-base sm:text-lg font-black mt-0.5 ${syncStats.pendingCount > 0 ? 'text-amber-400' : 'text-[#00e676]'}`}>
                  {syncStats.pendingCount}
                </p>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncingNow}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/70 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (language === 'bn' ? 'এখনই সিঙ্ক করুন' : 'Sync Queue')}</span>
              </button>

              <button
                type="button"
                onClick={handlePullCloud}
                disabled={isSyncingNow}
                className="py-2 px-3.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Fetch latest from Firestore"
              >
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'bn' ? 'ক্লাউড ফেচ' : 'Pull Cloud'}</span>
              </button>
            </div>

            {/* Sync Feedback Alert */}
            {syncFeedback && (
              <div className="mt-3 p-2 rounded-xl bg-emerald-950/80 border border-emerald-400/50 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-medium text-[11px]">{syncFeedback}</span>
              </div>
            )}
          </div>

          {/* ========================================================
              CARD 3: General Settings
              Edit Profile, App Language, Backup & Export, WhatsApp Support, About App
             ======================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#052217] via-[#031a11] to-[#02110a] border border-emerald-700/40 shadow-lg shadow-black/30">
            
            {/* Card Section Header */}
            <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-emerald-900/60">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Sliders className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  {language === 'bn' ? 'সাধারণ সেটিংস' : 'General Settings'}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {language === 'bn' ? 'প্রোফাইল, ভাষা, ব্যাকআপ ও সাপোর্ট ব্যবস্থাপনা' : 'Pharmacy profile, language, backup & support options'}
                </p>
              </div>
            </div>

            {/* Menu Rows with Increased Vertical Spacing & Inner Padding */}
            <div className="space-y-3">
              
              {/* 1. Edit Pharmacy Profile */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditProfile();
                }}
                className="w-full flex items-center justify-between py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl bg-[#02120b] hover:bg-[#062419] border border-emerald-900/50 hover:border-emerald-500/50 transition-all text-left group active:scale-[0.99] shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Store className="w-4 h-4 text-[#00e676]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {language === 'bn' ? 'ফার্মেসি প্রোফাইল এডিট' : 'Edit Pharmacy Profile'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {language === 'bn' ? 'দোকানের নাম, ঠিকানা, DGDA লাইসেন্স ও লোগো পরিবর্তন' : 'Store name, DGDA license, address, contact & logo'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
              </button>

              {/* 2. App Language */}
              <div className="w-full flex items-center justify-between py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl bg-[#02120b] border border-emerald-900/50 text-left shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-300 flex-shrink-0">
                    <Globe className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white">
                      {language === 'bn' ? 'অ্যাপের ভাষা' : 'App Language'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'bn' ? 'বর্তমান ভাষা: বাংলা (Bengali)' : 'Current Language: English'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-400/50 text-xs font-bold text-emerald-200 shadow-sm transition active:scale-95 flex-shrink-0 cursor-pointer"
                >
                  <span>{language === 'bn' ? 'English এ যান' : 'বাংলায় দেখুন'}</span>
                </button>
              </div>

              {/* 3. Backup & Export Ledger */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExportModal();
                }}
                className="w-full flex items-center justify-between py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl bg-[#02120b] hover:bg-[#062419] border border-emerald-900/50 hover:border-amber-500/50 transition-all text-left group active:scale-[0.99] shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform flex-shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {language === 'bn' ? 'ডাটা ব্যাকআপ ও এক্সপোর্ট' : 'Backup & Export Ledger'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {language === 'bn' ? 'কাস্টমার তালিকা ও বাকি খাতা PDF/CSV ডাউনলোড' : 'Download PDF statements, CSV/Excel reports'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
              </button>

              {/* 4. WhatsApp Support */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWhatsAppModal();
                }}
                className="w-full flex items-center justify-between py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl bg-[#02120b] hover:bg-[#062419] border border-emerald-900/50 hover:border-emerald-500/50 transition-all text-left group active:scale-[0.99] shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-[#25d366]/40 flex items-center justify-center text-[#25d366] group-hover:scale-105 transition-transform flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-[#25d366]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {language === 'bn' ? 'হোয়াটসঅ্যাপ সাপোর্ট ও রিমাইন্ডার' : 'WhatsApp Support & Reminder'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {language === 'bn' ? 'সরাসরি বাকি তাগাদা মেসেজ ও হেল্পলাইন' : 'Send WhatsApp due alerts or message support'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#25d366] group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
              </button>

              {/* 5. About & Developer Info */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAboutModal();
                }}
                className="w-full flex items-center justify-between py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl bg-[#02120b] hover:bg-[#062419] border border-emerald-900/50 hover:border-teal-500/50 transition-all text-left group active:scale-[0.99] shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-teal-500/40 flex items-center justify-center text-teal-300 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Info className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                      {language === 'bn' ? 'অ্যাপ ও ডেভেলপার তথ্য' : 'About App & Developer'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Version 2.5.0 • Md Siam Hasan Santo • Bogura, BD
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
              </button>

              {/* 6. View Startup Splash Screen */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('show-splash'));
                }}
                className="w-full flex items-center justify-between py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl bg-[#02120b] hover:bg-[#062419] border border-emerald-900/50 hover:border-emerald-500/50 transition-all text-left group active:scale-[0.99] shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-emerald-400/40 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#00e676]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {language === 'bn' ? 'স্বাগতম স্প্ল্যাশ স্ক্রিন অ্যানিমেশন' : 'Startup Splash Screen'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {language === 'bn' ? 'লোগো ও ওয়েলকাম অ্যানিমেশন পুনরায় দেখুন' : 'Replay startup welcome & logo animation'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
              </button>

            </div>
          </div>

          {/* ========================================================
              CARD 4: Security & Password
              Collapsible Accordion Change Password Section
             ======================================================== */}
          <ChangePasswordSection 
            collapsible={true} 
            defaultExpanded={false}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#052217] via-[#031a11] to-[#02110a] border border-emerald-700/40 shadow-lg shadow-black/30"
          />

        </div>

        {/* ========================================================
            PINNED BOTTOM FOOTER: Clean Log Out Confirmation
            Separate from main scroll view with proper margin
           ======================================================== */}
        <div className="p-4 sm:p-5 border-t border-emerald-900/60 bg-[#02120b] flex-shrink-0 relative z-10">
          {showLogoutConfirm ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2a0b12] via-[#1a060a] to-[#0f0306] border border-rose-500/50 shadow-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-rose-200">
                    {language === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি লগআউট করতে চান?' : 'Are you sure you want to log out?'}
                  </h5>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {language === 'bn'
                      ? 'লগআউট করলে আপনার বর্তমান সেশন বন্ধ হবে এবং লগইন পেজে নিয়ে যাবে।'
                      : 'Logging out will safely end your current session and return you to the login screen.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? 'Logging Out...' : (language === 'bn' ? 'হ্যাঁ, লগআউট' : 'Yes, Log Out')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-rose-200">
                    {language === 'bn' ? 'অ্যাকাউন্ট লগআউট' : 'Log Out Account'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {language === 'bn' ? 'সেশন সমাপ্ত করে লগইন পেজে যান' : 'Safely end session & return to login'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.signOut}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
