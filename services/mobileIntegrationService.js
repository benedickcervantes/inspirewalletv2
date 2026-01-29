import { firestore } from '../configs/firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

// Import existing services
import presenceService from './presenceService';
import adminAssignmentService from './adminAssignmentService';
import adminUserConversationService from './adminUserConversationService';
import realTimeCommunicationService from './realTimeCommunicationService';
import nestedDatabaseService from './nestedDatabaseService';

class MobileIntegrationService {
  constructor() {
    this.currentUser = null;
    this.currentAdmin = null;
    this.activeConversation = null;
    this.isInitialized = false;
    this.messageListeners = new Map();
  }

  // Initialize service for mobile user
  async initializeMobileUser(userId, userInfo = {}) {
    try {
      console.log('🚀 Initializing Mobile Integration Service for user:', userId);

      this.currentUser = {
        userId,
        ...userInfo
      };

      // Step 1: Initialize presence service
      await presenceService.initializePresence(userId, {
        ...userInfo,
        userType: 'mobile_user',
        platform: 'mobile'
      });

      // Step 2: Get or assign admin
      this.currentAdmin = await this.getOrAssignAdmin(userId, userInfo);

      // Step 3: Initialize real-time communication
      await realTimeCommunicationService.initialize(userId, {
        ...userInfo,
        adminId: this.currentAdmin.adminId
      });

      // Step 4: Get or create active conversation
      this.activeConversation = await this.getOrCreateConversation();

      this.isInitialized = true;

      console.log('✅ Mobile Integration Service initialized successfully');
      console.log('👤 Assigned Admin:', this.currentAdmin.adminName);
      console.log('💬 Active Conversation:', this.activeConversation.conversationId);

      return {
        success: true,
        userId: this.currentUser.userId,
        adminId: this.currentAdmin.adminId,
        adminName: this.currentAdmin.adminName,
        conversationId: this.activeConversation.conversationId,
        adminOnline: await this.isAdminOnline()
      };

    } catch (error) {
      console.error('❌ Error initializing Mobile Integration Service:', error);
      throw error;
    }
  }

  // Get or assign admin to user
  async getOrAssignAdmin(userId, userInfo) {
    try {
      // Check if user already has an assigned admin
      const existingAdmin = await adminAssignmentService.getUserAssignedAdmin(userId);

      if (existingAdmin && existingAdmin.admin) {
        console.log('👤 Found existing admin assignment');
        return {
          adminId: existingAdmin.assignment.adminId,
          adminName: existingAdmin.admin.name,
          adminEmail: existingAdmin.admin.email,
          assignment: existingAdmin.assignment
        };
      }

      // Assign new admin
      console.log('🔄 Assigning new admin to user');
      const newAssignment = await adminAssignmentService.assignUserToAdmin(
        userId,
        userInfo.email || '',
        userInfo.displayName || 'Mobile User'
      );

      return newAssignment;

    } catch (error) {
      console.error('❌ Error getting or assigning admin:', error);
      throw error;
    }
  }

  // Get or create active conversation
  async getOrCreateConversation() {
    try {
      if (!this.currentAdmin) {
        throw new Error('No admin assigned');
      }

      // Check for existing active conversation
      const existingConversation = await adminUserConversationService.getUserConversation(
        this.currentAdmin.adminId,
        this.currentUser.userId
      );

      if (existingConversation) {
        console.log('💬 Found existing conversation');
        return existingConversation;
      }

      // Create new conversation
      console.log('💬 Creating new conversation');
      const newConversation = await adminUserConversationService.initializeConversation(
        this.currentAdmin.adminId,
        this.currentUser.userId,
        this.currentUser
      );

      return {
        conversationId: newConversation.conversationId,
        ...newConversation.conversationData
      };

    } catch (error) {
      console.error('❌ Error getting or creating conversation:', error);
      throw error;
    }
  }

