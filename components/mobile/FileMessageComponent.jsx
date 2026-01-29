import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Linking } from 'react-native';
import { mobileApiService } from '../../services/mobileApiService';

const FileMessageComponent = ({ message, isOwn, showSenderName = false }) => {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return '📷';
    } else if (fileType?.startsWith('video/')) {
      return '🎥';
    } else if (fileType?.includes('pdf')) {
      return '📄';
    } else {
      return '📁';
    }
  };

  const loadImage = async () => {
    console.log('FileMessageComponent loadImage called:', {
      messageId: message.id,
      hasFile: !!message.file,
      fileUrl: message.file?.url,
      loading: loading
    });

    if (!message.file || loading) {
      console.log('Skipping loadImage - no file or already loading');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If we already have a direct URL, use it
      if (message.file.url) {
        console.log('Using direct URL:', message.file.url);
        setImageUri(message.file.url);
        setLoading(false);
        return;
      }

      // Try to construct message ID from the message object
      const messageId = message.id || message.messageId;

      if (!messageId) {
        setError('Message ID not available');
        setLoading(false);
        return;
      }

      // Otherwise, fetch using the API service
      const result = await mobileApiService.getAdminChatImage(
        message.adminId,
        message.userId,
        message.conversationId,
        messageId
      );

      if (result.success && result.file.url) {
        setImageUri(result.file.url);
      } else {
        setError(result.error || 'Failed to load image');
      }
    } catch (err) {
      console.error('Error loading image:', err);
      setError(err.message || 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('FileMessageComponent useEffect:', {
      messageId: message.id,
      hasFile: !!message.file,
      fileCategory: message.file?.category,
      willLoadImage: !!(message.file && message.file.category === 'image')
    });

    if (message.file && message.file.category === 'image') {
      loadImage();
    }
  }, [message.file]);

  const handleFilePress = async () => {
    if (imageUri) {
      try {
        const supported = await Linking.canOpenURL(imageUri);
        if (supported) {
          await Linking.openURL(imageUri);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open file');
      }
    } else if (message.file?.url) {
      try {
        const supported = await Linking.canOpenURL(message.file.url);
        if (supported) {
          await Linking.openURL(message.file.url);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open file');
      }
    }
  };

  const handleImagePress = () => {
    Alert.alert(
      'View Image',
      'Choose an option:',
      [
        {
          text: 'Open in Browser',
          onPress: handleFilePress
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const renderFileContent = () => {
    console.log('FileMessageComponent renderFileContent:', {
      messageId: message.id,
      hasFile: !!message.file,
      fileCategory: message.file?.category,
      fileType: message.file?.type,
      imageUri: imageUri,
      loading: loading,
      error: error
    });

    if (!message.file) {
      console.log('No file found, showing fallback');
      return (
        <View style={styles.fileContainer}>
          <Text style={[styles.fileName, isOwn && styles.ownText]}>
            📁 File attachment
          </Text>
          <Text style={[styles.fileError, isOwn && styles.ownText]}>
            File information not available
          </Text>
        </View>
      );
    }

    const { file } = message;

    // Handle images
    if (file.category === 'image' || file.type?.startsWith('image/')) {
      if (loading) {
        return (
          <View style={styles.imageContainer}>
            <View style={styles.imageLoading}>
              <Text style={[styles.loadingText, isOwn && styles.ownText]}>
                Loading image...
              </Text>
            </View>
          </View>
        );
      }

      if (error) {
        return (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={handleFilePress}
          >
            <View style={styles.imageError}>
              <Text style={[styles.errorText, isOwn && styles.ownText]}>
                📷 Image
              </Text>
              <Text style={[styles.errorSubtext, isOwn && styles.ownText]}>
                Tap to view
              </Text>
            </View>
          </TouchableOpacity>
        );
      }

      if (imageUri) {
        return (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={handleImagePress}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>
                {file.name}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }
    }

    // Handle other file types
    return (
      <TouchableOpacity
        style={styles.fileContainer}
        onPress={handleFilePress}
      >
        <View style={styles.fileHeader}>
          <Text style={styles.fileIcon}>
            {getFileIcon(file.type)}
          </Text>
          <View style={styles.fileInfo}>
            <Text style={[styles.fileName, isOwn && styles.ownText]} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={[styles.fileSize, isOwn && styles.ownText]}>
              {file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown size'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getMessageStyle = () => {
    if (message.senderType === 'system') {
      return styles.systemMessage;
    }
    return isOwn ? styles.ownMessage : styles.otherMessage;
  };

  return (
    <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
      {showSenderName && !isOwn && (
        <Text style={styles.senderName}>{getSenderDisplayName()}</Text>
      )}

      <View style={getMessageStyle()}>
        {/* Show content text if available and not just a file attachment indicator */}
        {message.content &&
         message.content !== '📸 Screenshot' &&
         !message.content.startsWith('📎 ') && (
          <Text style={[styles.messageText, isOwn && styles.ownText]}>
            {message.content}
          </Text>
        )}

        {/* Render file content */}
        {renderFileContent()}

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
    marginVertical: 4,
    maxWidth: '80%',
    alignSelf: 'flex-start'
  },
  ownMessageContainer: {
    alignSelf: 'flex-end'
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    marginLeft: 12,
    fontWeight: '500'
  },
  ownMessage: {
    backgroundColor: '#2196f3',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  otherMessage: {
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  systemMessage: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '70%'
  },
  messageText: {
    color: '#333333',
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 8
  },
  ownText: {
    color: '#ffffff'
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500'
  },
  imageLoading: {
    width: 200,
    height: 150,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12
  },
  imageError: {
    width: 200,
    height: 100,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12
  },
  loadingText: {
    color: '#666',
    fontSize: 14
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500'
  },
  errorSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 4
  },
  fileContainer: {
    marginBottom: 4
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333'
  },
  fileSize: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2
  },
  fileError: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 4
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4
  },
  timestamp: {
    fontSize: 11,
    color: '#999999',
    marginTop: 2
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)'
  },
  statusContainer: {
    marginLeft: 4
  },
  readStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  sentStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)'
  }
};

export default FileMessageComponent;