import { firestore } from '../configs/firebase';
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
  setDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import adminAssignmentService from './adminAssignmentService';
import presenceService from './presenceService';

class UpdatedMobileChatService {
  constructor() {
    this.listeners = new Map();
    this.currentUser = null;
    this.currentAdmin = null;
    this.currentConversation = null;
  }

  // Initialize user chat with new nested structure
  async initializeUserChat(userId, userEmail, userName) {
    try {
      console.log('🚀 Initializing chat for user:', userId);

      this.currentUser = {
        userId,
        userEmail,
        userName,
        platform: 'mobile'
      };

      // Step 1: Get or assign admin
      const assignedAdmin = await this.getOrAssignAdmin(userId, userEmail, userName);
      this.currentAdmin = assignedAdmin;

      // Step 2: Get or create conversation in nested structure
      this.currentConversation = await this.getOrCreateNestedConversation(
        assignedAdmin.adminId,
        userId,
        { userEmail, userName }
      );

      console.log('✅ Chat initialized successfully');
      console.log('👤 Admin:', assignedAdmin.adminName);
      console.log('💬 Conversation:', this.currentConversation.conversationId);

      return {
        success: true,
        chatRoomId: this.currentConversation.conversationId, // For backward compatibility
        conversationId: this.currentConversation.conversationId,
        adminId: assignedAdmin.adminId,
        adminName: assignedAdmin.adminName,
        adminEmail: assignedAdmin.adminEmail,
        adminOnline: await this.checkAdminOnlineStatus(assignedAdmin.adminId),
        ...this.currentConversation
      };

    } catch (error) {
      console.error('❌ Error initializing user chat:', error);
      throw error;
    }
  }

  // Get or assign admin (uses existing service)
  async getOrAssignAdmin(userId, userEmail, userName) {
    try {
      // Check existing assignment
      const existingAdmin = await adminAssignmentService.getUserAssignedAdmin(userId);

      if (existingAdmin && existingAdmin.admin) {
        return {
          adminId: existingAdmin.assignment.adminId,
          adminName: existingAdmin.admin.name,
          adminEmail: existingAdmin.admin.email,
          assignment: existingAdmin.assignment
        };
      }

      // Assign new admin
      const newAssignment = await adminAssignmentService.assignUserToAdmin(
        userId,
        userEmail,
        userName
      );

      return newAssignment;

    } catch (error) {
      console.error('❌ Error getting or assigning admin:', error);
      throw error;
    }
  }

  // Get or create conversation in nested structure
  async getOrCreateNestedConversation(adminId, userId, userInfo) {
    try {
      // Check for existing active conversation in nested structure
      const conversationsRef = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations'
      );

      const existingQuery = query(
        conversationsRef,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        const conversationDoc = existingSnapshot.docs[0];
        return {
          conversationId: conversationDoc.id,
          ...conversationDoc.data()
        };
      }

      // Create new conversation in nested structure
      const conversationId = `conv_${userId}_${Date.now()}`;
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
        isActive: true,
        messageCount: 0,
        lastMessage: {
          content: 'Chat started',
          senderId: 'system',
          senderType: 'system',
          timestamp: serverTimestamp()
        },
        unreadCounts: {
          admin: 0,
          user: 0
        },
        userInfo: {
          userEmail: userInfo.userEmail,
          userName: userInfo.userName,
          displayName: userInfo.userName,
          platform: 'mobile'
        },
        userOnline: true,
        adminOnline: false
      };

      // Ensure admin user structure exists
      await this.ensureAdminUserStructure(adminId, userId, userInfo);

      await setDoc(conversationRef, conversationData);

      // Send initial system message
      await this.sendSystemMessage(adminId, userId, conversationId,
        `${userInfo.userName} has started a conversation`);

      // Create backward-compatible chatRoom document for old clients
      await this.createBackwardCompatibleChatRoom(conversationId, adminId, userId, userInfo);

