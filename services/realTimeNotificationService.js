import { firestore } from '../configs/firebase';
import { 
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';

class RealTimeNotificationService {
  constructor() {
    this.listeners = new Map();
    this.unreadCounts = new Map();
  }

  /**
   * Subscribe to real-time unread message notifications for a user
   * @param {string} userId - The user ID to track notifications for
   * @param {function} callback - Callback function to receive unread count updates
   * @returns {function} Unsubscribe function
   */
  subscribeToUnreadNotifications(userId, callback) {
    console.log('🔔 Setting up real-time notification listener for user:', userId);

    if (this.listeners.has(userId)) {
      console.log('🔔 Unsubscribing existing listener for user:', userId);
      this.listeners.get(userId)();
    }

    // First, find the correct conversation path by searching through admin users
    this.findConversationPath(userId).then((conversationPath) => {
      if (!conversationPath) {
        console.log('🔔 No conversation found for user:', userId);
        callback(0);
        return;
      }

      console.log('🔔 Found conversation path:', conversationPath);
      const messagesRef = collection(firestore, conversationPath);
      
      // Query for admin messages only (removed orderBy to avoid index requirement)
      const messagesQuery = query(
        messagesRef,
        where('senderType', '==', 'admin')
      );

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        console.log('🔔 Real-time notification update received, admin messages:', snapshot.size);

        if (snapshot.empty) {
          console.log('🔔 No admin messages found, setting unread count to 0');
          this.unreadCounts.set(userId, 0);
          callback(0);
          return;
        }

        // Removed sensitive message content logging to prevent privacy leaks

        // Get user's last read timestamp
        const lastReadTimestamp = await this.getLastReadTimestamp(userId);
        
        let unreadCount = 0;

        if (lastReadTimestamp) {
          // Count messages after last read timestamp
          const lastRead = lastReadTimestamp.toDate ? lastReadTimestamp.toDate() : new Date(lastReadTimestamp);
          console.log('🔔 Comparing messages against last read:', lastRead.toISOString());

          snapshot.forEach((doc) => {
            const message = doc.data();
            const messageTime = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);

            console.log('🔔 Message time:', messageTime.toISOString(), 'vs Last read:', lastRead.toISOString());

            if (messageTime > lastRead) {
              unreadCount++;
            }
          });
        } else {
          // If no last read timestamp, count all admin messages as unread
          unreadCount = snapshot.size;
          console.log('🔔 No last read timestamp, counting all admin messages as unread:', unreadCount);
        }

        console.log('🔔 Setting unread count to:', unreadCount);
        this.unreadCounts.set(userId, unreadCount);
        callback(unreadCount);
      }, (error) => {
        console.error('🔔 Error in real-time notification listener:', error);
        // On error, set unread count to 0 to avoid showing incorrect notifications
        this.unreadCounts.set(userId, 0);
        callback(0);
      });

      // Store the unsubscribe function
      this.listeners.set(userId, unsubscribe);
    }).catch((error) => {
      console.error('🔔 Error finding conversation path:', error);
      callback(0);
    });

    // Return unsubscribe function
    return () => {
      console.log('🔔 Unsubscribing from real-time notifications for user:', userId);
      if (this.listeners.has(userId)) {
        this.listeners.get(userId)();
        this.listeners.delete(userId);
        this.unreadCounts.delete(userId);
      }
    };
  }

  /**
   * Find the conversation path for a user by searching through admin users
   * @param {string} userId - The user ID
   * @returns {Promise<string|null>} The conversation path or null if not found
   */
  async findConversationPath(userId) {
    try {
      console.log('🔔 Searching for conversation path for user:', userId);
      
      // Get all admin users
      const adminUsersRef = collection(firestore, 'adminUsers');
      const adminUsersSnapshot = await getDocs(adminUsersRef);
      
      console.log('🔔 Found', adminUsersSnapshot.size, 'admin users');
      
      for (const adminDoc of adminUsersSnapshot.docs) {
        const adminId = adminDoc.id;
        console.log('🔔 Checking admin:', adminId);
        
        // Check assigned users for this admin
        const assignedUsersRef = collection(firestore, 'adminUsers', adminId, 'assignedUsers');
        const assignedUsersSnapshot = await getDocs(assignedUsersRef);
        
        console.log('🔔 Found', assignedUsersSnapshot.size, 'assigned users for admin:', adminId);
        
        for (const assignedUserDoc of assignedUsersSnapshot.docs) {
          const assignedUserId = assignedUserDoc.id;
          const assignedUserData = assignedUserDoc.data();
          // Removed sensitive user data logging to prevent privacy leaks
          
          // Check if this assigned user has a conversation with our user
          const conversationsRef = collection(
            firestore, 
            'adminUsers', adminId, 
            'assignedUsers', assignedUserId, 
            'conversations'
          );
          const conversationsSnapshot = await getDocs(conversationsRef);
          
          console.log('🔔 Found', conversationsSnapshot.size, 'conversations for assigned user:', assignedUserId);
          
          for (const conversationDoc of conversationsSnapshot.docs) {
            const conversationId = conversationDoc.id;
            const conversationData = conversationDoc.data();
            // Removed sensitive data logging to prevent privacy leaks
            
            // Check if conversation ID matches user ID or if userId field matches
            if (conversationId === userId || conversationData.userId === userId) {
              const conversationPath = `adminUsers/${adminId}/assignedUsers/${assignedUserId}/conversations/${conversationId}/messages`;
              console.log('🔔 Found conversation path:', conversationPath);
              return conversationPath;
            }
          }
        }
      }
      
      console.log('🔔 No conversation found for user:', userId);
      return null;
    } catch (error) {
      console.error('🔔 Error finding conversation path:', error);
      return null;
    }
  }

  /**
   * Get user's last read timestamp from their user document
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} Last read timestamp or null
   */
  async getLastReadTimestamp(userId) {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.lastChatRead || null;
      }
      return null;
    } catch (error) {
      console.error('🔔 Error getting last read timestamp:', error);
      return null;
    }
  }

  /**
   * Mark messages as read for a user
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async markMessagesAsRead(userId) {
    try {
      console.log('🔔 Marking messages as read for user:', userId);

      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        lastChatRead: serverTimestamp()
      });

      console.log('🔔 Successfully marked messages as read');
      
      // Update local unread count immediately
      this.unreadCounts.set(userId, 0);
      
    } catch (error) {
      console.error('🔔 Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get current unread count for a user (from cache)
   * @param {string} userId - The user ID
   * @returns {number} Current unread count
   */
  getCurrentUnreadCount(userId) {
    return this.unreadCounts.get(userId) || 0;
  }

  /**
   * Clean up all listeners
   */
  cleanup() {
    console.log('🔔 Cleaning up all notification listeners');
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.unreadCounts.clear();
  }

  /**
   * Clean up listener for specific user
   * @param {string} userId - The user ID
   */
  cleanupUser(userId) {
    if (this.listeners.has(userId)) {
      console.log('🔔 Cleaning up notification listener for user:', userId);
      this.listeners.get(userId)();
      this.listeners.delete(userId);
      this.unreadCounts.delete(userId);
    }
  }
}

// Create singleton instance
const realTimeNotificationService = new RealTimeNotificationService();
export default realTimeNotificationService;

