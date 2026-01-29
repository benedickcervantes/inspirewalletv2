# 📱 Mobile Chat Integration Guide

This guide provides step-by-step instructions for integrating the mobile-to-admin chat system into your mobile application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Core Firebase dependencies
npm install firebase

# React Native specific (if using React Native)
npm install @react-native-firebase/app @react-native-firebase/firestore @react-native-firebase/auth
```

### 2. Initialize Firebase

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Your Firebase config
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### 3. Import Required Components

```javascript
import { useMobileAuth } from './hooks/useMobileAuth';
import { useMobileChat } from './hooks/useMobileChat';
import ChatScreen from './components/mobile/ChatScreen';
```

### 4. Basic Implementation

```javascript
import React from 'react';
import { useMobileAuth } from './hooks/useMobileAuth';
import { useMobileChat } from './hooks/useMobileChat';
import ChatScreen from './components/mobile/ChatScreen';

function MobileChatApp() {
  const { user, isAuthenticated } = useMobileAuth();
  const { isConnected } = useMobileChat();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (!isConnected) {
    return <LoadingScreen />;
  }

  return <ChatScreen />;
}
```

## 🔧 Core Services

### MobileChatService

Handles all chat operations between mobile users and admins.

**Key Methods:**
- `initializeUserChat(userId, userEmail, userName)` - Create or get chat room
- `sendMessageToAdmin(userId, chatRoomId, message, userName)` - Send message
- `subscribeToMessages(chatRoomId, callback)` - Real-time message updates
- `markMessagesAsRead(chatRoomId, userId)` - Mark messages as read

### MobilePresenceService

Manages user online/offline status and presence detection.

**Key Methods:**
- `initializePresence(userId, userInfo)` - Start presence detection
- `setUserOnline(userInfo)` - Set user as online
- `setUserOffline()` - Set user as offline
- `subscribeToUserPresence(userId, callback)` - Listen to presence changes

### AdminAssignmentService

Handles automatic assignment of users to available admins.

**Key Methods:**
- `assignUserToAdmin(userId, userEmail, userName)` - Assign user to admin
- `getNextAvailableAdmin()` - Find available admin
- `getUserAssignedAdmin(userId)` - Get user's assigned admin

## 🎯 React Hooks

### useMobileAuth

Provides authentication functionality for mobile users.

```javascript
const {
  user,           // Current user object
  loading,        // Auth loading state
  error,          // Auth error message
  signIn,         // Sign in function
  signUp,         // Sign up function
  logout,         // Logout function
  isAuthenticated // Authentication status
} = useMobileAuth();
```

### useMobileChat

Provides chat functionality and real-time messaging.

```javascript
const {
  chatRoom,         // Current chat room data
  messages,         // Array of messages
  loading,          // Chat loading state
  error,            // Chat error message
  isConnected,      // Connection status
  adminInfo,        // Assigned admin info
  unreadCount,      // Unread message count
  sendMessage,      // Send message function
  markMessagesAsRead, // Mark as read function
  isAdminOnline     // Admin online status
} = useMobileChat();
```

## 🎨 UI Components

### ChatScreen

Main chat interface component.

```javascript
<ChatScreen />
```

### MessageBubble

Individual message display component.

```javascript
<MessageBubble
  message={message}
  isOwn={message.senderId === user.uid}
  showSenderName={true}
/>
```

### AdminStatus

Display admin online status and info.

```javascript
<AdminStatus
  adminName={adminInfo.adminName}
  isOnline={adminInfo.adminOnline}
  compact={true}
/>
```

### ChatHeader

Chat screen header with status information.

```javascript
<ChatHeader
  adminName={adminInfo.adminName}
  isOnline={adminInfo.adminOnline}
  isConnected={isConnected}
  onBack={() => navigation.goBack()}
/>
```

## 📡 Mobile API Service

The system uses direct Firebase integration instead of HTTP endpoints for better mobile performance:

### MobileApiService Methods

```javascript
import { mobileApiService } from './services/mobileApiService';

// Initialize chat
const result = await mobileApiService.initializeChat(userId, userEmail, userName);

