# Admin-User Chat System Documentation

## Overview

This document describes the implementation of an automatic admin-user assignment and chat system for the Inspire Wallet mobile application. The system automatically assigns users to available admins in a balanced way (10 users per admin) and provides real-time chat functionality between users and their assigned support agents.

## Architecture

### Database Collections

1. **`admins`** - Admin profiles and capacity management
   ```javascript
   {
     adminId: string,
     name: string,
     email: string,
     maxUsers: number (default: 10),
     currentUsers: number,
     isActive: boolean,
     createdAt: timestamp,
     lastActivity: timestamp
   }
   ```

2. **`userAssignments`** - User-to-admin assignment tracking
   ```javascript
   {
     userId: string,
     adminId: string,
     assignedAt: timestamp,
     userProfile: {
       firstName: string,
       lastName: string,
       email: string
     },
     status: 'active' | 'inactive',
     reassignedAt?: timestamp,
     previousAdminId?: string
   }
   ```

3. **`users/{userId}/tickets`** - User's support tickets
   ```javascript
   {
     id: string,
     title: string,
     description: string,
     status: 'open' | 'in_progress' | 'closed',
     adminId: string,
     adminName: string,
     createdAt: timestamp,
     updatedAt: timestamp,
     messages: [{
       id: number,
       sender: string,
       message: string,
       timestamp: timestamp,
       isCustomer: boolean,
       isAdmin?: boolean
     }]
   }
   ```

4. **`adminChats/{adminId}/tickets`** - Admin's view of tickets
   ```javascript
   {
     id: string,
     title: string,
     description: string,
     status: 'open' | 'in_progress' | 'closed',
     userId: string,
     userName: string,
     userEmail: string,
     createdAt: timestamp,
     updatedAt: timestamp,
     messages: [/* same structure as user tickets */]
   }
   ```

## Implementation Components

### 1. Admin Assignment Service (`services/adminAssignmentService.js`)

Core service for managing admin-user assignments with the following methods:

- `createAdmin(adminData)` - Create a new admin profile
- `assignUserToAdmin(userId, userProfile)` - Auto-assign user to available admin
- `getUserAssignedAdmin(userId)` - Get user's assigned admin info
- `getAdminAssignedUsers(adminId)` - Get all users assigned to an admin
- `createChatTicket(userId, title, description)` - Create support ticket
- `reassignUser(userId, newAdminId)` - Reassign user to different admin
- `getAdminStats(adminId)` - Get admin statistics
- `getAllAdminsStats()` - Get all admins statistics

### 2. User Support Interface (`app/support/index.jsx`)

User-facing support interface that:
- Automatically assigns users to admins on first visit
- Shows assigned admin information
- Allows users to create new support tickets
- Displays existing tickets with status and message counts
- Provides access to chat with assigned admin

### 3. Admin Dashboard (`app/admindashboard/index.jsx`)

Admin interface for managing assigned users and tickets:
- Shows admin utilization statistics (users assigned vs capacity)
- Displays all support tickets assigned to the admin
- Lists all assigned users with their information
- Allows creation of new admin accounts
- Provides access to individual chat conversations

### 4. Admin Chat Interface (`app/adminchat/index.jsx`)

Real-time chat interface for admins to communicate with users:
- Synced messaging between admin and user views
- Ticket status management (open/in_progress/closed)
- User information display
- Real-time message updates

### 5. User Chat Interface (`app/chat/index.jsx`)

Enhanced user chat interface with:
- Integration with admin assignment system
- Real-time messaging with assigned admin
- Translation capabilities for multilingual support
- Image sharing functionality
- Message history and status tracking

## Setup Instructions

### 1. Firebase Setup

Ensure your Firebase project has the following security rules:

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admins to read/write admin data
    match /admins/{adminId} {
      allow read, write: if request.auth != null && request.auth.uid == adminId;
    }

    // Allow users to read their assignments
    match /userAssignments/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null; // Service creates assignments
    }

    // User tickets
    match /users/{userId}/tickets/{ticketId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Admin chats
    match /adminChats/{adminId}/tickets/{ticketId} {
      allow read, write: if request.auth != null && request.auth.uid == adminId;
    }
  }
}
```

### 2. Deploy Firebase Functions

Deploy the admin management functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

This deploys:
- `assignUserToAdmin` - HTTP function for user assignment
- `getAdminStats` - HTTP function for admin statistics
- `rebalanceUserAssignments` - HTTP function for load balancing

### 3. Create Admin Accounts

Use the admin dashboard or service to create admin accounts:

```javascript
import AdminAssignmentService from './services/adminAssignmentService';

