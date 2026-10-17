import React, { useState } from 'react';
import { Download, Share2, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If app is already installed or user dismissed it in this session, do not render
  if (isInstalled || dismissed) {
    return null;
  }

  // If neither Chromium prompt nor iOS is available, return null
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 border border-emerald-500/30 p-3 sm:p-3.5 shadow-lg backdrop-blur-md transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-emerald-950 border border-emerald-500/40 shadow-md shadow-emerald-950/50">
              <img
                src="/icons/icon-192x192.png?v=2"
                alt="Siam Pharma Due Management Logo"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                Install Siam Pharma Due Management
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                  PWA
                </span>
              </h4>
              <p className="text-[11px] text-emerald-200/70 truncate">
                হোমস্ক্রিন ইনস্টল ও অফলাইন সুবিধা
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 active:scale-95 transition"
              >
                <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Install</span>
              </button>
            )}

            {isIOS && !isInstallable && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Install iOS</span>
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
              className="p-1 text-emerald-400/50 hover:text-emerald-300 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#092219] border border-emerald-500/30 p-5 sm:p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Download className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-emerald-100/90 leading-relaxed">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-950/60 p-3 border border-emerald-800/30">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px]">
                  1
                </span>
                <p>
                  In Safari, tap the <strong>Share</strong> button (
                  <Share2 className="inline h-3.5 w-3.5 mx-0.5 text-emerald-400" />
                  ) at the bottom toolbar.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-emerald-950/60 p-3 border border-emerald-800/30">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px]">
                  2
                </span>
                <p>
                  Scroll down the menu and select <strong>Add to Home Screen</strong> (
                  <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-emerald-400" />
                  ).
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-emerald-950/60 p-3 border border-emerald-800/30">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px]">
                  3
                </span>
                <p>
                  Tap <strong>Add</strong> in the top-right corner to launch Siam Pharma like a native app.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
