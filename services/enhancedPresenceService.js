import {
  doc,
  collection,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';

class EnhancedPresenceService {
  constructor() {
    this.presenceListeners = new Map();
    this.heartbeatIntervals = new Map();
    this.cleanupFunctions = new Map();
    this.isActive = false;
  }

  // Initialize enhanced presence with device and context info
  async initializePresence(userId, userInfo = {}) {
    try {
      this.userId = userId;
      this.isActive = true;

      const presenceData = {
        userId,
        isOnline: true,
        lastSeen: serverTimestamp(),
        status: 'online', // 'online', 'away', 'busy', 'offline'
        currentDevice: this.detectDevice(),
        platform: userInfo.platform || 'mobile',
        deviceInfo: {
          userAgent: navigator?.userAgent || 'Mobile App',
          screen: this.getScreenInfo(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator?.language || 'en'
        },
        activeConversations: [],
        isTyping: {},
        sessionStart: serverTimestamp(),
        heartbeatCount: 0,
        connectionQuality: 'good', // 'excellent', 'good', 'poor'
        features: {
          pushNotifications: userInfo.pushEnabled || false,
          voiceMessages: userInfo.voiceEnabled || false,
          fileUploads: userInfo.fileUploadsEnabled || true
        }
      };

      const presenceRef = doc(db, 'presence', userId);
      await setDoc(presenceRef, presenceData, { merge: true });

      // Start monitoring systems
      this.startHeartbeat();
      this.setupConnectionMonitoring();
      this.setupVisibilityMonitoring();
      this.setupBatteryMonitoring();

      return { success: true, presenceData };

    } catch (error) {
      console.error('Error initializing enhanced presence:', error);
      throw error;
    }
  }

  // Detect device type
  detectDevice() {
    if (typeof window === 'undefined') return 'server';

    const width = window.innerWidth || screen.width;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  // Get screen information
  getScreenInfo() {
    if (typeof window === 'undefined') return null;

    return {
      width: window.innerWidth || screen.width,
      height: window.innerHeight || screen.height,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.type || 'unknown'
    };
  }

  // Enhanced heartbeat with connection quality monitoring
  startHeartbeat() {
    const heartbeatInterval = setInterval(async () => {
      if (!this.isActive || !this.userId) return;

      try {
        const startTime = Date.now();

        const presenceRef = doc(db, 'presence', this.userId);
        await updateDoc(presenceRef, {
          lastSeen: serverTimestamp(),
          heartbeatCount: (await getDoc(presenceRef)).data()?.heartbeatCount + 1 || 1,
          heartbeat: Date.now()
        });

        // Calculate connection quality based on response time
        const responseTime = Date.now() - startTime;
        const quality = this.calculateConnectionQuality(responseTime);

        await updateDoc(presenceRef, {
          connectionQuality: quality,
          lastResponseTime: responseTime
        });

      } catch (error) {
        console.error('Enhanced heartbeat error:', error);
        await this.handleConnectionError();
      }
    }, 15000); // Every 15 seconds for better real-time feel

    this.heartbeatIntervals.set(this.userId, heartbeatInterval);
  }

  // Calculate connection quality
  calculateConnectionQuality(responseTime) {
    if (responseTime < 500) return 'excellent';
    if (responseTime < 1500) return 'good';
    if (responseTime < 3000) return 'fair';
    return 'poor';
  }

  // Handle connection errors
  async handleConnectionError() {
    try {
      if (this.userId) {
        const presenceRef = doc(db, 'presence', this.userId);
        await updateDoc(presenceRef, {
          connectionQuality: 'poor',
          lastConnectionError: serverTimestamp(),
          status: 'away'
        });
      }
    } catch (error) {
      console.error('Error handling connection error:', error);
    }
  }

  // Setup connection monitoring
  setupConnectionMonitoring() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const updateConnectionInfo = async () => {
        if (!this.userId) return;

        const connection = navigator.connection;
        const presenceRef = doc(db, 'presence', this.userId);

        await updateDoc(presenceRef, {
          networkInfo: {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          },
          updatedAt: serverTimestamp()
        });
      };

      navigator.connection.addEventListener('change', updateConnectionInfo);

      this.cleanupFunctions.set('connection', () => {
        navigator.connection.removeEventListener('change', updateConnectionInfo);
      });
    }
  }

  // Setup visibility monitoring
  setupVisibilityMonitoring() {
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = async () => {
        if (!this.userId) return;

        const isVisible = !document.hidden;
        const presenceRef = doc(db, 'presence', this.userId);

        await updateDoc(presenceRef, {
          isVisible,
          status: isVisible ? 'online' : 'away',
          lastVisibilityChange: serverTimestamp()
        });

        if (isVisible) {
          await this.refreshPresence();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      this.cleanupFunctions.set('visibility', () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }
  }

  // Setup battery monitoring
  setupBatteryMonitoring() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        const updateBatteryInfo = async () => {
          if (!this.userId) return;

          const presenceRef = doc(db, 'presence', this.userId);
          await updateDoc(presenceRef, {
            batteryInfo: {
              level: battery.level,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            },
            updatedAt: serverTimestamp()
          });
        };

        battery.addEventListener('chargingchange', updateBatteryInfo);
        battery.addEventListener('levelchange', updateBatteryInfo);

        this.cleanupFunctions.set('battery', () => {
          battery.removeEventListener('chargingchange', updateBatteryInfo);
          battery.removeEventListener('levelchange', updateBatteryInfo);
        });

        // Initial battery info
        updateBatteryInfo();
      }).catch(error => {
        console.log('Battery API not supported:', error);
      });
    }
  }

  // Set user status with reason
  async setUserStatus(status, reason = '', customMessage = '') {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);
      await updateDoc(presenceRef, {
        status,
        statusReason: reason,
        customMessage,
        statusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify all active conversations
      await this.notifyStatusChange(status);

    } catch (error) {
      console.error('Error setting user status:', error);
    }
  }

  // Set user as online with context
  async setUserOnline(context = {}) {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);
      await updateDoc(presenceRef, {
        isOnline: true,
        status: 'online',
        lastSeen: serverTimestamp(),
        onlineContext: {
          location: context.location || null,
          activity: context.activity || 'active',
          mood: context.mood || null
        },
        sessionDuration: context.sessionStart ? Date.now() - context.sessionStart : 0,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  // Set user as offline with graceful cleanup
  async setUserOffline(reason = 'user_action') {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);
      const currentPresence = await getDoc(presenceRef);

      if (currentPresence.exists()) {
        const presenceData = currentPresence.data();
        const sessionDuration = Date.now() - (presenceData.sessionStart?.toMillis() || Date.now());

        await updateDoc(presenceRef, {
          isOnline: false,
          status: 'offline',
          lastSeen: serverTimestamp(),
          offlineReason: reason,
          sessionDuration,
          totalSessionTime: (presenceData.totalSessionTime || 0) + sessionDuration,
          updatedAt: serverTimestamp()
        });
      }

      // Clear typing indicators
      await this.clearAllTypingStatus();

    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  // Join conversation (track active conversations)
  async joinConversation(conversationId) {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);
      const currentPresence = await getDoc(presenceRef);

      if (currentPresence.exists()) {
        const activeConversations = currentPresence.data().activeConversations || [];

        if (!activeConversations.includes(conversationId)) {
          await updateDoc(presenceRef, {
            activeConversations: [...activeConversations, conversationId],
            [`conversationJoinTime.${conversationId}`]: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

    } catch (error) {
      console.error('Error joining conversation:', error);
    }
  }

  // Leave conversation
  async leaveConversation(conversationId) {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);
      const currentPresence = await getDoc(presenceRef);

      if (currentPresence.exists()) {
        const activeConversations = currentPresence.data().activeConversations || [];
        const updatedConversations = activeConversations.filter(id => id !== conversationId);

        await updateDoc(presenceRef, {
          activeConversations: updatedConversations,
          [`conversationLeaveTime.${conversationId}`]: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Clear typing status for this conversation
        await updateDoc(presenceRef, {
          [`isTyping.${conversationId}`]: {
            isTyping: false,
            timestamp: serverTimestamp()
          }
        });
      }

    } catch (error) {
      console.error('Error leaving conversation:', error);
    }
  }

  // Update typing status with timeout management
  async updateTypingStatus(conversationId, isTyping, typingText = '') {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);

      if (isTyping) {
        await updateDoc(presenceRef, {
          [`isTyping.${conversationId}`]: {
            isTyping: true,
            timestamp: serverTimestamp(),
            typingText: typingText.substring(0, 50), // Limit preview text
            deviceType: this.detectDevice()
          },
          updatedAt: serverTimestamp()
        });

        // Auto-clear after 5 seconds
        setTimeout(async () => {
          try {
            await updateDoc(presenceRef, {
              [`isTyping.${conversationId}.isTyping`]: false
            });
          } catch (error) {
            console.error('Error auto-clearing typing status:', error);
          }
        }, 5000);
      } else {
        await updateDoc(presenceRef, {
          [`isTyping.${conversationId}.isTyping`]: false,
          [`isTyping.${conversationId}.timestamp`]: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }

  // Clear all typing status
  async clearAllTypingStatus() {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);
      const currentPresence = await getDoc(presenceRef);

      if (currentPresence.exists()) {
        const presenceData = currentPresence.data();
        const updates = {};

        if (presenceData.isTyping) {
          Object.keys(presenceData.isTyping).forEach(conversationId => {
            updates[`isTyping.${conversationId}.isTyping`] = false;
          });

          if (Object.keys(updates).length > 0) {
            await updateDoc(presenceRef, updates);
          }
        }
      }

    } catch (error) {
      console.error('Error clearing all typing status:', error);
    }
  }

  // Get enhanced presence information
  async getUserPresence(userId) {
    try {
      const presenceRef = doc(db, 'presence', userId);
      const presenceDoc = await getDoc(presenceRef);

      if (!presenceDoc.exists()) {
        return this.getDefaultPresence(userId);
      }

      const presenceData = presenceDoc.data();

      // Check if user is truly online based on last heartbeat
      const now = Date.now();
      const lastHeartbeat = presenceData.heartbeat || 0;
      const timeDiff = now - lastHeartbeat;

      // Consider offline if no heartbeat for more than 60 seconds
      const isReallyOnline = presenceData.isOnline && timeDiff < 60000;

      return {
        userId,
        isOnline: isReallyOnline,
        status: isReallyOnline ? presenceData.status : 'offline',
        lastSeen: presenceData.lastSeen,
        platform: presenceData.platform,
        currentDevice: presenceData.currentDevice,
        connectionQuality: presenceData.connectionQuality || 'unknown',
        activeConversations: presenceData.activeConversations || [],
        isTyping: presenceData.isTyping || {},
        customMessage: presenceData.customMessage || '',
        batteryInfo: presenceData.batteryInfo,
        networkInfo: presenceData.networkInfo,
        features: presenceData.features || {},
        sessionDuration: presenceData.sessionDuration || 0
      };

    } catch (error) {
      console.error('Error getting user presence:', error);
      return this.getDefaultPresence(userId);
    }
  }

  // Get default presence object
  getDefaultPresence(userId) {
    return {
      userId,
      isOnline: false,
      status: 'offline',
      lastSeen: null,
      platform: null,
      currentDevice: null,
      connectionQuality: 'unknown',
      activeConversations: [],
      isTyping: {},
      customMessage: '',
      batteryInfo: null,
      networkInfo: null,
      features: {},
      sessionDuration: 0
    };
  }

  // Subscribe to user presence with enhanced data
  subscribeToUserPresence(userId, callback) {
    if (this.presenceListeners.has(userId)) {
      this.presenceListeners.get(userId)();
    }

    const presenceRef = doc(db, 'presence', userId);

    const unsubscribe = onSnapshot(presenceRef, (doc) => {
      if (doc.exists()) {
        const presenceData = doc.data();

        // Enhanced online detection
        const now = Date.now();
        const lastHeartbeat = presenceData.heartbeat || 0;
        const timeDiff = now - lastHeartbeat;
        const isReallyOnline = presenceData.isOnline && timeDiff < 60000;

        callback({
          userId,
          isOnline: isReallyOnline,
          status: isReallyOnline ? presenceData.status : 'offline',
          lastSeen: presenceData.lastSeen,
          platform: presenceData.platform,
          currentDevice: presenceData.currentDevice,
          connectionQuality: presenceData.connectionQuality || 'unknown',
          activeConversations: presenceData.activeConversations || [],
          isTyping: presenceData.isTyping || {},
          customMessage: presenceData.customMessage || '',
          lastActivity: presenceData.updatedAt
        });
      } else {
        callback(this.getDefaultPresence(userId));
      }
    });

    this.presenceListeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  // Notify status change to active conversations
  async notifyStatusChange(newStatus) {
    try {
      if (!this.userId) return;

      const presenceRef = doc(db, 'presence', this.userId);
      const presenceDoc = await getDoc(presenceRef);

      if (presenceDoc.exists()) {
        const activeConversations = presenceDoc.data().activeConversations || [];

        // Notify each active conversation about status change
        const batch = writeBatch(db);

        for (const conversationId of activeConversations) {
          const statusChangeRef = doc(collection(db, 'presenceUpdates'));
          batch.set(statusChangeRef, {
            userId: this.userId,
            conversationId,
            newStatus,
            timestamp: serverTimestamp(),
            type: 'status_change'
          });
        }

        await batch.commit();
      }

    } catch (error) {
      console.error('Error notifying status change:', error);
    }
  }

  // Get presence statistics
  async getPresenceStats(userId, dateRange = {}) {
    try {
      const presenceRef = doc(db, 'presence', userId);
      const presenceDoc = await getDoc(presenceRef);

      if (!presenceDoc.exists()) {
        return null;
      }

      const presenceData = presenceDoc.data();

      // Get historical presence data if needed
      // This would typically come from a separate analytics collection

      return {
        totalSessionTime: presenceData.totalSessionTime || 0,
        currentSessionDuration: presenceData.sessionDuration || 0,
        averageResponseTime: presenceData.averageResponseTime || 0,
        heartbeatCount: presenceData.heartbeatCount || 0,
        platform: presenceData.platform,
        device: presenceData.currentDevice,
        connectionQuality: presenceData.connectionQuality
      };

    } catch (error) {
      console.error('Error getting presence stats:', error);
      return null;
    }
  }

  // Refresh presence data
  async refreshPresence() {
    if (this.userId && this.isActive) {
      const userInfo = {
        platform: 'mobile',
        screenInfo: this.getScreenInfo()
      };
      await this.setUserOnline(userInfo);
    }
  }

  // Cleanup all presence listeners and intervals
  cleanup() {
    this.isActive = false;

    // Set user offline
    if (this.userId) {
      this.setUserOffline('cleanup');
    }

    // Stop all heartbeats
    this.heartbeatIntervals.forEach(interval => clearInterval(interval));
    this.heartbeatIntervals.clear();

    // Cleanup all presence listeners
    this.presenceListeners.forEach(unsubscribe => unsubscribe());
    this.presenceListeners.clear();

    // Cleanup event listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions.clear();

    // Reset state
    this.userId = null;
  }
}

export default new EnhancedPresenceService();