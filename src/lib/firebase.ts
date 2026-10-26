import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

// Dedicated Firebase Configuration for S S Pharma (siam-deu-pharma)
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDGmfK-cHpN_8EenevmJdpdD-W8Jq56Z_Y",
  authDomain: "siam-deu-pharma.firebaseapp.com",
  databaseURL: "https://siam-deu-pharma-default-rtdb.firebaseio.com",
  projectId: "siam-deu-pharma",
  storageBucket: "siam-deu-pharma.firebasestorage.app",
  messagingSenderId: "24684421701",
  appId: "1:24684421701:web:61c9a90169140aceceb92c"
};

// Initialize Firebase App instance singleton
const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];

// Configure log level to suppress non-fatal connection warnings during offline/retry states
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Initialize Firestore with IndexedDB multi-tab offline persistence & auto-detect long polling
const firestoreConfig = {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
};

let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(app, firestoreConfig, '(default)');
} catch {
  try {
    firestoreDb = initializeFirestore(app, firestoreConfig);
  } catch {
    firestoreDb = getFirestore(app);
  }
}

export const db = firestoreDb;
export const firestoreDB = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection helper with graceful offline handling
export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Connection check timeout')), 2500)
    );
    await Promise.race([
      getDoc(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    return true;
  } catch {
    return false;
  }
}
