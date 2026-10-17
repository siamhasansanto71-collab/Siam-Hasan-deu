import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  PhoneCall, 
  User, 
  FileText, 
  Award, 
  Edit3, 
  MessageCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { GlossySLogo } from './GlossySLogo';

interface PharmacyInfoCardProps {
  onOpenProfileModal: () => void;
  onOpenAboutModal?: () => void;
}

export const PharmacyInfoCard: React.FC<PharmacyInfoCardProps> = ({ 
  onOpenProfileModal,
  onOpenAboutModal 
}) => {
  const { userStoreProfile } = useLedger();

  // Real-time digital clock and live date state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    // Tick every 1000ms for continuous live clock updates
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const storeName = userStoreProfile.storeName || 'Siam Pharma Due Management';
  const storeNameBn = userStoreProfile.storeNameBn || 'সিয়াম ফার্মা';
  const address = userStoreProfile.address || 'Bogura, Bangladesh';
  const phone = userStoreProfile.contactPhone || '01846793071';
  const proprietor = userStoreProfile.proprietorName || 'Md Siam Hasan Santo';
  const license = userStoreProfile.licenseNumber || 'DL-BGR-2024-88291';
  const dgda = userStoreProfile.dgdaRegNumber || 'REG-PH-0924';

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  // Format digital clock string (e.g. "03:47:25 PM")
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Format date string (e.g. "Friday, 09 Oct 2026")
  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#072419]/95 via-[#051c14]/95 to-[#02130d]/95 border border-[rgba(255,255,255,0.15)] p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-emerald-500/50 box-border w-full max-w-full">
      
      {/* Glossy inner glow & ambient gradient */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Profile Header: Layout with Left Brand Info & Right Real-Time Digital Clock */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3 w-full box-border min-w-0">
        
        {/* Left Section: Pharmacy Logo & Brand Info */}
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          
          {/* 1. Profile Picture: Enlarged (60px x 60px / w-16 h-16) with subtle glowing green border & drop shadow */}
          <div 
            onClick={onOpenAboutModal || onOpenProfileModal}
            className="relative flex-shrink-0 w-[60px] h-[60px] sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#0c402b] via-[#06291b] to-[#041a11] border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)] ring-2 ring-emerald-500/25 flex items-center justify-center overflow-hidden cursor-pointer group transition-all duration-200 hover:scale-105 hover:shadow-[0_0_25px_rgba(52,211,153,0.5)]"
            title="Pharmacy Profile / Logo (Click to View / Edit)"
          >
            {userStoreProfile.logoUrl ? (
              <img
                src={userStoreProfile.logoUrl}
                alt={storeName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <img
                src="/icons/icon-192x192.png"
                alt={storeName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            )}
          </div>

          {/* 2. User Name, 3. Verified Badge, & 4. Location & Proprietor Details */}
          <div className="min-w-0 flex-1">
            {/* Name & Verified Badge Header Row */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight break-words drop-shadow-sm">
                {storeName}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00e676]" />
                <span>Verified</span>
              </span>
            </div>

            {/* Bengali Sub-name */}
            {storeNameBn && (
              <p className="text-xs sm:text-sm font-bold text-emerald-400/95 tracking-wide mt-0.5">
                {storeNameBn}
              </p>
            )}

            {/* Location & Proprietor Details with increased font size & spacing */}
            <div className="mt-2 space-y-1">
              {address && (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium text-slate-200 break-words">{address}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 flex-wrap">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Proprietor: <strong className="text-white font-bold">{proprietor}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Real-time Digital Clock & Date Display (Shifted inward with right margin & compact padding) */}
        <div 
          className="flex-shrink-0 text-right flex flex-col items-end justify-start box-border self-end sm:self-start"
          title="Current Device Time & Date"
        >
          {/* Compact Glassmorphic Time Badge with Subtle Border & Neon Glow */}
          <div className="relative group/clock flex flex-col items-end px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-[#031d14]/90 hover:bg-[#042419]/95 border border-[#00ff88]/40 shadow-[0_0_18px_rgba(0,255,136,0.18)] hover:shadow-[0_0_24px_rgba(0,255,136,0.28)] hover:border-[#00ffaa]/60 transition-all backdrop-blur-md box-border">
            
            {/* Top row: Pulsing green live indicator + Time Display */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffaa] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]"></span>
              </span>
              <span className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-[#00ffaa] tracking-tight tabular-nums select-none drop-shadow-[0_0_10px_rgba(0,255,170,0.5)] whitespace-nowrap">
                {formattedTime}
              </span>
            </div>

            {/* Bottom row: Clean Muted Subtitle Date */}
            <div className="mt-0.5 text-right w-full">
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-300/85 select-none tracking-wide whitespace-nowrap block">
                {formattedDate}
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Badges & Contact Row */}
      <div className="mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.15)] flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* Licenses */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-300">
            <Award className="w-3 h-3 text-[#00e676]" />
            <span>DGDA: {dgda}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-teal-300">
            <FileText className="w-3 h-3 text-teal-400" />
            <span>Lic: {license}</span>
          </span>
        </div>

        {/* Action Buttons: Phone, WhatsApp, Edit Profile */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCall}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/40 text-emerald-200 font-bold transition-all active:scale-95 text-[11px]"
            title={`Call ${phone}`}
          >
            <PhoneCall className="w-3 h-3 text-[#00e676]" />
            <span>{phone}</span>
          </button>

          <a
            href={`https://wa.me/88${phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(storeName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-[#00e676] transition-all"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onOpenProfileModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] shadow-sm shadow-emerald-950 transition-all active:scale-95"
            title="Edit Pharmacy Profile"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit Profile</span>
          </button>
        </div>

      </div>

    </div>
  );
};
