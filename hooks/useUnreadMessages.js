import { useState, useEffect } from 'react';
import { auth, firestore } from '../configs/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import realTimeNotificationService from '../services/realTimeNotificationService';

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(null);
  const [user, setUser] = useState(null);

  console.log('🔵 useUnreadMessages hook called, unreadCount:', unreadCount);

  // Listen to auth state changes
  useEffect(() => {
    console.log('🔵 Setting up auth listener');
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      console.log('🔵 Auth state changed, user:', currentUser?.uid);
      setUser(currentUser);
      if (!currentUser) {
        setUnreadCount(0);
        setLastReadTimestamp(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to user's last read timestamp
  useEffect(() => {
    if (!user) return;

    const userRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const lastRead = data.lastChatRead || null;
        console.log('Last read timestamp updated:', lastRead);
        setLastReadTimestamp(lastRead);
      }
    });

    return () => unsubscribeUser();
  }, [user]);

  // Listen to messages and count unread
  useEffect(() => {
    if (!user) {
      console.log('🔵 No user, setting unread count to 0');
      setUnreadCount(0);
      return;
    }

    // Find the correct conversation path dynamically
    realTimeNotificationService.findConversationPath(user.uid).then((conversationPath) => {
      if (!conversationPath) {
        console.log('🔵 No conversation found for user:', user.uid);
        setUnreadCount(0);
        return;
      }

      console.log('🔵 Setting up messages listener for path:', conversationPath);
      const messagesRef = collection(firestore, conversationPath);

      // Query for admin messages only (removed orderBy to avoid index requirement)
      const messagesQuery = query(
        messagesRef,
        where('senderType', '==', 'admin')
      );

      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        console.log('🔵 Messages snapshot received, size:', snapshot.size, 'admin messages');

        if (snapshot.empty) {
          setUnreadCount(0);
          return;
        }

        // Log all admin messages for debugging
        snapshot.forEach((doc) => {
          const message = doc.data();
          console.log('🔵 Admin message detected:', {
            messageId: doc.id,
            content: message.content,
            senderId: message.senderId,
            senderType: message.senderType,
            timestamp: message.timestamp
          });
        });

        let unreadMessages = 0;

        if (lastReadTimestamp) {
          // Count messages after last read timestamp
          const lastRead = lastReadTimestamp.toDate ? lastReadTimestamp.toDate() : new Date(lastReadTimestamp);
          console.log('🔵 Comparing against last read:', lastRead.toISOString());

          snapshot.forEach((doc) => {
            const message = doc.data();
            const messageTime = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);

            console.log('🔵 Message time:', messageTime.toISOString(), 'vs Last read:', lastRead.toISOString());

            if (messageTime > lastRead) {
              unreadMessages++;
            }
          });
        } else {
          // If no last read timestamp, count all admin messages as unread
          unreadMessages = snapshot.size;
          console.log('🔵 No last read timestamp, counting all admin messages:', unreadMessages);
        }

        console.log('🔵 Setting unread count to:', unreadMessages);
        setUnreadCount(unreadMessages);
      });

      return () => unsubscribeMessages();
    }).catch((error) => {
      console.error('🔵 Error finding conversation path:', error);
      setUnreadCount(0);
    });
  }, [user, lastReadTimestamp]);

  const markAsRead = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No current user, cannot mark as read');
        return;
      }

      console.log('Marking messages as read for user:', currentUser.uid);

      const userRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userRef, {
        lastChatRead: serverTimestamp()
      });

      console.log('Successfully marked messages as read');
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  return {
    unreadCount,
    markAsRead
  };
};