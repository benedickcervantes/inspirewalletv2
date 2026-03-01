# Dashboard Header API (Admin Frontend Reference)

This document describes the **Dashboard Header** overview cards shown on the admin dashboard. These cards display real-time counts fetched from the backend: **Active Session**, **New Deposit Request**, and **New Withdrawal Request**.

**Protected:** All backend endpoints used here require `Authorization: Bearer <admin_token>` and ADMIN role.

---

## Overview

The dashboard header displays three metrics:

| Card                       | Description                                                               | Backend endpoint                       |
| -------------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| **Active Session**         | Number of users currently online (WebSocket connected)                    | `GET /user-activity/online-count`      |
| **New Deposit Request**    | Total pending deposit requests (top-up + stock investment + time deposit) | `GET /deposit-requests/admin/stats`    |
| **New Withdrawal Request** | Total pending withdrawal requests                                         | `GET /withdrawal-requests/admin/stats` |

---

## Frontend API

The admin frontend can call the three endpoints in parallel and aggregate the counts.

### Response Shape

```typescript
interface DashboardHeaderStats {
  activeSession: number; // Users currently online
  newDepositRequest: number; // Pending deposit requests
  newWithdrawalRequest: number; // Pending withdrawal requests
}
```

**Example implementation:** Fetch all three in parallel, then map to `DashboardHeaderStats`:

```typescript
const [active, deposit, withdrawal] = await Promise.all([
  fetch("/user-activity/online-count", {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()),
  fetch("/deposit-requests/admin/stats", {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()),
  fetch("/withdrawal-requests/admin/stats", {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()),
]);
const stats = {
  activeSession: active.count,
  newDepositRequest: deposit.pending,
  newWithdrawalRequest: withdrawal.pending,
};
```

---

## Backend Endpoints

### 1. Active Session (Online Users Count)

**`GET /user-activity/online-count`**

Returns the number of users currently online (WebSocket connected).

**Response**

```json
{
  "count": 12
}
```

**Reference:** [API-USER-ACTIVITY.md](API-USER-ACTIVITY.md)

---

### 2. New Deposit Request (Pending Deposits)

**`GET /deposit-requests/admin/stats`**

Returns the total count of pending deposit requests (top-up + stock investment + time deposit).

**Response**

```json
{
  "pending": 5
}
```

**Reference:** [API-DEPOSIT-REQUESTS.md](API-DEPOSIT-REQUESTS.md)

---

### 3. New Withdrawal Request (Pending Withdrawals)

**`GET /withdrawal-requests/admin/stats`**

Returns the total count of pending withdrawal requests.

**Response**

```json
{
  "pending": 3
}
```

**Reference:** [API-WITHDRAWAL-REQUESTS.md](API-WITHDRAWAL-REQUESTS.md)

---

## Query Key & Refresh

- **Query key:** `["dashboard-header-stats"]`
- Data is fetched via TanStack Query on mount of the dashboard page.
- To invalidate after processing a request (e.g., approving a deposit or withdrawal):

```typescript
queryClient.invalidateQueries({ queryKey: ["dashboard-header-stats"] });
```

---

## Summary

| Card                   | Endpoint                             | Response field |
| ---------------------- | ------------------------------------ | -------------- |
| Active Session         | GET /user-activity/online-count      | `count`        |
| New Deposit Request    | GET /deposit-requests/admin/stats    | `pending`      |
| New Withdrawal Request | GET /withdrawal-requests/admin/stats | `pending`      |

---

## Alternative (list-based counts)

If you prefer to use list endpoints and count client-side:

- **Active Session:** `GET /users` (with limit) + `GET /user-activity/bulk?userIds=...` → count where `status === 'online'`. Prefer `GET /user-activity/online-count` to avoid pagination limits.
- **New Deposit Request:** `GET /deposit-requests/admin?status=PENDING` → `response.length`.
- **New Withdrawal Request:** `GET /withdrawal-requests/admin/pending` → `response.length`.

The dedicated stats endpoints above are more efficient for the dashboard header.
