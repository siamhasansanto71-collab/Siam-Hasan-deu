import React, { useState, useEffect } from 'react';
import { 
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
  Pill,
  MessageCircle,
  Phone,
  Store,
  User,
  Award,
  FileText,
  ChevronRight,
  ChevronLeft,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { parseAuthError } from '../lib/authErrorHandler';
import loginHeroArt from '../assets/images/ss_pharma_mobile_login_1791411493047.jpg';
import { GlossySLogo } from './GlossySLogo';

type AuthViewMode = 'login' | 'register' | 'forgot_password';

export const LoginScreen: React.FC = () => {
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

  // Screen Mode & Form States
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [regStep, setRegStep] = useState<1 | 2>(1);

  // Login inputs
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Multi-step Registration inputs (empty by default)
  const [ownerName, setOwnerName] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [dgdaRegNo, setDgdaRegNo] = useState('');
  const [whatsAppNo, setWhatsAppNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Clear all stored user/pharmacy preferences from browser storage on load when on login/signup screen
  useEffect(() => {
    try {
      localStorage.removeItem('siam_pharma_pending_profile');
      localStorage.removeItem('siam_pharma_remember_user');
      localStorage.removeItem('ss_pharma_profile_demo');
      localStorage.removeItem('siam_pharma_demo');
      localStorage.removeItem('siam_pharma_active_session');
      // Purge any stored keys matching profile, user, pending, or demo
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('profile') || key.includes('user') || key.includes('pending') || key.includes('remember') || key.includes('demo'))) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
    } catch {
      // ignore
    }
  }, []);

  const handleResetForm = () => {
    setOwnerName('');
    setPharmacyName('');
    setLicenseNo('');
    setDgdaRegNo('');
    setWhatsAppNo('');
    setEmailOrPhone('');
    setPassword('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setLocalError('');
    try {
      localStorage.removeItem('siam_pharma_pending_profile');
      localStorage.removeItem('siam_pharma_remember_user');
      localStorage.removeItem('ss_pharma_profile_demo');
      localStorage.removeItem('siam_pharma_demo');
      localStorage.removeItem('siam_pharma_active_session');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('profile') || key.includes('user') || key.includes('pending') || key.includes('remember') || key.includes('pharma') || key.includes('demo'))) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
      setSuccessNotice(language === 'bn' ? 'সকল সংরক্ষিত তথ্য ও ফর্ম রিসেট করা হয়েছে' : 'All stored preferences and form fields cleared successfully');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch {
      // ignore
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setLocalError('');
    clearAuthError();
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setLocalError(language === 'bn' ? parsed.messageBn : parsed.messageEn);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginIdentifier = emailOrPhone.trim();
    if (!loginIdentifier || !password.trim()) {
      setLocalError(
        language === 'bn' 
          ? 'অনুগ্রহ করে ইমেইল/ফোন নম্বর এবং পাসওয়ার্ড প্রদান করুন' 
          : 'Please enter your email/phone and password'
      );
      return;
    }

    // Convert raw phone numbers to dummy email if entered without @
    const effectiveEmail = loginIdentifier.includes('@')
      ? loginIdentifier
      : `${loginIdentifier.replace(/[^0-9]/g, '')}@siampharma.local`;

    setIsSubmitting(true);
    setLocalError('');
    setSuccessNotice('');
    clearAuthError();
    try {
      await signInWithEmail(effectiveEmail, password.trim());
      if (rememberMe) {
        localStorage.setItem('siam_pharma_remember_user', loginIdentifier);
      } else {
        localStorage.removeItem('siam_pharma_remember_user');
      }
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setLocalError(language === 'bn' ? parsed.messageBn : parsed.messageEn);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextRegStep = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!ownerName.trim() || !pharmacyName.trim()) {
      setLocalError(
        language === 'bn'
          ? 'অনুগ্রহ করে প্রোপাইটার ও ফার্মেসির নাম পূরণ করুন'
          : 'Please provide Owner Name and Pharmacy Name'
      );
      return;
    }
    setRegStep(2);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!regEmail.trim()) {
      setLocalError(language === 'bn' ? 'অনুগ্রহ করে ইমেইল ঠিকানা দিন' : 'Please provide a valid email');
      return;
    }

    if (regPassword.length < 6) {
      setLocalError(
        language === 'bn'
          ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setLocalError(
        language === 'bn'
          ? 'পাসওয়ার্ড দুটি মিলছে না'
          : 'Passwords do not match'
      );
      return;
    }

    // Save pending pharmacy profile information in local storage to sync upon direct account creation
    try {
      localStorage.setItem('siam_pharma_pending_profile', JSON.stringify({
        storeName: pharmacyName.trim(),
        proprietorName: ownerName.trim(),
        licenseNumber: licenseNo.trim(),
        dgdaRegNumber: dgdaRegNo.trim(),
        contactPhone: whatsAppNo.trim(),
        email: regEmail.trim()
      }));
    } catch {
      // ignore storage failure
    }

    // Direct registration without OTP verification
    setIsSubmitting(true);
    setLocalError('');
    clearAuthError();
    try {
      await registerWithEmail(regEmail.trim(), regPassword.trim());
      // On success, Firebase onAuthStateChanged fires immediately, setting user session and launching dashboard
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setLocalError(language === 'bn' ? parsed.messageBn : parsed.messageEn);
      // If error is that user already exists, switch to login
      if (parsed.code === 'auth/email-already-in-use') {
        setViewMode('login');
        setEmailOrPhone(regEmail);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToReset = emailOrPhone.trim();
    if (!emailToReset) {
      setLocalError(
        language === 'bn' 
          ? 'অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল প্রদান করুন' 
          : 'Please enter your registered email'
      );
      return;
    }

    setIsSubmitting(true);
    setLocalError('');
    try {
      await sendPasswordReset(emailToReset);
      setSuccessNotice(
        language === 'bn'
          ? `পাসওয়ার্ড রিসেট লিংক ${emailToReset} এ পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।`
          : `Password reset link sent to ${emailToReset}. Please check your inbox.`
      );
      setViewMode('login');
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setLocalError(language === 'bn' ? parsed.messageBn : parsed.messageEn);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-gradient-to-br from-[#020b08] via-[#04150f] to-[#020b08] text-[#f1f5f9] flex flex-col justify-between p-3 sm:p-5 lg:p-8 relative overflow-x-hidden selection:bg-[#00e676]/30 selection:text-white font-sans">
      
      {/* Ambient Neon Mint & Teal Glow Highlights */}
      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-[#00e676]/10 blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#00e5ff]/10 blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/3 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-500/5 blur-[90px] pointer-events-none" />

      {/* Top Header Bar / Brand Badge & Language Toggle */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 px-1 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0a3d2c] via-[#05261b] to-[#021811] border border-[#00e676]/60 flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.25)] overflow-hidden">
            <GlossySLogo size={36} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight block">
              Siam Pharma Due Management
            </span>
            <span className="text-[10px] text-emerald-400 font-medium hidden sm:inline-block">
              সিয়াম ফার্মা • Bogura, BD • DGDA REG-PH-0924
            </span>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="bg-[#051c14] p-1 rounded-xl flex items-center border border-emerald-500/25 shadow-md">
          <Globe className="w-3.5 h-3.5 text-[#00e676] mx-1.5" />
          <button
            type="button"
            onClick={() => setLanguage('bn')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              language === 'bn'
                ? 'bg-[#00e676] text-black shadow-md shadow-[#00e676]/25 font-black'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            বাংলা
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-[#00e676] text-black shadow-md shadow-[#00e676]/25 font-black'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            EN
          </button>
        </div>
      </header>

      {/* Main Dual-Column Hero & Auth Container */}
      <main className="w-full max-w-6xl mx-auto my-auto py-4 sm:py-6 z-20 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        
        {/* Left Hero Banner (Desktop / Tablet Split Screen Showcase) */}
        <section className="hidden lg:flex lg:col-span-6 flex-col justify-between h-full space-y-6 p-8 rounded-3xl bg-gradient-to-br from-[#062117]/90 via-[#041911]/90 to-[#020e09]/95 border border-[#00e676]/20 shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl relative overflow-hidden">
          
          {/* Subtle Ambient Decorative Circles */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#00e676]/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            {/* Pharmacy Credential Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00e676]/15 border border-[#00e676]/40 text-xs font-extrabold text-[#00e676] tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00e676]" />
                <span>DGDA VERIFIED SYSTEM</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-400/30 text-[11px] font-mono text-cyan-300">
                REG-PH-0924
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-400/30 text-[11px] font-mono text-emerald-300">
                DL-BGR-2024-88291
              </span>
            </div>

            {/* Hero Main Heading & Tagline */}
            <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
              {language === 'bn' ? (
                <>
                  আপনার ফার্মেসির বাকি খাতা ও কাস্টমার হিসাব <span className="text-[#00e676] drop-shadow-[0_0_12px_rgba(0,230,118,0.4)]">সহজে ও নির্ভুলভাবে</span> পরিচালনা করুন
                </>
              ) : (
                <>
                  Manage Your Pharmacy Credit & Due <span className="text-[#00e676] drop-shadow-[0_0_12px_rgba(0,230,118,0.4)]">Easily & Securely</span>
                </>
              )}
            </h1>

            <p className="text-sm text-emerald-200/90 leading-relaxed">
              {language === 'bn'
                ? 'সিয়াম ফার্মা বাকি ম্যানেজমেন্ট সিস্টেমে রয়েছে রিয়েল-টাইম ক্লাউড ব্যাকআপ, হোয়াটসঅ্যাপ বাকি তাগাদা নোটিফিকেশন, স্বয়ংক্রিয় পেমেন্ট হিসাব ও দৈনিক কালেকশন অ্যানালিটিক্স।'
                : 'Siam Pharma Due Management provides real-time cloud data sync, automated WhatsApp credit reminders, instant receipt calculation, and 30-day collection analytics.'}
            </p>
          </div>

          {/* 3D Glowing Pharmacy Artwork Banner Card */}
          <div className="relative z-10 rounded-2xl overflow-hidden border border-[#00e676]/30 shadow-2xl group">
            <img 
              src={loginHeroArt} 
              alt="Siam Pharma 3D Medical Artwork"
              className="w-full h-56 object-cover object-center group-hover:scale-102 transition-transform duration-500 brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#02110b] via-[#02110b]/40 to-transparent flex items-end p-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#00e676]/20 border border-[#00e676] flex items-center justify-center text-[#00e676]">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Siam Pharma Due</p>
                    <p className="text-[10px] text-emerald-300 font-mono">Md Siam Hasan Santo • 01846793071</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#00e676] bg-black/60 px-2 py-0.5 rounded border border-[#00e676]/40">
                  256-Bit SSL Cloud
                </span>
              </div>
            </div>
          </div>

          {/* Feature Badges Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#031810]/80 border border-emerald-500/20 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-[#00e676] flex-shrink-0" />
              <span>{language === 'bn' ? '১-ক্লিকে হোয়াটসঅ্যাপ তাগাদা' : '1-Click WhatsApp Reminder'}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#031810]/80 border border-emerald-500/20 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-[#00e5ff] flex-shrink-0" />
              <span>{language === 'bn' ? '৩০ দিনের কালেকশন চার্ট' : '30-Day Collection Analytics'}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#031810]/80 border border-emerald-500/20 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{language === 'bn' ? 'অফলাইন ও ব্যাকআপ এক্সপোর্ট' : 'Excel/CSV Ledger Export'}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#031810]/80 border border-emerald-500/20 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-[#00e676] flex-shrink-0" />
              <span>{language === 'bn' ? 'DGDA নিয়মাবলী সমর্থিত' : 'DGDA Certified Ready'}</span>
            </div>
          </div>

        </section>

        {/* Right Column: Glassmorphism Dark Card for Authentication & Onboarding */}
        <section className="w-full lg:col-span-6 max-w-md mx-auto">
          <div className="w-full bg-[#061812]/95 border border-[#00e676]/25 rounded-3xl p-5 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-[#00e676]/15 space-y-4 sm:space-y-5 relative">
            
            {/* Top Brand Header (Visible on Mobile & Tablet) */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0c442e] via-[#05261b] to-[#021811] border-2 border-[#00e676]/80 flex items-center justify-center text-[#00e676] shadow-xl shadow-emerald-950 overflow-hidden ring-2 ring-[#00e676]/30">
                  <div className="flex items-center justify-center tracking-tighter font-black text-2xl text-[#00e676] select-none drop-shadow-[0_0_8px_rgba(0,230,118,0.8)]">
                    <span>SP</span>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#00e676] flex items-center justify-center text-black shadow-md border border-white/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-black" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                <Pill className="w-4 h-4 text-[#00e676] flex-shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Siam Pharma Due Management
                </h2>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-emerald-300 mt-0.5">
                সিয়াম ফার্মা • Bogura, Bangladesh
              </p>

              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  DGDA: REG-PH-0924
                </span>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  01846793071
                </span>
              </div>
            </div>

            {/* Mode Switch Tabs (Login / Create Account) */}
            {viewMode !== 'forgot_password' && (
              <div className="grid grid-cols-2 gap-2 bg-[#020f0a] p-1.5 rounded-2xl border border-emerald-500/20 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setLocalError('');
                  }}
                  className={`h-11 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    viewMode === 'login'
                      ? 'bg-[#00e676] text-black shadow-lg shadow-[#00e676]/30'
                      : 'text-emerald-300 hover:text-white hover:bg-emerald-900/30'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>{language === 'bn' ? 'লগইন' : 'Login'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    setRegStep(1);
                    setLocalError('');
                  }}
                  className={`h-11 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    viewMode === 'register'
                      ? 'bg-[#00e676] text-black shadow-lg shadow-[#00e676]/30'
                      : 'text-emerald-300 hover:text-white hover:bg-emerald-900/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{language === 'bn' ? 'নতুন অ্যাকাউন্ট' : 'Create Account'}</span>
                </button>
              </div>
            )}

            {/* Alerts & Errors Display (Red Accent for High Due/Errors) */}
            {(localError || authError) && (
              <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/70 text-xs sm:text-sm text-rose-200 flex flex-col gap-2 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-[#ff5252] mt-0.5" />
                  <span className="flex-1 leading-relaxed font-medium">{localError || authError}</span>
                </div>
                {((localError || authError || '').toLowerCase().includes('already registered') || 
                  (localError || authError || '').toLowerCase().includes('already in use') || 
                  (localError || authError || '').includes('ইতিমধ্যেই')) && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-900/50">
                    <span className="text-xs text-rose-300">
                      {language === 'bn' ? 'ইতিমধ্যেই অ্যাকাউন্ট আছে?' : 'Already have an account?'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('login');
                        setLocalError('');
                        clearAuthError();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-black font-extrabold text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'লগইন করুন' : 'Sign In Now'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success Notices */}
            {successNotice && (
              <div className="p-3 rounded-2xl bg-emerald-950/90 border border-[#00e676]/60 text-xs sm:text-sm text-emerald-200 flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#00e676]" />
                <span className="flex-1 font-medium">{successNotice}</span>
              </div>
            )}

            {/* -------------------- MODE 1: LOGIN CARD -------------------- */}
            {viewMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Input: Phone or Email */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs sm:text-sm font-bold text-white block">
                    {language === 'bn' ? 'ফোন নম্বর বা ইমেইল' : 'Phone / Email Address'}
                  </label>
                  <div className="h-12 rounded-xl px-3.5 flex items-center gap-3 text-emerald-300 bg-[#02130d] border border-emerald-500/35 focus-within:border-[#00e676] focus-within:ring-2 focus-within:ring-[#00e676]/25 transition-all">
                    <Mail className="w-4 h-4 text-[#00e676] flex-shrink-0" />
                    <input
                      type="text"
                      required
                      value={emailOrPhone || ""}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      autoComplete="off"
                      placeholder=""
                      className="bg-transparent text-sm sm:text-base text-white placeholder-emerald-600/60 focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Input: Password */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-xs sm:text-sm font-bold text-white">
                      {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('forgot_password');
                        setLocalError('');
                      }}
                      className="text-xs font-semibold text-[#00e676] hover:text-emerald-300 hover:underline cursor-pointer"
                    >
                      {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                    </button>
                  </div>
                  <div className="h-12 rounded-xl px-3.5 flex items-center gap-3 text-emerald-300 bg-[#02130d] border border-emerald-500/35 focus-within:border-[#00e676] focus-within:ring-2 focus-within:ring-[#00e676]/25 transition-all">
                    <Lock className="w-4 h-4 text-[#00e676] flex-shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password || ""}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder=""
                      className="bg-transparent text-sm sm:text-base text-white placeholder-emerald-600/60 focus:outline-none w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-emerald-400 hover:text-white p-1 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Toggle & Reset Action */}
                <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-emerald-200">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-emerald-600 text-[#00e676] focus:ring-[#00e676] bg-[#02130d]"
                    />
                    <span>{language === 'bn' ? 'আমাকে মনে রাখুন' : 'Remember Me'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-[11px] font-semibold text-emerald-400/80 hover:text-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Clear all stored values and reset form"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{language === 'bn' ? 'ফর্ম খালি করুন' : 'Clear Form'}</span>
                  </button>
                </div>

                {/* Primary CTA: Glowing Neon Mint Green Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.35)] transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                >
                  <span>
                    {isSubmitting
                      ? (language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Signing in...')
                      : (language === 'bn' ? 'লগইন করুন' : 'Login')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Outline Button: Create New Account */}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    setRegStep(1);
                    setLocalError('');
                  }}
                  className="w-full h-11 rounded-xl bg-transparent hover:bg-emerald-950/40 border border-[#00e676]/40 text-[#00e676] hover:text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{language === 'bn' ? 'নতুন ফার্মেসি অ্যাকাউন্ট তৈরি করুন' : 'Create New Account'}</span>
                </button>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-emerald-900/60"></div>
                  <span className="flex-shrink mx-3 text-xs text-emerald-400/80 uppercase tracking-wider font-bold">
                    {language === 'bn' ? 'অথবা' : 'OR'}
                  </span>
                  <div className="flex-grow border-t border-emerald-900/60"></div>
                </div>

                {/* Google Sign-in */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
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
                  <span>{language === 'bn' ? 'গুগল দিয়ে ১-ক্লিক সাইন ইন' : 'Sign In with Google'}</span>
                </button>

              </form>
            )}

            {/* -------------------- MODE 2: MULTI-STEP REGISTRATION -------------------- */}
            {viewMode === 'register' && (
              <div className="space-y-4">
                
                {/* Step Indicators */}
                <div className="flex items-center justify-between pb-2 border-b border-emerald-900/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                      regStep === 1 ? 'bg-[#00e676] text-black shadow-[0_0_8px_#00e676]' : 'bg-emerald-900 text-emerald-300'
                    }`}>
                      1
                    </span>
                    <span className="text-xs font-bold text-white">
                      {language === 'bn' ? 'ফার্মেসি ও মালিকের তথ্য' : 'Pharmacy & Owner'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                      regStep === 2 ? 'bg-[#00e676] text-black shadow-[0_0_8px_#00e676]' : 'bg-emerald-900 text-emerald-300'
                    }`}>
                      2
                    </span>
                    <span className="text-xs font-bold text-white">
                      {language === 'bn' ? 'লগইন সিকিউরিটি' : 'Security'}
                    </span>
                  </div>
                </div>

                {regStep === 1 ? (
                  <form onSubmit={handleNextRegStep} autoComplete="off" className="space-y-3.5">
                    {/* Owner Name */}
                    <div className="space-y-1 text-left">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#00e676]" />
                        <span>{language === 'bn' ? 'মালিকের নাম (Proprietor Name)' : 'Owner / Proprietor Name'}</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ownerName || ""}
                        onChange={(e) => setOwnerName(e.target.value)}
                        autoComplete="off"
                        placeholder=""
                        className="w-full h-11 px-3 rounded-xl bg-[#02130d] border border-emerald-500/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00e676]"
                      />
                    </div>

                    {/* Pharmacy Name */}
                    <div className="space-y-1 text-left">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[#00e676]" />
                        <span>{language === 'bn' ? 'ফার্মেসির নাম (Pharmacy Name)' : 'Pharmacy Name'}</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyName || ""}
                        onChange={(e) => setPharmacyName(e.target.value)}
                        autoComplete="off"
                        placeholder=""
                        className="w-full h-11 px-3 rounded-xl bg-[#02130d] border border-emerald-500/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00e676]"
                      />
                    </div>

                    {/* Drug License No & DGDA Reg No */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 text-left">
                        <label className="text-[11px] font-bold text-white flex items-center gap-1">
                          <FileText className="w-3 h-3 text-[#00e676]" />
                          <span>{language === 'bn' ? 'ড্রাগ লাইসেন্স নং' : 'Drug License No'}</span>
                        </label>
                        <input
                          type="text"
                          value={licenseNo || ""}
                          onChange={(e) => setLicenseNo(e.target.value)}
                          autoComplete="off"
                          placeholder=""
                          className="w-full h-10 px-3 rounded-xl bg-[#02130d] border border-emerald-500/35 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00e676]"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[11px] font-bold text-white flex items-center gap-1">
                          <Award className="w-3 h-3 text-cyan-400" />
                          <span>{language === 'bn' ? 'DGDA রেজিস্ট্রেশন নং' : 'DGDA Reg No'}</span>
                        </label>
                        <input
                          type="text"
                          value={dgdaRegNo || ""}
                          onChange={(e) => setDgdaRegNo(e.target.value)}
                          autoComplete="off"
                          placeholder=""
                          className="w-full h-10 px-3 rounded-xl bg-[#02130d] border border-emerald-500/35 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00e676]"
                        />
                      </div>
                    </div>

                    {/* WhatsApp No */}
                    <div className="space-y-1 text-left">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#25d366]" />
                        <span>{language === 'bn' ? 'হোয়াটসঅ্যাপ / ফোন নম্বর' : 'WhatsApp / Mobile No'}</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={whatsAppNo || ""}
                        onChange={(e) => setWhatsAppNo(e.target.value)}
                        autoComplete="off"
                        placeholder=""
                        className="w-full h-11 px-3 rounded-xl bg-[#02130d] border border-emerald-500/35 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00e676]"
                      />
                    </div>

                    {/* Next Button */}
                    <button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.35)] transition cursor-pointer"
                    >
                      <span>{language === 'bn' ? 'পরবর্তী ধাপ (লগইন তথ্য)' : 'Continue to Security'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Reset Button */}
                    <div className="flex items-center justify-center pt-1">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="text-[11px] font-semibold text-emerald-400/80 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Clear all stored values"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{language === 'bn' ? 'সব তথ্য রিসেট / মুছুন (Clear All)' : 'Clear / Reset Form Fields'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} autoComplete="off" className="space-y-3.5">
                    {/* Account Email */}
                    <div className="space-y-1 text-left">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#00e676]" />
                        <span>{language === 'bn' ? 'অ্যাকাউন্ট ইমেইল' : 'Email Address'}</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail || ""}
                        onChange={(e) => setRegEmail(e.target.value)}
                        autoComplete="off"
                        placeholder=""
                        className="w-full h-11 px-3 rounded-xl bg-[#02130d] border border-emerald-500/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00e676]"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1 text-left">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#00e676]" />
                        <span>{language === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password (min 6 chars)'}</span>
                      </label>
                      <div className="h-11 rounded-xl px-3 flex items-center gap-2 text-emerald-300 bg-[#02130d] border border-emerald-500/35 focus-within:border-[#00e676]">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword || ""}
                          onChange={(e) => setRegPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder=""
                          className="bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="text-emerald-400 hover:text-white p-1"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1 text-left">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#00e676]" />
                        <span>{language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}</span>
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regConfirmPassword || ""}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder=""
                        className="w-full h-11 px-3 rounded-xl bg-[#02130d] border border-emerald-500/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00e676]"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="h-12 px-4 rounded-xl bg-[#031d13] hover:bg-[#073022] border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>{language === 'bn' ? 'পেছনে' : 'Back'}</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 h-12 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.35)] transition cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isSubmitting
                            ? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating Account...')
                            : (language === 'bn' ? 'রেজিস্ট্রেশন সম্পন্ন করুন' : 'Complete Registration')}
                        </span>
                      </button>
                    </div>

                    {/* Reset Button */}
                    <div className="flex items-center justify-center pt-1">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="text-[11px] font-semibold text-emerald-400/80 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Clear all stored values"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{language === 'bn' ? 'সব তথ্য রিসেট / মুছুন (Clear All)' : 'Clear / Reset Form Fields'}</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )}

            {/* -------------------- MODE 4: FORGOT PASSWORD -------------------- */}
            {viewMode === 'forgot_password' && (
              <form onSubmit={handleForgotPassword} className="space-y-4 animate-in fade-in">
                <div className="text-left space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {language === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Your Password'}
                  </h3>
                  <p className="text-xs text-emerald-300/80">
                    {language === 'bn' 
                      ? 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা দিন। আমরা পাসওয়ার্ড পরিবর্তনের লিংক পাঠাব।' 
                      : 'Enter your account email. We will send a secure password reset link.'}
                  </p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-white block">
                    {language === 'bn' ? 'নিবন্ধিত ইমেইল' : 'Registered Email Address'}
                  </label>
                  <div className="h-12 rounded-xl px-3.5 flex items-center gap-3 text-emerald-300 bg-[#02130d] border border-emerald-500/35 focus-within:border-[#00e676]">
                    <Mail className="w-4 h-4 text-[#00e676] flex-shrink-0" />
                    <input
                      type="email"
                      required
                      value={emailOrPhone || ""}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      autoComplete="off"
                      placeholder=""
                      className="bg-transparent text-sm text-white placeholder-emerald-600/60 focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('login')}
                    className="h-12 rounded-xl bg-[#031d13] hover:bg-[#073022] border border-emerald-800 text-emerald-300 font-bold text-xs sm:text-sm transition flex items-center justify-center cursor-pointer"
                  >
                    {language === 'bn' ? 'ফিরে যান' : 'Back to Login'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.35)] transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') : (language === 'bn' ? 'লিংক পাঠান' : 'Send Link')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Quick Guest Session & Demo Access */}
            <div className="pt-2 border-t border-emerald-900/60 space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true);
                  setLocalError('');
                  try {
                    await signInAnonymously();
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Guest session failed';
                    setLocalError(msg);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full h-11 px-3 rounded-xl bg-[#031c13] hover:bg-[#062c1e] border border-emerald-600/40 text-emerald-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#00e676]" />
                <span>{language === 'bn' ? 'গেস্ট ক্লাউড সেশন (পাসওয়ার্ড ছাড়া)' : 'Quick Guest Cloud Session'}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_6px_#00e676]"></span>
                  <span>DGDA REG-PH-0924</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDemoMode(true)}
                  className="text-amber-400 hover:text-amber-300 hover:underline font-bold text-xs cursor-pointer"
                >
                  {language === 'bn' ? 'অফলাইন / ডেমো মোড' : 'Try Demo / Offline Mode'}
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer Branding & WhatsApp Quick Contact */}
      <footer className="w-full max-w-6xl mx-auto py-2 px-2 text-center text-xs text-emerald-400/80 z-20 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-emerald-900/40 mt-auto">
        <p className="text-[11px] sm:text-xs">
          © 2026 Siam Pharma Due Management (সিয়াম ফার্মা) • Proprietor: Md Siam Hasan Santo • Bogura, BD
        </p>
        <a 
          href="https://wa.me/8801846793071?text=Hello%20Siam%20Pharma%20Support"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#25d366] hover:text-white transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Support WhatsApp: 01846793071</span>
        </a>
      </footer>

    </div>
  );
};
