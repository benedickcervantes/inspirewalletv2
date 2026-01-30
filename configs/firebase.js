// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getStorage } from "firebase/storage";
import Constants from 'expo-constants';

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

try {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
        });
        firestore = getFirestore(app);
        storage = getStorage(app);

        // Enable offline persistence
        enableIndexedDbPersistence(firestore).catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time.
                console.warn('Firebase persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                // The current browser doesn't support persistence
                console.warn('Firebase persistence not supported on this platform');
            }
        });
    } else {
        app = getApp();
        auth = getAuth(app);
        firestore = getFirestore(app);
        storage = getStorage(app);
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
    // Re-throw critical initialization errors
    throw error;
}

export { app, auth, firestore, storage };  