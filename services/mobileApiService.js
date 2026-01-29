import { mobileChatService } from './mobileChatService';
import { auth } from '../configs/firebase';

class MobileApiService {

  // Initialize chat for mobile user
  async initializeChat(userId, userEmail, userName) {
    try {
      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated');
      }

      // Initialize chat using the service directly
      const chatRoom = await mobileChatService.initializeUserChat(
        userId,
        userEmail,
        userName
      );

      return {
        success: true,
        chatRoom
      };

    } catch (error) {
      console.error('Error initializing mobile chat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send message to admin
  async sendMessage(userId, chatRoomId, message, userName) {
    try {
      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated');
      }

      // Validate message content
      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      if (message.length > 1000) {
        throw new Error('Message too long (max 1000 characters)');
      }

      // Send message using the service directly
      const result = await mobileChatService.sendMessageToAdmin(
        userId,
        chatRoomId,
        message,
        userName
      );

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get chat history
  async getChatHistory(userId, chatRoomId, limit = 50) {
    try {
      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated');
      }

      // Get chat history using the service directly
      const messages = await mobileChatService.getChatHistory(
        chatRoomId,
        userId,
        limit
      );

      return {
        success: true,
        messages,
        count: messages.length
      };

    } catch (error) {
      console.error('Error getting chat history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mark messages as read
  async markMessagesAsRead(userId, chatRoomId) {
    try {
      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated');
      }

      // Mark messages as read using the service directly
      await mobileChatService.markMessagesAsRead(chatRoomId, userId);

      return {
        success: true,
        message: 'Messages marked as read'
      };

    } catch (error) {
      console.error('Error marking messages as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update user online status
  async updateOnlineStatus(userId, chatRoomId, isOnline) {
    try {
      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated');
      }

      // Update status using the service directly
      await mobileChatService.setUserOnlineStatus(chatRoomId, userId, isOnline);

      return {
        success: true,
        status: isOnline ? 'online' : 'offline'
      };

    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get assigned admin info
  async getAssignedAdmin(userId) {
    try {
      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated');
      }

      // Get assigned admin using the service directly
      const adminInfo = await mobileChatService.getAssignedAdmin(userId);

      return {
        success: true,
        adminInfo
      };

    } catch (error) {
      console.error('Error getting assigned admin:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch image/file from admin chat message
  async getAdminChatImage(adminId, userId, conversationId, messageId) {
    try {
      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User not authenticated');
      }

      // Import Firebase functions
      const { getDoc, doc } = await import('firebase/firestore');
      const { firestore } = await import('../configs/firebase');

      // Get message from nested Firebase structure using v9 syntax
      const messageRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages', messageId
      );

      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();

      // Check if message has file attachment
      if (!messageData.file) {
        throw new Error('Message does not contain a file');
      }

      // Return file information including the download URL
      return {
        success: true,
        file: {
          url: messageData.file.url,
          name: messageData.file.name,
          type: messageData.file.type,
          size: messageData.file.size,
          category: messageData.file.category,
          path: messageData.file.path
        },
        messageInfo: {
          messageId: messageDoc.id,
          content: messageData.content,
          senderId: messageData.senderId,
          senderType: messageData.senderType,
          timestamp: messageData.timestamp,
          conversationId: messageData.conversationId,
          messageType: messageData.messageType
        }
      };

    } catch (error) {
      console.error('Error fetching admin chat image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Alternative method using the full path structure you provided
  async getImageByPath(pathData) {
    try {
      const {
        adminId = "HzsFreCuN8O9hoUb5LYFGxvhgHt1",
        userId = "yJrhz5swRtWUwWf5skEYYXICDqm2",
        conversationId = "yJrhz5swRtWUwWf5skEYYXICDqm2",
        messageId = "u1nzIv9ldQHGsi5xDdWE"
      } = pathData || {};

      // Verify user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get message using Firebase SDK
      const { getDoc, doc } = await import('firebase/firestore');
      const { firestore } = await import('../configs/firebase');

      const messageRef = doc(
        firestore,
        'adminUsers', adminId,
        'assignedUsers', userId,
        'conversations', conversationId,
        'messages', messageId
      );
      const messageDoc = await getDoc(messageRef);

      const fullPath = `adminUsers/${adminId}/assignedUsers/${userId}/conversations/${conversationId}/messages/${messageId}`;

      if (!messageDoc.exists()) {
        throw new Error('Message not found at path: ' + fullPath);
      }

      const messageData = messageDoc.data();

      // Return the complete message data including file info
      return {
        success: true,
        message: {
          id: messageDoc.id,
          ...messageData,
          fullPath: fullPath
        },
        file: messageData.file || null
      };

    } catch (error) {
      console.error('Error getting image by path:', error);
      return {
        success: false,
        error: error.message,
        path: pathData
      };
    }
  }
}

// Export singleton instance
export const mobileApiService = new MobileApiService();