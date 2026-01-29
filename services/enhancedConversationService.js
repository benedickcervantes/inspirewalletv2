import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import adminAssignmentService from './adminAssignmentService';

class EnhancedConversationService {
  constructor() {
    this.listeners = new Map();
    this.typingTimeouts = new Map();
  }

  // Enhanced conversation creation with comprehensive metadata
  async createConversation(adminId, userId, userInfo = {}) {
    try {
      const conversationId = `conv_${userId}_${adminId}_${Date.now()}`;

      const conversationData = {
        conversationId,
        adminId,
        userId,
        participants: [adminId, userId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: {
          content: 'Conversation started',
          senderId: 'system',
          senderType: 'system',
          timestamp: serverTimestamp(),
          messageType: 'system'
        },
        unreadCounts: {
          [adminId]: 0,
          [userId]: 0
        },
        status: 'active',
        metadata: {
          tags: [],
          priority: 'medium',
          assignedDate: serverTimestamp(),
          userInfo: {
            displayName: userInfo.displayName || 'User',
            email: userInfo.email || '',
            platform: userInfo.platform || 'mobile'
          }
        },
        analytics: {
          messageCount: 0,
          adminResponseTimes: [],
          userSatisfactionScore: null,
          lastActivityAt: serverTimestamp()
        }
      };

      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, conversationData);

      // Send initial system message
      await this.sendSystemMessage(conversationId,
        `Conversation started with ${userInfo.displayName || 'User'}`);

      return {
        conversationId,
        ...conversationData
      };

    } catch (error) {
      console.error('Error creating enhanced conversation:', error);
      throw error;
    }
  }

  // Enhanced message sending with delivery tracking
  async sendMessageWithDelivery(senderId, senderType, conversationId, messageData) {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const enhancedMessageData = {
        id: messageId,
        conversationId,
        content: messageData.content,
        senderId,
        senderType,
        senderName: messageData.senderName || 'Unknown',
        timestamp: serverTimestamp(),
        messageType: messageData.messageType || 'text',
        readBy: [],
        deliveredTo: [],
        readTimestamps: {},
        deliveryStatus: 'sent',
        attachments: messageData.attachments || [],
        replyTo: messageData.replyTo || null,
        reactions: {},
        isEdited: false,
        editHistory: []
      };

      // Add to messages subcollection
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      await setDoc(messageRef, enhancedMessageData);

      // Update conversation with last message info
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data();
        const recipientId = senderType === 'admin' ? conversationData.userId : conversationData.adminId;

        await updateDoc(conversationRef, {
          lastMessage: {
            content: messageData.content,
            senderId,
            senderType,
            timestamp: serverTimestamp(),
            messageType: messageData.messageType || 'text'
          },
          updatedAt: serverTimestamp(),
          [`unreadCounts.${recipientId}`]: increment(1),
          'analytics.messageCount': increment(1),
          'analytics.lastActivityAt': serverTimestamp()
        });

        // Track delivery
        await this.trackMessageDelivery(conversationId, messageId, recipientId);
      }

