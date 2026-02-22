# User Activity API (Admin Frontend Reference)

These endpoints allow admins to check whether users are online or offline and when they were last active. Requires `Authorization: Bearer <admin_token>` and ADMIN role.

**Encryption:** All stored data (lastLoginAt, lastActiveAt, isOnline) is encrypted at rest (AES-256-GCM).

---

## How Activity Is Tracked

- **`isOnline`:** Set to `true` when the user connects via WebSocket (app in foreground, connected). Set to `false` when the user disconnects or closes the app.
- **`lastActiveAt`:** Updated when the user logs in and when they connect via WebSocket.
- **`lastLoginAt`:** Updated when the user logs in (email/password authentication).

---

## Endpoints

### 1. Get User Activity (GET /user-activity/:userId)

Returns activity status for a single user.

**Example**
```
GET /user-activity/clxx123
```

**Response**
```json
{
  "isOnline": true,
  "lastActiveAt": "2026-02-22T12:05:00.000Z",
  "lastLoginAt": "2026-02-22T11:00:00.000Z"
}
```

**Field descriptions**

| Field         | Description                                         |
|---------------|-----------------------------------------------------|
| `isOnline`    | Whether the user has an active WebSocket connection |
| `lastActiveAt`| Last time the user was active (login or connect)    |
| `lastLoginAt` | Last time the user logged in                        |

**Error responses**
- **404** – User has no activity record yet (e.g. never logged in)

---

### 2. Bulk Query (GET /user-activity/bulk)

Returns activity status for multiple users. Use when populating the messaging conversations list or any admin view that shows online/offline status for many users.

**Query parameters**

| Field    | Type     | Required | Description                               |
|----------|----------|----------|-------------------------------------------|
| `userIds`| string[] | Yes      | Comma-separated user IDs, e.g. `id1,id2,id3` |

**Example**
```
GET /user-activity/bulk?userIds=clxx123,clxx456,clxx789
```

**Response**

A map of `userId` to activity object. Users without an activity record return `null`.

```json
{
  "clxx123": {
    "isOnline": true,
    "lastActiveAt": "2026-02-22T12:05:00.000Z",
    "lastLoginAt": "2026-02-22T11:00:00.000Z"
  },
  "clxx456": {
    "isOnline": false,
    "lastActiveAt": "2026-02-22T10:30:00.000Z",
    "lastLoginAt": "2026-02-22T10:30:00.000Z"
  },
  "clxx789": null
}
```

---

## Integration with Admin Messaging

The admin messaging list (`GET /messages/admin/conversations`) already includes `isActive` per conversation. For custom UIs or additional checks, use:

- **Single user:** `GET /user-activity/:userId`
- **Multiple users:** `GET /user-activity/bulk?userIds=...`
