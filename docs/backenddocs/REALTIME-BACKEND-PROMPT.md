# Backend: Real-Time Support for Inspire Wallet

**Purpose:** This document is a prompt for AI or backend developers to implement real-time updates for wallet balance and transactions. The Inspire Wallet mobile app (React Native / Expo) uses JWT auth and REST APIs. Currently, the frontend polls or refetches on navigation; true real-time requires the backend to push updates.

---

## Context

- **Stack:** Node.js/NestJS backend, Supabase/Prisma, JWT auth
- **Relevant APIs:** `GET /wallets`, `POST /wallets/main`, `GET /transactions`
- **Current flow:** Frontend fetches on Dashboard mount and when returning to the screen. No push.

## What Needs Real-Time Updates

| Data | When it changes | Frontend usage |
|------|-----------------|----------------|
| **Wallet balance** | Transfer, deposit, withdraw, fee, refund | Dashboard, Transfer screen |
| **Transaction list** | New transaction created (transfer, top-up, payment, etc.) | Dashboard "Transaction History" |

## Recommended Approach: WebSocket or Server-Sent Events

### Option A: WebSocket (bidirectional)

**Endpoint:** `wss://your-api.com/ws` or `ws://localhost:3000/ws`

**Flow:**
1. Client connects with `Authorization: Bearer <access_token>` (e.g. in query param or first message)
2. Backend validates JWT, associates connection with `userId`
3. When balance or transactions change for that user (e.g. after `POST /transfers`), backend emits an event to that user's connection(s)
4. Client receives event, refetches `GET /wallets/main` and/or `GET /transactions`, or uses payload if backend sends full data

**Event payload (suggested):**
```json
{
  "type": "WALLET_UPDATE",
  "payload": {
    "walletId": "clxx...",
    "balance": "100.50"
  }
}
```
```json
{
  "type": "TRANSACTION_CREATED",
  "payload": {
    "transactionId": "clxx...",
    "walletId": "clxx..."
  }
}
```

- On `WALLET_UPDATE`: Frontend updates displayed balance.
- On `TRANSACTION_CREATED`: Frontend refetches `GET /transactions` or appends the new transaction if payload includes full transaction.

### Option B: Server-Sent Events (SSE)

**Endpoint:** `GET /events/stream` with `Authorization: Bearer <access_token>`

- One-way: server → client
- Simpler than WebSocket if only server push is needed
- Same event types and payloads as above

**Example SSE event:**
```
event: WALLET_UPDATE
data: {"walletId":"clxx...","balance":"100.50"}

event: TRANSACTION_CREATED
data: {"transactionId":"clxx...","walletId":"clxx..."}
```

---

## AI/Backend Implementation Prompt

Copy and adapt the following prompt for your backend AI or team:

---

**PROMPT: Implement real-time wallet and transaction updates**

We have a wallet app backend (NestJS/Node, JWT auth) with:
- `POST /wallets/main` – returns main wallet with `balance`
- `GET /transactions` – returns transactions for the user

We need real-time updates so that when a user sends/receives money or completes a deposit/withdraw, their balance and transaction list update without manual refresh.

**Requirements:**
1. Add a WebSocket gateway (or SSE endpoint) that:
   - Accepts connections with JWT (e.g. `?token=<access_token>` or first message)
   - Validates the token and maps the connection to `userId`
   - Stores active connections per user (support multiple devices)

2. Emit events to the user when:
   - **Wallet balance changes:** After any operation that updates wallet balance (transfer, top-up, payment, fee, refund). Emit `WALLET_UPDATE` with `{ walletId, balance }`.
   - **New transaction:** After creating a transaction record. Emit `TRANSACTION_CREATED` with `{ transactionId, walletId }`.

3. Integrate with existing flows:
   - `POST /transfers` – after successful transfer, emit both `WALLET_UPDATE` (source and destination users) and `TRANSACTION_CREATED`
   - Deposit/withdraw flows – after balance update and transaction creation, emit events for the affected user

4. Handle disconnects: Remove the connection from the user's connection pool when the client disconnects.

5. Optional: Heartbeat/ping-pong to keep connections alive and detect stale clients.

**Tech suggestions:** NestJS `@WebSocketGateway`, Socket.IO, or native `ws`; for SSE, use a streaming response with `Content-Type: text/event-stream`.

---

## Frontend Consumption (After Backend Is Ready)

Once the backend exposes WebSocket or SSE, the frontend will:

1. Connect when the user opens the Dashboard (and has valid JWT)
2. Listen for `WALLET_UPDATE` → update `availableBalance` state
3. Listen for `TRANSACTION_CREATED` → refetch `GET /transactions` or append new transaction
4. Disconnect when the user navigates away or logs out
5. Reconnect if the connection drops (with exponential backoff)

**Until then:** The frontend uses polling (refetch every 15–30 seconds while Dashboard is focused) as a fallback.

---

## Fallback: Polling (No Backend Changes)

If WebSocket/SSE is not implemented yet, the frontend can poll:
- `POST /wallets/main` every 15–30 seconds for balance
- `GET /transactions` every 15–30 seconds for transaction list

This provides near real-time updates without backend changes. The backend only needs to ensure REST endpoints return current data (which they already do).
