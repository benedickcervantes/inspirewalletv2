# Real-Time Notification System

This document explains the real-time notification system implemented for the mobile chat application.

## Overview

The real-time notification system provides instant updates to the floating chat button when admin agents send new messages to users. The notification count is displayed as a badge on the floating button and is automatically cleared when the user reads the messages.

## Components

### 1. RealTimeNotificationService (`services/realTimeNotificationService.js`)

The core service that manages real-time notification tracking:

- **`subscribeToUnreadNotifications(userId, callback)`**: Sets up a real-time listener for unread admin messages
- **`markMessagesAsRead(userId)`**: Marks all messages as read for a user by updating their `lastChatRead` timestamp
- **`getCurrentUnreadCount(userId)`**: Gets the current unread count from cache
- **`cleanup()`**: Cleans up all listeners
- **`cleanupUser(userId)`**: Cleans up listener for a specific user

### 2. AgentFloatingButton (`components/AgentFloatingButton.jsx`)

The floating chat button that displays notification badges:

- Automatically subscribes to real-time notifications when user is authenticated
- Displays unread count as a red badge with animation
- Cleans up listeners when component unmounts or user logs out
- Removes the `unreadCount` prop dependency - now manages its own state

### 3. AgentChatModal (`components/AgentChatModal.jsx`)

The chat modal that clears notifications when messages are read:

- Marks messages as read when modal opens
- Marks messages as read when modal closes
- Marks messages as read when user sends a message (indicating active engagement)
- Uses the RealTimeNotificationService for consistent notification management

## How It Works

### 1. Real-Time Listening

```javascript
// The service sets up a Firestore listener for admin messages
const messagesQuery = query(
  messagesRef,
  where('senderType', '==', 'admin'),
  orderBy('timestamp', 'desc')
);

const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
  // Count unread messages based on lastReadTimestamp
  // Update callback with new count
});
```

### 2. Unread Count Calculation

The system counts unread messages by comparing message timestamps with the user's `lastChatRead` timestamp:

- If `lastChatRead` exists: Count messages with timestamp > `lastChatRead`
- If `lastChatRead` is null: Count all admin messages as unread

### 3. Marking as Read

When messages are marked as read:

```javascript
await updateDoc(userRef, {
  lastChatRead: serverTimestamp()
});
```

This updates the user's document with the current timestamp, which triggers the real-time listener to recalculate unread counts.

## Database Structure

The system uses the following Firebase structure:

```
adminUsers/{adminId}/assignedUsers/{assignedUserDocId}/conversations/{userId}/messages
```

- Messages are stored with `senderType: 'admin'` for admin messages
- User documents contain `lastChatRead` timestamp
- Real-time listeners monitor message collections for changes

## Usage

### In AgentFloatingButton

```javascript
// The component automatically handles subscription
const AgentFloatingButton = ({ onPress, isVisible = true }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = realTimeNotificationService.subscribeToUnreadNotifications(
      user.uid,
      (count) => setUnreadCount(count)
    );
    
    return unsubscribe;
  }, [user]);
  
  // Badge displays unreadCount
};
```

### In AgentChatModal

```javascript
// Mark messages as read when modal opens/closes
const markMessagesAsRead = async () => {
  await realTimeNotificationService.markMessagesAsRead(user.uid);
};

useEffect(() => {
  if (visible) {
    markMessagesAsRead();
  }
}, [visible]);
```

## Testing

Use the `NotificationTestComponent` to test the notification system:

```javascript
import NotificationTestComponent from '../components/NotificationTestComponent';

// Add to your test screen
<NotificationTestComponent />
```

## Benefits

1. **Real-Time Updates**: Notifications appear instantly when admin sends messages
2. **Automatic Cleanup**: Notifications are cleared when user reads messages
3. **Efficient**: Uses Firestore real-time listeners for minimal battery/data usage
4. **Consistent**: Single service manages all notification logic
5. **Reliable**: Handles edge cases like user logout, component unmount, etc.

## Troubleshooting

### Notifications Not Appearing

1. Check if user is authenticated
2. Verify Firebase connection
3. Check console logs for error messages
4. Ensure admin messages have `senderType: 'admin'`

### Notifications Not Clearing

1. Check if `markMessagesAsRead` is being called
2. Verify `lastChatRead` timestamp is being updated
3. Check Firestore security rules allow user document updates

### Performance Issues

1. Ensure listeners are properly cleaned up
2. Check for multiple listeners on the same user
3. Monitor Firestore usage in Firebase console

## Future Enhancements

1. **Push Notifications**: Integrate with Firebase Cloud Messaging
2. **Message Categories**: Different notification types for different message types
3. **Notification History**: Track notification events for analytics
4. **Custom Sounds**: Different notification sounds for different scenarios

