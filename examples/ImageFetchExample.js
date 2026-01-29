// Example usage of MessageBubble with image functionality for admin chat
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import MessageBubble from '../components/mobile/MessageBubble';
import { mobileApiService } from '../services/mobileApiService';

// Example message data matching your Firebase structure
const sampleImageMessage = {
  id: "2f2iNs129iXP39ZYfgCF",
  adminId: "HzsFreCuN8O9hoUb5LYFGxvhgHt1",
  content: "📎 qr-code-1758181215473.png",
  conversationId: "yJrhz5swRtWUwWf5skEYYXICDqm2",
  file: {
    category: "image",
    name: "qr-code-1758181215473.png",
    path: "chat-files/yJrhz5swRtWUwWf5skEYYXICDqm2/HzsFreCuN8O9hoUb5LYFGxvhgHt1/1758270384290_9dyrr5.png",
    size: 4161,
    type: "image/png",
    url: "https://firebasestorage.googleapis.com/v0/b/inspire-wallet.firebasestorage.app/o/chat-files%2FyJrhz5swRtWUwWf5skEYYXICDqm2%2FHzsFreCuN8O9hoUb5LYFGxvhgHt1%2F1758270384290_9dyrr5.png?alt=media&token=d8d82883-322c-4e8f-893c-421eb13d9caf"
  },
  messageType: "text",
  readBy: ["HzsFreCuN8O9hoUb5LYFGxvhgHt1"],
  senderId: "HzsFreCuN8O9hoUb5LYFGxvhgHt1",
  senderType: "admin",
  timestamp: new Date("2025-09-19T08:26:24.000Z"), // September 19, 2025 at 4:26:24 PM UTC+8
  userId: "yJrhz5swRtWUwWf5skEYYXICDqm2"
};

// Example of a user message for comparison
const sampleUserMessage = {
  id: "user123",
  content: "Can you help me with this QR code?",
  messageType: "text",
  senderId: "yJrhz5swRtWUwWf5skEYYXICDqm2",
  senderType: "user",
  timestamp: new Date("2025-09-19T08:25:00.000Z"),
  conversationId: "yJrhz5swRtWUwWf5skEYYXICDqm2"
};

// Example 1: Using specific parameters to fetch image data
async function fetchAdminChatImage() {
  try {
    const result = await mobileApiService.getAdminChatImage(
      'HzsFreCuN8O9hoUb5LYFGxvhgHt1', // adminId
      'yJrhz5swRtWUwWf5skEYYXICDqm2', // userId
      'yJrhz5swRtWUwWf5skEYYXICDqm2', // conversationId
      '2f2iNs129iXP39ZYfgCF' // messageId - updated to match your example
    );

    if (result.success) {
      console.log('✅ Image fetched successfully:');
      console.log('File URL:', result.file.url);
      console.log('File Name:', result.file.name);
      console.log('File Type:', result.file.type);
      console.log('File Size:', result.file.size);
      console.log('File Category:', result.file.category);
      console.log('Message Info:', result.messageInfo);

      return result.file.url;
    } else {
      console.error('❌ Failed to fetch image:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Example 2: Using the path-based method with defaults
async function fetchImageByPath(customPathData = {}) {
  try {
    const result = await mobileApiService.getImageByPath(customPathData);

    if (result.success) {
      console.log('✅ Image fetched by path:');
      console.log('Full message data:', result.message);
      console.log('File data:', result.file);

      if (result.file) {
        console.log('Direct download URL:', result.file.url);
      }

      return result;
    } else {
      console.error('❌ Failed to fetch by path:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Example 3: React Native component showing image messages
const ImageMessageExample = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatContainer}>
        {/* User message */}
        <MessageBubble
          message={sampleUserMessage}
          isOwn={true}
          showSenderName={false}
        />

        {/* Admin image message */}
        <MessageBubble
          message={sampleImageMessage}
          isOwn={false}
          showSenderName={true}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  chatContainer: {
    flex: 1,
    padding: 16
  }
});

// Example 4: Legacy web component for comparison
function AdminChatImageViewer({ adminId, userId, conversationId, messageId }) {
  const [imageUrl, setImageUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const loadImage = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await mobileApiService.getAdminChatImage(
        adminId, userId, conversationId, messageId
      );

      if (result.success) {
        setImageUrl(result.file.url);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (adminId && userId && conversationId && messageId) {
      loadImage();
    }
  }, [adminId, userId, conversationId, messageId]);

  if (loading) return <div>Loading image...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!imageUrl) return <div>No image found</div>;

  return (
    <div>
      <img
        src={imageUrl}
        alt="Admin chat attachment"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

// Export examples
export {
  fetchAdminChatImage,
  fetchImageByPath,
  ImageMessageExample,
  AdminChatImageViewer,
  sampleImageMessage,
  sampleUserMessage
};

export default ImageMessageExample;

// Usage:
// const imageUrl = await fetchAdminChatImage();
// const messageData = await fetchImageByPath();
// <ImageMessageExample /> - Shows how image messages appear in chat
// <AdminChatImageViewer adminId="..." userId="..." conversationId="..." messageId="..." />