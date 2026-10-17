/**
 * Formats Firebase Authentication errors into friendly, localized messages
 * without flooding the console with uncaught error stacks.
 */

export interface ParsedAuthError {
  code: string;
  isEmailAlreadyInUse: boolean;
  isUserNotFound: boolean;
  isWrongPassword: boolean;
  messageEn: string;
  messageBn: string;
}

export function parseAuthError(err: unknown): ParsedAuthError {
  let code = '';
  let rawMessage = '';

  if (err && typeof err === 'object') {
    if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
      code = (err as { code: string }).code;
    }
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      rawMessage = (err as { message: string }).message;
    }
  } else if (typeof err === 'string') {
    rawMessage = err;
  }

  // Fallback to match code inside raw message if code property wasn't set directly
  if (!code && rawMessage) {
    const match = rawMessage.match(/\((auth\/[^)]+)\)/);
    if (match) {
      code = match[1];
    }
  }

  const isEmailAlreadyInUse = code === 'auth/email-already-in-use' || rawMessage.includes('email-already-in-use');
  const isUserNotFound = code === 'auth/user-not-found' || rawMessage.includes('user-not-found');
  const isWrongPassword = code === 'auth/wrong-password' || rawMessage.includes('wrong-password');
  const isInvalidCredential = code === 'auth/invalid-credential' || rawMessage.includes('invalid-credential');
  const isWeakPassword = code === 'auth/weak-password' || rawMessage.includes('weak-password');
  const isInvalidEmail = code === 'auth/invalid-email' || rawMessage.includes('invalid-email');
  const isTooManyRequests = code === 'auth/too-many-requests' || rawMessage.includes('too-many-requests');
  const isPopupClosed = code === 'auth/popup-closed-by-user' || rawMessage.includes('popup-closed-by-user');
  const isNetworkError = code === 'auth/network-request-failed' || rawMessage.includes('network-request-failed');

  let messageEn = 'Authentication failed. Please try again.';
  let messageBn = 'অথেন্টিকেশন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।';

  if (isEmailAlreadyInUse) {
    messageEn = 'This email is already registered. Please sign in with your password or use another email.';
    messageBn = 'এই ইমেইলটি দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।';
  } else if (isWrongPassword || isInvalidCredential) {
    messageEn = 'Incorrect email or password. Please verify and try again.';
    messageBn = 'ভুল ইমেইল বা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
  } else if (isUserNotFound) {
    messageEn = 'No account found with this email. Please sign up first.';
    messageBn = 'এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে সাইন আপ করুন।';
  } else if (isWeakPassword) {
    messageEn = 'Password is too weak. Please use at least 6 characters.';
    messageBn = 'পাসওয়ার্ড খুব ছোট। কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।';
  } else if (isInvalidEmail) {
    messageEn = 'Please provide a valid email address.';
    messageBn = 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।';
  } else if (isTooManyRequests) {
    messageEn = 'Too many attempts. Access is temporarily paused; please try again later.';
    messageBn = 'অনেকবার ভুল চেষ্টার কারণে সাময়িক বিরতি। কিছুক্ষণ পর আবার চেষ্টা করুন।';
  } else if (isPopupClosed) {
    messageEn = 'Sign-in window was closed before completion.';
    messageBn = 'সাইন-ইন উইন্ডো বন্ধ করা হয়েছে।';
  } else if (isNetworkError) {
    messageEn = 'Network connection problem. Please check your internet connection.';
    messageBn = 'ইন্টারনেট সংযোগ সমস্যা। আপনার নেটওয়ার্ক চেক করুন।';
  }

  return {
    code,
    isEmailAlreadyInUse,
    isUserNotFound,
    isWrongPassword,
    messageEn,
    messageBn
  };
}
