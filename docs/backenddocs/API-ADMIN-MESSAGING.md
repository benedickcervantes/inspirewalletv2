# Admin Messaging API (Frontend Reference)

These endpoints allow admins to send support messages to users, list conversations, and search users for recipient selection. **Either admin or user can start a conversation**—conversations are two-way. All admin endpoints require `Authorization: Bearer <admin_token>` and ADMIN role.

**Encryption:** Message content, status, direction, and read timestamp are encrypted at rest (AES-256-GCM). User activity timestamps and online status are also encrypted.

---

## Base URL & Auth

- **Base URL:** Same as your API (e.g. `https://api.example.com`)
- **Auth:** `Authorization: Bearer <admin_token>`
- **Content-Type:** `application/json` for request bodies

---

## Endpoints

### 1. Search Users (GET /messages/admin/users/search)

Search users by name, email, or account number for recipient selection in the compose modal.

**Query parameters**

| Field  | Type   | Required | Description                                      |
|--------|--------|----------|--------------------------------------------------|
| `q`    | string | Yes      | Search query (name, email, or account number)    |
| `limit`| number | No       | Max results (default 50, max 50)                 |

**Example**
```
GET /messages/admin/users/search?q=Jane&limit=20
```

**Response:** Array of user objects with decrypted PII (for display only):
```json
[
  {
    "id": "clxx...",
    "email": "jane@example.com",
    "accountNumber": "1234 5678 9012",
    "firstName": "Jane",
    "lastName": "Doe",
    "status": "ACTIVE"
  }
]
```

---

### 2. Send Message (POST /messages/admin/send)

Send a support message to one or more users.

**Request body**

| Field    | Type     | Required | Description                    |
|----------|----------|----------|--------------------------------|
| `userIds`| string[] | Yes      | Target user IDs (at least one) |
| `content`| string   | Yes      | Message content (1–10000 chars)|

**Example**
```json
{
  "userIds": ["clxx123", "clxx456"],
  "content": "Your withdrawal request has been approved. The funds will arrive within 1–2 business days."
}
```

**Response**
```json
{
  "created": 2
}
```

---

### 3. List Conversations (GET /messages/admin/conversations)

List all conversations with users (includes conversations started by users or admins). Latest message may be from admin or user.

**Query parameters**

| Field   | Type   | Required | Description                                   |
|---------|--------|----------|-----------------------------------------------|
| `search`| string | No       | Filter by user name, email, or account number |
| `page`  | number | No       | Page number (default 1)                       |
| `limit` | number | No       | Items per page (default 20, max 100)          |
| `status`| string | No       | Filter by latest message status: `SENT`, `READ`, or `all` (default) |

**Example**
```
GET /messages/admin/conversations?page=1&limit=20&status=READ
```

**Response**
```json
{
  "conversations": [
    {
      "userId": "clxx...",
      "messageId": "clxx...",
      "fullName": "Jane Doe",
      "accountNumber": "1234 5678 9012",
      "latestMessageAt": "2026-02-22T12:00:00.000Z",
      "latestMessageContent": "Your withdrawal has been approved.",
      "latestMessageDirection": "ADMIN_TO_USER",
      "status": "READ",
      "hasPreviousMessages": true,
      "isActive": true
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Field descriptions**

| Field                 | Description                                                  |
|-----------------------|--------------------------------------------------------------|
| `userId`              | User ID (for linking to thread)                              |
| `messageId`           | ID of the latest message in the conversation                 |
| `fullName`            | User's first and last name                                   |
| `accountNumber`       | Formatted account number (XXXX XXXX XXXX)                    |
| `latestMessageAt`     | Date/time of the latest message                              |
| `latestMessageContent`| Content of the latest message                                |
| `latestMessageDirection`| Who sent the latest: `ADMIN_TO_USER` or `USER_TO_ADMIN`     |
| `status`              | Latest message status: `SENT` or `READ`                      |
| `hasPreviousMessages` | Whether there are older messages in the thread               |
| `isActive`            | Whether the user is currently online (WebSocket connected)   |

---

### 4. Get Message Thread (GET /messages/admin/conversations/:userId)

Fetch the full two-way message history with a specific user (both admin and user messages).

**Example**
```
GET /messages/admin/conversations/clxx123
```

**Response**
```json
{
  "user": {
    "id": "clxx123",
    "fullName": "Jane Doe",
    "accountNumber": "1234 5678 9012"
  },
  "messages": [
    {
      "id": "msg1",
      "content": "I need help with my withdrawal.",
      "createdAt": "2026-02-20T09:00:00.000Z",
      "status": "SENT",
      "direction": "USER_TO_ADMIN"
    },
    {
      "id": "msg2",
      "content": "We have received your withdrawal request.",
      "createdAt": "2026-02-20T10:00:00.000Z",
      "status": "READ",
      "direction": "ADMIN_TO_USER"
    },
    {
      "id": "msg3",
      "content": "Your withdrawal has been approved.",
      "createdAt": "2026-02-22T12:00:00.000Z",
      "status": "READ",
      "direction": "ADMIN_TO_USER"
    }
  ]
}
```

---

## Summary for Admin Frontend

| Action            | Endpoint                             | Method |
|-------------------|--------------------------------------|--------|
| Search users      | /messages/admin/users/search         | GET    |
| Send message      | /messages/admin/send                 | POST   |
| List conversations| /messages/admin/conversations        | GET    |
| View thread       | /messages/admin/conversations/:userId| GET    |
