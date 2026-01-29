import { useState, useEffect, useCallback, useRef } from 'react';
import { mobileApiService } from '../services/mobileApiService';
import { mobileChatService } from '../services/mobileChatService';
import { useMobileAuth } from './useMobileAuth';

export const useMobileChat = () => {
  const { user, isAuthenticated } = useMobileAuth();
  const [chatRoom, setChatRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesUnsubscribe = useRef(null);
  const chatRoomUnsubscribe = useRef(null);

  // Initialize chat when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeChat();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isAuthenticated, user]);

  // Initialize chat room
  const initializeChat = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await mobileApiService.initializeChat(
        user.uid,
        user.email,
        user.displayName || user.email
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const chatRoomData = result.chatRoom;
      setChatRoom(chatRoomData);
      setAdminInfo({
        adminId: chatRoomData.adminId,
        adminName: chatRoomData.adminName,
        adminEmail: chatRoomData.adminEmail,
        adminOnline: chatRoomData.adminOnline || false
      });

      // Subscribe to real-time messages
      subscribeToMessages(chatRoomData.chatRoomId);

      // Subscribe to chat room updates
      subscribeToChatRoom(chatRoomData.chatRoomId);

      // Set user as online
      await mobileApiService.updateOnlineStatus(
        user.uid,
        chatRoomData.chatRoomId,
        true
      );

      setIsConnected(true);
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time messages
  const subscribeToMessages = (chatRoomId) => {
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
    }

    messagesUnsubscribe.current = mobileChatService.subscribeToMessages(
      chatRoomId,
      (newMessages) => {
        setMessages(newMessages);

        // Count unread admin messages
        const unreadAdminMessages = newMessages.filter(
          msg => msg.senderType === 'admin' && !msg.isRead
        ).length;
        setUnreadCount(unreadAdminMessages);
      }
    );
  };

  // Subscribe to chat room updates
  const subscribeToChatRoom = (chatRoomId) => {
    if (chatRoomUnsubscribe.current) {
      chatRoomUnsubscribe.current();
    }

    chatRoomUnsubscribe.current = mobileChatService.subscribeToChatRoom(
      chatRoomId,
      (updatedChatRoom) => {
        setChatRoom(updatedChatRoom);
        setAdminInfo(prev => ({
          ...prev,
          adminOnline: updatedChatRoom.adminOnline || false
        }));
      }
    );
  };

  // Send message to admin
  const sendMessage = async (messageText) => {
    try {
      if (!chatRoom || !user) {
        throw new Error('Chat not initialized');
      }

      if (!messageText || messageText.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      setError(null);

      const result = await mobileApiService.sendMessage(
        user.uid,
        chatRoom.chatRoomId,
        messageText,
        user.displayName || user.email
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      if (!chatRoom || !user) return;

      await mobileApiService.markMessagesAsRead(user.uid, chatRoom.chatRoomId);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Get chat history
  const loadChatHistory = async (limit = 50) => {
    try {
      if (!chatRoom || !user) return [];

      setLoading(true);
      const result = await mobileApiService.getChatHistory(
        user.uid,
        chatRoom.chatRoomId,
        limit
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setMessages(result.messages);
      return result.messages;
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Set online status
  const setOnlineStatus = async (isOnline) => {
    try {
      if (!chatRoom || !user) return;

      await mobileApiService.updateOnlineStatus(
        user.uid,
        chatRoom.chatRoomId,
        isOnline
      );
    } catch (err) {
      console.error('Error setting online status:', err);
    }
  };

  // Get assigned admin info
  const getAssignedAdmin = useCallback(async () => {
    try {
      if (!user) return null;

      const result = await mobileApiService.getAssignedAdmin(user.uid);
      if (result.success) {
        setAdminInfo(result.adminInfo);
        return result.adminInfo;
      }
      return null;
    } catch (err) {
      console.error('Error getting assigned admin:', err);
      return null;
    }
  }, [user]);

  // Cleanup function
  const cleanup = () => {
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
      messagesUnsubscribe.current = null;
    }

    if (chatRoomUnsubscribe.current) {
      chatRoomUnsubscribe.current();
      chatRoomUnsubscribe.current = null;
    }

    setChatRoom(null);
    setMessages([]);
    setAdminInfo(null);
    setIsConnected(false);
    setUnreadCount(0);
    setError(null);
  };

  // Set user offline when component unmounts
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (chatRoom && user) {
        setOnlineStatus(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (chatRoom && user) {
        setOnlineStatus(false);
      }
    };
  }, [chatRoom, user]);

  return {
    // State
    chatRoom,
    messages,
    loading,
    error,
    isConnected,
    adminInfo,
    unreadCount,

    // Actions
    sendMessage,
    markMessagesAsRead,
    loadChatHistory,
    setOnlineStatus,
    getAssignedAdmin,
    initializeChat,
    cleanup,

    // Computed
    hasMessages: messages.length > 0,
    isAdminOnline: adminInfo?.adminOnline || false,
    lastMessage: messages[messages.length - 1] || null
  };
};