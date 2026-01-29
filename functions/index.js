const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const HEARTBEAT_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

// Cloud Function to check for inactive users (runs every 2 minutes to stay within free tier)
exports.checkInactiveUsers = functions.pubsub.schedule('every 2 minutes').onRun(async (context) => {
  try {
    console.log('🔄 Checking for inactive users...');
    
    const now = new Date();
    const presenceRef = db.collection('presence');
    
    // Query for online users
    const snapshot = await presenceRef
      .where('status', '==', 'online')
      .where('isActive', '==', true)
      .get();

    const inactiveUsers = [];
    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      const lastHeartbeat = data.lastHeartbeat?.toDate?.() || new Date(data.lastHeartbeat);
      const timeSinceLastHeartbeat = now - lastHeartbeat;
      
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        inactiveUsers.push(doc.id);
        
        // Add to batch update
        const userRef = presenceRef.doc(doc.id);
        batch.update(userRef, {
          status: 'offline',
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          isActive: false,
          disconnectReason: 'cloud_function_timeout',
          logoutTime: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    // Execute batch update if there are inactive users
    if (inactiveUsers.length > 0) {
      await batch.commit();
    }

    return { 
      success: true, 
      inactiveUsersCount: inactiveUsers.length,
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error('❌ Error in checkInactiveUsers:', error);
    return { 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

// HTTP function to manually trigger heartbeat check (for testing)
exports.manualHeartbeatCheck = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }


    
    const now = new Date();
    const presenceRef = db.collection('presence');
    
    const snapshot = await presenceRef
      .where('status', '==', 'online')
      .where('isActive', '==', true)
      .get();

    const inactiveUsers = [];
    const activeUsers = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const lastHeartbeat = data.lastHeartbeat?.toDate?.() || new Date(data.lastHeartbeat);
      const timeSinceLastHeartbeat = now - lastHeartbeat;
      
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        inactiveUsers.push({
          userId: doc.id,
          lastHeartbeat: data.lastHeartbeat,
          timeSinceLastHeartbeat: timeSinceLastHeartbeat
        });
      } else {
        activeUsers.push({
          userId: doc.id,
          lastHeartbeat: data.lastHeartbeat,
          timeSinceLastHeartbeat: timeSinceLastHeartbeat
        });
      }
    });

    res.json({
      success: true,
      timestamp: now.toISOString(),
      activeUsersCount: activeUsers.length,
      inactiveUsersCount: inactiveUsers.length,
      activeUsers,
      inactiveUsers
    });
  } catch (error) {
    console.error('❌ Error in manual heartbeat check:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// HTTP function to get online users count
exports.getOnlineUsersCount = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    const presenceRef = db.collection('presence');
    const snapshot = await presenceRef
      .where('status', '==', 'online')
      .where('isActive', '==', true)
      .get();

    res.json({
      success: true,
      onlineCount: snapshot.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting online users count:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// HTTP function to get user status
exports.getUserStatus = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const presenceRef = db.collection('presence').doc(userId);
    const doc = await presenceRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const data = doc.data();
    res.json({
      success: true,
      userId,
      status: data.status,
      isActive: data.isActive,
      lastHeartbeat: data.lastHeartbeat,
      lastSeen: data.lastSeen,
      sessionId: data.sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting user status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// HTTP function for health check
exports.heartbeatHealth = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    const presenceRef = db.collection('presence');
    const snapshot = await presenceRef
      .where('status', '==', 'online')
      .where('isActive', '==', true)
      .get();

    res.json({
      status: 'healthy',
      onlineUsers: snapshot.size,
      heartbeatTimeout: HEARTBEAT_TIMEOUT / 1000 + ' seconds',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in health check:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}); 