      return conversationData;

    } catch (error) {
      console.error('❌ Error getting or creating nested conversation:', error);
      throw error;
    }
  }

  // Ensure admin user assignment structure exists
  async ensureAdminUserStructure(adminId, userId, userInfo) {
    try {
      const assignmentRef = doc(firestore, 'adminUsers', adminId, 'assignedUsers', userId);

      const assignmentDoc = await getDoc(assignmentRef);

      if (!assignmentDoc.exists()) {
        await setDoc(assignmentRef, {
          userId,
          adminId,
          assignedAt: serverTimestamp(),
          userInfo: {
            userEmail: userInfo.userEmail || '',
            userName: userInfo.userName || 'User',
            displayName: userInfo.userName || 'User',
            platform: 'mobile'
          },
          status: 'active',
          conversationCount: 0,
          lastActivity: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('❌ Error ensuring admin user structure:', error);
    }
  }

  // Create backward-compatible chatRoom for existing mobile apps
  async createBackwardCompatibleChatRoom(conversationId, adminId, userId, userInfo) {
    try {
      const chatRoomRef = doc(firestore, 'chatRooms', conversationId);

      await setDoc(chatRoomRef, {
        userId,
        adminId,
        userEmail: userInfo.userEmail,
        adminEmail: this.currentAdmin.adminEmail,
        userName: userInfo.userName,
        adminName: this.currentAdmin.adminName,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        isActive: true,
        unreadCount: 0,
        lastMessage: `Chat started with ${this.currentAdmin.adminName}`,
        lastMessageSender: 'system',
        userOnline: true,
        adminOnline: false,
        // Reference to nested conversation
        nestedConversationPath: `adminUsers/${adminId}/assignedUsers/${userId}/conversations/${conversationId}`
      });

    } catch (error) {
      console.error('❌ Error creating backward compatible chat room:', error);
    }
  }

  // Send message from user to admin (supports both old and new structure)
  async sendMessageToAdmin(userId, chatRoomId, message, userName) {
    try {
      if (!this.currentAdmin || !this.currentConversation) {
        throw new Error('Chat not properly initialized');
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send to nested structure (primary)
      await this.sendMessageToNestedStructure(
        this.currentAdmin.adminId,
        userId,
        this.currentConversation.conversationId,
        message,
        userName,
        messageId
      );

      // Update backward-compatible chatRoom
      await this.updateBackwardCompatibleChatRoom(chatRoomId, message, 'user');

      // Create message in old messages collection for backward compatibility
      await this.createBackwardCompatibleMessage(chatRoomId, message, userId, userName, messageId);

      console.log('✅ Message sent successfully');

      return { success: true, messageId };

    } catch (error) {
      console.error('❌ Error sending message to admin:', error);
      throw error;
    }
  }

  // Send message to nested structure
  async sendMessageToNestedStructure(adminId, userId, conversationId, message, userName, messageId) {
    try {
      const messageRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages', messageId
      );

      const messageData = {
        id: messageId,
        content: message.trim(),
        senderId: userId,
        senderType: 'user',
        senderName: userName,
        timestamp: serverTimestamp(),
        readBy: [],
        deliveryStatus: 'sent',
        messageType: 'text',
        platform: 'mobile'
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
          content: message.trim(),
          senderId: userId,
          senderType: 'user',
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        'unreadCounts.admin': firestore.FieldValue?.increment?.(1) || 1,
        messageCount: firestore.FieldValue?.increment?.(1) || 1
      });

      // Send notification to admin
      await this.notifyAdmin(adminId, userId, conversationId, messageData);

    } catch (error) {
      console.error('❌ Error sending to nested structure:', error);
      throw error;
    }
  }

  // Update backward-compatible chatRoom
  async updateBackwardCompatibleChatRoom(chatRoomId, message, senderType) {
    try {
      const chatRoomRef = doc(firestore, 'chatRooms', chatRoomId);

      await updateDoc(chatRoomRef, {
        lastMessage: message.trim(),
        lastMessageSender: senderType,
        lastMessageAt: serverTimestamp(),
        unreadCount: senderType === 'user' ?
          firestore.FieldValue?.increment?.(1) || 1 : 0
      });

    } catch (error) {
      console.error('❌ Error updating backward compatible chat room:', error);
    }
  }

  // Create backward-compatible message
  async createBackwardCompatibleMessage(chatRoomId, message, senderId, senderName, messageId) {
    try {
      const messageData = {
        chatRoomId,
        senderId,
        senderType: 'user',
        senderName,
        message: message.trim(),
        timestamp: serverTimestamp(),
        isRead: false,
        messageId
      };

      await addDoc(collection(firestore, 'messages'), messageData);

    } catch (error) {
      console.error('❌ Error creating backward compatible message:', error);
    }
  }

  // Subscribe to messages (handles both old and new structure)
  subscribeToMessages(chatRoomId, callback) {
    try {
      if (!this.currentAdmin || !this.currentConversation) {
        console.warn('⚠️ Chat not initialized, using fallback subscription');
        return this.subscribeToOldMessages(chatRoomId, callback);
      }

      // Subscribe to nested messages (primary)
      return this.subscribeToNestedMessages(
        this.currentAdmin.adminId,
        this.currentUser.userId,
        this.currentConversation.conversationId,
        callback
      );

    } catch (error) {
      console.error('❌ Error subscribing to messages:', error);
      // Fallback to old structure
      return this.subscribeToOldMessages(chatRoomId, callback);
    }
  }

  // Subscribe to nested messages
  subscribeToNestedMessages(adminId, userId, conversationId, callback) {
    try {
      const listenerKey = `nested_messages_${conversationId}`;

      if (this.listeners.has(listenerKey)) {
        this.listeners.get(listenerKey)();
      }

      const messagesRef = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'asc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        callback(messages);
      }, (error) => {
        console.error('❌ Error in nested messages subscription:', error);
        callback([]);
      });

      this.listeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error subscribing to nested messages:', error);
      return null;
    }
  }

  // Subscribe to old messages (fallback)
  subscribeToOldMessages(chatRoomId, callback) {
    try {
      const listenerKey = `old_messages_${chatRoomId}`;

      if (this.listeners.has(listenerKey)) {
        this.listeners.get(listenerKey)();
      }

      const messagesQuery = query(
        collection(firestore, 'messages'),
        where('chatRoomId', '==', chatRoomId),
        orderBy('timestamp', 'asc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        callback(messages);
      }, (error) => {
        console.error('❌ Error in old messages subscription:', error);
        callback([]);
      });

      this.listeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error subscribing to old messages:', error);
      return null;
    }
  }

  // Subscribe to chat room updates
  subscribeToChatRoom(chatRoomId, callback) {
    try {
      const listenerKey = `chatroom_${chatRoomId}`;

      if (this.listeners.has(listenerKey)) {
        this.listeners.get(listenerKey)();
      }

      // Subscribe to both old chatRoom and nested conversation
      const chatRoomRef = doc(firestore, 'chatRooms', chatRoomId);

      const unsubscribe = onSnapshot(chatRoomRef, async (doc) => {
        if (doc.exists()) {
          const chatRoomData = doc.data();

          // Also get data from nested structure if available
          if (this.currentAdmin && this.currentUser && this.currentConversation) {
            try {
              const nestedConvRef = doc(
                firestore,
                'adminUsers', this.currentAdmin.adminId,
                'assignedUsers', this.currentUser.userId,
                'conversations', this.currentConversation.conversationId
              );

              const nestedConvDoc = await getDoc(nestedConvRef);

              if (nestedConvDoc.exists()) {
                const nestedData = nestedConvDoc.data();

                // Merge data from both sources
                callback({
                  id: doc.id,
                  ...chatRoomData,
                  // Override with nested data if available
                  ...nestedData,
                  // Keep backward compatibility
                  chatRoomId: doc.id
                });
                return;
              }
            } catch (nestedError) {
              console.warn('⚠️ Could not fetch nested data:', nestedError);
            }
          }

          // Fallback to chatRoom data only
          callback({
            id: doc.id,
            ...chatRoomData
          });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('❌ Error in chat room subscription:', error);
        callback(null);
      });

      this.listeners.set(listenerKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error subscribing to chat room:', error);
      return null;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(chatRoomId, userId) {
    try {
      // Mark in nested structure if available
      if (this.currentAdmin && this.currentConversation) {
        await this.markNestedMessagesAsRead(
          this.currentAdmin.adminId,
          userId,
          this.currentConversation.conversationId
        );
      }

      // Mark in old structure for backward compatibility
      await this.markOldMessagesAsRead(chatRoomId, userId);

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      throw error;
    }
  }

  // Mark nested messages as read
  async markNestedMessagesAsRead(adminId, userId, conversationId) {
    try {
      const messagesRef = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      const unreadQuery = query(
        messagesRef,
        where('senderType', '==', 'admin'),
        where('readBy', 'not-in', [[userId]])
      );

      const unreadSnapshot = await getDocs(unreadQuery);

      if (unreadSnapshot.empty) return;

      const batch = writeBatch(firestore);

      unreadSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          readBy: firestore.FieldValue?.arrayUnion?.(userId) || [userId],
          isRead: true
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
        'unreadCounts.user': 0
      });

      await batch.commit();

    } catch (error) {
      console.error('❌ Error marking nested messages as read:', error);
    }
  }

  // Mark old messages as read (backward compatibility)
  async markOldMessagesAsRead(chatRoomId, userId) {
    try {
      const messagesQuery = query(
        collection(firestore, 'messages'),
        where('chatRoomId', '==', chatRoomId),
        where('senderType', '==', 'admin'),
        where('isRead', '==', false)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      if (messagesSnapshot.empty) return;

      const batch = writeBatch(firestore);

      messagesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });

      // Reset unread count for chatRoom
      const chatRoomRef = doc(firestore, 'chatRooms', chatRoomId);
      batch.update(chatRoomRef, { unreadCount: 0 });

      await batch.commit();

    } catch (error) {
      console.error('❌ Error marking old messages as read:', error);
    }
  }

  // Update user online status
  async setUserOnlineStatus(chatRoomId, userId, isOnline) {
    try {
      // Update in nested structure
      if (this.currentAdmin && this.currentConversation) {
        const conversationRef = doc(
          firestore,
          'adminUsers', this.currentAdmin.adminId,
          'assignedUsers', userId,
          'conversations', this.currentConversation.conversationId
        );

        await updateDoc(conversationRef, {
          userOnline: isOnline,
          userLastSeen: serverTimestamp()
        });
      }

      // Update in old chatRoom structure
      const chatRoomRef = doc(firestore, 'chatRooms', chatRoomId);
      await updateDoc(chatRoomRef, {
        userOnline: isOnline,
        userLastSeen: serverTimestamp()
      });

      // Update presence service
      if (presenceService.forceUpdateStatus) {
        await presenceService.forceUpdateStatus(isOnline ? 'online' : 'offline');
      }

    } catch (error) {
      console.error('❌ Error updating user online status:', error);
    }
  }

  // Check admin online status
  async checkAdminOnlineStatus(adminId) {
    try {
      const adminPresenceRef = doc(firestore, 'presence', adminId);
      const adminPresenceDoc = await getDoc(adminPresenceRef);

      if (!adminPresenceDoc.exists()) return false;

      const presenceData = adminPresenceDoc.data();
      const now = new Date();
      const lastHeartbeat = presenceData.lastHeartbeat?.toDate() || new Date(0);
      const timeDiff = now - lastHeartbeat;

      return presenceData.status === 'online' &&
             presenceData.isActive &&
             timeDiff < 120000; // 2 minutes

    } catch (error) {
      console.error('❌ Error checking admin online status:', error);
      return false;
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

      await setDoc(messageRef, {
        id: messageId,
        content,
        senderId: 'system',
        senderType: 'system',
        senderName: 'System',
        timestamp: serverTimestamp(),
        readBy: [adminId, userId],
        deliveryStatus: 'delivered',
        messageType: 'system'
      });

    } catch (error) {
      console.error('❌ Error sending system message:', error);
    }
  }

  // Notify admin
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

    } catch (error) {
      console.error('❌ Error notifying admin:', error);
    }
  }

  // Get chat history
  async getChatHistory(chatRoomId, userId, limitCount = 50) {
    try {
      // Try to get from nested structure first
      if (this.currentAdmin && this.currentConversation) {
        return await this.getNestedChatHistory(
          this.currentAdmin.adminId,
          userId,
          this.currentConversation.conversationId,
          limitCount
        );
      }

      // Fallback to old structure
      return await this.getOldChatHistory(chatRoomId, limitCount);

    } catch (error) {
      console.error('❌ Error getting chat history:', error);
      return [];
    }
  }

  // Get nested chat history
  async getNestedChatHistory(adminId, userId, conversationId, limitCount) {
    try {
      const messagesRef = collection(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages'
      );

      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();

    } catch (error) {
      console.error('❌ Error getting nested chat history:', error);
      return [];
    }
  }

  // Get old chat history
  async getOldChatHistory(chatRoomId, limitCount) {
    try {
      const messagesQuery = query(
        collection(firestore, 'messages'),
        where('chatRoomId', '==', chatRoomId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();

    } catch (error) {
      console.error('❌ Error getting old chat history:', error);
      return [];
    }
  }

  // Get assigned admin info
  async getAssignedAdmin(userId) {
    try {
      if (this.currentAdmin) {
        return {
          adminId: this.currentAdmin.adminId,
          adminName: this.currentAdmin.adminName,
          adminEmail: this.currentAdmin.adminEmail,
          adminOnline: await this.checkAdminOnlineStatus(this.currentAdmin.adminId)
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Error getting assigned admin:', error);
      return null;
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      initialized: !!(this.currentUser && this.currentAdmin),
      currentUser: this.currentUser,
      currentAdmin: this.currentAdmin ? {
        adminId: this.currentAdmin.adminId,
        adminName: this.currentAdmin.adminName
      } : null,
      currentConversation: this.currentConversation ? {
        conversationId: this.currentConversation.conversationId,
        status: this.currentConversation.status
      } : null,
      activeListeners: this.listeners.size
    };
  }

  // Clean up listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();

    this.currentUser = null;
    this.currentAdmin = null;
    this.currentConversation = null;
  }
}

// Export singleton instance
const updatedMobileChatService = new UpdatedMobileChatService();
export default updatedMobileChatService;