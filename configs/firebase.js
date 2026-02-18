// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, doc, getDoc, getDocFromServer, setDoc, onSnapshot, collection, query, where, limit } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
// Firebase Storage omitted here to avoid @firebase/storage bundling issues in Expo/RN.
// Use getStorage(app) from "firebase/storage" in a screen that needs uploads if required.

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2MVTPMsY3XlgzcIjDWqfJTWP1CsdnFvY",
    authDomain: "inspire-wallet.firebaseapp.com",
    projectId: "inspire-wallet",
    storageBucket: "inspire-wallet.firebasestorage.app",
    messagingSenderId: "1091026046056",
    appId: "1:1091026046056:web:1440a666dad63cc9cb3fdd",
    measurementId: "G-HSVD3JN0S9"
};

let app;
let auth;
let firestore;
let storage;

const isWeb = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

try {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        // Web: getAuth uses browser persistence. Native: getReactNativePersistence required.
        if (isWeb) {
            auth = getAuth(app);
        } else {
            auth = initializeAuth(app, {
                persistence: getReactNativePersistence(ReactNativeAsyncStorage)
            });
        }
        firestore = getFirestore(app);
        storage = null;

        if (isWeb) {
            try {
                enableIndexedDbPersistence(firestore).catch((err) => {
                    if (err?.code === 'failed-precondition' || err?.code === 'unimplemented') return;
                    console.warn('Firebase persistence:', err?.message);
                });
            } catch (_) {}
        }
    } else {
        app = getApp();
        auth = getAuth(app);
        firestore = getFirestore(app);
        storage = null;
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
    app = undefined;
    auth = null;
    firestore = null;
    storage = null;
}

/**
 * Subscribe to the user document. Callback receives user data or null. Returns unsubscribe function.
 */
function subscribeToUser(uid, callback) {
    if (!firestore || !uid) return () => {};
    const ref = doc(firestore, "users", uid);
    return onSnapshot(ref, (snap) => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, (err) => {
        console.warn("subscribeToUser error:", err?.message);
        callback(null);
    });
}

/**
 * Subscribe to recent transactions for a user. Callback receives array of transaction docs. Returns unsubscribe function.
 * Uses subcollection users/{uid}/transactions. If you have createdAt, add: orderBy("createdAt", "desc") and a Firestore index.
 */
function subscribeToTransactions(uid, callback) {
    if (!firestore || !uid) return () => {};
    const ref = collection(firestore, "users", uid, "transactions");
    const q = query(ref, limit(50));
    return onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        callback(list);
    }, (err) => {
        console.warn("subscribeToTransactions error:", err?.message);
        callback([]);
    });
}

/**
 * Subscribe to unread notifications count for a user. Callback receives count (number). Returns unsubscribe function.
 * Uses subcollection users/{uid}/notifications where read != true (or unread == true if you use that field).
 */
function subscribeToNotifications(uid, callback) {
    if (!firestore || !uid) return () => {};
    const ref = collection(firestore, "users", uid, "notifications");
    const q = query(ref, where("read", "==", false), limit(500));
    return onSnapshot(q, (snap) => {
        callback(snap.size);
    }, (err) => {
        console.warn("subscribeToNotifications error:", err?.message);
        callback(0);
    });
}

export {
    app,
    auth,
    firestore,
    storage,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    doc,
    getDoc,
    getDocFromServer,
    setDoc,
    subscribeToUser,
    subscribeToTransactions,
    subscribeToNotifications,
};  