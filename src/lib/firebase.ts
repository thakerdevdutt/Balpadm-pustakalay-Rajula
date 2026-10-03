import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel 
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "bright-polygon-8zp2g",
  appId: "1:693266031887:web:dd0ff70d949e1c50580a7a",
  apiKey: "AIzaSyCS1XsUfwoptMczKCVMDHiuXzzwtUor5d0",
  authDomain: "bright-polygon-8zp2g.firebaseapp.com",
  storageBucket: "bright-polygon-8zp2g.firebasestorage.app",
  messagingSenderId: "693266031887",
};

export const FIRESTORE_DATABASE_ID = "ai-studio-lekhsangrah-cef2db47-6867-4f02-b7ed-81f45b5e98a4";

// Suppress non-fatal Firestore offline retry messages from triggering error bounds
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Initialize Firebase App safely (avoid duplicate initialization in HMR)
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore reliably with persistent IndexedDB cache (0 network reads on repeat visits)
let firestoreInstance;
try {
  const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
  if (isBrowser) {
    firestoreInstance = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalAutoDetectLongPolling: true,
    }, FIRESTORE_DATABASE_ID);
  } else {
    firestoreInstance = initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    }, FIRESTORE_DATABASE_ID);
  }
} catch {
  firestoreInstance = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID);
}
export const db = firestoreInstance;

