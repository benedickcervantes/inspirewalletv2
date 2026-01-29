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
  writeBatch
} from 'firebase/firestore';
import { firestore as db } from '../configs/firebase';
import adminAssignmentService from './adminAssignmentService';

class MobileChatService {
  constructor() {
    this.listeners = new Map();
  }

  // Initialize or get existing chat room for user
  async initializeUserChat(userId, userEmail, userName) {
    try {
      // Check if user already has a chat room
      const chatRoomsQuery = query(
        collection(db, 'chatRooms'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const chatRoomsSnapshot = await getDocs(chatRoomsQuery);

      if (!chatRoomsSnapshot.empty) {
        // Return existing chat room
        const chatRoomDoc = chatRoomsSnapshot.docs[0];
        return {
          chatRoomId: chatRoomDoc.id,
          ...chatRoomDoc.data()
        };
      }

      // Create new chat room with admin assignment
      const assignedAdmin = await adminAssignmentService.assignUserToAdmin(
        userId,
        userEmail,
        userName
      );

      if (!assignedAdmin) {
        throw new Error('No available admins for assignment');
      }

      // Create new chat room
      const chatRoomData = {
        userId,
        adminId: assignedAdmin.adminId,
        userEmail,
        adminEmail: assignedAdmin.adminEmail,
        userName,
        adminName: assignedAdmin.adminName,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        isActive: true,
        unreadCount: 0,
        lastMessage: `Chat started with ${assignedAdmin.adminName}`,
        lastMessageSender: 'system',
        userOnline: false,
        adminOnline: false
      };

      const chatRoomRef = await addDoc(collection(db, 'chatRooms'), chatRoomData);

      // Send initial system message
      await this.sendSystemMessage(chatRoomRef.id, `${userName} has started a conversation`);

      return {
        chatRoomId: chatRoomRef.id,
        ...chatRoomData
      };

    } catch (error) {
      console.error('Error initializing user chat:', error);
      throw error;
    }
  }

  // Send message from user to admin
  async sendMessageToAdmin(userId, chatRoomId, message, userName) {
    try {
      // Verify user owns this chat room
      const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists() || chatRoomSnap.data().userId !== userId) {
        throw new Error('Unauthorized access to chat room');
      }

      // Add message to messages collection
      const messageData = {
        chatRoomId,
        senderId: userId,
        senderType: 'user',
        senderName: userName,
        message: message.trim(),
        timestamp: serverTimestamp(),
        isRead: false
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update chat room with last message info
      await updateDoc(chatRoomRef, {
        lastMessage: message.trim(),
        lastMessageSender: 'user',
        lastMessageAt: serverTimestamp(),
        unreadCount: chatRoomSnap.data().unreadCount + 1
      });

      return { success: true, messageId: Date.now() };

    } catch (error) {
      console.error('Error sending message to admin:', error);
      throw error;
    }
  }

  // Subscribe to real-time messages for a chat room
  subscribeToMessages(chatRoomId, callback) {
    if (this.listeners.has(chatRoomId)) {
      this.listeners.get(chatRoomId)();
    }

    const messagesQuery = query(
      collection(db, 'messages'),
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
    });

    this.listeners.set(chatRoomId, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to chat room updates
  subscribeToChatRoom(chatRoomId, callback) {
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);

    const unsubscribe = onSnapshot(chatRoomRef, (doc) => {
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data()
        });
      }
    });

    return unsubscribe;
  }

  // Mark messages as read by user
  async markMessagesAsRead(chatRoomId, userId) {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('chatRoomId', '==', chatRoomId),
        where('senderType', '==', 'admin'),
        where('isRead', '==', false)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      if (messagesSnapshot.empty) return;

      const batch = writeBatch(db);

      messagesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });

      await batch.commit();

      // Reset unread count for admin messages
      const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
      await updateDoc(chatRoomRef, {
        unreadCount: 0
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Update user online status
  async setUserOnlineStatus(chatRoomId, userId, isOnline) {
    try {
      const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
      await updateDoc(chatRoomRef, {
        userOnline: isOnline,
        userLastSeen: serverTimestamp()
      });

      // Update presence collection
      const presenceRef = doc(db, 'presence', userId);
      await updateDoc(presenceRef, {
        isOnline,
        lastSeen: serverTimestamp(),
        platform: 'mobile'
      });

    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  // Get chat history for user
  async getChatHistory(chatRoomId, userId, limitCount = 50) {
    try {
      // Verify user owns this chat room
      const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists() || chatRoomSnap.data().userId !== userId) {
        throw new Error('Unauthorized access to chat room');
      }

      const messagesQuery = query(
        collection(db, 'messages'),
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
      console.error('Error getting chat history:', error);
      throw error;
    }
  }

  // Send system message
  async sendSystemMessage(chatRoomId, message) {
    try {
      const messageData = {
        chatRoomId,
        senderId: 'system',
        senderType: 'system',
        senderName: 'System',
        message,
        timestamp: serverTimestamp(),
        isRead: true
      };

      await addDoc(collection(db, 'messages'), messageData);
    } catch (error) {
      console.error('Error sending system message:', error);
    }
  }

  // Get user's assigned admin info
  async getAssignedAdmin(userId) {
    try {
      const chatRoomsQuery = query(
        collection(db, 'chatRooms'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const chatRoomsSnapshot = await getDocs(chatRoomsQuery);

      if (chatRoomsSnapshot.empty) {
        return null;
      }

      const chatRoomData = chatRoomsSnapshot.docs[0].data();

      return {
        adminId: chatRoomData.adminId,
        adminName: chatRoomData.adminName,
        adminEmail: chatRoomData.adminEmail,
        adminOnline: chatRoomData.adminOnline || false
      };

    } catch (error) {
      console.error('Error getting assigned admin:', error);
      return null;
    }
  }

  // Clean up listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

// Export singleton instance
export const mobileChatService = new MobileChatService();