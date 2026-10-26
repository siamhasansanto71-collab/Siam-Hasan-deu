import React, { useState, useEffect } from 'react';
import { GlossySLogo } from './GlossySLogo';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number; // duration in ms before auto-dismissing
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  minDuration = 2100 
}) => {
  const [stage, setStage] = useState<'entering' | 'active' | 'exiting' | 'done'>('entering');
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // 1. Trigger entrance scale-up and fade-in immediately on mount
    const enterTimer = requestAnimationFrame(() => {
      setStage('active');
    });

    // 2. Animate the progress indicator smoothly
    const pTimer1 = setTimeout(() => setProgress(50), 350);
    const pTimer2 = setTimeout(() => setProgress(82), 900);
    const pTimer3 = setTimeout(() => setProgress(100), 1600);

    // 3. Initiate smooth fade-out exit
    const exitTimer = setTimeout(() => {
      setStage('exiting');
    }, minDuration);

    // 4. Complete unmounting after exit transition completes
    const doneTimer = setTimeout(() => {
      setStage('done');
      if (onFinish) {
        onFinish();
      }
    }, minDuration + 500);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(pTimer1);
      clearTimeout(pTimer2);
      clearTimeout(pTimer3);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [minDuration, onFinish]);

  const handleQuickDismiss = () => {
    if (stage !== 'exiting' && stage !== 'done') {
      setStage('exiting');
      setTimeout(() => {
        setStage('done');
        if (onFinish) onFinish();
      }, 400);
    }
  };

  if (stage === 'done') {
    return null;
  }

  const isExiting = stage === 'exiting';
  const isEntering = stage === 'entering';

  return (
    <div 
      onClick={handleQuickDismiss}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none cursor-pointer transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 38%, #06281b 0%, #03160e 55%, #010a06 100%)'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Siam Pharma"
    >
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full bg-emerald-500/18 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-teal-500/10 blur-[90px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-emerald-400/12 blur-[90px] pointer-events-none" />

      {/* Main Glassmorphic Card Container with Scale-Up Animation */}
      <div 
        className={`relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg rounded-3xl bg-slate-950/85 border border-emerald-500/35 p-7 sm:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(0,230,118,0.2)] backdrop-blur-2xl ring-1 ring-emerald-400/25 flex flex-col items-center text-center transition-all duration-700 ease-out ${
          isEntering ? 'opacity-0 scale-90 translate-y-3' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Subtle top rim light */}
        <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

        {/* Large Styled 'Welcome' Heading with Glowing Dark-Emerald Glassmorphic Typography */}
        <div className="relative mb-5 w-full flex flex-col items-center">
          {/* Neon radiant ambient flare behind the heading */}
          <div className="absolute -top-4 w-52 h-16 bg-emerald-400/25 rounded-full blur-2xl pointer-events-none" />

          {/* Frosted Glassmorphic Kicker Badge */}
          <div className="relative px-5 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/70 via-[#05281c]/80 to-emerald-950/70 border border-emerald-500/40 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-md mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00e676] animate-pulse" />
              <span>স্বাগতম • WELCOME</span>
              <Sparkles className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
            </span>
          </div>

          {/* Large Glowing Welcome Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none drop-shadow-[0_0_35px_rgba(0,230,118,0.55)]">
            <span className="bg-gradient-to-b from-white via-emerald-100 to-[#00e676] bg-clip-text text-transparent">
              Welcome
            </span>
          </h1>

          <p className="text-xs sm:text-sm font-bold text-emerald-300/85 mt-2 tracking-wide">
            to <span className="text-white font-extrabold">Siam Pharma</span> Due Management
          </p>
        </div>

        {/* Hero 3D Logo Emblem with Pulsing Neon Aura */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-emerald-400/25 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-[#0c4a30] via-[#06291a] to-[#02150c] p-1 border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(0,230,118,0.35)] ring-4 ring-emerald-500/20 flex items-center justify-center">
            <GlossySLogo size={72} className="w-full h-full object-cover" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#00e676] border-2 border-[#02150c]"></span>
            </span>
          </div>
        </div>

        {/* Brand Name & Subtitle */}
        <div className="space-y-1 mb-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,230,118,0.25)]">
            <span className="bg-gradient-to-r from-emerald-300 via-teal-100 to-emerald-400 bg-clip-text text-transparent">
              সিয়াম ফার্মা
            </span>
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-emerald-400/90 tracking-wide">
            ফার্মেসি বাকি ও দৈনিক ক্যাশ লেজার
          </p>
        </div>

        {/* Quiet Meta Separator */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium mb-5">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Offline & Cloud Sync</span>
          </span>
          <span aria-hidden="true" className="text-emerald-700">·</span>
          <span>v2.5</span>
        </div>

        {/* Polished Animated Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-emerald-500/20">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-[#00e676] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,230,118,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400/80 px-0.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span>সিস্টেম লোড হচ্ছে...</span>
            </span>
            <span className="font-bold text-emerald-300">{progress}%</span>
          </div>
        </div>

        {/* Quick tap dismissal hint */}
        <p className="mt-4 text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
};
