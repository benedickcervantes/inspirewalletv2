import { firestore } from '../configs/firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class PresenceService {
  constructor() {
    this.presenceRef = null;
    this.unsubscribe = null;
    this.userId = null;
    this.heartbeatInterval = null;
    this.heartbeatIntervalMs = 5000; // 5 seconds heartbeat (for testing)
    this.lastHeartbeat = null;
    // Using Firebase Functions instead of external backend
    this.functionsUrl = 'https://us-central1-inspire-wallet.cloudfunctions.net';
  }

  async initializePresence(userId, userData = {}) {
    try {
      this.userId = userId;
      this.presenceRef = doc(firestore, 'presence', userId);
      
      await this.setUserOnline(userData);
      this.setupPresenceListener();
      this.startHeartbeat();
      this.setupDisconnectHandler();
    } catch (error) {
      console.error('❌ Error initializing presence:', error);
    }
  }

  async setUserOnline(userData = {}) {
    if (!this.presenceRef) return;

    try {
      // Generate session ID and store it
      this.sessionId = this.generateSessionId();
      
      const presenceData = {
        userId: this.userId,
        status: 'online',
        lastSeen: serverTimestamp(),
        loginTime: serverTimestamp(),
        lastHeartbeat: serverTimestamp(),
        deviceInfo: await this.getDeviceInfo(),
        userData: {
          email: userData.email || '',
          displayName: userData.displayName || '',
          userType: userData.userType || 'user',
          ...userData
        },
        sessionId: this.sessionId,
        isActive: true,
        appVersion: '1.0.0', // You can make this dynamic
        connectionType: 'mobile'
      };

      await setDoc(this.presenceRef, presenceData, { merge: true });
      
      const userRef = doc(firestore, 'users', this.userId);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        currentSession: this.sessionId,
        isOnline: true
      });

      // Store session info for backend monitoring
      const sessionInfo = {
        userId: this.userId,
        sessionId: this.sessionId,
        lastHeartbeat: new Date().toISOString(),
        deviceInfo: await this.getDeviceInfo()
      };
      await AsyncStorage.setItem('currentSession', JSON.stringify(sessionInfo));


    } catch (error) {
      console.error('❌ Error setting user online:', error);
    }
  }

  async setUserOffline() {
    if (!this.presenceRef) return;

    try {
      const presenceData = {
        status: 'offline',
        lastSeen: serverTimestamp(),
        logoutTime: serverTimestamp(),
        isActive: false,
        lastHeartbeat: serverTimestamp()
      };

      await updateDoc(this.presenceRef, presenceData);
      
      const userRef = doc(firestore, 'users', this.userId);
      await updateDoc(userRef, {
        lastLogout: serverTimestamp(),
        isOnline: false,
        currentSession: null
      });

      // Notify backend about user going offline
      await this.notifyBackendOffline();
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  async notifyBackendOffline() {
    if (!this.userId) return;

    try {
      // Call Firebase Function to immediately mark user offline
      const response = await fetch(`${this.functionsUrl}/manualHeartbeatCheck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          action: 'force_offline',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        // User offline status sent to Firebase Functions
      } else {
        // Firebase Functions offline notification failed, relying on scheduled check
      }
    } catch (error) {
      console.error('Error in offline notification:', error);
      // Continue with Firebase offline update even if function fails
    }
  }

  async updateLastSeen() {
    if (!this.presenceRef) return;

    try {
      await updateDoc(this.presenceRef, {
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  async sendHeartbeat() {
    if (!this.presenceRef) return;

    try {
      this.lastHeartbeat = new Date();
      
      // Update Firebase Firestore
      await updateDoc(this.presenceRef, {
        lastHeartbeat: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isActive: true,
        status: 'online' // Ensure status stays online
      });
      
      // Update session info in AsyncStorage
      const sessionInfo = {
        userId: this.userId,
        sessionId: this.sessionId,
        lastHeartbeat: this.lastHeartbeat.toISOString(),
        deviceInfo: await this.getDeviceInfo()
      };
      await AsyncStorage.setItem('currentSession', JSON.stringify(sessionInfo));
      
      // Send heartbeat to backend API
      await this.sendHeartbeatToBackend();
    } catch (error) {
      console.error('❌ Error sending heartbeat:', error);
    }
  }

  async sendHeartbeatToBackend() {
    if (!this.userId) return;

    try {
      // Call Firebase Function to log heartbeat activity
      const response = await fetch(`${this.functionsUrl}/manualHeartbeatCheck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          action: 'heartbeat',
          timestamp: this.lastHeartbeat.toISOString(),
          sessionId: this.sessionId
        })
      });

      if (response.ok) {
        // Heartbeat logged to Firebase Functions
      } else {
        // Firebase Functions heartbeat logging failed, continuing with Firestore
      }
    } catch (error) {
      console.error('Error in heartbeat monitoring:', error);
      // Continue with Firebase heartbeat even if function fails
    }
  }

  startHeartbeat() {
    // Clear any existing heartbeat
    this.stopHeartbeat();
    
    // Send initial heartbeat
    this.sendHeartbeat();
    
    // Set up periodic heartbeat
    this.heartbeatInterval = global.setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      global.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  setupDisconnectHandler() {
    if (!this.presenceRef) return;

    try {
      // Store session info for backend monitoring
      const sessionInfo = {
        userId: this.userId,
        sessionId: this.sessionId,
        lastHeartbeat: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo()
      };
      
      // Store session info in AsyncStorage for backend to check
      AsyncStorage.setItem('currentSession', JSON.stringify(sessionInfo));
    } catch (error) {
      console.error('❌ Error setting up disconnect handler:', error);
    }
  }

  setupPresenceListener() {
    if (!this.presenceRef) return;

    this.unsubscribe = onSnapshot(this.presenceRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        // Check if user was marked as offline by disconnect handler
        if (data.status === 'offline' && data.disconnectReason === 'force_closed') {
          this.setUserOnline();
        }
      }
    }, (error) => {
      console.error('Error in presence listener:', error);
    });
  }

  async getDeviceInfo() {
    try {
      const deviceId = await AsyncStorage.getItem('deviceId') || this.generateDeviceId();
      await AsyncStorage.setItem('deviceId', deviceId);
      
      return {
        deviceId,
        platform: Platform.OS,
        version: Platform.Version,
        timestamp: new Date().toISOString()
      };
    } catch (_error) {
      return {
        deviceId: 'unknown',
        platform: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  generateDeviceId() {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getOnlineUsers() {
    try {
      const presenceRef = collection(firestore, 'presence');
      const q = query(
        presenceRef,
        where('status', '==', 'online'),
        where('isActive', '==', true),
        orderBy('lastSeen', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const onlineUsers = [];
      
      querySnapshot.forEach((doc) => {
        onlineUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return onlineUsers;
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  async cleanup() {
    try {
      this.stopHeartbeat();
      await this.setUserOffline();
      
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      
      // Clear session info from AsyncStorage
      await AsyncStorage.removeItem('currentSession');
      
      this.presenceRef = null;
      this.userId = null;
      this.lastHeartbeat = null;
    } catch (error) {
      console.error('❌ Error cleaning up presence:', error);
    }
  }

  // Method to check if user is still active based on heartbeat
  async checkUserActivity() {
    if (!this.presenceRef) return false;

    try {
      const doc = await getDocs(this.presenceRef);
      if (doc.exists()) {
        const data = doc.data();
        const lastHeartbeat = data.lastHeartbeat?.toDate?.() || new Date(data.lastHeartbeat);
        const now = new Date();
        const timeDiff = now - lastHeartbeat;
        
        // Consider user inactive if no heartbeat for more than 2 minutes
        return timeDiff < 120000; // 2 minutes
      }
      return false;
    } catch (error) {
      console.error('Error checking user activity:', error);
      return false;
    }
  }

  // Method to check Firebase Functions health
  async checkFunctionsHealth() {
    try {
      // Test Firestore connection to verify Firebase Functions accessibility
      const testRef = doc(firestore, 'test', 'health-check');
      await getDocs(testRef);
      return true;
    } catch (error) {
      console.error('Error checking Firebase Functions health:', error);
      return false;
    }
  }

  // Method to get user status from Firebase
  async getUserStatusFromFirebase() {
    if (!this.userId || !this.presenceRef) return null;

    try {
      const docSnap = await getDocs(this.presenceRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          userId: this.userId,
          status: data.status,
          isActive: data.isActive,
          lastHeartbeat: data.lastHeartbeat,
          sessionId: data.sessionId
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user status from Firebase:', error);
      return null;
    }
  }

  // Method to get online users count from Firebase
  async getOnlineUsersCountFromFirebase() {
    try {
      const onlineUsers = await this.getOnlineUsers();
      return onlineUsers.length;
    } catch (error) {
      console.error('Error getting online users count from Firebase:', error);
      return 0;
    }
  }

  // Method to get current presence status
  async getCurrentPresenceStatus() {
    if (!this.presenceRef) {
      return null;
    }

    try {
      const docSnap = await getDocs(this.presenceRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting current presence status:', error);
      return null;
    }
  }

  // Method to force update presence status
  async forceUpdateStatus(status) {
    if (!this.presenceRef) return;

    try {
      await updateDoc(this.presenceRef, {
        status: status,
        lastSeen: serverTimestamp(),
        isActive: status === 'online'
      });
    } catch (error) {
      console.error('❌ Error force updating status:', error);
    }
  }
}

const presenceService = new PresenceService();
export default presenceService; 