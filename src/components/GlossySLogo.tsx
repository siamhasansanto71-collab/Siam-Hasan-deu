import React, { useState } from 'react';
import siamAppIcon from '../assets/images/siam_pharma_icon_1791557206419.jpg';

interface GlossySLogoProps {
  className?: string;
  size?: number;
  inBadge?: boolean;
}

export const GlossySLogo: React.FC<GlossySLogoProps> = ({ 
  className = "w-11 h-11", 
  size = 48,
  inBadge = false 
}) => {
  const [imageError, setImageError] = useState(false);

  // If inBadge is true (used in modal showcase / about dialog)
  if (inBadge) {
    return (
      <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#041a12] shadow-xl shadow-black/60 ring-1 ring-emerald-500/40 w-20 h-20 sm:w-24 sm:h-24 select-none">
        {!imageError ? (
          <img
            src={siamAppIcon}
            alt="Siam Pharma 3D Emblem"
            className="w-12 h-12 object-cover drop-shadow-md rounded-xl ring-1 ring-emerald-400/40"
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-12 h-12 drop-shadow-lg"
          >
            <defs>
              <linearGradient id="badgePillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e676" />
                <stop offset="100%" stopColor="#00b0ff" />
              </linearGradient>
            </defs>
            <rect x="8" y="8" width="84" height="84" rx="22" fill="#062117" stroke="#00e676" strokeWidth="3" />
            <path
              d="M 68 34 C 62 26 44 26 36 34 C 28 42 30 52 46 56 C 62 60 64 68 58 78 C 52 86 36 86 28 78"
              stroke="url(#badgePillGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M 64 42 H 78 M 71 35 V 49" stroke="#00e676" strokeWidth="5" strokeLinecap="round" />
          </svg>
        )}

        <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-300 tracking-wider lowercase mt-1 font-sans">
          siam pharma
        </span>
      </div>
    );
  }

  // Standard standalone 3D emblem icon
  return (
    <div 
      className={`relative flex items-center justify-center select-none overflow-hidden rounded-xl ${className}`}
      style={{ width: size, height: size }}
    >
      {!imageError ? (
        <img
          src={siamAppIcon}
          alt="Siam Pharma 3D Emblem"
          className="w-full h-full object-cover rounded-xl drop-shadow-[0_4px_12px_rgba(0,230,118,0.35)]"
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
        >
          <defs>
            <linearGradient id="emeraldBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="45%" stopColor="#059669" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <radialGradient id="emeraldRadialGlow" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e676" />
              <stop offset="100%" stopColor="#00e5ff" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="url(#emeraldBgGrad)"
            stroke="#34d399"
            strokeWidth="2"
            strokeOpacity="0.8"
          />
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="url(#emeraldRadialGlow)"
          />
          {/* Stylized 3D letter 'S' */}
          <path
            d="M 66 32 C 60 22 42 22 34 32 C 26 40 28 50 46 54 C 64 58 66 68 58 80 C 50 90 32 90 24 80"
            stroke="url(#sNeonGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          {/* Medical cross + */}
          <path d="M 64 38 H 80 M 72 30 V 46" stroke="#00e676" strokeWidth="5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
};
