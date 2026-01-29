# Firebase Cloud Functions Heartbeat Monitoring

This guide explains how to deploy and use the Firebase Cloud Functions for heartbeat monitoring using only the free tier.

## Overview

The Firebase Cloud Functions provide a serverless solution for monitoring user heartbeats and automatically setting users offline when no heartbeat is detected. This eliminates the need for a separate backend server.

## Free Tier Limits

- **2 million invocations per month** (free)
- **400,000 GB-seconds of compute time** (free)
- **200,000 CPU-seconds of compute time** (free)
- **5GB of outbound networking** (free)

## Functions Included

### 1. `checkInactiveUsers` (Scheduled Function)
- **Trigger**: Runs every 2 minutes
- **Purpose**: Checks for users who haven't sent a heartbeat in 2+ minutes
- **Action**: Sets inactive users to "offline" status
- **Free Tier**: ~720 invocations/day = ~21,600/month (well within limits)

### 2. `manualHeartbeatCheck` (HTTP Function)
- **Trigger**: HTTP request
- **Purpose**: Manual testing and debugging
- **Action**: Returns list of active and inactive users
- **URL**: `https://your-project.cloudfunctions.net/manualHeartbeatCheck`

### 3. `getOnlineUsersCount` (HTTP Function)
- **Trigger**: HTTP request
- **Purpose**: Get count of online users
- **URL**: `https://your-project.cloudfunctions.net/getOnlineUsersCount`

### 4. `getUserStatus` (HTTP Function)
- **Trigger**: HTTP request
- **Purpose**: Get status of specific user
- **URL**: `https://your-project.cloudfunctions.net/getUserStatus?userId=USER_ID`

### 5. `heartbeatHealth` (HTTP Function)
- **Trigger**: HTTP request
- **Purpose**: Health check for the system
- **URL**: `https://your-project.cloudfunctions.net/heartbeatHealth`

## Deployment Steps

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Functions (if not already done)
```bash
firebase init functions
```

### 4. Install Dependencies
```bash
cd functions
npm install
```

### 5. Deploy Functions
```bash
firebase deploy --only functions
```

## Configuration

### Update Firebase Project
Make sure your `firebase.json` points to the correct project:

```bash
firebase use your-project-id
```

### Set Environment Variables (Optional)
```bash
firebase functions:config:set heartbeat.timeout="120000"
```

## Testing the Functions

### 1. Test Manual Heartbeat Check
```bash
curl https://your-project.cloudfunctions.net/manualHeartbeatCheck
```

### 2. Test Health Check
```bash
curl https://your-project.cloudfunctions.net/heartbeatHealth
```

### 3. Test Online Users Count
```bash
curl https://your-project.cloudfunctions.net/getOnlineUsersCount
```

### 4. Test User Status
```bash
curl "https://your-project.cloudfunctions.net/getUserStatus?userId=USER_ID"
```

## Monitoring

### View Function Logs
```bash
firebase functions:log
```

### Monitor Usage
- Go to Firebase Console
- Navigate to Functions
- Check the "Usage" tab for invocation counts and costs

## How It Works

1. **Mobile App**: Sends heartbeats every 5 seconds to Firestore
2. **Scheduled Function**: Runs every 2 minutes to check for inactive users
3. **Timeout Detection**: Users with no heartbeat for 2+ minutes are marked offline
4. **Automatic Cleanup**: Inactive users are automatically set to offline status

## Benefits of Firebase Functions

### ✅ Free Tier Friendly
- No server costs
- Pay only for what you use
- Generous free tier limits

### ✅ Serverless
- No server management
- Automatic scaling
- Built-in monitoring

### ✅ Integrated
- Direct access to Firestore
- No external dependencies
- Seamless with existing Firebase setup

### ✅ Reliable
- Google's infrastructure
- 99.9% uptime SLA
- Automatic retries

## Cost Estimation

For a typical app with 1000 users:

- **Scheduled Function**: 720 invocations/day × 30 days = 21,600/month
- **HTTP Functions**: ~1000 requests/day × 30 days = 30,000/month
- **Total**: ~51,600 invocations/month (well within 2M free limit)

## Troubleshooting

### Function Not Deploying
```bash
# Check Firebase CLI version
firebase --version

# Clear cache and retry
firebase functions:delete checkInactiveUsers
firebase deploy --only functions
```

### Function Not Running
```bash
# Check logs
firebase functions:log

# Check function status
firebase functions:list
```

### High Costs
- Monitor usage in Firebase Console
- Check for infinite loops
- Verify function timeouts

## Security Rules

Make sure your Firestore rules allow the functions to read/write presence data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /presence/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Next Steps

1. Deploy the functions
2. Test with the mobile app
3. Monitor logs and usage
4. Adjust heartbeat intervals if needed
5. Set up alerts for function failures

The Firebase Functions approach provides a robust, cost-effective solution for heartbeat monitoring that stays within the free tier limits while providing reliable offline detection. 