      return messageId;

    } catch (error) {
      console.error('Error sending message with delivery:', error);
      throw error;
    }
  }

  // Track message delivery status
  async trackMessageDelivery(conversationId, messageId, recipientId) {
    try {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);

      await updateDoc(messageRef, {
        deliveredTo: arrayUnion(recipientId),
        deliveryStatus: 'delivered',
        [`deliveryTimestamps.${recipientId}`]: serverTimestamp()
      });

      // Send real-time notification
      await this.sendRealTimeNotification(recipientId, {
        type: 'new_message',
        conversationId,
        messageId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error tracking message delivery:', error);
    }
  }

  // Enhanced read receipt system
  async markMessagesAsRead(conversationId, readerId, messageIds = null) {
    try {
      const batch = writeBatch(db);
      let messagesToMark = [];

      if (messageIds) {
        // Mark specific messages as read
        messagesToMark = messageIds;
      } else {
        // Mark all unread messages as read
        const messagesQuery = query(
          collection(db, 'conversations', conversationId, 'messages'),
          where('readBy', 'not-in', [[readerId]])
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        messagesToMark = messagesSnapshot.docs.map(doc => doc.id);
      }

      // Update each message
      for (const messageId of messagesToMark) {
        const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        batch.update(messageRef, {
          readBy: arrayUnion(readerId),
          [`readTimestamps.${readerId}`]: serverTimestamp()
        });
      }

      // Update conversation unread count
      const conversationRef = doc(db, 'conversations', conversationId);
      batch.update(conversationRef, {
        [`unreadCounts.${readerId}`]: 0,
        lastReadBy: readerId,
        lastReadAt: serverTimestamp()
      });

      await batch.commit();

      // Notify sender about read status
      const conversationSnap = await getDoc(conversationRef);
      if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data();
        const senderId = readerId === conversationData.adminId ? conversationData.userId : conversationData.adminId;

        await this.sendRealTimeNotification(senderId, {
          type: 'messages_read',
          conversationId,
          readById: readerId,
          messageCount: messagesToMark.length
        });
      }

    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Real-time typing indicator system
  async updateTypingStatus(conversationId, userId, isTyping) {
    try {
      const presenceRef = doc(db, 'presence', userId);

      // Clear existing timeout
      if (this.typingTimeouts.has(`${conversationId}_${userId}`)) {
        clearTimeout(this.typingTimeouts.get(`${conversationId}_${userId}`));
      }

      if (isTyping) {
        // Set typing status
        await updateDoc(presenceRef, {
          [`isTyping.${conversationId}`]: {
            isTyping: true,
            timestamp: serverTimestamp()
          }
        }, { merge: true });

        // Auto-clear after 3 seconds of no activity
        const timeoutId = setTimeout(async () => {
          try {
            await updateDoc(presenceRef, {
              [`isTyping.${conversationId}.isTyping`]: false
            });
          } catch (error) {
            console.error('Error clearing typing timeout:', error);
          }
        }, 3000);

        this.typingTimeouts.set(`${conversationId}_${userId}`, timeoutId);
      } else {
        // Clear typing status
        await updateDoc(presenceRef, {
          [`isTyping.${conversationId}.isTyping`]: false
        });
      }

    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }

  // Subscribe to typing indicators
  subscribeToTypingIndicators(conversationId, participantIds, callback) {
    const listeners = [];

    participantIds.forEach(userId => {
      const presenceRef = doc(db, 'presence', userId);

      const unsubscribe = onSnapshot(presenceRef, (doc) => {
        if (doc.exists()) {
          const presenceData = doc.data();
          const typingData = presenceData.isTyping?.[conversationId];

          if (typingData) {
            callback({
              userId,
              isTyping: typingData.isTyping || false,
              timestamp: typingData.timestamp
            });
          }
        }
      });

      listeners.push(unsubscribe);
    });

    return () => listeners.forEach(unsubscribe => unsubscribe());
  }

  // Enhanced message subscription with real-time updates
  subscribeToConversationMessages(conversationId, callback, options = {}) {
    const messageLimit = options.limit || 100;

    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(messageLimit)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = [];
      const changes = {
        added: [],
        modified: [],
        removed: []
      };

      snapshot.docChanges().forEach((change) => {
        const messageData = {
          id: change.doc.id,
          ...change.doc.data()
        };

        switch (change.type) {
          case 'added':
            changes.added.push(messageData);
            break;
          case 'modified':
            changes.modified.push(messageData);
            break;
          case 'removed':
            changes.removed.push(messageData);
            break;
        }
      });

      snapshot.docs.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      callback({
        messages: messages.reverse(),
        changes
      });
    });

    this.listeners.set(`messages_${conversationId}`, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to conversation updates
  subscribeToConversation(conversationId, callback) {
    const conversationRef = doc(db, 'conversations', conversationId);

    const unsubscribe = onSnapshot(conversationRef, (doc) => {
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data()
        });
      }
    });

    this.listeners.set(`conversation_${conversationId}`, unsubscribe);
    return unsubscribe;
  }

  // Send system message
  async sendSystemMessage(conversationId, content, metadata = {}) {
    try {
      return await this.sendMessageWithDelivery('system', 'system', conversationId, {
        content,
        senderName: 'System',
        messageType: 'system',
        ...metadata
      });
    } catch (error) {
      console.error('Error sending system message:', error);
      throw error;
    }
  }

  // Add reaction to message
  async addMessageReaction(conversationId, messageId, userId, reaction) {
    try {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);

      await updateDoc(messageRef, {
        [`reactions.${userId}`]: reaction
      });

      // Track analytics
      await this.trackMessageInteraction(conversationId, messageId, 'reaction', { reaction });

    } catch (error) {
      console.error('Error adding message reaction:', error);
      throw error;
    }
  }

  // Edit message (with history)
  async editMessage(conversationId, messageId, newContent, editorId) {
    try {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageSnap.data();

      // Verify editor has permission
      if (messageData.senderId !== editorId) {
        throw new Error('Unauthorized to edit this message');
      }

      const editEntry = {
        previousContent: messageData.content,
        editedAt: serverTimestamp(),
        editedBy: editorId
      };

      await updateDoc(messageRef, {
        content: newContent,
        isEdited: true,
        editHistory: arrayUnion(editEntry),
        lastEditedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Real-time notification system
  async sendRealTimeNotification(userId, notification) {
    try {
      const notificationData = {
        ...notification,
        userId,
        timestamp: serverTimestamp(),
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Store notification
      await addDoc(collection(db, 'notifications'), notificationData);

      // Check if user is online for immediate delivery
      const presenceRef = doc(db, 'presence', userId);
      const presenceSnap = await getDoc(presenceRef);

      if (presenceSnap.exists() && presenceSnap.data().isOnline) {
        // User is online - notification will be delivered via real-time listener
        return { delivered: true, method: 'realtime' };
      } else {
        // User is offline - queue for push notification
        await this.queuePushNotification(userId, notification);
        return { delivered: true, method: 'push' };
      }

    } catch (error) {
      console.error('Error sending real-time notification:', error);
      throw error;
    }
  }

  // Queue push notification for offline users
  async queuePushNotification(userId, notification) {
    try {
      const pushQueue = collection(db, 'pushNotifications');

      await addDoc(pushQueue, {
        userId,
        notification,
        status: 'pending',
        createdAt: serverTimestamp(),
        attempts: 0,
        maxAttempts: 3
      });

    } catch (error) {
      console.error('Error queuing push notification:', error);
    }
  }

  // Track message interaction for analytics
  async trackMessageInteraction(conversationId, messageId, interactionType, metadata = {}) {
    try {
      await addDoc(collection(db, 'messageInteractions'), {
        conversationId,
        messageId,
        interactionType,
        metadata,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error tracking message interaction:', error);
    }
  }

  // Get conversation analytics
  async getConversationAnalytics(conversationId, dateRange = {}) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (!conversationSnap.exists()) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationSnap.data();

      // Get message count
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'desc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      // Calculate metrics
      const messages = messagesSnapshot.docs.map(doc => doc.data());
      const adminMessages = messages.filter(m => m.senderType === 'admin');
      const userMessages = messages.filter(m => m.senderType === 'user');

      // Calculate response times
      const responseTimes = [];
      for (let i = 1; i < messages.length; i++) {
        const current = messages[i];
        const previous = messages[i - 1];

        if (current.senderType === 'admin' && previous.senderType === 'user') {
          const responseTime = current.timestamp.toMillis() - previous.timestamp.toMillis();
          responseTimes.push(responseTime);
        }
      }

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      return {
        conversationId,
        totalMessages: messages.length,
        adminMessages: adminMessages.length,
        userMessages: userMessages.length,
        averageResponseTime: avgResponseTime,
        responseTimes,
        firstMessageAt: conversationData.createdAt,
        lastMessageAt: conversationData.analytics?.lastActivityAt,
        status: conversationData.status,
        satisfaction: conversationData.analytics?.userSatisfactionScore
      };

    } catch (error) {
      console.error('Error getting conversation analytics:', error);
      throw error;
    }
  }

  // Clean up listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();

    this.typingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.typingTimeouts.clear();
  }
}

export default new EnhancedConversationService();