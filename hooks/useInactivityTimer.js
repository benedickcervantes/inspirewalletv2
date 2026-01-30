import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../configs/firebase';
import { useRouter, usePathname } from 'expo-router';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const LOG_INTERVAL = 60 * 1000; // 1 minute in milliseconds

// Routes where inactivity timer should NOT run (login, passcode, register, etc.)
const EXCLUDED_ROUTES = ['/', '/register', '/forgotpassword'];

/**
 * Custom hook to track user inactivity and automatically logout after 15 minutes
 * Logs every minute to console to track inactivity progress
 * Only starts when user enters the dashboard (main screen), excludes login and passcode screens
 */
export const useInactivityTimer = (isAuthenticated) => {
  const router = useRouter();
  const pathname = usePathname();
  const inactivityTimerRef = useRef(null);
  const logIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const minutesElapsedRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  // Check if current route should have inactivity timer active
  const shouldTimerBeActive = useCallback(() => {
    // Timer should only be active if:
    // 1. User is authenticated
    // 2. User is NOT on excluded routes (login, passcode, register, etc.)
    // 3. User is on dashboard or other authenticated screens
    return isAuthenticated && !EXCLUDED_ROUTES.includes(pathname);
  }, [isAuthenticated, pathname]);

  // Handle auto-logout
  const handleAutoLogout = useCallback(async () => {
    try {
      console.log('🚪 [Inactivity Timer] Starting automatic logout due to inactivity...');
      
      const user = auth.currentUser;
      if (user) {
        await signOut(auth);
        console.log('✅ [Inactivity Timer] User logged out successfully');
      }
      
      // Navigate to login screen
      router.replace('/');
    } catch (error) {
      console.error('❌ [Inactivity Timer] Error during auto-logout:', error);
      // Force navigation even if signOut fails
      router.replace('/');
    }
  }, [router]);

  // Reset inactivity timer
  const resetTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    lastActivityRef.current = Date.now();
    minutesElapsedRef.current = 0;
    
    if (shouldTimerBeActive()) {
      // Set timeout for auto-logout after 15 minutes
      inactivityTimerRef.current = setTimeout(() => {
        console.log('⏰ [Inactivity Timer] 15 minutes of inactivity reached. Logging out...');
        handleAutoLogout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [shouldTimerBeActive, handleAutoLogout]);

  // Track user activity
  const trackActivity = useCallback(() => {
    if (shouldTimerBeActive()) {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // Only reset if there was actual inactivity (more than 1 second)
      if (timeSinceLastActivity > 1000) {
        console.log('👆 [Inactivity Timer] User activity detected. Resetting timer.');
        resetTimer();
      }
    }
  }, [shouldTimerBeActive, resetTimer]);

  // Log every minute
  useEffect(() => {
    if (!shouldTimerBeActive()) {
      return;
    }

    logIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;
      const minutesInactive = Math.floor(inactiveTime / LOG_INTERVAL);
      
      if (minutesInactive > 0 && minutesInactive < 15) {
        minutesElapsedRef.current = minutesInactive;
        const remainingMinutes = 15 - minutesInactive;
        console.log(`⏱️ [Inactivity Timer] ${minutesInactive} minute(s) of inactivity. ${remainingMinutes} minute(s) remaining before auto-logout.`);
      }
    }, LOG_INTERVAL);

    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
      }
    };
  }, [shouldTimerBeActive]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!shouldTimerBeActive()) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - reset timer only if on authenticated screen
        if (shouldTimerBeActive()) {
          console.log('📱 [Inactivity Timer] App came to foreground. Resetting timer.');
          resetTimer();
        }
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background - pause timer (don't logout when app is in background)
        console.log('📱 [Inactivity Timer] App went to background. Timer paused.');
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [shouldTimerBeActive, resetTimer]);

  // Initialize timer when user enters dashboard (main screen)
  useEffect(() => {
    if (shouldTimerBeActive()) {
      // User entered dashboard or authenticated screen - start timer
      console.log(`🔐 [Inactivity Timer] User entered dashboard (${pathname}). Starting inactivity timer (15 minutes).`);
      resetTimer();
    } else {
      // Clear timers when user is on excluded routes or not authenticated
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
        logIntervalRef.current = null;
      }
      
      if (EXCLUDED_ROUTES.includes(pathname)) {
        console.log(`🚫 [Inactivity Timer] Timer paused - user is on excluded route (${pathname}).`);
      } else if (!isAuthenticated) {
        console.log('🔓 [Inactivity Timer] User not authenticated. Timer cleared.');
      }
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
      }
    };
  }, [isAuthenticated, pathname, shouldTimerBeActive, resetTimer]);

  // Return activity tracker function that can be called from components
  return { trackActivity };
};

