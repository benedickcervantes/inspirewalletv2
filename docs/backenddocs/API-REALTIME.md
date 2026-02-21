# API: Real-Time Updates (WebSocket)

Real-time push for wallet balance and transaction updates. The Inspire Wallet app connects via WebSocket and receives events without polling.

---

## Endpoint

**WebSocket:** `ws://localhost:3000/ws` (dev) or `wss://your-api.com/ws` (prod)

Uses **Socket.IO** on path `/ws`. Same host/port as the REST API.

**Frontend:** The app uses `EXPO_PUBLIC_WALLET_BACKEND_URL` from `.env` (e.g. `http://192.168.254.102:3000`). Socket.IO connects to this base URL; no separate WebSocket URL needed.

---

## Authentication

Clients must send a valid JWT on connection. Two options:

### Option 1: Handshake `auth`

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/ws',
  auth: {
    token: access_token,           // raw token, or
    token: `Bearer ${access_token}`
  }
});
```

### Option 2: Query parameter

```javascript
const socket = io('http://localhost:3000', {
  path: '/ws',
  query: { token: access_token }
});
```

If the token is missing or invalid, the connection is rejected and disconnected.

---

## Event Types

### `WALLET_UPDATE`

Emitted when a wallet's balance changes (transfer, deposit, withdraw, time deposit, etc.).

**Payload:**
```json
{
  "walletId": "clxx...",
  "balance": "100.50"
}
```

**Client action:** Update displayed balance for the given wallet (e.g. refetch `GET /wallets/main` or update local state).

---

### `TRANSACTION_CREATED`

Emitted when a new transaction is created (transfer, top-up, payment, time deposit payout, etc.).

**Payload:**
```json
{
  "transactionId": "clxx...",
  "walletId": "clxx..."
}
```

**Client action:** Refetch `GET /transactions` or append the new transaction if the payload includes full transaction data.

---

## Heartbeat (PING / PONG)

Clients can send `PING` to keep the connection alive. The server responds with `PONG`.

```javascript
socket.emit('PING');
socket.on('PONG', () => { /* connection alive */ });
```

---

## Example: React Native / Expo (Option 2 – query parameter)

```javascript
import { io } from 'socket.io-client';

// Backend URL from .env – EXPO_PUBLIC_WALLET_BACKEND_URL
const baseUrl = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL?.replace(/\/$/, '') || '';

function useRealtime(accessToken: string | null) {
  useEffect(() => {
    if (!accessToken || !baseUrl) return;

    const socket = io(baseUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      query: { token: accessToken },  // Option 2: token as query parameter
    });

    socket.on('WALLET_UPDATE', (payload) => {
      updateWalletBalance(payload.walletId, payload.balance);
    });

    socket.on('TRANSACTION_CREATED', (payload) => {
      refetchTransactions();
    });

    const ping = setInterval(() => socket.emit('PING'), 30000);

    return () => {
      clearInterval(ping);
      socket.disconnect();
    };
  }, [accessToken]);
}
```

---

## When Events Are Emitted

| Flow | WALLET_UPDATE | TRANSACTION_CREATED |
|------|---------------|---------------------|
| `POST /transfers` | Source & destination users | Both users |
| `POST /deposits` | Deposited user | Deposited user |
| `POST /withdrawals` | Withdrawing user | Withdrawing user |
| Time deposit approval | User (debit) | User |
| Time deposit cancellation | User (credit) | User |
| Time deposit dividend payout | User | User (1–2 events if last payout) |

---

## Multiple Devices

A user can have multiple connected devices (e.g. phone + tablet). Each connection joins the `user:{userId}` room. Events are broadcast to all of that user's connections.

---

## Disconnect Handling

- On disconnect, the client is removed from the user's connection pool.
- Clients should reconnect with exponential backoff on connection loss.
- Use a fresh JWT if the previous one has expired.
