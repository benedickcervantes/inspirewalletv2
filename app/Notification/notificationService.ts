import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "../../configs/firebase";

export interface NotificationItem {
  id: string;
  read?: boolean;
  type?: string;
  title?: string;
  message?: string;
  timestamp?: { toDate?: () => Date } | Date;
  [key: string]: unknown;
}

class NotificationService {
  subscribeToNotifications(
    userId: string,
    callback: (notifications: NotificationItem[]) => void
  ): () => void {
    if (!firestore || !userId) {
      console.warn("NotificationService: Missing firestore or userId");
      return () => {};
    }

    try {
      const notificationsRef = collection(firestore, "users", userId, "notifications");
      const q = query(notificationsRef, orderBy("timestamp", "desc"), limit(50));

      return onSnapshot(
        q,
        (snapshot) => {
          const notifications = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as NotificationItem[];
          callback(notifications);
        },
        (error) => {
          console.error("Error subscribing to notifications:", error);
          callback([]);
        }
      );
    } catch (error) {
      console.error("Error setting up notification subscription:", error);
      return () => {};
    }
  }

  subscribeToUnreadCount(userId: string, callback: (count: number) => void): () => void {
    if (!firestore || !userId) {
      console.warn("NotificationService: Missing firestore or userId");
      return () => {};
    }

    try {
      const notificationsRef = collection(firestore, "users", userId, "notifications");
      const q = query(notificationsRef, where("read", "==", false));

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.size);
        },
        (error) => {
          console.error("Error subscribing to unread count:", error);
          callback(0);
        }
      );
    } catch (error) {
      console.error("Error setting up unread count subscription:", error);
      return () => {};
    }
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    if (!firestore || !userId || !notificationId) {
      console.warn("NotificationService: Missing required parameters");
      return;
    }

    try {
      const notificationRef = doc(
        firestore,
        "users",
        userId,
        "notifications",
        notificationId
      );
      await updateDoc(notificationRef, {
        read: true,
        readAt: new Date(),
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    if (!firestore || !userId) {
      console.warn("NotificationService: Missing userId");
      return;
    }

    try {
      const notificationsRef = collection(firestore, "users", userId, "notifications");
      const q = query(notificationsRef, where("read", "==", false));
      const snapshot = await getDocs(q);

      const updatePromises = snapshot.docs.map((d) =>
        updateDoc(d.ref, {
          read: true,
          readAt: new Date(),
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }
}

export default new NotificationService();