// Send message
const result = await mobileApiService.sendMessage(userId, chatRoomId, message, userName);

// Get chat history
const result = await mobileApiService.getChatHistory(userId, chatRoomId, limit);

// Mark messages as read
const result = await mobileApiService.markMessagesAsRead(userId, chatRoomId);

// Update online status
const result = await mobileApiService.updateOnlineStatus(userId, chatRoomId, isOnline);
```

## 🔐 Authentication & Security

### Firebase Authentication Integration

The system uses Firebase Auth directly without requiring manual token handling:

```javascript
import { useMobileAuth } from './hooks/useMobileAuth';

function ChatComponent() {
  const { user, isAuthenticated, signIn, signUp, logout } = useMobileAuth();

  // Authentication is handled automatically
  // All API calls verify the current user via Firebase Auth
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <ChatScreen />;
}
```

### Security Rules

Firestore security rules ensure users can only access their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read, write: if request.auth != null
        && resource.data.senderId == request.auth.uid;
    }

    match /chatRooms/{chatRoomId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

## 💡 Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
const sendMessage = async (messageText) => {
  try {
    const result = await mobileChatService.sendMessageToAdmin(
      user.uid,
      chatRoom.chatRoomId,
      messageText,
      user.displayName
    );

    if (!result.success) {
      Alert.alert('Error', result.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to send message');
    console.error('Send message error:', error);
  }
};
```

### 2. Cleanup Listeners

Always cleanup listeners to prevent memory leaks:

```javascript
useEffect(() => {
  return () => {
    mobileChatService.cleanup();
    mobilePresenceService.cleanup();
  };
}, []);
```

### 3. Offline Handling

Handle offline scenarios gracefully:

```javascript
const [isOffline, setIsOffline] = useState(false);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOffline(!state.isConnected);
  });

  return unsubscribe;
}, []);
```

### 4. Performance Optimization

Limit message history and implement pagination:

```javascript
const loadChatHistory = async (limit = 50) => {
  const history = await mobileChatService.getChatHistory(
    chatRoom.chatRoomId,
    user.uid,
    limit
  );
  return history;
};
```

## 🧪 Testing

### Manual Testing

Use the provided example component to test the integration:

```javascript
import MobileChatExample from './examples/MobileChatExample';

// Render in your app for testing
<MobileChatExample />
```

### Test Scenarios

1. **User Registration** - Test account creation
2. **Authentication** - Test login/logout flow
3. **Chat Initialization** - Test chat room creation
4. **Message Sending** - Test real-time messaging
5. **Admin Assignment** - Test automatic admin assignment
6. **Presence Detection** - Test online/offline status
7. **Message Reading** - Test read receipt functionality

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Firebase configuration
   - Check API keys and project settings

2. **Message Not Sending**
   - Check network connectivity
   - Verify user authentication
   - Check Firestore security rules

3. **Real-time Updates Not Working**
   - Verify Firestore listeners are active
   - Check for proper cleanup

4. **Admin Assignment Failed**
   - Ensure admins are created in the system
   - Check admin availability and capacity

### Debug Mode

Enable debug logging:

```javascript
// Enable Firebase debug logging
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Add debug statements
console.log('Chat initialization:', chatRoom);
console.log('Message sent:', result);
```

## 📊 Monitoring

Monitor chat system performance:

1. **Message Volume** - Track messages per day/hour
2. **Response Times** - Monitor admin response times
3. **User Engagement** - Track active users
4. **Error Rates** - Monitor system errors
5. **Admin Load** - Track admin workload distribution

## 🔄 Updates & Maintenance

### Regular Tasks

1. Monitor admin availability
2. Clean up old chat rooms
3. Archive inactive conversations
4. Update presence detection rules
5. Review security rules and permissions

### Performance Optimization

1. Implement message pagination
2. Add caching for frequently accessed data
3. Optimize real-time listeners
4. Compress large message payloads
5. Implement connection pooling

This integration provides a robust, scalable mobile-to-admin chat system that can handle real-time communication between mobile app users and support administrators! 🚀