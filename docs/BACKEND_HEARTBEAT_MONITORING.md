# Backend Heartbeat Monitoring System

This document provides comprehensive backend implementation for monitoring user heartbeats and automatically setting users offline when no heartbeat is detected.

## Backend URL
The mobile app sends heartbeats to: `http://192.168.8.201:4000`

## API Endpoints

### 1. Heartbeat Endpoint
**POST** `/api/heartbeat`
- Receives heartbeat data from mobile app
- Updates user's last heartbeat timestamp
- Returns success/error response

### 2. Offline Notification Endpoint
**POST** `/api/heartbeat/offline`
- Called when user explicitly logs out
- Immediately sets user status to offline
- Returns success/error response

### 3. User Status Check Endpoint
**GET** `/api/heartbeat/status/:userId`
- Returns current status of a specific user
- Includes last heartbeat time and online status

### 4. Online Users Count Endpoint
**GET** `/api/heartbeat/online-count`
- Returns count of currently online users
- Useful for monitoring system health

### 5. Health Check Endpoint
**GET** `/api/heartbeat/health`
- Simple health check for the heartbeat service
- Returns 200 OK if service is running

## Node.js Express Implementation

```javascript
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://inspire-wallet.firebaseio.com'
});

const db = admin.firestore();

// Heartbeat timeout (2 minutes)
const HEARTBEAT_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

// Store active sessions in memory (or use Redis for production)
const activeSessions = new Map();

// POST /api/heartbeat
app.post('/api/heartbeat', async (req, res) => {
  try {
    const { userId, timestamp, deviceInfo, sessionId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Update user's heartbeat in Firebase
    const presenceRef = db.collection('presence').doc(userId);
    await presenceRef.update({
      lastHeartbeat: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      status: 'online',
      isActive: true,
      sessionId: sessionId,
      deviceInfo: deviceInfo
    });

    // Store session info locally
    activeSessions.set(userId, {
      sessionId,
      lastHeartbeat: new Date(timestamp),
      deviceInfo
    });

    console.log(`✅ Heartbeat received from user: ${userId}`);
    res.json({ success: true, message: 'Heartbeat recorded' });
  } catch (error) {
    console.error('❌ Error processing heartbeat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/heartbeat/offline
app.post('/api/heartbeat/offline', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Set user offline in Firebase
    const presenceRef = db.collection('presence').doc(userId);
    await presenceRef.update({
      status: 'offline',
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      isActive: false,
      logoutTime: admin.firestore.FieldValue.serverTimestamp()
    });

    // Remove from active sessions
    activeSessions.delete(userId);

    console.log(`🔴 User set offline: ${userId}`);
    res.json({ success: true, message: 'User set offline' });
  } catch (error) {
    console.error('❌ Error setting user offline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/heartbeat/status/:userId
app.get('/api/heartbeat/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const presenceRef = db.collection('presence').doc(userId);
    const doc = await presenceRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = doc.data();
    res.json({
      userId,
      status: data.status,
      lastHeartbeat: data.lastHeartbeat,
      isActive: data.isActive,
      sessionId: data.sessionId
    });
  } catch (error) {
    console.error('❌ Error getting user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/heartbeat/online-count
app.get('/api/heartbeat/online-count', async (req, res) => {
  try {
    const presenceRef = db.collection('presence');
    const snapshot = await presenceRef
      .where('status', '==', 'online')
      .where('isActive', '==', true)
      .get();
    
    res.json({ 
      onlineCount: snapshot.size,
      activeSessions: activeSessions.size
    });
  } catch (error) {
    console.error('❌ Error getting online count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/heartbeat/health
app.get('/api/heartbeat/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size
  });
});

// Background task to check for inactive users
async function checkInactiveUsers() {
  try {
    console.log('🔄 Checking for inactive users...');
    
    const now = new Date();
    const inactiveUsers = [];

    // Check all active sessions
    for (const [userId, session] of activeSessions.entries()) {
      const timeSinceLastHeartbeat = now - session.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        inactiveUsers.push(userId);
      }
    }

    // Set inactive users offline
    for (const userId of inactiveUsers) {
      try {
        const presenceRef = db.collection('presence').doc(userId);
        await presenceRef.update({
          status: 'offline',
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          isActive: false,
          disconnectReason: 'heartbeat_timeout'
        });

        activeSessions.delete(userId);
        console.log(`🔴 User set offline due to heartbeat timeout: ${userId}`);
      } catch (error) {
        console.error(`❌ Error setting user ${userId} offline:`, error);
      }
    }

    if (inactiveUsers.length > 0) {
      console.log(`✅ Processed ${inactiveUsers.length} inactive users`);
    }
  } catch (error) {
    console.error('❌ Error checking inactive users:', error);
  }
}

// Run inactive user check every 30 seconds
setInterval(checkInactiveUsers, 30000);

// Also check Firebase directly for any missed updates
async function checkFirebaseInactiveUsers() {
  try {
    const presenceRef = db.collection('presence');
    const snapshot = await presenceRef
      .where('status', '==', 'online')
      .where('isActive', '==', true)
      .get();

    const now = new Date();
    const inactiveUsers = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const lastHeartbeat = data.lastHeartbeat?.toDate?.() || new Date(data.lastHeartbeat);
      const timeSinceLastHeartbeat = now - lastHeartbeat;
      
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        inactiveUsers.push(doc.id);
      }
    });

    // Set inactive users offline
    for (const userId of inactiveUsers) {
      try {
        const presenceRef = db.collection('presence').doc(userId);
        await presenceRef.update({
          status: 'offline',
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          isActive: false,
          disconnectReason: 'firebase_heartbeat_timeout'
        });

        activeSessions.delete(userId);
        console.log(`🔴 User set offline via Firebase check: ${userId}`);
      } catch (error) {
        console.error(`❌ Error setting user ${userId} offline:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error checking Firebase inactive users:', error);
  }
}

