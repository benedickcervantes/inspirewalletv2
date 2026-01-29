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
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

class AdminUserConversationService {
  constructor() {
    this.listeners = new Map();
    this.typingTimeouts = new Map();
  }

  // Initialize conversation between admin and user
  async initializeConversation(adminId, userId, userInfo = {}) {
    try {
      const conversationId = `conv_${userId}_${Date.now()}`;

      // Create conversation document in the nested structure
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      const conversationData = {
        conversationId,
        adminId,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        lastMessage: {
          content: 'Conversation started',
          senderId: 'system',
          senderType: 'system',
          timestamp: serverTimestamp()
        },
        unreadCounts: {
          admin: 0,
          user: 0
        },
        userInfo: {
          displayName: userInfo.displayName || 'User',
          email: userInfo.email || '',
          platform: userInfo.platform || 'mobile'
        },
        metadata: {
          source: 'mobile_chat',
          priority: userInfo.priority || 'normal'
        }
      };

      await setDoc(conversationRef, conversationData);

      // Send initial system message
      await this.sendSystemMessage(adminId, userId, conversationId,
        `Conversation started with ${userInfo.displayName || 'User'}`);

      return {
        conversationId,
        conversationData
      };

    } catch (error) {
      console.error('❌ Error initializing conversation:', error);
      throw error;
    }
  }

  // Send message from user to admin
  async sendUserMessage(adminId, userId, conversationId, messageContent, userInfo = {}) {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add message to the nested messages collection
      const messageRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages', messageId
      );

      const messageData = {
        id: messageId,
        content: messageContent,
        senderId: userId,
        senderType: 'user',
        senderName: userInfo.displayName || 'User',
        timestamp: serverTimestamp(),
        readBy: [],
        deliveryStatus: 'sent',
        messageType: 'text',
        platform: userInfo.platform || 'mobile'
      };

      await setDoc(messageRef, messageData);

