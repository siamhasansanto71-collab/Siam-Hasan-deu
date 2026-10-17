import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  type User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as fbSignOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously as fbSignInAnonymously,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { parseAuthError } from '../lib/authErrorHandler';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string) => Promise<void>;
  sendPasswordReset: (e: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  setDemoMode: (val: boolean) => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsDemoMode(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsDemoMode(false);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      console.warn('Google Sign-in status:', parsed.messageEn);
      setAuthError(parsed.messageEn);
      const customErr = new Error(parsed.messageEn);
      (customErr as unknown as { code: string }).code = parsed.code;
      throw customErr;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setIsDemoMode(false);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      console.warn('Email Sign-in status:', parsed.messageEn);
      setAuthError(parsed.messageEn);
      const customErr = new Error(parsed.messageEn);
      (customErr as unknown as { code: string }).code = parsed.code;
      throw customErr;
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      setIsDemoMode(false);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      console.warn('Registration notice:', parsed.messageEn);
      setAuthError(parsed.messageEn);
      const customErr = new Error(parsed.messageEn);
      (customErr as unknown as { code: string }).code = parsed.code;
      throw customErr;
    }
  };

  const sendPasswordReset = async (email: string) => {
    setAuthError(null);
    try {
      await fbSendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      console.warn('Password reset notice:', parsed.messageEn);
      setAuthError(parsed.messageEn);
      const customErr = new Error(parsed.messageEn);
      (customErr as unknown as { code: string }).code = parsed.code;
      throw customErr;
    }
  };

  const signInAnonymously = async () => {
    setAuthError(null);
    try {
      await fbSignInAnonymously(auth);
      setIsDemoMode(false);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      console.warn('Anonymous sign-in status:', parsed.messageEn);
      setAuthError(parsed.messageEn);
      const customErr = new Error(parsed.messageEn);
      (customErr as unknown as { code: string }).code = parsed.code;
      throw customErr;
    }
  };

  const changeUserPassword = async (currentPassword: string, newPassword: string) => {
    setAuthError(null);
    if (!user) {
      if (isDemoMode) {
        // Simulated success in Demo Mode
        await new Promise((res) => setTimeout(res, 500));
        return;
      }
      throw new Error('You must be signed in to change your password.');
    }

    if (!user.email) {
      throw new Error('This account does not have an email address associated with it.');
    }

    // Check if user is signed in solely with third-party provider like Google
    const hasPasswordProvider = user.providerData?.some(
      (p) => p.providerId === 'password'
    );
    const isGoogleOnly =
      user.providerData?.some((p) => p.providerId === 'google.com') &&
      !hasPasswordProvider;

    if (isGoogleOnly) {
      throw new Error(
        'This account was signed in via Google. Password updates are only applicable to accounts registered with email and password.'
      );
    }

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Update password
      await fbUpdatePassword(user, newPassword);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      let errMsg = parsed.messageEn;
      if (
        parsed.isWrongPassword ||
        parsed.code === 'auth/wrong-password' ||
        parsed.code === 'auth/invalid-credential'
      ) {
        errMsg = 'Current password is incorrect. Please check and try again.';
      } else if (parsed.code === 'auth/requires-recent-login') {
        errMsg = 'For security reasons, please log out and sign in again before changing your password.';
      } else if (parsed.code === 'auth/weak-password') {
        errMsg = 'New password is too weak. Please use at least 6 characters.';
      }
      setAuthError(errMsg);
      const customErr = new Error(errMsg);
      (customErr as unknown as { code: string }).code = parsed.code;
      throw customErr;
    }
  };

  const signOut = async () => {
    setAuthError(null);
    setUser(null);
    setIsDemoMode(false);
    try {
      await fbSignOut(auth);
    } catch (err: unknown) {
      console.warn('Firebase sign out status:', err);
    }
    try {
      localStorage.removeItem('siam_pharma_demo');
      localStorage.removeItem('siam_pharma_active_session');
      sessionStorage.clear();
    } catch {
      // Storage clearance best-effort
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        authError,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        signInAnonymously,
        changeUserPassword,
        signOut,
        setDemoMode: setIsDemoMode,
        clearAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