// Run Firebase check every 2 minutes
setInterval(checkFirebaseInactiveUsers, 120000);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Heartbeat monitoring server running on port ${PORT}`);
  console.log(`📊 Monitoring heartbeats with ${HEARTBEAT_TIMEOUT/1000}s timeout`);
});
```

## Firebase Cloud Functions Alternative

If you prefer to use Firebase Cloud Functions instead of a separate Node.js server:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const HEARTBEAT_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// Cloud Function to check for inactive users
exports.checkInactiveUsers = functions.pubsub.schedule('every 30 seconds').onRun(async (context) => {
  try {
    const now = new Date();
    const presenceRef = db.collection('presence');
    const snapshot = await presenceRef
      .where('status', '==', 'online')
      .where('isActive', '==', true)
      .get();

    const inactiveUsers = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const lastHeartbeat = data.lastHeartbeat?.toDate?.() || new Date(data.lastHeartbeat);
      const timeSinceLastHeartbeat = now - lastHeartbeat;
      
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        inactiveUsers.push(doc.id);
      }
    });

    // Set inactive users offline
    const batch = db.batch();
    inactiveUsers.forEach(userId => {
      const userRef = presenceRef.doc(userId);
      batch.update(userRef, {
        status: 'offline',
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        isActive: false,
        disconnectReason: 'cloud_function_timeout'
      });
    });

    if (inactiveUsers.length > 0) {
      await batch.commit();
      console.log(`🔴 Set ${inactiveUsers.length} users offline due to heartbeat timeout`);
    }

    return null;
  } catch (error) {
    console.error('❌ Error in checkInactiveUsers:', error);
    return null;
  }
});
```

## Testing the System

1. **Start the backend server** on `192.168.8.201:4000`
2. **Login to the mobile app** - user should appear as "online"
3. **Check Firebase** - presence document should show status: "online"
4. **Force close the app** - wait 2 minutes, then check Firebase
5. **User should be marked as "offline"** automatically

## Monitoring and Debugging

- Check backend logs for heartbeat messages
- Monitor Firebase presence collection for status changes
- Use the health check endpoint to verify service status
- Check online users count to monitor system activity

## Security Considerations

- Implement authentication for API endpoints
- Use HTTPS in production
- Validate user permissions before updating presence
- Rate limit heartbeat requests to prevent abuse 