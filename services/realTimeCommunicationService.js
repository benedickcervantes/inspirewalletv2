import { firestore } from '../configs/firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import presenceService from './presenceService';
import adminUserConversationService from './adminUserConversationService';

class RealTimeCommunicationService {
  constructor() {
    this.connectionListeners = new Map();
    this.messageQueue = new Map();
    this.deliveryConfirmations = new Map();
    this.isInitialized = false;
  }

  // Initialize the real-time communication service
  async initialize(userId, userInfo = {}) {
    try {
      this.userId = userId;
      this.userInfo = userInfo;

      // Initialize presence service first
      await presenceService.initializePresence(userId, userInfo);

      // Setup message delivery system
      await this.setupMessageDelivery();

      // Setup real-time notifications
      this.setupRealtimeNotifications();

      this.isInitialized = true;

      console.log('✅ Real-time communication service initialized');
      return { success: true };

    } catch (error) {
      console.error('❌ Error initializing real-time communication service:', error);
      throw error;
    }
  }

  // Send message with real-time delivery confirmation
  async sendMessageWithConfirmation(adminId, conversationId, messageContent, messageType = 'text') {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      // Send message through the conversation service
      const result = await adminUserConversationService.sendUserMessage(
        adminId,
        this.userId,
        conversationId,
        messageContent,
        this.userInfo
      );

      if (result.success) {
        // Setup delivery tracking
        await this.trackMessageDelivery(result.messageId, adminId, conversationId);

        // Send real-time notification to admin
        await this.sendRealtimeNotification(adminId, {
          type: 'new_message',
          userId: this.userId,
          conversationId,
          messageId: result.messageId,
          content: messageContent,
          senderName: this.userInfo.displayName || 'User',
          timestamp: Date.now()
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Error sending message with confirmation:', error);
      throw error;
    }
  }

  // Listen for real-time admin messages
  listenForAdminMessages(adminId, conversationId, callback) {
    try {
      const listenerKey = `admin_messages_${adminId}_${conversationId}`;

      // Use the conversation service to subscribe to messages
      const unsubscribe = adminUserConversationService.subscribeToMessages(
        adminId,
        this.userId,
        conversationId,
        (messageData) => {
          // Filter only admin messages
          const adminMessages = messageData.messages.filter(
            msg => msg.senderType === 'admin'
          );

          const newAdminMessages = messageData.changes.added.filter(
            msg => msg.senderType === 'admin'
          );

          // Send delivery confirmations for new admin messages
          newAdminMessages.forEach(message => {
            this.confirmMessageDelivery(message.id, adminId, conversationId);
          });

          callback({
            messages: adminMessages,
            newMessages: newAdminMessages,
            changes: messageData.changes
          });
        }
      );

      this.connectionListeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error listening for admin messages:', error);
      return null;
    }
  }

  // Listen for typing indicators
  listenForTypingIndicators(adminId, conversationId, callback) {
    try {
      const listenerKey = `typing_${adminId}_${conversationId}`;

      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', this.userId,
        'conversations', conversationId
      );

      const unsubscribe = onSnapshot(conversationRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const typing = data.typing || {};

          callback({
            adminTyping: typing[adminId]?.isTyping || false,
            userTyping: typing[this.userId]?.isTyping || false,
            lastUpdate: typing[adminId]?.timestamp || null
          });
        }
      }, (error) => {
        console.error('❌ Error in typing listener:', error);
      });

      this.connectionListeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error listening for typing indicators:', error);
      return null;
    }
  }

  // Update user's typing status
  async updateTypingStatus(adminId, conversationId, isTyping) {
    try {
      await adminUserConversationService.updateTypingStatus(
        adminId,
        this.userId,
        conversationId,
        this.userId,
        isTyping
      );

      return { success: true };

    } catch (error) {
      console.error('❌ Error updating typing status:', error);
      throw error;
    }
  }

  // Listen for admin presence status
  listenForAdminPresence(adminId, callback) {
    try {
      const listenerKey = `admin_presence_${adminId}`;

      const adminPresenceRef = doc(firestore, 'presence', adminId);

      const unsubscribe = onSnapshot(
        adminPresenceRef,
        (doc) => {
          if (doc.exists()) {
            const presenceData = doc.data();

            // Calculate if admin is truly online
            const now = new Date();
            const lastHeartbeat = presenceData.lastHeartbeat?.toDate() || new Date(0);
            const timeDiff = now - lastHeartbeat;

            const isReallyOnline = presenceData.status === 'online' &&
                                  presenceData.isActive &&
                                  timeDiff < 120000; // 2 minutes threshold

            callback({
              adminId,
              isOnline: isReallyOnline,
              status: presenceData.status,
              lastSeen: presenceData.lastSeen,
              lastHeartbeat: presenceData.lastHeartbeat,
              responseTime: this.calculateResponseTime(presenceData)
            });
          } else {
            callback({
              adminId,
              isOnline: false,
              status: 'offline',
              lastSeen: null,
              lastHeartbeat: null
            });
          }
        },
        (error) => {
          // Handle permission errors gracefully
          if (error.code === 'permission-denied') {
            console.warn('⚠️ Permission denied for admin presence listener, cleaning up');
            // Clean up listener on permission error
            if (this.connectionListeners.has(listenerKey)) {
              const unsubscribe = this.connectionListeners.get(listenerKey);
              if (unsubscribe) unsubscribe();
              this.connectionListeners.delete(listenerKey);
            }
            // Notify callback that admin is offline due to permission error
            callback({
              adminId,
              isOnline: false,
              status: 'offline',
              lastSeen: null,
              lastHeartbeat: null
            });
          } else {
            console.error('❌ Error in admin presence listener:', error);
          }
        }
      );

      this.connectionListeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error listening for admin presence:', error);
      return null;
    }
  }

  // Calculate estimated response time based on admin activity
  calculateResponseTime(presenceData) {
    if (!presenceData.lastHeartbeat) return null;

    const now = new Date();
    const lastActivity = presenceData.lastHeartbeat.toDate();
    const timeSinceActivity = now - lastActivity;

    // Estimate response time based on recent activity
    if (timeSinceActivity < 30000) { // Less than 30 seconds
      return 'immediate'; // < 1 minute
    } else if (timeSinceActivity < 300000) { // Less than 5 minutes
      return 'fast'; // 1-5 minutes
    } else if (timeSinceActivity < 1800000) { // Less than 30 minutes
      return 'moderate'; // 5-30 minutes
    } else {
      return 'slow'; // > 30 minutes
    }
  }

  // Setup message delivery tracking
  async setupMessageDelivery() {
    try {
      // Listen for delivery confirmations
      this.listenForDeliveryConfirmations();

      // Process any queued messages
      await this.processMessageQueue();

      console.log('✅ Message delivery system setup complete');

    } catch (error) {
      console.error('❌ Error setting up message delivery:', error);
    }
  }

  // Track message delivery
  async trackMessageDelivery(messageId, adminId, conversationId) {
    try {
      const deliveryTrackingRef = doc(collection(firestore, 'messageDeliveryTracking'));

      await setDoc(deliveryTrackingRef, {
        messageId,
        userId: this.userId,
        adminId,
        conversationId,
        sentAt: serverTimestamp(),
        status: 'sent',
        attempts: 1,
        lastAttempt: serverTimestamp()
      });

      // Set timeout for delivery confirmation
      setTimeout(async () => {
        await this.checkDeliveryStatus(messageId, adminId, conversationId);
      }, 30000); // 30 seconds timeout

    } catch (error) {
      console.error('❌ Error tracking message delivery:', error);
    }
  }

  // Confirm message delivery
  async confirmMessageDelivery(messageId, adminId, conversationId) {
    try {
      const confirmationRef = doc(collection(firestore, 'messageDeliveryConfirmations'));

      await setDoc(confirmationRef, {
        messageId,
        userId: this.userId,
        adminId,
        conversationId,
        deliveredAt: serverTimestamp(),
        confirmedBy: this.userId,
        deliveryMethod: 'realtime'
      });

    } catch (error) {
      console.error('❌ Error confirming message delivery:', error);
    }
  }

  // Check delivery status
  async checkDeliveryStatus(messageId, adminId, conversationId) {
    try {
      // Check if delivery was confirmed
      const confirmationsQuery = query(
        collection(firestore, 'messageDeliveryConfirmations'),
        where('messageId', '==', messageId),
        where('userId', '==', this.userId)
      );

      const confirmationsSnapshot = await getDocs(confirmationsQuery);

      if (confirmationsSnapshot.empty) {
        // No confirmation received, retry or mark as failed
        console.warn('⚠️ Message delivery not confirmed:', messageId);

        // Update delivery tracking
        const trackingQuery = query(
          collection(firestore, 'messageDeliveryTracking'),
          where('messageId', '==', messageId),
          where('userId', '==', this.userId)
        );

        const trackingSnapshot = await getDocs(trackingQuery);

        if (!trackingSnapshot.empty) {
          const trackingDoc = trackingSnapshot.docs[0];
          await updateDoc(trackingDoc.ref, {
            status: 'delivery_timeout',
            lastAttempt: serverTimestamp()
          });
        }
      }

    } catch (error) {
      console.error('❌ Error checking delivery status:', error);
    }
  }

  // Listen for delivery confirmations
  listenForDeliveryConfirmations() {
    try {
      const confirmationsQuery = query(
        collection(firestore, 'messageDeliveryConfirmations'),
        where('userId', '==', this.userId),
        orderBy('deliveredAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(confirmationsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const confirmationData = change.doc.data();
            this.handleDeliveryConfirmation(confirmationData);
          }
        });
      });

      this.connectionListeners.set('delivery_confirmations', unsubscribe);

    } catch (error) {
      console.error('❌ Error listening for delivery confirmations:', error);
    }
  }

  // Handle delivery confirmation
  handleDeliveryConfirmation(confirmationData) {
    try {
      console.log('✅ Message delivery confirmed:', confirmationData.messageId);

      // Remove from pending confirmations
      this.deliveryConfirmations.delete(confirmationData.messageId);

      // Emit delivery confirmation event if needed
      this.emitDeliveryConfirmation(confirmationData);

    } catch (error) {
      console.error('❌ Error handling delivery confirmation:', error);
    }
  }

  // Process message queue for offline messages
  async processMessageQueue() {
    try {
      if (this.messageQueue.size === 0) return;

      console.log(`📤 Processing ${this.messageQueue.size} queued messages`);

      for (const [messageId, messageData] of this.messageQueue.entries()) {
        try {
          await this.sendMessageWithConfirmation(
            messageData.adminId,
            messageData.conversationId,
            messageData.content,
            messageData.type
          );

          this.messageQueue.delete(messageId);
        } catch (error) {
          console.error('❌ Error processing queued message:', messageId, error);
        }
      }

    } catch (error) {
      console.error('❌ Error processing message queue:', error);
    }
  }

  // Send real-time notification
  async sendRealtimeNotification(recipientId, notificationData) {
    try {
      const notificationRef = doc(collection(firestore, 'realtimeNotifications'));

      await setDoc(notificationRef, {
        ...notificationData,
        recipientId,
        sentAt: serverTimestamp(),
        read: false,
        expiresAt: new Date(Date.now() + 300000) // 5 minutes expiry
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error sending realtime notification:', error);
      throw error;
    }
  }

  // Setup real-time notifications listener
  setupRealtimeNotifications() {
    try {
      const notificationsQuery = query(
        collection(firestore, 'realtimeNotifications'),
        where('recipientId', '==', this.userId),
        where('read', '==', false),
        orderBy('sentAt', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notificationData = change.doc.data();
            this.handleRealtimeNotification(change.doc.id, notificationData);
          }
        });
      });

      this.connectionListeners.set('realtime_notifications', unsubscribe);

    } catch (error) {
      console.error('❌ Error setting up realtime notifications:', error);
    }
  }

  // Handle real-time notification
  async handleRealtimeNotification(notificationId, notificationData) {
    try {
      console.log('🔔 Received realtime notification:', notificationData);

      // Mark notification as read
      const notificationRef = doc(firestore, 'realtimeNotifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });

      // Process notification based on type
      switch (notificationData.type) {
        case 'admin_message':
          this.handleAdminMessageNotification(notificationData);
          break;
        case 'conversation_assigned':
          this.handleConversationAssignedNotification(notificationData);
          break;
        case 'admin_status_change':
          this.handleAdminStatusChangeNotification(notificationData);
          break;
        default:
          console.log('📱 Generic notification received:', notificationData);
      }

    } catch (error) {
      console.error('❌ Error handling realtime notification:', error);
    }
  }

  // Handle admin message notification
  handleAdminMessageNotification(notificationData) {
    try {
      // Show in-app notification or trigger callback
      console.log('💬 New admin message notification:', notificationData);

      // You can emit events here for UI components to handle
      this.emitNotification('admin_message', notificationData);

    } catch (error) {
      console.error('❌ Error handling admin message notification:', error);
    }
  }

  // Handle conversation assigned notification
  handleConversationAssignedNotification(notificationData) {
    try {
      console.log('👤 Conversation assigned notification:', notificationData);

      this.emitNotification('conversation_assigned', notificationData);

    } catch (error) {
      console.error('❌ Error handling conversation assigned notification:', error);
    }
  }

  // Handle admin status change notification
  handleAdminStatusChangeNotification(notificationData) {
    try {
      console.log('📊 Admin status change notification:', notificationData);

      this.emitNotification('admin_status_change', notificationData);

    } catch (error) {
      console.error('❌ Error handling admin status change notification:', error);
    }
  }

  // Emit notification event (can be used by UI components)
  emitNotification(type, data) {
    try {
      // This is where you would emit events for React components to listen to
      // For now, just console log
      console.log(`🔔 Emitting notification: ${type}`, data);

      // You could use EventEmitter or React context here
      // this.eventEmitter.emit('notification', { type, data });

    } catch (error) {
      console.error('❌ Error emitting notification:', error);
    }
  }

  // Emit delivery confirmation event
  emitDeliveryConfirmation(confirmationData) {
    try {
      console.log('✅ Emitting delivery confirmation:', confirmationData);

      // Emit event for UI components
      // this.eventEmitter.emit('message_delivered', confirmationData);

    } catch (error) {
      console.error('❌ Error emitting delivery confirmation:', error);
    }
  }

  // Mark messages as read with real-time update
  async markMessagesAsReadRealtime(adminId, conversationId) {
    try {
      const result = await adminUserConversationService.markMessagesAsRead(
        adminId,
        this.userId,
        conversationId,
        this.userId,
        'user'
      );

      // Send read receipt notification to admin
      if (result.success && result.markedCount > 0) {
        await this.sendRealtimeNotification(adminId, {
          type: 'messages_read',
          userId: this.userId,
          conversationId,
          readCount: result.markedCount,
          readAt: Date.now()
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      throw error;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isInitialized: this.isInitialized,
      userId: this.userId,
      activeListeners: this.connectionListeners.size,
      queuedMessages: this.messageQueue.size,
      pendingConfirmations: this.deliveryConfirmations.size,
      presenceStatus: presenceService.getCurrentPresenceStatus ?
        presenceService.getCurrentPresenceStatus() : null
    };
  }

  // Cleanup all connections
  async cleanup() {
    try {
      console.log('🧹 Cleaning up real-time communication service');

      // Clear all listeners
      this.connectionListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      this.connectionListeners.clear();

      // Clear queues
      this.messageQueue.clear();
      this.deliveryConfirmations.clear();

      // Cleanup presence service
      if (presenceService.cleanup) {
        await presenceService.cleanup();
      }

      // Cleanup conversation service
      adminUserConversationService.cleanup();

      this.isInitialized = false;

      console.log('✅ Real-time communication service cleaned up');

    } catch (error) {
      console.error('❌ Error cleaning up real-time communication service:', error);
    }
  }

  // Reconnect after network issues
  async reconnect() {
    try {
      if (!this.userId || !this.userInfo) {
        throw new Error('Cannot reconnect: User information missing');
      }

      console.log('🔄 Reconnecting real-time communication service...');

      // Cleanup existing connections
      await this.cleanup();

      // Reinitialize
      await this.initialize(this.userId, this.userInfo);

      console.log('✅ Real-time communication service reconnected');
      return { success: true };

    } catch (error) {
      console.error('❌ Error reconnecting real-time communication service:', error);
      throw error;
    }
  }
}

const realTimeCommunicationService = new RealTimeCommunicationService();
export default realTimeCommunicationService;