      // Update conversation with last message info
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      await updateDoc(conversationRef, {
        lastMessage: {
          content: messageContent,
          senderId: userId,
          senderType: 'user',
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp(),
        'unreadCounts.admin': increment(1)
      });

      // Update admin notification
      await this.notifyAdmin(adminId, userId, conversationId, messageData);

      return { messageId, success: true };

    } catch (error) {
      console.error('❌ Error sending user message:', error);
      throw error;
    }
  }

  // Send message from admin to user
  async sendAdminMessage(adminId, userId, conversationId, messageContent, adminInfo = {}) {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const messageRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages', messageId
      );

      const messageData = {
        id: messageId,
        content: messageContent,
        senderId: adminId,
        senderType: 'admin',
        senderName: adminInfo.displayName || 'Admin',
        timestamp: serverTimestamp(),
        readBy: [],
        deliveryStatus: 'sent',
        messageType: 'text'
      };

      await setDoc(messageRef, messageData);

      // Update conversation
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      await updateDoc(conversationRef, {
        lastMessage: {
          content: messageContent,
          senderId: adminId,
          senderType: 'admin',
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp(),
        'unreadCounts.user': increment(1)
      });

      // Notify user about new admin message
      await this.notifyUser(userId, adminId, conversationId, messageData);

      return { messageId, success: true };

    } catch (error) {
      console.error('❌ Error sending admin message:', error);
      throw error;
    }
  }

  // Send system message
  async sendSystemMessage(adminId, userId, conversationId, content) {
    try {
      const messageId = `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const messageRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages', messageId
      );

      const messageData = {
        id: messageId,
        content,
        senderId: 'system',
        senderType: 'system',
        senderName: 'System',
        timestamp: serverTimestamp(),
        readBy: [adminId, userId], // System messages are automatically read
        deliveryStatus: 'delivered',
        messageType: 'system'
      };

      await setDoc(messageRef, messageData);

      return { messageId, success: true };

    } catch (error) {
      console.error('❌ Error sending system message:', error);
      throw error;
    }
  }

  // Subscribe to conversation messages in real-time
  subscribeToMessages(adminId, userId, conversationId, callback, limitCount = 50) {
    try {
      const messagesCollection = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      const messagesQuery = query(
        messagesCollection,
        orderBy('timestamp', 'asc'),
        limit(limitCount)
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
          messages,
          changes
        });
      }, (error) => {
        console.error('❌ Error in messages subscription:', error);
        callback({ messages: [], changes: { added: [], modified: [], removed: [] }, error });
      });

      const listenerKey = `messages_${adminId}_${userId}_${conversationId}`;
      this.listeners.set(listenerKey, unsubscribe);

      return unsubscribe;

    } catch (error) {
      console.error('❌ Error subscribing to messages:', error);
      return null;
    }
  }

  // Subscribe to conversation updates
  subscribeToConversation(adminId, userId, conversationId, callback) {
    try {
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      const unsubscribe = onSnapshot(conversationRef, (doc) => {
        if (doc.exists()) {
          callback({
            id: doc.id,
            ...doc.data()
          });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('❌ Error in conversation subscription:', error);
        callback(null, error);
      });

      const listenerKey = `conversation_${adminId}_${userId}_${conversationId}`;
      this.listeners.set(listenerKey, unsubscribe);

      return unsubscribe;

    } catch (error) {
      console.error('❌ Error subscribing to conversation:', error);
      return null;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(adminId, userId, conversationId, readerId, readerType = 'user') {
    try {
      const messagesCollection = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      // Get unread messages
      const unreadQuery = query(
        messagesCollection,
        where('readBy', 'not-in', [[readerId]])
      );

      const unreadSnapshot = await getDocs(unreadQuery);

      if (unreadSnapshot.empty) {
        return { success: true, markedCount: 0 };
      }

      const batch = writeBatch(firestore);

      // Mark each message as read
      unreadSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          readBy: arrayUnion(readerId),
          [`readTimestamps.${readerId}`]: serverTimestamp()
        });
      });

      // Update conversation unread count
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      batch.update(conversationRef, {
        [`unreadCounts.${readerType}`]: 0,
        lastReadBy: readerId,
        lastReadAt: serverTimestamp()
      });

      await batch.commit();

      return { success: true, markedCount: unreadSnapshot.size };

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      throw error;
    }
  }

  // Get conversation history
  async getConversationHistory(adminId, userId, conversationId, limitCount = 50, startAfter = null) {
    try {
      const messagesCollection = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      let messagesQuery = query(
        messagesCollection,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (startAfter) {
        messagesQuery = query(
          messagesCollection,
          orderBy('timestamp', 'desc'),
          startAfter(startAfter),
          limit(limitCount)
        );
      }

      const messagesSnapshot = await getDocs(messagesQuery);

      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to get chronological order

      return {
        messages,
        hasMore: messagesSnapshot.docs.length === limitCount,
        lastDoc: messagesSnapshot.docs[messagesSnapshot.docs.length - 1] || null
      };

    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      throw error;
    }
  }

  // Get all conversations for an admin
  async getAdminConversations(adminId, limitCount = 20) {
    try {
      const adminUserCollection = collection(firestore, 'adminUsers', adminId, 'assignedUsers');
      const assignedUsersSnapshot = await getDocs(adminUserCollection);

      const allConversations = [];

      for (const userDoc of assignedUsersSnapshot.docs) {
        const userId = userDoc.id;

        const conversationsCollection = collection(
          firestore,
          'adminUsers', adminId,
          'assignedUsers', userId,
          'conversations'
        );

        const conversationsQuery = query(
          conversationsCollection,
          where('status', '==', 'active'),
          orderBy('updatedAt', 'desc')
        );

        const conversationsSnapshot = await getDocs(conversationsQuery);

        conversationsSnapshot.docs.forEach(doc => {
          allConversations.push({
            id: doc.id,
            userId,
            ...doc.data()
          });
        });
      }

      // Sort all conversations by updatedAt
      allConversations.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis() || 0;
        const bTime = b.updatedAt?.toMillis() || 0;
        return bTime - aTime;
      });

      return allConversations.slice(0, limitCount);

    } catch (error) {
      console.error('❌ Error getting admin conversations:', error);
      throw error;
    }
  }

  // Get user's conversation with admin
  async getUserConversation(adminId, userId) {
    try {
      const conversationsCollection = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations'
      );

      const conversationsQuery = query(
        conversationsCollection,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);

      if (conversationsSnapshot.empty) {
        return null;
      }

      const conversationDoc = conversationsSnapshot.docs[0];
      return {
        id: conversationDoc.id,
        ...conversationDoc.data()
      };

    } catch (error) {
      console.error('❌ Error getting user conversation:', error);
      throw error;
    }
  }

  // Update typing status
  async updateTypingStatus(adminId, userId, conversationId, typerId, isTyping) {
    try {
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      // Clear existing timeout
      const timeoutKey = `${conversationId}_${typerId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey));
      }

      if (isTyping) {
        await updateDoc(conversationRef, {
          [`typing.${typerId}`]: {
            isTyping: true,
            timestamp: serverTimestamp()
          }
        });

        // Auto-clear after 3 seconds
        const timeoutId = setTimeout(async () => {
          try {
            await updateDoc(conversationRef, {
              [`typing.${typerId}.isTyping`]: false
            });
          } catch (error) {
            console.error('❌ Error clearing typing timeout:', error);
          }
        }, 3000);

        this.typingTimeouts.set(timeoutKey, timeoutId);
      } else {
        await updateDoc(conversationRef, {
          [`typing.${typerId}.isTyping`]: false
        });
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error updating typing status:', error);
      throw error;
    }
  }

  // Close conversation
  async closeConversation(adminId, userId, conversationId, reason = 'resolved') {
    try {
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      await updateDoc(conversationRef, {
        status: 'closed',
        closedAt: serverTimestamp(),
        closedBy: adminId,
        closureReason: reason,
        updatedAt: serverTimestamp()
      });

      // Send closure message
      await this.sendSystemMessage(adminId, userId, conversationId,
        `Conversation closed: ${reason}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error closing conversation:', error);
      throw error;
    }
  }

  // Notify admin about new user message
  async notifyAdmin(adminId, userId, conversationId, messageData) {
    try {
      const notificationRef = doc(collection(firestore, 'adminNotifications'));

      await setDoc(notificationRef, {
        adminId,
        userId,
        conversationId,
        type: 'new_user_message',
        message: {
          content: messageData.content,
          senderName: messageData.senderName,
          timestamp: messageData.timestamp
        },
        read: false,
        createdAt: serverTimestamp()
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error notifying admin:', error);
    }
  }

  // Notify user about new admin message
  async notifyUser(userId, adminId, conversationId, messageData) {
    try {
      const notificationRef = doc(collection(firestore, 'userNotifications'));

      await setDoc(notificationRef, {
        userId,
        adminId,
        conversationId,
        type: 'new_admin_message',
        message: {
          content: messageData.content,
          senderName: messageData.senderName,
          timestamp: messageData.timestamp
        },
        read: false,
        createdAt: serverTimestamp()
      });

      // Update user's presence with notification
      const presenceRef = doc(firestore, 'presence', userId);
      await updateDoc(presenceRef, {
        hasUnreadMessages: true,
        lastNotification: serverTimestamp()
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error notifying user:', error);
    }
  }

  // Get conversation analytics
  async getConversationAnalytics(adminId, userId, conversationId) {
    try {
      const messagesCollection = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      const messagesSnapshot = await getDocs(messagesCollection);
      const messages = messagesSnapshot.docs.map(doc => doc.data());

      const analytics = {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.senderType === 'user').length,
        adminMessages: messages.filter(m => m.senderType === 'admin').length,
        systemMessages: messages.filter(m => m.senderType === 'system').length,
        averageResponseTime: 0,
        conversationDuration: 0
      };

      // Calculate response times
      let responseTimes = [];
      for (let i = 1; i < messages.length; i++) {
        const current = messages[i];
        const previous = messages[i - 1];

        if (current.senderType === 'admin' && previous.senderType === 'user') {
          const responseTime = current.timestamp.toMillis() - previous.timestamp.toMillis();
          responseTimes.push(responseTime);
        }
      }

      analytics.averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      // Calculate conversation duration
      if (messages.length > 0) {
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        analytics.conversationDuration = lastMessage.timestamp.toMillis() - firstMessage.timestamp.toMillis();
      }

      return analytics;

    } catch (error) {
      console.error('❌ Error getting conversation analytics:', error);
      throw error;
    }
  }

  // Transfer conversation to another admin
  async transferConversation(fromAdminId, toAdminId, userId, conversationId, reason = 'workload_balance') {
    try {
      // Get current conversation data
      const currentConversationRef = doc(
        firestore,
        'adminUsers', fromAdminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      const conversationDoc = await getDoc(currentConversationRef);
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data();

      // Create conversation in new admin's structure
      const newConversationRef = doc(
        firestore,
        'adminUsers', toAdminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      await setDoc(newConversationRef, {
        ...conversationData,
        adminId: toAdminId,
        transferredFrom: fromAdminId,
        transferredAt: serverTimestamp(),
        transferReason: reason,
        updatedAt: serverTimestamp()
      });

      // Copy all messages
      const messagesCollection = collection(
        firestore,
        'adminUsers', fromAdminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      const messagesSnapshot = await getDocs(messagesCollection);
      const batch = writeBatch(firestore);

      messagesSnapshot.docs.forEach(messageDoc => {
        const newMessageRef = doc(
          firestore,
          'adminUsers', toAdminId,
          'assignedUsers', userId,
          'conversations', conversationId,
          'messages', messageDoc.id
        );

        batch.set(newMessageRef, messageDoc.data());
      });

      await batch.commit();

      // Send transfer notification message
      await this.sendSystemMessage(toAdminId, userId, conversationId,
        `Conversation transferred from ${fromAdminId} to ${toAdminId}. Reason: ${reason}`);

      // Update assignment in admin service
      await this.updateUserAssignment(userId, fromAdminId, toAdminId);

      // Delete old conversation (optional - you might want to keep for audit)
      // await deleteDoc(currentConversationRef);

      return { success: true, newAdminId: toAdminId };

    } catch (error) {
      console.error('❌ Error transferring conversation:', error);
      throw error;
    }
  }

  // Update user assignment
  async updateUserAssignment(userId, fromAdminId, toAdminId) {
    try {
      const assignmentRef = doc(firestore, 'userAssignments', userId);

      await updateDoc(assignmentRef, {
        adminId: toAdminId,
        previousAdminId: fromAdminId,
        transferredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('❌ Error updating user assignment:', error);
    }
  }

  // Clean up listeners
  cleanup() {
    // Clear all real-time listeners
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();

    // Clear typing timeouts
    this.typingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.typingTimeouts.clear();
  }

  // Unsubscribe from specific listener
  unsubscribeListener(listenerKey) {
    const unsubscribe = this.listeners.get(listenerKey);
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
      this.listeners.delete(listenerKey);
    }
  }
}

const adminUserConversationService = new AdminUserConversationService();
export default adminUserConversationService;