  // Send message to admin
  async sendMessage(messageContent, messageType = 'text') {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      console.log('📤 Sending message to admin:', messageContent.substring(0, 50));

      // Send message with real-time delivery
      const result = await realTimeCommunicationService.sendMessageWithConfirmation(
        this.currentAdmin.adminId,
        this.activeConversation.conversationId,
        messageContent,
        messageType
      );

      if (result.success) {
        console.log('✅ Message sent successfully');

        // Update last activity
        await this.updateLastActivity();
      }

      return {
        success: result.success,
        messageId: result.messageId,
        timestamp: Date.now(),
        deliveryStatus: 'sent'
      };

    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  // Listen for admin messages
  listenForMessages(callback) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      console.log('👂 Starting to listen for admin messages');

      // Listen for admin messages
      const messageUnsubscribe = realTimeCommunicationService.listenForAdminMessages(
        this.currentAdmin.adminId,
        this.activeConversation.conversationId,
        (messageData) => {
          console.log('📨 Received admin messages:', messageData.newMessages.length);

          // Process new messages
          if (messageData.newMessages.length > 0) {
            messageData.newMessages.forEach(message => {
              console.log('📨 New admin message:', message.content);
            });
          }

          // Call the callback with formatted data
          callback({
            messages: messageData.messages,
            newMessages: messageData.newMessages,
            hasNewMessages: messageData.newMessages.length > 0
          });
        }
      );

      this.messageListeners.set('admin_messages', messageUnsubscribe);

      return messageUnsubscribe;

    } catch (error) {
      console.error('❌ Error listening for messages:', error);
      return null;
    }
  }

  // Listen for typing indicators
  listenForTyping(callback) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      const typingUnsubscribe = realTimeCommunicationService.listenForTypingIndicators(
        this.currentAdmin.adminId,
        this.activeConversation.conversationId,
        (typingData) => {
          callback({
            adminTyping: typingData.adminTyping,
            adminName: this.currentAdmin.adminName
          });
        }
      );

      this.messageListeners.set('typing', typingUnsubscribe);

      return typingUnsubscribe;

    } catch (error) {
      console.error('❌ Error listening for typing:', error);
      return null;
    }
  }

  // Update typing status
  async updateTypingStatus(isTyping) {
    try {
      if (!this.isInitialized) return;

      await realTimeCommunicationService.updateTypingStatus(
        this.currentAdmin.adminId,
        this.activeConversation.conversationId,
        isTyping
      );

    } catch (error) {
      console.error('❌ Error updating typing status:', error);
    }
  }

  // Listen for admin presence
  listenForAdminPresence(callback) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      const presenceUnsubscribe = realTimeCommunicationService.listenForAdminPresence(
        this.currentAdmin.adminId,
        (presenceData) => {
          console.log('👤 Admin presence update:', {
            online: presenceData.isOnline,
            status: presenceData.status,
            responseTime: presenceData.responseTime
          });

          callback({
            isOnline: presenceData.isOnline,
            status: presenceData.status,
            lastSeen: presenceData.lastSeen,
            expectedResponseTime: presenceData.responseTime,
            adminName: this.currentAdmin.adminName
          });
        }
      );

      this.messageListeners.set('admin_presence', presenceUnsubscribe);

      return presenceUnsubscribe;

    } catch (error) {
      console.error('❌ Error listening for admin presence:', error);
      return null;
    }
  }

  // Check if admin is online
  async isAdminOnline() {
    try {
      if (!this.currentAdmin) return false;

      const adminPresenceRef = doc(firestore, 'presence', this.currentAdmin.adminId);
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

  // Get conversation history
  async getConversationHistory(limit = 50) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      const history = await adminUserConversationService.getConversationHistory(
        this.currentAdmin.adminId,
        this.currentUser.userId,
        this.activeConversation.conversationId,
        limit
      );

      console.log('📚 Retrieved conversation history:', history.messages.length, 'messages');

      return {
        messages: history.messages,
        hasMore: history.hasMore,
        total: history.messages.length
      };

    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead() {
    try {
      if (!this.isInitialized) return;

      const result = await realTimeCommunicationService.markMessagesAsReadRealtime(
        this.currentAdmin.adminId,
        this.activeConversation.conversationId
      );

      console.log('✅ Messages marked as read:', result.markedCount || 0);

      return result;

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      isInitialized: this.isInitialized,
      currentUser: this.currentUser,
      currentAdmin: this.currentAdmin ? {
        adminId: this.currentAdmin.adminId,
        adminName: this.currentAdmin.adminName,
        adminEmail: this.currentAdmin.adminEmail
      } : null,
      activeConversation: this.activeConversation ? {
        conversationId: this.activeConversation.conversationId,
        status: this.activeConversation.status
      } : null,
      activeListeners: this.messageListeners.size,
      connectionStatus: realTimeCommunicationService.getConnectionStatus()
    };
  }

  // Get admin information
  getAdminInfo() {
    return this.currentAdmin ? {
      adminId: this.currentAdmin.adminId,
      adminName: this.currentAdmin.adminName,
      adminEmail: this.currentAdmin.adminEmail,
      isOnline: false // Will be updated by presence listener
    } : null;
  }

  // Update last activity
  async updateLastActivity() {
    try {
      if (!this.isInitialized) return;

      // Update user presence
      await presenceService.updateLastSeen();

      // Update conversation activity
      await nestedDatabaseService.updateConversationStats(
        this.currentAdmin.adminId,
        this.currentUser.userId,
        this.activeConversation.conversationId,
        {
          lastUserActivity: serverTimestamp()
        }
      );

    } catch (error) {
      console.error('❌ Error updating last activity:', error);
    }
  }

  // Handle connection issues
  async handleConnectionIssue() {
    try {
      console.log('🔄 Handling connection issue...');

      // Try to reconnect real-time service
      await realTimeCommunicationService.reconnect();

      // Refresh presence
      await presenceService.sendHeartbeat();

      console.log('✅ Connection issue handled');

    } catch (error) {
      console.error('❌ Error handling connection issue:', error);
    }
  }

  // Send feedback/rating
  async sendFeedback(rating, comment = '') {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      const feedbackRef = doc(collection(firestore, 'conversationFeedback'));

      await setDoc(feedbackRef, {
        userId: this.currentUser.userId,
        adminId: this.currentAdmin.adminId,
        conversationId: this.activeConversation.conversationId,
        rating: rating, // 1-5 scale
        comment: comment,
        submittedAt: serverTimestamp(),
        platform: 'mobile'
      });

      console.log('✅ Feedback submitted:', { rating, comment: comment.substring(0, 50) });

      return { success: true };

    } catch (error) {
      console.error('❌ Error sending feedback:', error);
      throw error;
    }
  }

  // Request admin transfer
  async requestAdminTransfer(reason = 'user_request') {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      // Create transfer request
      const transferRequestRef = doc(collection(firestore, 'adminTransferRequests'));

      await setDoc(transferRequestRef, {
        userId: this.currentUser.userId,
        currentAdminId: this.currentAdmin.adminId,
        conversationId: this.activeConversation.conversationId,
        reason: reason,
        requestedAt: serverTimestamp(),
        status: 'pending',
        platform: 'mobile'
      });

      console.log('📋 Admin transfer requested');

      return { success: true, message: 'Transfer request submitted' };

    } catch (error) {
      console.error('❌ Error requesting admin transfer:', error);
      throw error;
    }
  }

  // Get conversation analytics for user
  async getConversationAnalytics() {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      const analytics = await adminUserConversationService.getConversationAnalytics(
        this.currentAdmin.adminId,
        this.currentUser.userId,
        this.activeConversation.conversationId
      );

      return {
        totalMessages: analytics.totalMessages,
        userMessages: analytics.userMessages,
        adminMessages: analytics.adminMessages,
        averageResponseTime: analytics.averageResponseTime,
        conversationDuration: analytics.conversationDuration
      };

    } catch (error) {
      console.error('❌ Error getting conversation analytics:', error);
      return null;
    }
  }

  // Cleanup service
  async cleanup() {
    try {
      console.log('🧹 Cleaning up Mobile Integration Service');

      // Stop all message listeners
      this.messageListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      this.messageListeners.clear();

      // Cleanup real-time service
      await realTimeCommunicationService.cleanup();

      // Cleanup other services
      adminUserConversationService.cleanup();
      nestedDatabaseService.cleanup();

      // Cleanup presence service
      await presenceService.cleanup();

      // Reset state
      this.currentUser = null;
      this.currentAdmin = null;
      this.activeConversation = null;
      this.isInitialized = false;

      console.log('✅ Mobile Integration Service cleaned up');

    } catch (error) {
      console.error('❌ Error cleaning up Mobile Integration Service:', error);
    }
  }

  // Pause service (for app backgrounding)
  async pauseService() {
    try {
      console.log('⏸️ Pausing Mobile Integration Service');

      // Pause heartbeat but keep connections
      if (presenceService.stopHeartbeat) {
        presenceService.stopHeartbeat();
      }

      // Update status to away
      if (presenceService.forceUpdateStatus) {
        await presenceService.forceUpdateStatus('away');
      }

    } catch (error) {
      console.error('❌ Error pausing service:', error);
    }
  }

  // Resume service (for app foregrounding)
  async resumeService() {
    try {
      console.log('▶️ Resuming Mobile Integration Service');

      // Resume heartbeat
      if (presenceService.startHeartbeat) {
        presenceService.startHeartbeat();
      }

      // Update status to online
      if (presenceService.forceUpdateStatus) {
        await presenceService.forceUpdateStatus('online');
      }

      // Handle any connection issues
      await this.handleConnectionIssue();

    } catch (error) {
      console.error('❌ Error resuming service:', error);
    }
  }
}

// Export singleton instance
const mobileIntegrationService = new MobileIntegrationService();
export default mobileIntegrationService;