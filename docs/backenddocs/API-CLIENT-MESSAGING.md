# Client Messaging API (Frontend Reference)

These endpoints allow app users to message Inspire Wallet Customer Support and view the two-way conversation. **Either the user or admin can start the conversation.**

**Encryption:** Message content, status, direction, and read timestamp are encrypted at rest (AES-256-GCM).

---

## Base URL & Auth

- **Base URL:** Same as your API (e.g. `https://api.example.com`)
- **Auth:** `Authorization: Bearer <user_token>` (JWT from login)
- **Content-Type:** `application/json` for request bodies

---

## Endpoints

### 1. Send Message (POST /messages)

Send a message to support. Use this to start a new conversation or reply to an existing one.

**Request body**

| Field    | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| `content`| string | Yes      | Message content (1–10000 chars)|

**Example**
```json
{
  "content": "I need help with my withdrawal request."
}
```

**Response**
```json
{
  "id": "clxx..."
}
```

---

### 2. List Messages (GET /messages)

List the current user's messages (two-way conversation with support). Shows both messages from the user and from Inspire Wallet Customer Support. Messages are ordered by newest first.

**Query parameters**

| Field  | Type   | Required | Description         |
|--------|--------|----------|---------------------|
| `page` | number | No       | Page number (default 1) |
| `limit`| number | No       | Items per page (default 20, max 100) |

**Example**
```
GET /messages?page=1&limit=20
```

**Response**
```json
{
  "messages": [
    {
      "id": "clxx...",
      "content": "Your withdrawal has been approved. The funds will arrive within 1–2 business days.",
      "createdAt": "2026-02-22T12:00:00.000Z",
      "status": "READ",
      "senderName": "Inspire Wallet Customer Support",
      "direction": "ADMIN_TO_USER"
    },
    {
      "id": "clxx...",
      "content": "I need help with my withdrawal.",
      "createdAt": "2026-02-20T09:00:00.000Z",
      "status": "SENT",
      "senderName": "You",
      "direction": "USER_TO_ADMIN"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Field descriptions**

| Field       | Description                                                   |
|-------------|---------------------------------------------------------------|
| `id`        | Message ID (use for mark-as-read)                             |
| `content`   | Message body                                                  |
| `createdAt` | Date/time when the message was sent                           |
| `status`    | `SENT` or `READ`                                              |
| `senderName`| `"Inspire Wallet Customer Support"` for admin messages, `"You"` for user's own messages |
| `direction` | `ADMIN_TO_USER` or `USER_TO_ADMIN`                            |

---

### 3. Mark Message as Read (PATCH /messages/:id/read)

Mark a single message as read.

**Example**
```
PATCH /messages/clxx123/read
```

**Response**
```json
{
  "message": "Message marked as read"
}
```

**Error responses**
- **404** – Message not found
- **403** – Not allowed (e.g. message belongs to another user)

---

### 4. Mark All as Read (PATCH /messages/read-all)

Mark all unread support messages as read.

**Example**
```
PATCH /messages/read-all
```

**Response**
```json
{
  "count": 3
}
```

`count` is the number of messages that were updated.

---

## Real-Time Updates (WebSocket)

When the user has an active WebSocket connection, they receive a `NEW_SUPPORT_MESSAGE` event when an admin sends them a message.

**Event:** `NEW_SUPPORT_MESSAGE`

**Payload:**
```json
{
  "messageId": "clxx..."
}
```

**Client action:** Refetch `GET /messages` or append the new message to the local list. Optionally show a push notification or badge.

See [API-REALTIME.md](API-REALTIME.md) for WebSocket connection details.

---

## Summary for Client Frontend

| Action          | Endpoint               | Method |
|-----------------|------------------------|--------|
| Send message    | /messages              | POST   |
| List messages   | /messages              | GET    |
| Mark one read   | /messages/:id/read     | PATCH  |
| Mark all read   | /messages/read-all     | PATCH  |
