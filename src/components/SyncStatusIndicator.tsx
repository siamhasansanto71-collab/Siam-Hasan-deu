import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  ArrowUpCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';

export const SyncStatusIndicator: React.FC = () => {
  const { syncStats, triggerManualSync, pullLatestFromCloud, dexieStorageStats } = useLedger();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const prevPendingRef = useRef(syncStats.pendingCount);
  const prevSyncingRef = useRef(syncStats.state === 'syncing');

  // Listen for Service Worker background sync & cloud push events
  useEffect(() => {
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && (event.data.type === 'SW_SYNC_SUCCESS' || event.data.type === 'DATA_PUSHED')) {
        setJustSynced(true);
        const count = event.data.count || 1;
        setSyncSuccessToast(
          language === 'bn' 
            ? `ক্লাউডে ${count}টি ডাটা সফলভাবে সিঙ্ক হয়েছে!` 
            : `Data successfully pushed to cloud (${count} item${count > 1 ? 's' : ''})`
        );
        setTimeout(() => setJustSynced(false), 8000);
        setTimeout(() => setSyncSuccessToast(null), 5000);
      }
    };

    const handleCustomSyncEvent = (event: Event) => {
      const customEvt = event as CustomEvent;
      const count = customEvt.detail?.count || 1;
      setJustSynced(true);
      setSyncSuccessToast(
        language === 'bn' 
          ? `ক্লাউডে সফলভাবে সেভ হয়েছে!` 
          : `Successfully pushed to cloud!`
      );
      setTimeout(() => setJustSynced(false), 8000);
      setTimeout(() => setSyncSuccessToast(null), 5000);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sw-sync-success', handleCustomSyncEvent);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleSwMessage);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('sw-sync-success', handleCustomSyncEvent);
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        }
      }
    };
  }, [language]);

  // Detect when syncing completes and pending queue reaches 0
  useEffect(() => {
    if (prevSyncingRef.current && syncStats.state === 'synced' && syncStats.pendingCount === 0) {
      setJustSynced(true);
      setSyncSuccessToast(
        language === 'bn' 
          ? 'ক্লাউডে সফলভাবে ডাটা সিঙ্ক সম্পন্ন হয়েছে!' 
          : 'All pending data pushed to cloud!'
      );
      const timer = setTimeout(() => {
        setJustSynced(false);
        setSyncSuccessToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = syncStats.state === 'syncing';
    prevPendingRef.current = syncStats.pendingCount;
  }, [syncStats.state, syncStats.pendingCount, language]);

  // Click outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isSyncing = syncStats.state === 'syncing';
  const isOffline = !syncStats.isOnline || syncStats.state === 'offline';
  const hasPending = syncStats.pendingCount > 0;

  // Format last synced time
  const formatSyncTime = (date: Date | null) => {
    if (!date) return language === 'bn' ? 'সম্প্রতি সিঙ্ক করা হয়েছে' : 'Synced recently';
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return language === 'bn' ? 'এইমাত্র সিঙ্ক হয়েছে' : 'Just now';
      if (diffMins < 60) return language === 'bn' ? `${diffMins} মিনিট আগে` : `${diffMins}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return language === 'bn' ? 'সিঙ্কড' : 'Synced';
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* Top Header Interactive Indicator Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 shadow-sm text-xs select-none ${
          isSyncing
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
            : isOffline
            ? 'bg-rose-950/40 border-rose-600/50 text-rose-300 ring-1 ring-rose-500/30'
            : hasPending
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            : justSynced
            ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/60 shadow-[0_0_15px_rgba(0,230,118,0.3)] animate-pulse'
            : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-300 hover:text-white'
        }`}
        title={
          isSyncing
            ? 'Pushing data to cloud...'
            : isOffline
            ? 'Offline Mode — Changes saved locally in Service Worker & IndexedDB'
            : hasPending
            ? `${syncStats.pendingCount} records pending cloud push`
            : 'All data successfully pushed to cloud (Service Worker & Firestore synced)'
        }
      >
        {/* Dynamic Icon */}
        {isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        ) : isOffline ? (
          <CloudOff className="w-3.5 h-3.5 text-rose-400" />
        ) : justSynced ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00e676]" />
        ) : (
          <Cloud className="w-3.5 h-3.5 text-[#00e676]" />
        )}

        {/* Status text badge (Responsive: hidden on narrow screens, visible on tablet/desktop) */}
        <span className="hidden sm:inline font-bold tracking-tight text-[11px]">
          {isSyncing
            ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Pushing...')
            : isOffline
            ? (language === 'bn' ? 'অফলাইন' : 'Offline')
            : hasPending
            ? `${syncStats.pendingCount} ${language === 'bn' ? 'পেন্ডিং' : 'Pending'}`
            : justSynced
            ? (language === 'bn' ? 'ক্লাউড সিঙ্কড' : 'Cloud Synced')
            : (language === 'bn' ? 'সিঙ্কড' : 'Synced')}
        </span>

        {/* Glowing Status Dot */}
        <span className="relative flex h-2 w-2">
          {isSyncing ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </>
          ) : isOffline ? (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e676] shadow-[0_0_6px_#00e676]"></span>
            </>
          )}
        </span>

        {/* Pending Badge Count */}
        {hasPending && !isSyncing && (
          <span className="absolute -top-1.5 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-black text-black bg-amber-400 rounded-full border border-[#061712]">
            {syncStats.pendingCount}
          </span>
        )}
      </button>

      {/* Floating Success Toast when data is successfully pushed */}
      {syncSuccessToast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-xs font-bold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#00e676] flex-shrink-0" />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* Dropdown Popover for Detailed Service Worker & Cloud Sync Information */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#04150f]/95 border border-emerald-500/40 shadow-2xl p-3.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-900/60">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#00e676]" />
              <span className="text-xs font-extrabold text-white">
                {language === 'bn' ? 'সার্ভিস ওয়ার্কার ও ক্লাউড সিঙ্ক' : 'Service Worker & Cloud Sync'}
              </span>
            </div>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          {/* Cloud Push Status Card */}
          <div className={`p-2.5 rounded-xl border mb-3 text-xs ${
            isOffline
              ? 'bg-rose-950/40 border-rose-800/50 text-rose-200'
              : isSyncing
              ? 'bg-amber-950/40 border-amber-800/50 text-amber-200'
              : 'bg-emerald-950/50 border-emerald-800/50 text-emerald-200'
          }`}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span className="flex items-center gap-1.5">
                {isOffline ? (
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-[#00e676]" />
                )}
                {isOffline 
                  ? (language === 'bn' ? 'ইন্টারনেট বিচ্ছিন্ন (Offline)' : 'Intermittent / Offline')
                  : (language === 'bn' ? 'ক্লাউড কানেক্টেড' : 'Cloud Connected')}
              </span>
              <span className="text-[10px] opacity-80">
                {formatSyncTime(syncStats.lastSyncedAt)}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isOffline
                ? (language === 'bn' 
                    ? 'ইন্টারনেট সমস্যা থাকলেও কোনো তথ্য হারাবে না। সব এন্ট্রি লোকাল IndexedDB ও সার্ভিস ওয়ার্কারে সংরক্ষিত আছে। নেট পেলেই ক্লাউডে পুশ হবে।'
                    : 'Changes are safely cached locally in Service Worker & IndexedDB. They will automatically push to Firestore as soon as internet is restored.')
                : hasPending
                ? (language === 'bn'
                    ? `${syncStats.pendingCount}টি এন্ট্রি ক্লাউডে পুশ করার অপেক্ষায় আছে...`
                    : `${syncStats.pendingCount} record(s) queued to be pushed to cloud...`)
                : (language === 'bn'
                    ? 'আপনার সমস্ত হিসাব ও বিক্রি সফলভাবে ক্লাউড ডাটাবেজে সংরক্ষিত ও সিঙ্ক করা হয়েছে।'
                    : 'All sales and due transactions have been successfully pushed to the cloud.')}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-900/40">
              <span className="text-slate-400 block text-[10px]">
                {language === 'bn' ? 'পেন্ডিং পুশ' : 'Pending Pushes'}
              </span>
              <span className={`font-mono font-bold text-sm ${hasPending ? 'text-amber-300' : 'text-emerald-400'}`}>
                {syncStats.pendingCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-900/40">
              <span className="text-slate-400 block text-[10px]">
                {language === 'bn' ? 'সার্ভিস ওয়ার্কার ক্যাশ' : 'Service Worker Cache'}
              </span>
              <span className="font-mono font-bold text-sm text-emerald-400">
                {dexieStorageStats.customerCount + dexieStorageStats.transactionCount} {language === 'bn' ? 'রেকর্ড' : 'Records'}
              </span>
            </div>
          </div>

          {/* Manual Trigger Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await triggerManualSync();
              }}
              disabled={isSyncing || isOffline}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{language === 'bn' ? 'এখনই সিঙ্ক করুন' : 'Push to Cloud'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await pullLatestFromCloud();
              }}
              disabled={isSyncing || isOffline}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-emerald-500/30 font-semibold text-xs transition active:scale-95 cursor-pointer"
              title="Pull latest cloud updates"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