// Create first admin
await AdminAssignmentService.createAdmin({
  adminId: 'admin_1',
  name: 'John Doe',
  email: 'john@company.com',
  maxUsers: 10
});
```

### 4. Navigation Setup

Add the new routes to your navigation system:

```javascript
// In your router configuration
{
  name: 'support',
  component: () => import('./app/support/index.jsx')
},
{
  name: 'admindashboard',
  component: () => import('./app/admindashboard/index.jsx')
},
{
  name: 'adminchat',
  component: () => import('./app/adminchat/index.jsx')
}
```

## Usage Flow

### For Users:
1. User navigates to support section
2. System automatically assigns user to available admin (round-robin)
3. User can create support tickets with title and description
4. User can chat with their assigned admin in real-time
5. User sees ticket status updates and message history

### For Admins:
1. Admin accesses admin dashboard
2. Admin sees assigned users and active tickets
3. Admin can create additional admin accounts
4. Admin opens individual chats to respond to users
5. Admin can update ticket status (open/in_progress/closed)

## API Endpoints (Firebase Functions)

### POST `/assignUserToAdmin`
Assigns a user to an available admin.

**Request Body:**
```json
{
  "userId": "user123",
  "userProfile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "assignment": {
    "userId": "user123",
    "adminId": "admin456",
    "adminName": "Support Agent",
    "assignedAt": "2025-01-15T10:30:00Z",
    "status": "active"
  }
}
```

### GET `/getAdminStats`
Returns statistics for all admins.

**Response:**
```json
{
  "success": true,
  "adminStats": [
    {
      "adminId": "admin456",
      "name": "Support Agent",
      "maxUsers": 10,
      "currentUsers": 8,
      "actualAssignedUsers": 8,
      "activeTickets": 3,
      "utilizationPercent": 80,
      "isActive": true
    }
  ],
  "totalAdmins": 3,
  "activeAdmins": 3
}
```

### POST `/rebalanceUserAssignments`
Rebalances user assignments across all admins.

**Response:**
```json
{
  "success": true,
  "reassignments": 2,
  "totalUsers": 30,
  "totalAdmins": 3,
  "usersPerAdmin": 10
}
```

## Load Balancing

The system automatically distributes users evenly across available admins:

1. **Automatic Assignment**: New users are assigned to the admin with the fewest current users
2. **Capacity Management**: Admins have a maximum user limit (default: 10)
3. **Manual Rebalancing**: Use the rebalance function to redistribute users evenly
4. **Admin Scaling**: Add new admins to handle increased user load

## Real-time Synchronization

The chat system uses Firebase real-time listeners to sync messages between users and admins:

- Messages are stored in both user and admin collections
- Real-time updates ensure immediate message delivery
- Offline support through Firebase's persistence layer
- Automatic reconnection and sync when coming back online

## Monitoring and Analytics

Monitor system health through:

1. **Admin Dashboard**: View utilization rates and ticket counts
2. **Firebase Console**: Monitor database reads/writes and function invocations
3. **Admin Stats API**: Programmatic access to system metrics
4. **Function Logs**: Debug assignment and chat issues

## Scaling Considerations

To handle growth:

1. **Add More Admins**: Create new admin accounts as user base grows
2. **Increase Capacity**: Adjust `maxUsers` for experienced admins
3. **Implement Shifts**: Create multiple admin teams for 24/7 support
4. **Monitor Performance**: Use Firebase monitoring for scaling decisions

## Troubleshooting

Common issues and solutions:

### Users Not Getting Assigned
- Check if active admins exist with capacity
- Verify Firebase security rules allow assignment writes
- Review function logs for assignment errors

### Chat Messages Not Syncing
- Verify real-time listeners are properly set up
- Check internet connectivity and Firebase offline persistence
- Review message timestamp handling for proper ordering

### Performance Issues
- Monitor Firebase read/write operations
- Implement message pagination for long conversations
- Consider using Firebase Cloud Messaging for push notifications

## Future Enhancements

Potential improvements:

1. **Push Notifications**: Notify users of new admin messages
2. **File Attachments**: Support for file sharing in chats
3. **Chat Analytics**: Detailed metrics on response times and satisfaction
4. **Automated Responses**: Basic bot responses for common questions
5. **Multiple Language Support**: Enhanced translation capabilities
6. **Priority Queuing**: VIP user support prioritization

## Security Considerations

The system implements several security measures:

1. **Authentication Required**: All operations require valid Firebase auth
2. **Data Isolation**: Users can only access their own tickets and assignments
3. **Admin Access Control**: Admins can only see their assigned users
4. **Input Validation**: All user inputs are validated before processing
5. **Rate Limiting**: Firebase functions include built-in rate limiting

This system provides a robust foundation for user-admin communication with automatic load balancing and real-time chat capabilities.