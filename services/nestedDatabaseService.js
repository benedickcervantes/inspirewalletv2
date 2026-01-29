import { firestore } from '../configs/firebase';
import {
  doc,
  collection,
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
  increment
} from 'firebase/firestore';

class NestedDatabaseService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  // Get or create admin user structure
  async ensureAdminUserStructure(adminId, userId, userInfo = {}) {
    try {
      const adminUserRef = doc(firestore, 'adminUsers', adminId, 'assignedUsers', userId);

      const adminUserDoc = await getDoc(adminUserRef);

      if (!adminUserDoc.exists()) {
        // Create admin user assignment structure
        const assignmentData = {
          userId,
          adminId,
          assignedAt: serverTimestamp(),
          userInfo: {
            displayName: userInfo.displayName || 'User',
            email: userInfo.email || '',
            platform: userInfo.platform || 'mobile'
          },
          status: 'active',
          conversationCount: 0,
          lastActivity: serverTimestamp()
        };

        await setDoc(adminUserRef, assignmentData);

        // Update admin stats
        await this.updateAdminStats(adminId, {
          totalAssignedUsers: increment(1),
          lastAssignment: serverTimestamp()
        });
      }

      return { exists: adminUserDoc.exists(), path: adminUserRef.path };

    } catch (error) {
      console.error('❌ Error ensuring admin user structure:', error);
      throw error;
    }
  }

  // Create conversation in nested structure
  async createConversationInNested(adminId, userId, conversationId, conversationData = {}) {
    try {
      // Ensure admin user structure exists
      await this.ensureAdminUserStructure(adminId, userId, conversationData.userInfo);

      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      const fullConversationData = {
        conversationId,
        adminId,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        messageCount: 0,
        lastMessage: null,
        unreadCounts: {
          admin: 0,
          user: 0
        },
        ...conversationData
      };

      await setDoc(conversationRef, fullConversationData);

      // Update assignment conversation count
      await this.updateAssignmentStats(adminId, userId, {
        conversationCount: increment(1),
        lastActivity: serverTimestamp()
      });

      return {
        conversationId,
        path: conversationRef.path,
        data: fullConversationData
      };

    } catch (error) {
      console.error('❌ Error creating conversation in nested structure:', error);
      throw error;
    }
  }

  // Add message to nested conversation
  async addMessageToNested(adminId, userId, conversationId, messageId, messageData) {
    try {
      const messageRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages', messageId
      );

      const fullMessageData = {
        id: messageId,
        conversationId,
        adminId,
        userId,
        timestamp: serverTimestamp(),
        readBy: [],
        deliveryStatus: 'sent',
        ...messageData
      };

      await setDoc(messageRef, fullMessageData);

      // Update conversation stats
      await this.updateConversationStats(adminId, userId, conversationId, {
        messageCount: increment(1),
        lastMessage: {
          content: messageData.content || '',
          senderId: messageData.senderId,
          senderType: messageData.senderType,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      // Update assignment activity
      await this.updateAssignmentStats(adminId, userId, {
        lastActivity: serverTimestamp()
      });

      return {
        messageId,
        path: messageRef.path,
        data: fullMessageData
      };

    } catch (error) {
      console.error('❌ Error adding message to nested structure:', error);
      throw error;
    }
  }

  // Get all conversations for admin (across all assigned users)
  async getAllAdminConversations(adminId, options = {}) {
    try {
      const { limit: limitCount = 50, status = 'active', includeUserInfo = true } = options;

      const assignedUsersRef = collection(firestore, 'adminUsers', adminId, 'assignedUsers');
      const assignedUsersSnapshot = await getDocs(assignedUsersRef);

      const allConversations = [];

      for (const userDoc of assignedUsersSnapshot.docs) {
        const userId = userDoc.id;
        const userInfo = userDoc.data();

        const conversationsRef = collection(
          firestore,
          'adminUsers', adminId,
          'assignedUsers', userId,
          'conversations'
        );

        let conversationsQuery = query(
          conversationsRef,
          where('status', '==', status),
          orderBy('updatedAt', 'desc')
        );

        const conversationsSnapshot = await getDocs(conversationsQuery);

        conversationsSnapshot.docs.forEach(doc => {
          const conversationData = {
            id: doc.id,
            userId,
            path: doc.ref.path,
            ...doc.data()
          };

          if (includeUserInfo) {
            conversationData.assignedUserInfo = userInfo;
          }

          allConversations.push(conversationData);
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

  // Get conversation by ID from nested structure
  async getConversationFromNested(adminId, userId, conversationId) {
    try {
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        return null;
      }

      return {
        id: conversationDoc.id,
        path: conversationRef.path,
        ...conversationDoc.data()
      };

    } catch (error) {
      console.error('❌ Error getting conversation from nested structure:', error);
      throw error;
    }
  }

  // Get messages from nested conversation with pagination
  async getMessagesFromNested(adminId, userId, conversationId, options = {}) {
    try {
      const { limit: limitCount = 50, orderDirection = 'asc', startAfter = null } = options;

      const messagesRef = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      let messagesQuery = query(
        messagesRef,
        orderBy('timestamp', orderDirection),
        limit(limitCount)
      );

      if (startAfter) {
        messagesQuery = query(
          messagesRef,
          orderBy('timestamp', orderDirection),
          startAfter(startAfter),
          limit(limitCount)
        );
      }

      const messagesSnapshot = await getDocs(messagesQuery);

      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        path: doc.ref.path,
        ...doc.data()
      }));

      return {
        messages,
        hasMore: messagesSnapshot.docs.length === limitCount,
        lastDoc: messagesSnapshot.docs[messagesSnapshot.docs.length - 1] || null,
        total: messagesSnapshot.docs.length
      };

    } catch (error) {
      console.error('❌ Error getting messages from nested structure:', error);
      throw error;
    }
  }

  // Listen to conversation changes in nested structure
  subscribeToNestedConversation(adminId, userId, conversationId, callback) {
    try {
      const listenerKey = `nested_conv_${adminId}_${userId}_${conversationId}`;

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
            path: doc.ref.path,
            ...doc.data()
          });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('❌ Error in nested conversation subscription:', error);
        callback(null, error);
      });

      this.listeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error subscribing to nested conversation:', error);
      return null;
    }
  }

  // Listen to messages in nested conversation
  subscribeToNestedMessages(adminId, userId, conversationId, callback, options = {}) {
    try {
      const { limit: limitCount = 50, orderDirection = 'asc' } = options;
      const listenerKey = `nested_msgs_${adminId}_${userId}_${conversationId}`;

      const messagesRef = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', orderDirection),
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
            path: change.doc.ref.path,
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
            path: doc.ref.path,
            ...doc.data()
          });
        });

        callback({
          messages,
          changes,
          total: snapshot.docs.length
        });
      }, (error) => {
        console.error('❌ Error in nested messages subscription:', error);
        callback({ messages: [], changes: { added: [], modified: [], removed: [] }, error });
      });

      this.listeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error subscribing to nested messages:', error);
      return null;
    }
  }

  // Update conversation stats
  async updateConversationStats(adminId, userId, conversationId, updates) {
    try {
      const conversationRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId
      );

      await updateDoc(conversationRef, updates);
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating conversation stats:', error);
      throw error;
    }
  }

  // Update assignment stats
  async updateAssignmentStats(adminId, userId, updates) {
    try {
      const assignmentRef = doc(firestore, 'adminUsers', adminId, 'assignedUsers', userId);

      await updateDoc(assignmentRef, updates);
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating assignment stats:', error);
      throw error;
    }
  }

  // Update admin stats
  async updateAdminStats(adminId, updates) {
    try {
      const adminRef = doc(firestore, 'adminUsers', adminId);

      // Get or create admin document
      const adminDoc = await getDoc(adminRef);

      if (!adminDoc.exists()) {
        await setDoc(adminRef, {
          adminId,
          createdAt: serverTimestamp(),
          totalAssignedUsers: 0,
          totalConversations: 0,
          lastActivity: serverTimestamp(),
          ...updates
        });
      } else {
        await updateDoc(adminRef, updates);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error updating admin stats:', error);
      throw error;
    }
  }

  // Batch operations for nested structure
  async batchOperations(operations) {
    try {
      const batch = writeBatch(firestore);

      for (const operation of operations) {
        const { type, path, data } = operation;

        switch (type) {
          case 'set':
            batch.set(doc(firestore, path), data);
            break;
          case 'update':
            batch.update(doc(firestore, path), data);
            break;
          case 'delete':
            batch.delete(doc(firestore, path));
            break;
        }
      }

      await batch.commit();
      return { success: true, operationsCount: operations.length };

    } catch (error) {
      console.error('❌ Error in batch operations:', error);
      throw error;
    }
  }

  // Copy conversation to different admin (for transfers)
  async copyConversationToAdmin(fromAdminId, toAdminId, userId, conversationId) {
    try {
      // Get original conversation and messages
      const originalConversation = await this.getConversationFromNested(
        fromAdminId, userId, conversationId
      );

      if (!originalConversation) {
        throw new Error('Original conversation not found');
      }

      const originalMessages = await this.getMessagesFromNested(
        fromAdminId, userId, conversationId, { limit: 1000 }
      );

      // Create new conversation structure
      await this.createConversationInNested(toAdminId, userId, conversationId, {
        ...originalConversation,
        adminId: toAdminId,
        transferredFrom: fromAdminId,
        transferredAt: serverTimestamp()
      });

      // Copy all messages
      const batch = writeBatch(firestore);

      originalMessages.messages.forEach(message => {
        const newMessageRef = doc(
          firestore,
          'adminUsers', toAdminId,
          'assignedUsers', userId,
          'conversations', conversationId,
          'messages', message.id
        );

        batch.set(newMessageRef, {
          ...message,
          adminId: toAdminId, // Update admin reference
          copiedAt: serverTimestamp()
        });
      });

      await batch.commit();

      // Add transfer system message
      await this.addMessageToNested(toAdminId, userId, conversationId,
        `sys_transfer_${Date.now()}`, {
          content: `Conversation transferred from admin ${fromAdminId} to admin ${toAdminId}`,
          senderId: 'system',
          senderType: 'system',
          senderName: 'System',
          messageType: 'system'
        });

      return { success: true, messagesTransferred: originalMessages.messages.length };

    } catch (error) {
      console.error('❌ Error copying conversation to admin:', error);
      throw error;
    }
  }

  // Get admin performance metrics from nested data
  async getAdminMetricsFromNested(adminId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;

      const assignedUsersRef = collection(firestore, 'adminUsers', adminId, 'assignedUsers');
      const assignedUsersSnapshot = await getDocs(assignedUsersRef);

      const metrics = {
        totalAssignedUsers: assignedUsersSnapshot.size,
        totalConversations: 0,
        totalMessages: 0,
        activeConversations: 0,
        averageResponseTime: 0,
        messageDistribution: {
          adminMessages: 0,
          userMessages: 0,
          systemMessages: 0
        }
      };

      let responseTimes = [];

      for (const userDoc of assignedUsersSnapshot.docs) {
        const userId = userDoc.id;

        // Get conversations for this user
        const conversationsRef = collection(
          firestore,
          'adminUsers', adminId,
          'assignedUsers', userId,
          'conversations'
        );

        let conversationsQuery = query(conversationsRef);

        if (startDate || endDate) {
          if (startDate) conversationsQuery = query(conversationsQuery, where('createdAt', '>=', startDate));
          if (endDate) conversationsQuery = query(conversationsQuery, where('createdAt', '<=', endDate));
        }

        const conversationsSnapshot = await getDocs(conversationsQuery);
        metrics.totalConversations += conversationsSnapshot.size;

        // Count active conversations
        conversationsSnapshot.docs.forEach(doc => {
          const convData = doc.data();
          if (convData.status === 'active') {
            metrics.activeConversations++;
          }
        });

        // Analyze messages for each conversation
        for (const convDoc of conversationsSnapshot.docs) {
          const conversationId = convDoc.id;

          const messagesRef = collection(
            firestore,
            'adminUsers', adminId,
            'assignedUsers', userId,
            'conversations', conversationId,
            'messages'
          );

          const messagesSnapshot = await getDocs(messagesRef);
          metrics.totalMessages += messagesSnapshot.size;

          const messages = messagesSnapshot.docs.map(doc => doc.data());

          // Count message types
          messages.forEach(msg => {
            switch (msg.senderType) {
              case 'admin':
                metrics.messageDistribution.adminMessages++;
                break;
              case 'user':
                metrics.messageDistribution.userMessages++;
                break;
              case 'system':
                metrics.messageDistribution.systemMessages++;
                break;
            }
          });

          // Calculate response times
          for (let i = 1; i < messages.length; i++) {
            const current = messages[i];
            const previous = messages[i - 1];

            if (current.senderType === 'admin' && previous.senderType === 'user') {
              const responseTime = current.timestamp.toMillis() - previous.timestamp.toMillis();
              responseTimes.push(responseTime);
            }
          }
        }
      }

      // Calculate average response time
      if (responseTimes.length > 0) {
        metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }

      return metrics;

    } catch (error) {
      console.error('❌ Error getting admin metrics from nested data:', error);
      throw error;
    }
  }

  // Search across nested conversations
  async searchNestedConversations(adminId, searchQuery, options = {}) {
    try {
      const { limit: limitCount = 20, messageContent = false } = options;

      const results = [];
      const assignedUsersRef = collection(firestore, 'adminUsers', adminId, 'assignedUsers');
      const assignedUsersSnapshot = await getDocs(assignedUsersRef);

      for (const userDoc of assignedUsersSnapshot.docs) {
        const userId = userDoc.id;
        const userInfo = userDoc.data();

        // Search in user info
        const searchLower = searchQuery.toLowerCase();
        const userMatch = (
          userInfo.userInfo?.displayName?.toLowerCase().includes(searchLower) ||
          userInfo.userInfo?.email?.toLowerCase().includes(searchLower)
        );

        if (userMatch) {
          // Get user's conversations
          const conversationsRef = collection(
            firestore,
            'adminUsers', adminId,
            'assignedUsers', userId,
            'conversations'
          );

          const conversationsSnapshot = await getDocs(conversationsRef);

          conversationsSnapshot.docs.forEach(doc => {
            results.push({
              type: 'conversation',
              userId,
              conversationId: doc.id,
              userInfo: userInfo.userInfo,
              conversationData: doc.data(),
              matchType: 'user_info'
            });
          });
        }

        // Search in message content if requested
        if (messageContent) {
          // This would require a more complex search implementation
          // For now, we'll skip message content search due to Firebase limitations
        }
      }

      return results.slice(0, limitCount);

    } catch (error) {
      console.error('❌ Error searching nested conversations:', error);
      throw error;
    }
  }

  // Get cache entry
  getCacheEntry(key) {
    return this.cache.get(key);
  }

  // Set cache entry
  setCacheEntry(key, value, ttl = 300000) { // 5 minutes default TTL
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });

    // Auto cleanup expired entries
    global.setTimeout(() => {
      const entry = this.cache.get(key);
      if (entry && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
      }
    }, ttl);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Cleanup all listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();
    this.cache.clear();
  }

  // Unsubscribe specific listener
  unsubscribeListener(listenerKey) {
    const unsubscribe = this.listeners.get(listenerKey);
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
      this.listeners.delete(listenerKey);
    }
  }
}

const nestedDatabaseService = new NestedDatabaseService();
export default nestedDatabaseService;