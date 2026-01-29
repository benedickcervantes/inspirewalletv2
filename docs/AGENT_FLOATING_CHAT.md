# Agent Floating Chat Feature

## Overview

This feature adds a floating chat button in the bottom right corner of the app for users with `agent: true` property. When tapped, it opens a chat modal interface that allows agents to communicate with support or other agents.

## Components

### 1. AgentFloatingButton.jsx
- **Location**: `components/AgentFloatingButton.jsx`
- **Purpose**: Displays a draggable floating action button with chat icon
- **Features**:
  - Animated scale-in/scale-out effects
  - Pulse animation to draw attention
  - **Draggable/movable** - users can position it anywhere on screen
  - Position persistence - remembers last position using AsyncStorage
  - Screen boundary constraints - prevents dragging off-screen
  - Visual feedback during dragging (scale and shadow effects)
  - Only visible when `isVisible` prop is true
  - Uses app's theme colors (Colors.redTheme.background)

### 2. AgentChatModal.jsx
- **Location**: `components/AgentChatModal.jsx`
- **Purpose**: Full-screen chat modal interface connecting agents with assigned admins
- **Features**:
  - **Integrated with Existing Mobile Chat System** - Uses `useMobileChat` and `useMobileAuth` hooks
  - **Real-time Connection** - Automatically connects to assigned admin via existing chat infrastructure
  - **Admin Assignment Integration** - Leverages existing admin assignment system
  - **Presence Detection** - Shows admin online/offline status with visual indicators
  - Real-time message loading and sending
  - Keyboard-aware interface
  - Message history with timestamps
  - Different styling for agent vs admin messages
  - Auto-scroll to latest messages
  - Connection status indicators
  - Error handling and empty state management

### 3. Integration in _layout.jsx
- **Location**: `app/_layout.jsx`
- **Purpose**: Global integration of the floating button and chat modal
- **Features**:
  - Monitors user authentication state
  - Checks user's `agent` property in real-time
  - Shows/hides floating button based on agent status and current page
  - Manages chat modal visibility
  - Hides floating button on login, register, and forgot password pages

## Database Structure

The chat system uses the exact same database structure as the web admin dashboard:

```
adminUsers/
  └── {adminId}/
      └── assignedUsers/
          └── {assignedUserDocId}/
              └── conversations/
                  └── {userId}/
                      └── messages/
                          └── {messageId}/
                              ├── content: string
                              ├── senderId: string
                              ├── senderType: 'user' | 'admin'
                              ├── senderName: string
                              └── timestamp: serverTimestamp

// Example path:
// /adminUsers/HzsFreCuN8O9hoUb5LYFGxvhgHt1/assignedUsers/L6lz1DQ958GkBJp00FlM/conversations/yJrhz5swRtWUwWf5skEYYXICDqm2/messages/xhSsxQZL0yXDFHqmisfu

// Message structure:
{
  content: "Hello from mobile agent",
  senderId: "yJrhz5swRtWUwWf5skEYYXICDqm2",
  senderType: "user",
  senderName: "Agent Name",
  timestamp: "2025-09-18T10:37:14.753Z"
}
```

## User Experience

1. **For Agents**: 
   - Draggable floating button appears (default: bottom right corner)
   - Button has subtle pulse animation
   - **Can be dragged to any position on screen**
   - **Position is automatically saved and restored**
   - Button scales up and shows enhanced shadow while dragging
   - Tapping opens full-screen chat modal
   - **Automatically connects to existing mobile chat system**
   - **Uses existing admin assignment infrastructure**
   - Can send and receive messages in real-time with assigned admin
   - Shows admin name and online status in chat header
   - **Real-time presence detection** - shows when admin is online/offline

2. **For Non-Agents**:
   - No floating button is displayed
   - No access to agent chat functionality

## Technical Details

### Authentication Check
- Uses Firebase Auth state listener
- Real-time monitoring of user data changes
- Automatically shows/hides button based on `userData.agent` property
- Hides button on authentication-related pages (login, register, forgot password)

### Real-time Updates
- Messages are loaded and updated in real-time using Firebase Firestore listeners
- Auto-scroll to latest messages when new ones arrive
- Optimistic UI updates for better user experience

### Performance Considerations
- Messages are limited to 50 most recent messages
- Efficient Firebase queries with proper indexing
- Proper cleanup of listeners to prevent memory leaks
- Position data is cached locally using AsyncStorage for fast loading
- Dragging uses native driver for smooth 60fps animations

## Styling

The components follow the app's existing design system:
- Uses `Colors.redTheme.background` for primary color
- Consistent with existing modal and button styles
- Responsive design for different screen sizes
- Proper shadow and elevation for floating elements

## Future Enhancements

Potential improvements that could be added:
1. **Message read receipts** - Show when admin has read agent messages
2. **Typing indicators** - Show when admin is typing a response
3. **File/image sharing** - Allow agents to send screenshots or documents
4. **Push notifications** - Notify agents when admin responds
5. **Chat history search** - Search through previous conversations
6. **Priority levels** - Mark conversations as urgent/high priority
7. **Admin handoff** - Transfer conversations between admins
8. **Snap-to-edges** - button automatically snaps to screen edges when released
9. **Haptic feedback** - vibration when dragging starts/ends
10. **Double-tap to reset position** - return button to default position
11. **Offline message queuing** - Queue messages when admin is offline
12. **Chat analytics** - Track response times and conversation metrics
