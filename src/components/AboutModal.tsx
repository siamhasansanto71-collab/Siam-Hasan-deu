import React from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  ShieldCheck, 
  ExternalLink,
  Award,
  FileText,
  User,
  Settings,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { GlossySLogo } from './GlossySLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

/**
 * STATIC Developer & Official App Information Modal
 * Strictly locked: does NOT read or write to user profile state or localStorage.
 */
export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onOpenProfile }) => {
  if (!isOpen) return null;

  // STRICT STATIC CONSTANTS - Permanent Developer & App Registry
  const APP_NAME = 'Siam Pharma Due';
  const APP_VERSION = 'v2.4 Pro';
  const TAGLINE = 'Intelligent Pharmacy Management & Customer Due Ledger System';
  const PROPRIETOR = 'Md Siam Hasan Santo';
  const DRUG_LICENSE_NO = 'DL-BGR-2024-88291';
  const DGDA_REG_NO = 'REG-PH-0924';
  const PHONE_NUMBER = '01846793071';
  const EMAIL_ADDRESS = 'siamhasansanto999@gmail.com';
  const LOCATION_ADDRESS = 'Bogura, Bangladesh';

  const waUrl = `https://wa.me/8801846793071?text=${encodeURIComponent(
    `Hello ${PROPRIETOR}, I am reaching out regarding ${APP_NAME}.`
  )}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-[#04140d]/95 border border-emerald-500/40 shadow-2xl shadow-black p-5 sm:p-6 overflow-hidden text-center max-h-[92vh] flex flex-col backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Row with Verified Badge & Close Button */}
        <div className="flex items-center justify-between pb-2 border-b border-emerald-900/50 z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-[11px] font-bold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Developer & Official Registry</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#0a2016] hover:bg-emerald-900/80 border border-emerald-800/60 text-slate-300 hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto pr-0.5 space-y-4 my-3 flex-1 scrollbar-thin text-left">
          
          {/* 1. App Emblem & Title */}
          <div className="text-center pt-1">
            <div className="flex justify-center mb-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-3xl blur-xl transition-all group-hover:blur-2xl"></div>
                <img
                  src="/icons/icon-192x192.png"
                  alt="Siam Pharma Logo"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] relative z-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {APP_NAME}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/70 text-emerald-300 border border-emerald-500/50">
                {APP_VERSION}
              </span>
            </div>

            <p className="text-xs text-slate-300/90 font-medium px-2 leading-relaxed mt-1 text-center">
              {TAGLINE}
            </p>
          </div>

          {/* 2. Permanent Proprietor & Developer Card */}
          <div className="p-3.5 rounded-2xl bg-[#061e14] border border-emerald-700/40 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-600/50 flex items-center justify-center text-emerald-300 font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400/90 tracking-wider block">
                    Proprietor & Developer
                  </span>
                  <span className="text-sm font-bold text-white block">
                    {PROPRIETOR}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Verified</span>
              </span>
            </div>
          </div>

          {/* 3. Government Pharmacy Registration Card */}
          <div className="p-3.5 rounded-2xl bg-[#061e14] border border-emerald-700/40 space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Government Pharmacy Registration</span>
              </div>
              <span className="text-[9px] uppercase font-mono font-bold text-emerald-400/80 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                DGDA Reg.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-emerald-900/60">
              <div className="bg-[#03130d] p-2.5 rounded-xl border border-emerald-900/50">
                <span className="text-[9px] uppercase font-bold text-emerald-400/80 tracking-wider block">
                  DRUG LICENSE NO.
                </span>
                <span className="font-mono font-bold text-slate-100 text-xs mt-0.5 block truncate">
                  {DRUG_LICENSE_NO}
                </span>
              </div>

              <div className="bg-[#03130d] p-2.5 rounded-xl border border-emerald-900/50">
                <span className="text-[9px] uppercase font-bold text-emerald-400/80 tracking-wider block">
                  DGDA REGISTRATION
                </span>
                <span className="font-mono font-bold text-slate-100 text-xs mt-0.5 block truncate">
                  {DGDA_REG_NO}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Interactive Contact Details */}
          <div className="space-y-2">
            {/* Phone & WhatsApp Contact */}
            <a
              href={`tel:${PHONE_NUMBER}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#061e14] hover:bg-[#082a1c] border border-emerald-800/50 text-xs transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/40 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:text-white">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-400/90 tracking-wider block">
                    CONTACT / WHATSAPP
                  </span>
                  <span className="font-mono font-bold text-slate-100 group-hover:text-emerald-300 text-xs sm:text-sm">
                    {PHONE_NUMBER}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold group-hover:underline">
                Call Now
              </span>
            </a>

            {/* Direct Email */}
            <a
              href={`mailto:${EMAIL_ADDRESS}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#061e14] hover:bg-[#082a1c] border border-emerald-800/50 text-xs transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/40 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:text-white">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-emerald-400/90 tracking-wider block">
                    DIRECT EMAIL
                  </span>
                  <span className="font-mono font-medium text-slate-100 group-hover:text-emerald-300 text-xs truncate block">
                    {EMAIL_ADDRESS}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold group-hover:underline flex-shrink-0 ml-1">
                Email
              </span>
            </a>

            {/* Location */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#061e14] border border-emerald-800/50 text-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-400/90 tracking-wider block">
                  LOCATION
                </span>
                <span className="font-semibold text-slate-100 text-xs sm:text-sm">
                  {LOCATION_ADDRESS}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Primary WhatsApp Action Button */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#10b981] hover:bg-[#059669] text-black font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-950/80 transition-all active:scale-98"
          >
            <MessageCircle className="w-4 h-4 fill-black" />
            <span>Chat on WhatsApp ({PHONE_NUMBER})</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>

          {/* 6. Quick Link to Custom Pharmacy Settings */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-semibold"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Looking to edit your pharmacy store? Open Shop Profile Settings</span>
            </button>
          </div>

        </div>

        {/* 7. Static Footer */}
        <div className="pt-2.5 border-t border-emerald-950 text-[10px] text-slate-400 font-medium">
          © 2026 {APP_NAME} • Permanent Developer Registry • All Rights Reserved
        </div>

      </div>
    </div>
  );
};
