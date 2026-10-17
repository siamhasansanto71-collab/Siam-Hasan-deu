import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Store, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  AlertCircle, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  RotateCcw,
  Sparkles,
  Camera,
  Mail,
  Award,
  Type,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';
import { PharmacyProfile } from '../types/ledger';
import { ChangePasswordSection } from './ChangePasswordSection';

interface PharmacyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PharmacyProfileModal: React.FC<PharmacyProfileModalProps> = ({ isOpen, onClose }) => {
  const { userStoreProfile, updateUserStoreProfile } = useLedger();
  const { signOut } = useAuth();
  const { t } = useLanguage();

  const [storeName, setStoreName] = useState(userStoreProfile.storeName || '');
  const [storeNameBn, setStoreNameBn] = useState(userStoreProfile.storeNameBn || '');
  const [address, setAddress] = useState(userStoreProfile.address || '');
  const [contactPhone, setContactPhone] = useState(userStoreProfile.contactPhone || '');
  const [proprietorName, setProprietorName] = useState(userStoreProfile.proprietorName || '');
  const [licenseNumber, setLicenseNumber] = useState(userStoreProfile.licenseNumber || '');
  const [dgdaRegNumber, setDgdaRegNumber] = useState(userStoreProfile.dgdaRegNumber || '');
  const [email, setEmail] = useState(userStoreProfile.email || '');
  const [tagline, setTagline] = useState(userStoreProfile.tagline || '');
  const [logoUrl, setLogoUrl] = useState(userStoreProfile.logoUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStoreName(userStoreProfile.storeName || '');
      setStoreNameBn(userStoreProfile.storeNameBn || '');
      setAddress(userStoreProfile.address || '');
      setContactPhone(userStoreProfile.contactPhone || '');
      setProprietorName(userStoreProfile.proprietorName || '');
      setLicenseNumber(userStoreProfile.licenseNumber || '');
      setDgdaRegNumber(userStoreProfile.dgdaRegNumber || '');
      setEmail(userStoreProfile.email || '');
      setTagline(userStoreProfile.tagline || '');
      setLogoUrl(userStoreProfile.logoUrl || '');
      setSavedSuccess(false);
      setError('');
    }
  }, [isOpen, userStoreProfile]);

  if (!isOpen) return null;

  // Handle local image file upload and compress to max 256px thumbnail
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setLogoUrl(dataUrl);
          setError('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setLogoUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('Store Name is required');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Contact Phone / WhatsApp Number is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await updateUserStoreProfile({
        storeName: storeName.trim(),
        storeNameBn: storeNameBn.trim(),
        address: address.trim(),
        contactPhone: contactPhone.trim(),
        proprietorName: proprietorName.trim(),
        licenseNumber: licenseNumber.trim(),
        dgdaRegNumber: dgdaRegNumber.trim(),
        email: email.trim(),
        tagline: tagline.trim(),
        logoUrl: logoUrl.trim()
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to save pharmacy profile:', err);
      setError('Failed to save profile. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#062217] border border-emerald-500/50 shadow-2xl shadow-emerald-950 p-4 sm:p-6 overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>{t.profileModalTitle}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage your pharmacy brand, logo, proprietor & DGDA license
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-emerald-950 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-2.5 rounded-xl bg-rose-900/50 border border-rose-600/60 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="my-3 p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-500/60 text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{t.profileSavedSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5 my-4 max-h-[68vh] overflow-y-auto pr-1">
          {/* Logo Upload & Preview Section */}
          <div className="p-3.5 rounded-2xl bg-[#041910] border border-emerald-800/50">
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              {t.logoUpload}
            </label>
            <div className="flex items-center gap-4">
              {/* Logo Preview Avatar */}
              <div className="relative w-16 h-16 rounded-2xl bg-[#072b1c] border-2 border-emerald-500/40 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Pharmacy Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Store className="w-8 h-8 text-emerald-400 mx-auto" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoUrl ? t.changeImageBtn : t.uploadImageBtn}</span>
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-950/80 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-emerald-800/60"
                      title={t.removeLogoBtn}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  PNG, JPG or WebP. Saved and synced in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Store Names (English & Bengali) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                {t.storeNameEn} *
              </label>
              <input
                type="text"
                required
                value={storeName || ""}
                onChange={(e) => setStoreName(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                {t.storeNameBn}
              </label>
              <input
                type="text"
                value={storeNameBn || ""}
                onChange={(e) => setStoreNameBn(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Proprietor Name & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.proprietorName} *</span>
              </label>
              <input
                type="text"
                required
                value={proprietorName || ""}
                onChange={(e) => setProprietorName(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-emerald-400" />
                <span>System Tagline</span>
              </label>
              <input
                type="text"
                value={tagline || ""}
                onChange={(e) => setTagline(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Contact / WhatsApp & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contact / WhatsApp *</span>
              </label>
              <input
                type="tel"
                required
                value={contactPhone || ""}
                onChange={(e) => setContactPhone(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Direct Email</span>
              </label>
              <input
                type="email"
                value={email || ""}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Location / Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Location / Address</span>
            </label>
            <input
              type="text"
              value={address || ""}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="off"
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Government Registration: Drug License No & DGDA Registration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Drug License No</span>
              </label>
              <input
                type="text"
                value={licenseNumber || ""}
                onChange={(e) => setLicenseNumber(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>DGDA Registration</span>
              </label>
              <input
                type="text"
                value={dgdaRegNumber || ""}
                onChange={(e) => setDgdaRegNumber(e.target.value)}
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#04160f] border border-emerald-800/60 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Change Password Section right above Sign Out */}
          <ChangePasswordSection collapsible={true} defaultExpanded={false} className="mt-4 mb-2" />

          {/* Footer: Log Out on left, Cancel & Save on right */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-emerald-900/50">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-600/50 shadow-md shadow-rose-950/50 transition-all active:scale-95 disabled:opacity-50"
              title="Log Out from Siam Pharma"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>{isLoggingOut ? 'Logging Out...' : t.signOut}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : t.saveProfileBtn}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
