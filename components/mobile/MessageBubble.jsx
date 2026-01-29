import React from 'react';
import { View, Text } from 'react-native';
import FileMessageComponent from './FileMessageComponent';

const MessageBubble = ({ message, isOwn, showSenderName = false }) => {
  // Removed excessive logging

  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderDisplayName = () => {
    if (message.senderType === 'system') {
      return 'System';
    }
    if (message.senderType === 'admin') {
      return message.senderName || 'Support';
    }
    return message.senderName || 'You';
  };

  const getMessageStyle = () => {
    if (message.senderType === 'system') {
      return styles.systemMessage;
    }
    return isOwn ? styles.ownMessage : styles.otherMessage;
  };

  const getTextStyle = () => {
    if (message.senderType === 'system') {
      return styles.systemMessageText;
    }
    return isOwn ? styles.ownMessageText : styles.otherMessageText;
  };

  // Check if this is a file message
  const isFileMessage = message.file ||
                        message.messageType === 'file' ||
                        message.messageType === 'image' ||
                        (message.content && message.content.startsWith('📎 '));

  // Simplified debug logging
  if (message.senderType === 'admin') {
    console.log('Admin message received:', message.id, message.content?.substring(0, 50));
  }

  // If it's a file message, use the FileMessageComponent
  if (isFileMessage) {
    console.log('Using FileMessageComponent for message:', message.id);
    return (
      <FileMessageComponent
        message={message}
        isOwn={isOwn}
        showSenderName={showSenderName}
      />
    );
  }

  if (message.senderType === 'system') {
    return (
      <View style={styles.systemContainer}>
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>
            {message.message || message.content}
          </Text>
        </View>
        <Text style={styles.systemTimestamp}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
      {showSenderName && !isOwn && (
        <Text style={styles.senderName}>{getSenderDisplayName()}</Text>
      )}

      <View style={getMessageStyle()}>
        <Text style={getTextStyle()}>
          {message.message || message.content}
        </Text>

        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
            {formatTime(message.timestamp)}
          </Text>

          {isOwn && (
            <View style={styles.statusContainer}>
              {message.isRead || message.readBy?.length > 0 ? (
                <Text style={styles.readStatus}>✓✓</Text>
              ) : (
                <Text style={styles.sentStatus}>✓</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = {
  messageContainer: {
    marginVertical: 6,
    maxWidth: '85%',
    alignSelf: 'flex-start'
  },
  ownMessageContainer: {
    alignSelf: 'flex-end'
  },
  senderName: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    marginLeft: 12,
    fontWeight: '600'
  },
  ownMessage: {
    backgroundColor: '#FE7D48',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#FE7D48',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  systemContainer: {
    alignItems: 'center',
    marginVertical: 8
  },
  systemMessage: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '70%'
  },
  ownMessageText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400'
  },
  otherMessageText: {
    color: '#000000',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400'
  },
  systemMessageText: {
    color: '#1976d2',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500'
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)'
  },
  
  systemTimestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  },
  statusContainer: {
    marginLeft: 4
  },
  readStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600'
  },
  sentStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600'
  }
};

export default MessageBubble;