import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import enhancedPresenceService from './enhancedPresenceService';

class MessageDeliveryService {
  constructor() {
    this.deliveryQueue = new Map();
    this.retryIntervals = new Map();
    this.deliveryListeners = new Map();
    this.processingQueue = false;
  }

  // Initialize delivery service
  async initialize() {
    try {
      // Start processing delivery queue
      this.startQueueProcessor();

      // Setup delivery status listeners
      this.setupDeliveryStatusListener();

      return { success: true };
    } catch (error) {
      console.error('Error initializing message delivery service:', error);
      throw error;
    }
  }

  // Enhanced message sending with delivery guarantees
  async sendMessage(senderId, recipientId, conversationId, messageData) {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create message with delivery tracking
      const enhancedMessage = {
        id: messageId,
        senderId,
        recipientId,
        conversationId,
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        attachments: messageData.attachments || [],
        timestamp: serverTimestamp(),
        deliveryStatus: {
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
          lastAttempt: null,
          deliveredAt: null,
          readAt: null,
          failureReason: null
        },
        priority: messageData.priority || 'normal', // 'high', 'normal', 'low'
        deliveryOptions: {
          requireDeliveryReceipt: messageData.requireReceipt || false,
          requireReadReceipt: messageData.requireReadReceipt || false,
          expiresAt: messageData.expiresAt || null,
          retryStrategy: messageData.retryStrategy || 'exponential'
        }
      };

      // Store message
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      await setDoc(messageRef, enhancedMessage);

      // Queue for delivery
      await this.queueForDelivery(messageId, enhancedMessage);

      // Immediate delivery attempt
      await this.attemptDelivery(messageId, enhancedMessage);

      return messageId;

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Queue message for delivery
  async queueForDelivery(messageId, messageData) {
    try {
      const queueEntry = {
        messageId,
        ...messageData,
        queuedAt: Date.now(),
        priority: this.getPriorityValue(messageData.priority)
      };

      this.deliveryQueue.set(messageId, queueEntry);

      // Also store in persistent queue for recovery
      await addDoc(collection(db, 'deliveryQueue'), {
        messageId,
        conversationId: messageData.conversationId,
        recipientId: messageData.recipientId,
        priority: messageData.priority,
        queuedAt: serverTimestamp(),
        status: 'queued'
      });

    } catch (error) {
      console.error('Error queuing message for delivery:', error);
    }
  }

  // Get numeric priority value
  getPriorityValue(priority) {
    switch (priority) {
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  // Attempt message delivery
  async attemptDelivery(messageId, messageData) {
    try {
      const recipientPresence = await enhancedPresenceService.getUserPresence(messageData.recipientId);

      // Update delivery attempt
      await this.updateDeliveryStatus(messageId, 'attempting', {
        attempts: messageData.deliveryStatus.attempts + 1,
        lastAttempt: serverTimestamp()
      });

      if (recipientPresence.isOnline) {
        // Recipient is online - attempt real-time delivery
        await this.deliverRealTime(messageId, messageData, recipientPresence);
      } else {
        // Recipient is offline - use push notification
        await this.deliverOffline(messageId, messageData, recipientPresence);
      }

    } catch (error) {
      console.error('Error attempting message delivery:', error);
      await this.handleDeliveryFailure(messageId, error.message);
    }
  }

  // Real-time delivery for online users
  async deliverRealTime(messageId, messageData, recipientPresence) {
    try {
      // Create real-time notification
      const notification = {
        type: 'new_message',
        messageId,
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        content: this.getNotificationContent(messageData),
        timestamp: Date.now(),
        deliveryMethod: 'realtime'
      };

      // Store notification for real-time listener pickup
      await addDoc(collection(db, 'realTimeNotifications'), {
        ...notification,
        recipientId: messageData.recipientId,
        expiresAt: new Date(Date.now() + 300000), // 5 minutes
        delivered: false
      });

      // Mark as delivered
      await this.updateDeliveryStatus(messageId, 'delivered', {
        deliveredAt: serverTimestamp(),
        deliveryMethod: 'realtime',
        recipientDevice: recipientPresence.currentDevice,
        connectionQuality: recipientPresence.connectionQuality
      });

      // Setup delivery confirmation listener
      this.setupDeliveryConfirmationListener(messageId, messageData);

    } catch (error) {
      console.error('Error in real-time delivery:', error);
      throw error;
    }
  }

  // Offline delivery via push notification
  async deliverOffline(messageId, messageData, recipientPresence) {
    try {
      // Create push notification payload
      const pushPayload = {
        messageId,
        conversationId: messageData.conversationId,
        title: `New message from ${messageData.senderName || 'Someone'}`,
        body: this.getNotificationContent(messageData),
        icon: '/icons/message-icon.png',
        badge: '/icons/badge.png',
        tag: `conversation-${messageData.conversationId}`,
        data: {
          messageId,
          conversationId: messageData.conversationId,
          senderId: messageData.senderId,
          action: 'open_conversation'
        },
        actions: [
          {
            action: 'reply',
            title: 'Reply',
            type: 'text',
            placeholder: 'Type your reply...'
          },
          {
            action: 'mark_read',
            title: 'Mark as Read'
          }
        ]
      };

      // Queue for push notification service
      await this.queuePushNotification(messageData.recipientId, pushPayload);

      // Mark as delivered via push
      await this.updateDeliveryStatus(messageId, 'delivered', {
        deliveredAt: serverTimestamp(),
        deliveryMethod: 'push',
        recipientLastSeen: recipientPresence.lastSeen,
        pushScheduled: true
      });

    } catch (error) {
      console.error('Error in offline delivery:', error);
      throw error;
    }
  }

  // Get notification content preview
  getNotificationContent(messageData) {
    if (messageData.messageType === 'text') {
      return messageData.content.length > 50
        ? `${messageData.content.substring(0, 50)}...`
        : messageData.content;
    } else if (messageData.messageType === 'image') {
      return '📷 Sent an image';
    } else if (messageData.messageType === 'file') {
      return '📎 Sent a file';
    } else {
      return 'New message';
    }
  }

  // Queue push notification
  async queuePushNotification(userId, payload) {
    try {
      await addDoc(collection(db, 'pushQueue'), {
        userId,
        payload,
        status: 'pending',
        createdAt: serverTimestamp(),
        attempts: 0,
        maxAttempts: 3,
        priority: payload.priority || 'normal'
      });
    } catch (error) {
      console.error('Error queuing push notification:', error);
    }
  }

  // Update delivery status
  async updateDeliveryStatus(messageId, status, additionalData = {}) {
    try {
      // Find the message and update delivery status
      const messagesQuery = query(
        collection(db, 'messages'),
        where('id', '==', messageId),
        limit(1)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      if (!messagesSnapshot.empty) {
        const messageDoc = messagesSnapshot.docs[0];
        const updateData = {
          'deliveryStatus.status': status,
          'deliveryStatus.lastUpdated': serverTimestamp(),
          ...Object.keys(additionalData).reduce((acc, key) => {
            acc[`deliveryStatus.${key}`] = additionalData[key];
            return acc;
          }, {})
        };

        await updateDoc(messageDoc.ref, updateData);
      }

      // Update in delivery tracking collection
      await this.updateDeliveryTracking(messageId, status, additionalData);

    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  // Update delivery tracking
  async updateDeliveryTracking(messageId, status, additionalData) {
    try {
      const trackingRef = doc(db, 'messageDeliveryTracking', messageId);

      await setDoc(trackingRef, {
        messageId,
        status,
        lastUpdated: serverTimestamp(),
        ...additionalData
      }, { merge: true });

    } catch (error) {
      console.error('Error updating delivery tracking:', error);
    }
  }

  // Setup delivery confirmation listener
  setupDeliveryConfirmationListener(messageId, messageData) {
    const confirmationTimeout = setTimeout(async () => {
      try {
        // If no confirmation after 30 seconds, attempt retry
        const currentStatus = await this.getDeliveryStatus(messageId);

        if (currentStatus.status === 'delivered' && !currentStatus.confirmed) {
          await this.scheduleRetry(messageId, 'no_confirmation');
        }
      } catch (error) {
        console.error('Error in delivery confirmation timeout:', error);
      }
    }, 30000);

    // Listen for delivery confirmation
    const confirmationRef = doc(db, 'deliveryConfirmations', messageId);
    const unsubscribe = onSnapshot(confirmationRef, (doc) => {
      if (doc.exists()) {
        clearTimeout(confirmationTimeout);
        this.handleDeliveryConfirmation(messageId, doc.data());
        unsubscribe();
      }
    });

    // Store for cleanup
    this.deliveryListeners.set(messageId, () => {
      clearTimeout(confirmationTimeout);
      unsubscribe();
    });
  }

  // Handle delivery confirmation
  async handleDeliveryConfirmation(messageId, confirmationData) {
    try {
      await this.updateDeliveryStatus(messageId, 'confirmed', {
        confirmedAt: serverTimestamp(),
        confirmationMethod: confirmationData.method,
        deviceInfo: confirmationData.deviceInfo
      });

      // Remove from delivery queue
      this.deliveryQueue.delete(messageId);

      // Clean up listener
      const cleanup = this.deliveryListeners.get(messageId);
      if (cleanup) {
        cleanup();
        this.deliveryListeners.delete(messageId);
      }

    } catch (error) {
      console.error('Error handling delivery confirmation:', error);
    }
  }

  // Handle delivery failure
  async handleDeliveryFailure(messageId, reason) {
    try {
      const queuedMessage = this.deliveryQueue.get(messageId);

      if (!queuedMessage) return;

      const attempts = queuedMessage.deliveryStatus.attempts || 0;
      const maxAttempts = queuedMessage.deliveryOptions.maxAttempts || 3;

      if (attempts < maxAttempts) {
        // Schedule retry
        await this.scheduleRetry(messageId, reason);
      } else {
        // Mark as failed
        await this.updateDeliveryStatus(messageId, 'failed', {
          failureReason: reason,
          finalAttemptAt: serverTimestamp()
        });

        // Remove from queue
        this.deliveryQueue.delete(messageId);

        // Notify sender about failure
        await this.notifyDeliveryFailure(messageId, queuedMessage, reason);
      }

    } catch (error) {
      console.error('Error handling delivery failure:', error);
    }
  }

  // Schedule retry with exponential backoff
  async scheduleRetry(messageId, reason) {
    try {
      const queuedMessage = this.deliveryQueue.get(messageId);
      if (!queuedMessage) return;

      const attempts = queuedMessage.deliveryStatus.attempts || 0;
      const retryStrategy = queuedMessage.deliveryOptions.retryStrategy || 'exponential';

      let delay;
      switch (retryStrategy) {
        case 'exponential':
          delay = Math.min(1000 * Math.pow(2, attempts), 300000); // Max 5 minutes
          break;
        case 'linear':
          delay = 30000 * (attempts + 1); // 30s, 60s, 90s
          break;
        case 'fixed':
          delay = 60000; // Always 1 minute
          break;
        default:
          delay = 30000;
      }

      // Update retry info
      await this.updateDeliveryStatus(messageId, 'retrying', {
        retryScheduledAt: serverTimestamp(),
        retryDelay: delay,
        retryReason: reason
      });

      // Schedule retry
      const retryTimeout = setTimeout(async () => {
        try {
          await this.attemptDelivery(messageId, queuedMessage);
        } catch (error) {
          console.error('Error in scheduled retry:', error);
        }
      }, delay);

      this.retryIntervals.set(messageId, retryTimeout);

    } catch (error) {
      console.error('Error scheduling retry:', error);
    }
  }

  // Notify sender about delivery failure
  async notifyDeliveryFailure(messageId, messageData, reason) {
    try {
      const notification = {
        type: 'delivery_failed',
        messageId,
        conversationId: messageData.conversationId,
        recipientId: messageData.senderId, // Notify sender
        reason,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'deliveryFailureNotifications'), notification);

    } catch (error) {
      console.error('Error notifying delivery failure:', error);
    }
  }

  // Get delivery status
  async getDeliveryStatus(messageId) {
    try {
      const trackingRef = doc(db, 'messageDeliveryTracking', messageId);
      const trackingDoc = await getDoc(trackingRef);

      if (trackingDoc.exists()) {
        return trackingDoc.data();
      }

      return { status: 'unknown', messageId };

    } catch (error) {
      console.error('Error getting delivery status:', error);
      return { status: 'error', messageId, error: error.message };
    }
  }

  // Confirm message delivery (called by recipient)
  async confirmDelivery(messageId, deviceInfo = {}) {
    try {
      const confirmationRef = doc(db, 'deliveryConfirmations', messageId);

      await setDoc(confirmationRef, {
        messageId,
        confirmedAt: serverTimestamp(),
        method: 'manual',
        deviceInfo: {
          userAgent: navigator?.userAgent,
          platform: deviceInfo.platform || 'unknown',
          timestamp: Date.now(),
          ...deviceInfo
        }
      });

    } catch (error) {
      console.error('Error confirming delivery:', error);
    }
  }

  // Mark message as read
  async markAsRead(messageId, readerId, readContext = {}) {
    try {
      // Update message read status
      await this.updateDeliveryStatus(messageId, 'read', {
        readAt: serverTimestamp(),
        readBy: readerId,
        readContext: {
          device: readContext.device || 'unknown',
          location: readContext.location || null,
          readDuration: readContext.readDuration || null
        }
      });

      // Create read receipt
      const readReceiptRef = doc(db, 'readReceipts', messageId);
      await setDoc(readReceiptRef, {
        messageId,
        readBy: readerId,
        readAt: serverTimestamp(),
        readContext
      });

    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // Start queue processor
  startQueueProcessor() {
    if (this.processingQueue) return;

    this.processingQueue = true;

    const processQueue = async () => {
      try {
        if (this.deliveryQueue.size === 0) return;

        // Sort by priority and timestamp
        const sortedMessages = Array.from(this.deliveryQueue.values())
          .sort((a, b) => {
            if (a.priority !== b.priority) {
              return b.priority - a.priority; // Higher priority first
            }
            return a.queuedAt - b.queuedAt; // Older messages first
          });

        // Process up to 5 messages at once
        const batchSize = Math.min(5, sortedMessages.length);
        const batch = sortedMessages.slice(0, batchSize);

        await Promise.all(
          batch.map(message =>
            this.attemptDelivery(message.messageId, message).catch(error =>
              console.error(`Error processing message ${message.messageId}:`, error)
            )
          )
        );

      } catch (error) {
        console.error('Error processing delivery queue:', error);
      }
    };

    // Process queue every 10 seconds
    setInterval(processQueue, 10000);
  }

  // Setup delivery status listener
  setupDeliveryStatusListener() {
    // Listen for delivery confirmations and read receipts
    const deliveryUpdatesQuery = query(
      collection(db, 'deliveryConfirmations'),
      orderBy('confirmedAt', 'desc'),
      limit(100)
    );

    onSnapshot(deliveryUpdatesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          this.handleDeliveryConfirmation(data.messageId, data);
        }
      });
    });
  }

  // Get delivery statistics
  async getDeliveryStats(conversationId = null, dateRange = {}) {
    try {
      let trackingQuery = collection(db, 'messageDeliveryTracking');

      if (conversationId) {
        trackingQuery = query(trackingQuery, where('conversationId', '==', conversationId));
      }

      const trackingSnapshot = await getDocs(trackingQuery);
      const stats = {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        read: 0,
        averageDeliveryTime: 0,
        deliveryRate: 0,
        readRate: 0
      };

      let totalDeliveryTime = 0;
      let deliveryCount = 0;

      trackingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.total++;

        switch (data.status) {
          case 'delivered':
          case 'confirmed':
            stats.delivered++;
            break;
          case 'failed':
            stats.failed++;
            break;
          case 'pending':
          case 'retrying':
            stats.pending++;
            break;
          case 'read':
            stats.read++;
            stats.delivered++; // Read implies delivered
            break;
        }

        // Calculate delivery time
        if (data.deliveredAt && data.createdAt) {
          const deliveryTime = data.deliveredAt.toMillis() - data.createdAt.toMillis();
          totalDeliveryTime += deliveryTime;
          deliveryCount++;
        }
      });

      stats.averageDeliveryTime = deliveryCount > 0 ? totalDeliveryTime / deliveryCount : 0;
      stats.deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
      stats.readRate = stats.delivered > 0 ? (stats.read / stats.delivered) * 100 : 0;

      return stats;

    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return null;
    }
  }

  // Cleanup delivery service
  cleanup() {
    this.processingQueue = false;

    // Clear all retry intervals
    this.retryIntervals.forEach(interval => clearTimeout(interval));
    this.retryIntervals.clear();

    // Cleanup all listeners
    this.deliveryListeners.forEach(cleanup => cleanup());
    this.deliveryListeners.clear();

    // Clear delivery queue
    this.deliveryQueue.clear();
  }
}

export default new MessageDeliveryService();