import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Globe, 
  CheckCircle2, 
  ArrowRight,
  Send,
  Smartphone,
  Wifi,
  BatteryCharging,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { parseAuthError } from '../lib/authErrorHandler';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    registerWithEmail, 
    sendPasswordReset,
    signInAnonymously,
    setDemoMode,
    authError, 
    clearAuthError 
  } = useAuth();
  
  const { language, setLanguage } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetSentNotice, setResetSentNotice] = useState('');
  const [showMockupPreview, setShowMockupPreview] = useState(false);
  const [showFullScreenMockup, setShowFullScreenMockup] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setLocalError('');
    clearAuthError();
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setLocalError(language === 'bn' ? parsed.messageBn : parsed.messageEn);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLocalError(language === 'bn' ? 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড দুটিই লিখুন' : 'Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    setLocalError('');
    setResetSentNotice('');
    clearAuthError();
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password.trim());
      } else {
        await registerWithEmail(email.trim(), password.trim());
      }
      onClose();
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setLocalError(language === 'bn' ? parsed.messageBn : parsed.messageEn);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError(language === 'bn' ? 'অনুগ্রহ করে আপনার ইমেইল প্রদান করুন' : 'Please enter your email address first');
      return;
    }

    setIsSubmitting(true);
    setLocalError('');
    try {
      await sendPasswordReset(email.trim());
      setResetSentNotice(
        language === 'bn'
          ? `পাসওয়ার্ড রিসেট লিংক ${email} এ পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।`
          : `Password reset link sent to ${email}. Please check your inbox.`
      );
      setIsForgotPasswordOpen(false);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setLocalError(language === 'bn' ? parsed.messageBn : parsed.messageEn);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoMode = () => {
    setDemoMode(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* Outer Smartphone Frame & Glassmorphic Container */}
      <div className="relative w-full max-w-[420px] my-auto rounded-[24px] sm:rounded-[36px] bg-[rgba(6,32,28,0.95)] border border-emerald-500/35 shadow-[0_0_50px_rgba(4,28,24,0.95)] text-slate-100 overflow-hidden backdrop-blur-2xl ring-1 ring-emerald-500/20">
        
        {/* Subtle Ambient Studio Neon Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-600/10 blur-[80px] pointer-events-none" />

        {/* 1. SMARTPHONE STATUS BAR (10:38 + Notification Icons) */}
        <div className="relative z-20 px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between text-emerald-300/90 select-none border-b border-emerald-950/40">
          {/* Time: 10:38 */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs tracking-wider text-emerald-200 font-mono">10:38</span>
          </div>

          {/* Smartphone Speaker Notch / Dynamic Island Accent */}
          <div className="w-14 sm:w-16 h-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/40 shadow-inner" />

          {/* Right Status Indicators: Signal, Wifi, Battery */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px]">
            {/* Cellular Signal Bars */}
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-1 rounded-sm bg-emerald-400"></span>
              <span className="w-0.5 h-1.5 rounded-sm bg-emerald-400"></span>
              <span className="w-0.5 h-2 rounded-sm bg-emerald-400"></span>
              <span className="w-0.5 h-2.5 rounded-sm bg-emerald-400"></span>
            </div>
            {/* WiFi */}
            <Wifi className="w-3 h-3 text-emerald-400" />
            {/* Battery */}
            <div className="flex items-center gap-1 font-mono text-[9px] text-emerald-300 font-bold">
              <span>98%</span>
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Top Control Bar: Mode Toggle + Language Switcher + Close */}
        <div className="px-4 sm:px-5 pt-3 pb-1 flex justify-between items-center relative z-10">
          {/* Mode Tabs (Login / Sign Up) */}
          <div className="bg-[#031c15] p-1 rounded-2xl flex border border-emerald-900/60 space-x-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setIsForgotPasswordOpen(false);
                setLocalError('');
              }}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                mode === 'login' && !isForgotPasswordOpen
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{language === 'bn' ? 'লগইন' : 'Login'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setIsForgotPasswordOpen(false);
                setLocalError('');
              }}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                mode === 'register' && !isForgotPasswordOpen
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{language === 'bn' ? 'রেজিস্টার' : 'Sign Up'}</span>
            </button>
          </div>

          {/* Right Action Cluster: Language Switcher & Close Button */}
          <div className="flex items-center gap-2">
            <div className="bg-[#031c15] p-0.5 rounded-2xl flex border border-emerald-900/60 items-center shadow-inner">
              <span className="text-emerald-400 pl-1.5 pr-0.5 text-xs">
                <Globe className="w-3 h-3" />
              </span>
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-2 py-0.5 rounded-xl text-[10px] font-bold transition ${
                  language === 'bn'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-xl text-[10px] font-bold transition ${
                  language === 'en'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/40 text-emerald-300 hover:text-white transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN TRANSLUCENT GLASS PANEL CONTENT */}
        <div className="p-3.5 sm:p-6 pt-2">
          
          {/* 2. BEAUTIFUL MODERN GREEN 'SS' LOGO & PHARMA CLOUD ACCESS HEADER */}
          <div className="flex flex-col items-center pt-1 text-center relative z-10">
            {/* Modern Green 'SS' Monogram Logo */}
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0a3d2c] via-[#05261b] to-[#021811] border-2 border-emerald-400/80 flex items-center justify-center text-emerald-300 shadow-xl shadow-emerald-950/80 relative overflow-hidden ring-2 ring-emerald-500/30 group-hover:scale-105 transition-transform duration-300">
                {/* Neon glow backdrop inside logo */}
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-teal-400/10 to-transparent pointer-events-none" />
                
                {/* Modern Geometric 'SP' Monogram */}
                <div className="flex items-center justify-center tracking-tighter font-black text-2xl text-emerald-400 select-none drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
                  <span className="text-emerald-300 -mr-0.5">S</span>
                  <span className="text-teal-400">P</span>
                </div>
              </div>

              {/* Security Shield Badge */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-black text-xs font-black shadow-md border border-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-black" />
              </div>
            </div>

            {/* App Title: Siam Pharma Due management in White */}
            <div className="flex items-center space-x-2 mt-2.5 text-center justify-center">
              <h1 className="text-base xs:text-xl sm:text-2xl font-black text-white tracking-wide">Siam Pharma Due management</h1>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-900/90 border border-emerald-500/50 text-emerald-300 text-[10px] font-extrabold tracking-wider shadow-sm">
                PRO
              </span>
            </div>

            {/* Subtitle */}
            <p className="text-xs font-semibold text-emerald-300 tracking-wide mt-0.5">
              সিয়াম ফার্মা • Bogura, Bangladesh • WhatsApp: 01846793071
            </p>
            <p className="text-[11px] text-emerald-400/75 text-center max-w-xs mt-0.5">
              {language === 'bn'
                ? 'ফার্মেসির হিসাব, কাস্টমার বাকি ও ক্লাউড ডেটাবেস রিয়েলটাইম সিঙ্ক'
                : 'Secure cloud synchronization for customer dues & pharmacy inventory'}
            </p>
          </div>

          {/* Error or Success Alerts */}
          {(localError || authError) && (
            <div className="mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span className="flex-1 text-[11px] leading-relaxed">{localError || authError}</span>
              </div>
              {((localError || authError || '').toLowerCase().includes('already registered') || 
                (localError || authError || '').toLowerCase().includes('already in use') || 
                (localError || authError || '').includes('ইতিমধ্যেই')) && (
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-900/40">
                  <span className="text-[10px] text-rose-300">
                    {language === 'bn' ? 'অ্যাকাউন্ট রয়েছে?' : 'Have an account?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setLocalError('');
                      clearAuthError();
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>{language === 'bn' ? 'লগইন করুন' : 'Switch to Sign In'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {resetSentNotice && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span className="flex-1 text-[11px]">{resetSentNotice}</span>
            </div>
          )}

          {/* 3. FORGOT PASSWORD FLOW */}
          {isForgotPasswordOpen ? (
            <form onSubmit={handleForgotPassword} className="space-y-3 pt-3 relative z-10">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-emerald-200 block">
                  {language === 'bn' ? 'আপনার নিবন্ধিত ইমেইল' : 'Email'}
                </label>
                <div className="rounded-xl px-3 py-2.5 flex items-center space-x-2.5 text-emerald-300 bg-[rgba(4,22,19,0.85)] border border-emerald-500/40 focus-within:border-emerald-400 focus-within:shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                  <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <input
                    type="email"
                    required
                    value={email || ""}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    placeholder=""
                    className="bg-transparent text-xs text-white placeholder-emerald-600/70 focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#041d15] hover:bg-[#082a20] border border-emerald-800/60 text-emerald-300 font-bold text-xs transition"
                >
                  {language === 'bn' ? 'ফিরে যান' : 'Back to Login'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') : (language === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link')}</span>
                </button>
              </div>
            </form>
          ) : (
            /* 4. TWO GREEN INPUT FIELDS & FORM */
            <form onSubmit={handleEmailAuth} autoComplete="off" className="space-y-3 pt-3 relative z-10">
              
              {/* Green Input Field 1: Email */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-emerald-200 block">
                  {language === 'bn' ? 'ইমেইল' : 'Email'}
                </label>
                <div className="rounded-xl px-3 py-2.5 flex items-center space-x-2.5 text-emerald-300 bg-[rgba(4,22,19,0.85)] border border-emerald-500/35 focus-within:border-emerald-400 focus-within:shadow-[0_0_8px_rgba(16,185,129,0.35)] transition-all">
                  <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <input
                    type="email"
                    required
                    value={email || ""}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    placeholder=""
                    className="bg-transparent text-xs text-white placeholder-emerald-600/70 focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Green Input Field 2: Password */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-emerald-200">
                    {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordOpen(true);
                        setLocalError('');
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="rounded-xl px-3 py-2.5 flex items-center space-x-2.5 text-emerald-300 bg-[rgba(4,22,19,0.85)] border border-emerald-500/35 focus-within:border-emerald-400 focus-within:shadow-[0_0_8px_rgba(16,185,129,0.35)] transition-all">
                  <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password || ""}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder=""
                    className="bg-transparent text-xs text-white placeholder-emerald-600/70 focus:outline-none w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-emerald-400 hover:text-emerald-200 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* 5. THIN DIVIDER LINE: OR WITH EMAIL / OR WITH GOOGLE */}
              <div className="relative flex py-1.5 items-center my-1">
                <div className="flex-grow border-t border-emerald-900/60"></div>
                <span className="flex-shrink mx-3 text-[10px] text-emerald-400/80 uppercase tracking-wider font-bold">
                  OR WITH EMAIL
                </span>
                <div className="flex-grow border-t border-emerald-900/60"></div>
              </div>

              {/* 6. PROMINENT BUTTONS: */}
              {/* White Button: Sign in with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center space-x-2.5 shadow-md transition-all active:scale-98 disabled:opacity-60"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              {/* Solid Green Button: Sign In (with white text) */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-98 disabled:opacity-60"
              >
                <span>
                  {isSubmitting
                    ? (language === 'bn' ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'Authenticating...')
                    : mode === 'login'
                    ? (language === 'bn' ? 'সাইন ইন' : 'Sign In')
                    : (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* 7. TEXT LINKS: Forgot Password? and Create Account */}
          {!isForgotPasswordOpen && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(true);
                  setLocalError('');
                }}
                className="text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                Forgot Password?
              </button>
              <span className="text-emerald-700">•</span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setLocalError('');
                }}
                className="text-emerald-300 hover:text-white font-semibold hover:underline"
              >
                {mode === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          )}

          {/* Quick Anonymous Cloud Session (One-Click) */}
          <button
            type="button"
            onClick={async () => {
              setIsSubmitting(true);
              setLocalError('');
              try {
                await signInAnonymously();
                onClose();
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Quick sync session failed';
                setLocalError(msg);
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-[#041d15] hover:bg-[#072d21] border border-emerald-800/40 text-emerald-400/90 font-medium text-[11px] flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>{language === 'bn' ? 'গেস্ট ক্লাউড সেশন (পাসওয়ার্ড ছাড়া)' : 'Quick Guest Cloud Session'}</span>
          </button>

          {/* 8. 8K SMARTPHONE DISPLAY SHOWCASE TOGGLE */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowMockupPreview(!showMockupPreview)}
              className="w-full py-1.5 px-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/30 text-[11px] text-emerald-300/80 flex items-center justify-center gap-1.5 transition"
            >
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>{showMockupPreview ? 'Hide Smartphone Mockup' : 'View 8K Smartphone Display Mockup'}</span>
            </button>

            {showMockupPreview && (
              <div className="mt-2 p-2 rounded-2xl bg-black/70 border border-emerald-500/30 overflow-hidden text-center animate-in fade-in duration-200">
                <div 
                  className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-60 mx-auto bg-black cursor-pointer group"
                  onClick={() => setShowFullScreenMockup(true)}
                  title="Click to view full screen 8K rendering"
                >
                  <img
                    src="/src/assets/images/ss_pharma_mobile_login_1791411493047.jpg"
                    alt="Siam Pharma Due management Smartphone Login Screen Display"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end justify-between p-2">
                    <span className="text-[10px] text-emerald-200 font-medium">
                      10:38 Smartphone Luminous Emerald
                    </span>
                    <span className="p-1 rounded-md bg-black/60 text-emerald-300 text-[10px] flex items-center gap-0.5">
                      <Maximize2 className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 9. SEPARATE FOOTER SECTION: Try Demo Mode / Offline Mode */}
          <div className="mt-4 pt-3 border-t border-emerald-900/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>siam-deu-pharma</span>
            </div>

            <button
              type="button"
              onClick={handleDemoMode}
              className="text-amber-400 hover:text-amber-300 hover:underline font-semibold"
            >
              Try Demo Mode / Offline Mode
            </button>
          </div>

        </div>

      </div>

      {/* Full-Screen Modal for 8K Smartphone Render */}
      {showFullScreenMockup && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowFullScreenMockup(false)}
        >
          <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setShowFullScreenMockup(false)}
              className="self-end mb-2 p-1.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src="/src/assets/images/ss_pharma_mobile_login_1791411493047.jpg"
              alt="Siam Pharma Due management 8K Smartphone Display"
              referrerPolicy="no-referrer"
              className="max-h-[82vh] rounded-2xl border-2 border-emerald-500/40 shadow-2xl object-contain"
            />
            <p className="mt-2 text-xs text-emerald-300 font-mono text-center">
              Siam Pharma Due management • Luminous Emerald-Green Glassmorphism Smartphone Display (8K)
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
