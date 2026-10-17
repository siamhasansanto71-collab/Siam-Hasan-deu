import React, { useState } from 'react';
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface ChangePasswordSectionProps {
  className?: string;
  onSuccess?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const ChangePasswordSection: React.FC<ChangePasswordSectionProps> = ({ 
  className = '',
  onSuccess,
  collapsible = false,
  defaultExpanded = false
}) => {
  const { user, isDemoMode, changeUserPassword } = useAuth();
  const { language, t } = useLanguage();

  const [isExpanded, setIsExpanded] = useState(!collapsible || defaultExpanded);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if account is Google-only login
  const isGoogleAccount = 
    user?.providerData?.some((p) => p.providerId === 'google.com') &&
    !user?.providerData?.some((p) => p.providerId === 'password');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validation: Ensure inputs are not empty
    if (!currentPassword.trim()) {
      setErrorMessage(t.currentPasswordRequired);
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage(t.newPasswordRequired);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(t.passwordMinLength);
      return;
    }

    if (!confirmPassword.trim()) {
      setErrorMessage(t.confirmPasswordRequired);
      return;
    }

    // 2. Validate that New Password and Confirm New Password match
    if (newPassword !== confirmPassword) {
      setErrorMessage(t.passwordsDoNotMatch);
      return;
    }

    // 3. Connect to Auth system to update password
    setIsSubmitting(true);
    try {
      await changeUserPassword(currentPassword, newPassword);

      // Clear input fields upon success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);

      // Show clear success message
      setSuccessMessage(
        isDemoMode
          ? (language === 'bn' 
              ? 'ডেমো মোডে পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!' 
              : 'Password updated successfully (Demo Mode)!')
          : t.passwordChangedSuccess
      );

      if (onSuccess) {
        onSuccess();
      }

      // Auto clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: unknown) {
      console.warn('Failed to update password:', err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          language === 'bn' 
            ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। বর্তমান পাসওয়ার্ড যাচাই করে পুনরায় চেষ্টা করুন।' 
            : 'Failed to update password. Please check your current password and try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-[#062419] via-[#041a12] to-[#02110b] border border-emerald-700/50 shadow-xl shadow-black/40 ${className}`}>
      
      {/* Section Header / Accordion Toggle */}
      <div 
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        className={`flex items-center justify-between gap-2.5 ${collapsible ? 'cursor-pointer select-none' : ''} ${isExpanded ? 'mb-3.5 pb-2.5 border-b border-emerald-900/60' : ''}`}
        title={collapsible ? (isExpanded ? 'Collapse Change Password' : 'Expand Change Password') : undefined}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>{t.changePasswordTitle}</span>
            </h4>
            <p className="text-[11px] text-slate-300 truncate">
              {t.changePasswordDesc}
            </p>
          </div>
        </div>

        {collapsible && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex-shrink-0 hover:bg-emerald-900 transition">
            <span>{isExpanded ? (language === 'bn' ? 'সংক্ষেপ' : 'Close') : (language === 'bn' ? 'পরিবর্তন' : 'Edit')}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="animate-in fade-in duration-200 space-y-3">
          {/* Google-only account notice if applicable */}
          {isGoogleAccount && (
            <div className="mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 text-xs text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                {language === 'bn' 
                  ? 'আপনার অ্যাকাউন্টটি Google এর মাধ্যমে সংযুক্ত। Google সাইন-ইন অ্যাকাউন্টের ক্ষেত্রে আলাদা পাসওয়ার্ডের প্রয়োজন হয় না।' 
                  : 'You signed in using your Google Account. Direct password changes are only available for email & password accounts.'}
              </div>
            </div>
          )}

          {/* Success Alert Banner */}
          {successMessage && (
            <div className="mb-3.5 p-3 rounded-xl bg-emerald-950/70 border border-emerald-400/60 text-xs text-emerald-100 flex items-start gap-2.5 shadow-md shadow-emerald-950/50 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div className="font-medium text-xs leading-relaxed">
                {successMessage}
              </div>
            </div>
          )}

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="mb-3.5 p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200 flex items-start gap-2.5 shadow-md shadow-rose-950/50 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="font-medium text-xs leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

      {/* Password Inputs */}
      <div 
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }} 
        className="space-y-3"
      >
        
        {/* 1. Current Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.currentPasswordLabel}</span>
            <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t.currentPasswordPlaceholder}
              autoComplete="current-password"
              disabled={isSubmitting || isGoogleAccount}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#03140e] border border-emerald-800/60 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              disabled={isSubmitting || isGoogleAccount}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition disabled:opacity-40"
              tabIndex={-1}
              title={showCurrentPassword ? 'Hide current password' : 'Show current password'}
            >
              {showCurrentPassword ? (
                <EyeOff className="w-4 h-4 text-emerald-300" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 2. New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.newPasswordLabel}</span>
            <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t.newPasswordPlaceholder}
              autoComplete="new-password"
              disabled={isSubmitting || isGoogleAccount}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#03140e] border border-emerald-800/60 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={isSubmitting || isGoogleAccount}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition disabled:opacity-40"
              tabIndex={-1}
              title={showNewPassword ? 'Hide new password' : 'Show new password'}
            >
              {showNewPassword ? (
                <EyeOff className="w-4 h-4 text-emerald-300" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 3. Confirm New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.confirmPasswordLabel}</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={t.confirmPasswordPlaceholder}
            autoComplete="new-password"
            disabled={isSubmitting || isGoogleAccount}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#03140e] border border-emerald-800/60 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition disabled:opacity-50"
          />
        </div>

        {/* 4. Action Button: Update Password */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isGoogleAccount}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/60 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t.updatingPassword}</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-emerald-200" />
                <span>{t.updatePasswordBtn}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )}
</div>
);
};
