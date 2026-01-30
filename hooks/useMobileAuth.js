import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore as db } from '../configs/firebase';

export const useMobileAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          ...userData
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login time
      await setDoc(doc(db, 'users', user.uid), {
        lastLoginAt: serverTimestamp(),
        platform: 'mobile'
      }, { merge: true });

      return { success: true, user };
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Provide more specific error messages
      let userMessage = error.message;
      if (error.code === 'auth/invalid-credential') {
        userMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.code === 'auth/user-not-found') {
        userMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/user-disabled') {
        userMessage = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        userMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/too-many-requests') {
        userMessage = 'Too many failed login attempts. Please try again later.';
      }
      
      setError(userMessage);
      return { success: false, error: userMessage, code: error.code };
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, {
        displayName: displayName
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: displayName,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        platform: 'mobile',
        isActive: true,
        role: 'user'
      });

      // Initialize presence document
      await setDoc(doc(db, 'presence', user.uid), {
        isOnline: true,
        lastSeen: serverTimestamp(),
        platform: 'mobile'
      });

      return { success: true, user };
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setError(null);

      if (user) {
        // Update presence to offline
        await setDoc(doc(db, 'presence', user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
          platform: 'mobile'
        }, { merge: true });
      }

      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      setError(null);

      // Update Firebase Auth profile if display name changed
      if (updates.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName
        });
      }

      // Update Firestore user document
      await setDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update local user state
      setUser(prev => ({ ...prev, ...updates }));

      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Get user profile
  const getUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin' || user?.isAdmin === true;
  };

  // Set user online status
  const setOnlineStatus = async (isOnline) => {
    try {
      if (!user) return;

      await setDoc(doc(db, 'presence', user.uid), {
        isOnline,
        lastSeen: serverTimestamp(),
        platform: 'mobile'
      }, { merge: true });
    } catch (error) {
      console.error('Set online status error:', error);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    logout,
    updateUserProfile,
    getUserProfile,
    isAdmin,
    setOnlineStatus,
    isAuthenticated: !!user
  };
};