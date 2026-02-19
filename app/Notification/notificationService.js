import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { firestore } from '../../configs/firebase';

class NotificationService {
  /**
   * Subscribe to real-time notifications for a user
   * @param {string} userId - The user's UID
   * @param {function} callback - Callback function that receives notifications array
   * @returns {function} Unsubscribe function
   */
  subscribeToNotifications(userId, callback) {
    if (!firestore || !userId) {
      console.warn('NotificationService: Missing firestore or userId');
      return () => {};
    }

    try {
      const notificationsRef = collection(firestore, 'users', userId, 'notifications');
      const q = query(
        notificationsRef,
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          callback(notifications);
        },
        (error) => {
          console.error('Error subscribing to notifications:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to unread notification count
   * @param {string} userId - The user's UID
   * @param {function} callback - Callback function that receives unread count
   * @returns {function} Unsubscribe function
   */
  subscribeToUnreadCount(userId, callback) {
    if (!firestore || !userId) {
      console.warn('NotificationService: Missing firestore or userId');
      return () => {};
    }

    try {
      const notificationsRef = collection(firestore, 'users', userId, 'notifications');
      const q = query(notificationsRef, where('read', '==', false));

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.size);
        },
        (error) => {
          console.error('Error subscribing to unread count:', error);
          callback(0);
        }
      );
    } catch (error) {
      console.error('Error setting up unread count subscription:', error);
      return () => {};
    }
  }

  /**
   * Mark a notification as read
   * @param {string} userId - The user's UID
   * @param {string} notificationId - The notification ID
   */
  async markAsRead(userId, notificationId) {
    if (!firestore || !userId || !notificationId) {
      console.warn('NotificationService: Missing required parameters');
      return;
    }

    try {
      const notificationRef = doc(firestore, 'users', userId, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: new Date(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - The user's UID
   */
  async markAllAsRead(userId) {
    if (!firestore || !userId) {
      console.warn('NotificationService: Missing userId');
      return;
    }

    try {
      const notificationsRef = collection(firestore, 'users', userId, 'notifications');
      const q = query(notificationsRef, where('read', '==', false));
      const snapshot = await getDocs(q);

      const updatePromises = snapshot.docs.map((doc) =>
        updateDoc(doc.ref, {
          read: true,
          readAt: new Date(),
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

export default new NotificationService();
