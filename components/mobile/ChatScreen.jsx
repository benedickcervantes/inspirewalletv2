import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useMobileChat } from '../../hooks/useMobileChat';
import { useMobileAuth } from '../../hooks/useMobileAuth';
import MessageBubble from './MessageBubble';
import AdminStatus from './AdminStatus';
import ChatHeader from './ChatHeader';

const ChatScreen = () => {
  const { user } = useMobileAuth();
  const {
    messages,
    loading,
    error,
    isConnected,
    adminInfo,
    unreadCount,
    sendMessage,
    markMessagesAsRead,
    isAdminOnline
  } = useMobileChat();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    if (unreadCount > 0) {
      markMessagesAsRead();
    }
  }, [unreadCount, markMessagesAsRead]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    const result = await sendMessage(messageText.trim());

    if (result.success) {
      setMessageText('');
    }

    setSending(false);
  };

  const renderMessage = (message, index) => (
    <MessageBubble
      key={message.id || index}
      message={message}
      isOwn={message.senderId === user?.uid}
      showSenderName={message.senderType !== 'user'}
    />
  );

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Connecting to support...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ChatHeader
          adminName={adminInfo?.adminName}
          isOnline={isAdminOnline}
          isConnected={isConnected}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                👋 Welcome! You're now connected with our support team.
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Send a message to start the conversation.
              </Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <AdminStatus
            adminName={adminInfo?.adminName}
            isOnline={isAdminOnline}
            compact
          />

          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
              editable={!sending}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending}
            >
              <Text style={styles.sendButtonText}>
                {sending ? '...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  keyboardAvoidingView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336'
  },
  errorText: {
    color: '#c62828',
    fontSize: 14
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  sendButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc'
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  }
};

export default ChatScreen;