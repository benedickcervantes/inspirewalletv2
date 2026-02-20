import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import {
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type Auth,
} from "firebase/auth";

const getReactNativePersistence = (firebaseAuth as { getReactNativePersistence?: (storage: unknown) => unknown }).getReactNativePersistence;
import {
  collection,
  doc,
  enableIndexedDbPersistence,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentReference,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD2MVTPMsY3XlgzcIjDWqfJTWP1CsdnFvY",
  authDomain: "inspire-wallet.firebaseapp.com",
  projectId: "inspire-wallet",
  storageBucket: "inspire-wallet.firebasestorage.app",
  messagingSenderId: "1091026046056",
  appId: "1:1091026046056:web:1440a666dad63cc9cb3fdd",
  measurementId: "G-HSVD3JN0S9",
};

export interface UserData {
  id: string;
  [key: string]: unknown;
}

export interface TransactionDoc {
  id: string;
  createdAt?: { toMillis?: () => number };
  [key: string]: unknown;
}

let app: FirebaseApp | undefined;
let auth: Auth | null;
let firestore: Firestore | null;
let storage: null = null;

const isWeb = typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    if (isWeb) {
      auth = getAuth(app);
    } else {
      auth = getReactNativePersistence
        ? initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage) as import("firebase/auth").Persistence,
          })
        : getAuth(app);
    }
    firestore = getFirestore(app);

    if (isWeb && firestore) {
      try {
        enableIndexedDbPersistence(firestore).catch((err: { code?: string; message?: string }) => {
          if (err?.code === "failed-precondition" || err?.code === "unimplemented") return;
          console.warn("Firebase persistence:", err?.message);
        });
      } catch {
        // ignore
      }
    }
  } else {
    app = getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  app = undefined;
  auth = null;
  firestore = null;
}

function subscribeToUser(
  uid: string,
  callback: (data: UserData | null) => void
): Unsubscribe {
  if (!firestore || !uid) return () => {};
  const ref = doc(firestore, "users", uid) as DocumentReference;
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as UserData) : null);
    },
    (err) => {
      console.warn("subscribeToUser error:", err?.message);
      callback(null);
    }
  );
}

function subscribeToTransactions(
  uid: string,
  callback: (list: TransactionDoc[]) => void
): Unsubscribe {
  if (!firestore || !uid) return () => {};
  const ref = collection(firestore, "users", uid, "transactions");
  const q = query(ref, limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TransactionDoc));
      list.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
      callback(list);
    },
    (err) => {
      console.warn("subscribeToTransactions error:", err?.message);
      callback([]);
    }
  );
}

function subscribeToNotifications(uid: string, callback: (count: number) => void): Unsubscribe {
  if (!firestore || !uid) return () => {};
  const ref = collection(firestore, "users", uid, "notifications");
  const q = query(ref, where("read", "==", false), limit(500));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.size);
    },
    (err) => {
      console.warn("subscribeToNotifications error:", err?.message);
      callback(0);
    }
  );
}

export {
  app,
  auth,
  doc,
  firestore,
  getDoc,
  getDocFromServer,
  onAuthStateChanged,
  setDoc,
  signInWithEmailAndPassword,
  storage,
  subscribeToNotifications,
  subscribeToTransactions,
  subscribeToUser,
};
