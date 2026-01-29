# Presence System Documentation

## Overview
The presence system monitors user login/logout status using Firebase Firestore and heartbeats. It tracks when users are online, offline, and automatically detects when users go offline due to app force-closure or network issues.

## Key Features
- ✅ Real-time presence monitoring
- ✅ Automatic offline detection via heartbeats
- ✅ Backend integration for robust monitoring
- ✅ Session tracking and management
- ✅ Device information logging
- ✅ Force-close detection (via backend monitoring)

## System Architecture

### Frontend (React Native/Expo)
- **Presence Service**: Manages user presence state
- **Heartbeat System**: Sends periodic heartbeats every 30 seconds
- **App State Monitoring**: Detects foreground/background transitions
- **Session Management**: Tracks unique sessions per login

### Backend (Node.js/Express)
- **Heartbeat Receiver**: Processes heartbeat data from mobile app
- **Offline Detection**: Automatically marks users offline after 2 minutes of no heartbeat
- **Firebase Integration**: Updates presence collection in real-time
- **Health Monitoring**: Provides system status and debugging endpoints

## Files Modified

### Core Files
- `services/presenceService.js` - Main presence management service
- `app/index.jsx` - Login integration (email/password and passcode)
- `app/main/index.jsx` - App state monitoring and testing
- `app/settings/index.jsx` - Logout integration

### Documentation
- `docs/PRESENCE_SYSTEM.md` - This documentation
- `docs/BACKEND_HEARTBEAT_MONITORING.md` - Backend implementation guide

## How It Works

### 1. User Login
When a user logs in (either via email/password or passcode):
```javascript
// Initialize presence monitoring
await presenceService.initializePresence(user.uid, userData);
```

### 2. Online Status
The system immediately sets the user as "online" in Firebase:
```javascript
{
  userId: "user123",
  status: "online",
  lastSeen: serverTimestamp(),
  loginTime: serverTimestamp(),
  lastHeartbeat: serverTimestamp(),
  sessionId: "session_abc123",
  isActive: true
}
```

### 3. Heartbeat System
Every 30 seconds, the app sends a heartbeat:
- Updates `lastHeartbeat` and `lastSeen` in Firebase
- Sends heartbeat to backend API (`http://192.168.8.201:4000`)
- Stores session info in AsyncStorage for backend monitoring

### 4. Offline Detection
The backend automatically detects inactive users:
- Checks for users with no heartbeat for 2+ minutes
- Sets status to "offline" in Firebase
- Logs disconnect reason (heartbeat_timeout, force_closed, etc.)

### 5. User Logout
When user explicitly logs out:
```javascript
// Clean up presence monitoring
await presenceService.cleanup();
```

## Firebase Collections

### Presence Collection (`/presence/{userId}`)
```javascript
{
  userId: "string",
  status: "online" | "offline",
  lastSeen: "timestamp",
  loginTime: "timestamp",
  lastHeartbeat: "timestamp",
  logoutTime: "timestamp", // Only when explicitly logged out
  deviceInfo: {
    deviceId: "string",
    platform: "ios" | "android",
    version: "string"
  },
  userData: {
    email: "string",
    displayName: "string",
    userType: "string"
  },
  sessionId: "string",
  isActive: "boolean",
  appVersion: "string",
  connectionType: "mobile",
  disconnectReason: "string" // Only when going offline
}
```

### Users Collection (`/users/{userId}`)
```javascript
{
  // ... existing user data
  lastLogin: "timestamp",
  currentSession: "string",
  isOnline: "boolean"
}
```

## Backend Integration

The mobile app sends heartbeats to: `http://192.168.8.201:4000`

### API Endpoints
- `POST /api/heartbeat` - Receive heartbeat data
- `POST /api/heartbeat/offline` - User logout notification
- `GET /api/heartbeat/status/:userId` - Check user status
- `GET /api/heartbeat/online-count` - Get online users count
- `GET /api/heartbeat/health` - Health check

## Testing and Debugging

### 1. Test Button
The main screen includes a "TEST" button that shows current presence status:
- Current status (online/offline)
- Active state
- Session ID
- Last heartbeat time

### 2. Console Logs
The system provides detailed logging with emojis:
- 🔄 Initializing presence
- ✅ Success operations
- ❌ Error operations
- 💓 Heartbeat sent
- 🔴 User set offline

### 3. Backend Monitoring
Check backend logs for:
- Heartbeat received messages
- Inactive user detection
- Offline status updates

## Troubleshooting

### Issue: Status not changing in Firebase
**Symptoms**: User remains "online" even after force-closing app

**Solutions**:
1. Verify backend server is running on `192.168.8.201:4000`
2. Check backend logs for heartbeat processing
3. Ensure Firebase rules allow write access to presence collection
4. Test with the "TEST" button to verify current status

### Issue: Heartbeats not being sent
**Symptoms**: No heartbeat logs in console

**Solutions**:
1. Check if `presenceService.initializePresence()` is called on login
2. Verify app state monitoring is working
3. Check for JavaScript errors in console
4. Ensure user is properly authenticated

### Issue: Backend not receiving heartbeats
**Symptoms**: Backend logs show no heartbeat messages

**Solutions**:
1. Verify network connectivity to `192.168.8.201:4000`
2. Check if backend server is accessible
3. Verify API endpoints are correctly implemented
4. Check for CORS issues

## Recent Fixes

### Fixed: onDisconnect Error
**Issue**: `TypeError: onDisconnect is not a function`
**Cause**: Firebase v11+ doesn't support `onDisconnect` in modular SDK
**Solution**: Removed `onDisconnect` dependency and implemented backend-based offline detection

### Enhanced: Session Management
- Session ID is now properly stored and reused
- AsyncStorage integration for backend monitoring
- Improved error handling and logging

### Added: Testing Tools
- TEST button for debugging presence status
- Enhanced console logging with emojis
- Backend health check integration

## Security Considerations

1. **Firebase Rules**: Ensure presence collection has appropriate read/write rules
2. **Backend Authentication**: Implement proper authentication for API endpoints
3. **Rate Limiting**: Prevent heartbeat spam
4. **Data Validation**: Validate all incoming heartbeat data

## Performance Considerations

1. **Heartbeat Interval**: 30 seconds provides good balance between accuracy and performance
2. **Backend Timeout**: 2 minutes timeout for offline detection
3. **Batch Operations**: Backend uses batch updates for efficiency
4. **Memory Management**: Proper cleanup on logout and app state changes

## Future Enhancements

1. **Presence States**: Add "away" status for inactive users
2. **Push Notifications**: Notify users when they're marked offline
3. **Analytics**: Track user session durations and patterns
4. **Multi-device Support**: Handle same user logged in on multiple devices 