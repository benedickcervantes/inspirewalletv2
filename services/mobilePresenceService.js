import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { firestore as db } from '../configs/firebase';

class MobilePresenceService {
  constructor() {
    this.presenceListeners = new Map();
    this.heartbeatInterval = null;
    this.isActive = false;
  }

  // Initialize presence detection for user
  async initializePresence(userId, userInfo = {}) {
    try {
      this.userId = userId;
      this.isActive = true;

      // Set initial presence
      await this.setUserOnline(userInfo);

      // Start heartbeat to maintain online status
      this.startHeartbeat();

      // Listen for visibility changes
      this.setupVisibilityListeners();

      // Listen for app state changes (mobile)
      this.setupAppStateListeners();

      return { success: true };
    } catch (error) {
      console.error('Error initializing presence:', error);
      throw error;
    }
  }

  // Set user as online
  async setUserOnline(userInfo = {}) {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);

      await setDoc(presenceRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        platform: 'mobile',
        deviceInfo: {
          userAgent: navigator.userAgent || 'Mobile App',
          platform: userInfo.platform || 'mobile',
          version: userInfo.appVersion || '1.0.0'
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Also update any active chat rooms
      await this.updateChatRoomPresence(true);

    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  // Set user as offline
  async setUserOffline() {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);

      await updateDoc(presenceRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Also update any active chat rooms
      await this.updateChatRoomPresence(false);

    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  // Update presence in active chat rooms
  async updateChatRoomPresence(isOnline) {
    try {
      if (!this.userId) return;

      // This would be called from the chat service when a chat room is active
      // We'll implement this as a callback mechanism
      if (this.onPresenceChange) {
        this.onPresenceChange(isOnline);
      }

    } catch (error) {
      console.error('Error updating chat room presence:', error);
    }
  }

  // Set callback for presence changes
  setPresenceChangeCallback(callback) {
    this.onPresenceChange = callback;
  }

  // Start heartbeat to maintain online status
  startHeartbeat() {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      if (this.isActive && this.userId) {
        try {
          const presenceRef = doc(db, 'presence', this.userId);
          await updateDoc(presenceRef, {
            lastSeen: serverTimestamp(),
            heartbeat: Date.now()
          });
        } catch (error) {
          console.error('Heartbeat error:', error);
        }
      }
    }, 30000);
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Setup visibility change listeners (web)
  setupVisibilityListeners() {
    // React Native doesn't have document.visibilitychange
    // Use AppState instead for React Native
    try {
      const { AppState } = require('react-native');
      
      const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          this.handleAppBackground();
        } else if (nextAppState === 'active') {
          this.handleAppForeground();
        }
      };

      this.appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

      // Cleanup function
      this.cleanupVisibilityListener = () => {
        if (this.appStateSubscription) {
          this.appStateSubscription.remove();
        }
      };
    } catch (error) {
      console.warn('AppState not available:', error);
    }
  }

  // Setup app state listeners (React Native)
  setupAppStateListeners() {
    // This is now handled by setupVisibilityListeners in React Native
    // No additional setup needed since AppState handles both focus/blur and visibility
    console.log('AppState listeners setup via setupVisibilityListeners');
  }

  // Handle app going to background
  async handleAppBackground() {
    try {
      if (this.userId) {
        // Don't immediately set offline, just update last seen
        const presenceRef = doc(db, 'presence', this.userId);
        await updateDoc(presenceRef, {
          lastSeen: serverTimestamp(),
          isBackground: true
        });
      }
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  }

  // Handle app coming to foreground
  async handleAppForeground() {
    try {
      if (this.userId) {
        const presenceRef = doc(db, 'presence', this.userId);
        await updateDoc(presenceRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
          isBackground: false
        });

        // Update chat room presence
        await this.updateChatRoomPresence(true);
      }
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }

  // Subscribe to another user's presence
  subscribeToUserPresence(userId, callback) {
    if (this.presenceListeners.has(userId)) {
      this.presenceListeners.get(userId)();
    }

    const presenceRef = doc(db, 'presence', userId);

    const unsubscribe = onSnapshot(presenceRef, (doc) => {
      if (doc.exists()) {
        const presenceData = doc.data();

        // Determine if user is truly online based on last seen
        const now = new Date();
        const lastSeen = presenceData.lastSeen?.toDate() || new Date(0);
        const timeDiff = now - lastSeen;

        // Consider user offline if no activity for more than 2 minutes
        const isReallyOnline = presenceData.isOnline && timeDiff < 120000;

        callback({
          userId,
          isOnline: isReallyOnline,
          lastSeen: presenceData.lastSeen,
          platform: presenceData.platform,
          isBackground: presenceData.isBackground || false
        });
      } else {
        callback({
          userId,
          isOnline: false,
          lastSeen: null,
          platform: null,
          isBackground: false
        });
      }
    });

    this.presenceListeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  // Unsubscribe from user presence
  unsubscribeFromUserPresence(userId) {
    if (this.presenceListeners.has(userId)) {
      this.presenceListeners.get(userId)();
      this.presenceListeners.delete(userId);
    }
  }

  // Get user's current presence status
  async getUserPresence(userId) {
    try {
      const presenceRef = doc(db, 'presence', userId);
      const presenceDoc = await getDoc(presenceRef);

      if (!presenceDoc.exists()) {
        return {
          isOnline: false,
          lastSeen: null,
          platform: null
        };
      }

      const presenceData = presenceDoc.data();

      // Check if user is truly online
      const now = new Date();
      const lastSeen = presenceData.lastSeen?.toDate() || new Date(0);
      const timeDiff = now - lastSeen;

      const isReallyOnline = presenceData.isOnline && timeDiff < 120000;

      return {
        isOnline: isReallyOnline,
        lastSeen: presenceData.lastSeen,
        platform: presenceData.platform,
        isBackground: presenceData.isBackground || false
      };

    } catch (error) {
      console.error('Error getting user presence:', error);
      return {
        isOnline: false,
        lastSeen: null,
        platform: null
      };
    }
  }

  // Cleanup all presence listeners and intervals
  cleanup() {
    this.isActive = false;

    // Stop heartbeat
    this.stopHeartbeat();

    // Set user offline
    if (this.userId) {
      this.setUserOffline();
    }

    // Cleanup all presence listeners
    this.presenceListeners.forEach(unsubscribe => unsubscribe());
    this.presenceListeners.clear();

    // Cleanup event listeners
    if (this.cleanupVisibilityListener) {
      this.cleanupVisibilityListener();
    }

    if (this.cleanupAppStateListener) {
      this.cleanupAppStateListener();
    }

    // Reset state
    this.userId = null;
    this.onPresenceChange = null;
  }

  // Force refresh presence status
  async refreshPresence() {
    if (this.userId && this.isActive) {
      await this.setUserOnline();
    }
  }
}

// Export singleton instance
export const mobilePresenceService = new MobilePresenceService();