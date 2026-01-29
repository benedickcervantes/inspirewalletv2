// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getStorage } from "firebase/storage";

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
        // Note: IndexedDB persistence is not supported in React Native
        // Firebase will use memory cache automatically
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
