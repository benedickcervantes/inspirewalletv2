import {
    collection,
    deleteDoc,
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
        firestore!,
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

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    if (!firestore || !userId || !notificationId) {
      console.warn("NotificationService: Missing required parameters");
      return;
    }

    try {
      const notificationRef = doc(
        firestore!,
        "users",
        userId,
        "notifications",
        notificationId
      );
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    if (!firestore || !userId) {
      console.warn("NotificationService: Missing userId");
      return;
    }

    try {
      const notificationsRef = collection(firestore, "users", userId, "notifications");
      const snapshot = await getDocs(notificationsRef);

      const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      throw error;
    }
  }

  async deleteNotifications(userId: string, notificationIds: string[]): Promise<void> {
    if (!firestore || !userId || !notificationIds?.length) {
      return;
    }

    try {
      const deletePromises = notificationIds.map((notificationId) => {
        const notificationRef = doc(
          firestore!,
          "users",
          userId,
          "notifications",
          notificationId
        );
        return deleteDoc(notificationRef);
      });
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting notifications:", error);
      throw error;
    }
  }
}

export default new NotificationService();
