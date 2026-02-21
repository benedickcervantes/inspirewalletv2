# API Documentation: Transactions (Frontend Guide)

This document describes how the frontend should use the **Transactions** API. Every change in wallet balance (top-up, send, receive, fee, refund, etc.) is recorded as a transaction row for audit, statements, and dispute handling. Sensitive fields are encrypted at rest on the backend; the frontend sends and receives **plain JSON**.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** Send `Content-Type: application/json` for request bodies.
- **Protected routes:** All transaction endpoints require the JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** Request bodies use strict validation. Only send the fields documented below.

---

## Summary for the frontend

- **This model handles both deposit and withdraw.** The API uses different type names; see the mapping below.
- **When the user deposits or withdraws, the wallet balance does change.** The backend flow that processes deposit or withdraw will (1) update the wallet balance and (2) create a transaction record. So a successful deposit increases the balance and appears as a transaction; a successful withdraw decreases the balance and appears as a transaction. The frontend can rely on the transaction list as the audit trail and on the wallet balance as the current state.

**Transaction types (API name → meaning for the frontend)**

| API `type`     | Meaning / display idea        | Balance effect      |
|----------------|--------------------------------|---------------------|
| `TOP_UP`       | **Deposit** (money in: card, bank, cash-in) | Balance increases   |
| `PAYMENT`      | **Withdraw** (money out: to bank, merchant, cash-out) | Balance decreases   |
| `TRANSFER_OUT` | Sent to another user’s wallet  | Balance decreases   |
| `TRANSFER_IN`  | Received from another user     | Balance increases   |
| `FEE`          | Fee deducted                   | Balance decreases   |
| `REFUND`       | Refund received                | Balance increases   |

Use these types when showing labels (e.g. show “Deposit” for `TOP_UP`, “Withdraw” for `PAYMENT`) and when building statements or filters.

---

## Transactions

All transaction endpoints are under the `/transactions` prefix. You can only access transactions for wallets that belong to the authenticated user.

### 1. List transactions

**`GET /transactions`**  
**Protected:** Yes.

Returns transactions for the authenticated user. Optionally filter by a single wallet.

**Query parameters**

| Parameter  | Type   | Required | Description                                                                 |
|------------|--------|----------|-----------------------------------------------------------------------------|
| `walletId` | string | No       | If provided, only transactions for this wallet (must belong to the user).  |
| `limit`    | string | No       | Max number of items (default 50, max 100). Parsed as integer.              |
| `cursor`   | string | No       | Transaction ID for cursor-based pagination (next page).                     |

**Request**

- No body.
- Headers: `Authorization: Bearer <access_token>`.

**Example: all my transactions**

```http
GET /transactions?limit=20
```

**Example: one wallet’s transactions**

```http
GET /transactions?walletId=clxx...&limit=20
```

**Example success response** `200`

```json
[
  {
    "id": "clxx...",
    "walletId": "clxx...",
    "toWalletId": null,
    "amount": "100.50",
    "currency": {
      "id": "clxx...",
      "code": "PHP",
      "name": "Philippine Peso",
      "symbol": "₱",
      "createdAt": "2026-02-18T00:00:00.000Z",
      "updatedAt": "2026-02-18T00:00:00.000Z"
    },
    "type": "TOP_UP",
    "status": "COMPLETED",
    "externalId": "pay_abc123",
    "description": "Card top-up",
    "metadata": { "source": "card", "last4": "4242" },
    "createdAt": "2026-02-18T12:00:00.000Z"
  }
]
```

**Error responses**

- **404 Not Found** – `walletId` was provided but wallet not found or not owned by the user  
  ```json
  { "statusCode": 404, "message": "Wallet not found", "error": "Not Found" }
  ```
- **401 Unauthorized** – Missing or invalid/expired token  
  ```json
  { "statusCode": 401, "message": "Unauthorized" }
  ```

---

### 2. Get one transaction

**`GET /transactions/:id`**  
**Protected:** Yes.

Returns a single transaction by ID. The transaction must belong to a wallet owned by the authenticated user.

**Request**

- **URL parameter:** `id` – transaction ID (cuid).
- Headers: `Authorization: Bearer <access_token>`.

**Example success response** `200`

Same shape as a single transaction object in the list (see **Transaction object** below).

**Error responses**

- **404 Not Found** – Transaction not found or its wallet is not owned by the user  
  ```json
  { "statusCode": 404, "message": "Transaction not found", "error": "Not Found" }
  ```
- **401 Unauthorized** – Missing or invalid/expired token

---

### 3. Create a transaction

**`POST /transactions`**  
**Protected:** Yes.

Creates a transaction record (audit row). The wallet must belong to the authenticated user. **This endpoint only records the transaction;** it does not change wallet balance. Your backend flow (e.g. top-up or transfer) should update the wallet balance and then call this to log the event.

**Request body**

| Field        | Type   | Required | Validation                                    | Description                                      |
|-------------|--------|----------|-----------------------------------------------|--------------------------------------------------|
| `walletId`  | string | Yes      | —                                             | Wallet this transaction applies to               |
| `toWalletId`| string | No       | —                                             | For transfers: the counterpart wallet            |
| `amount`    | string | Yes      | Decimal, up to 2 decimal places (e.g. `100.50`) | Amount (stored encrypted)                        |
| `currencyId` | string | Yes      | Must match the wallet’s currency              | Currency ID (audit)                              |
| `type`      | string | Yes      | See **Transaction types** below               | Kind of transaction                             |
| `status`    | string | No       | See **Transaction statuses** below            | Default: `PENDING`                              |
| `externalId`| string | No       | Max 512 characters                            | External reference (e.g. payment gateway id)     |
| `description` | string | No     | Max 2000 characters                           | Human-readable description                       |
| `metadata`  | object | No       | Valid JSON object                             | Arbitrary key-value data (e.g. source, last4)   |

**Transaction types:** `TOP_UP`, `TRANSFER_OUT`, `TRANSFER_IN`, `PAYMENT`, `FEE`, `REFUND`

**Transaction statuses:** `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`

**Example request (top-up)**

```json
{
  "walletId": "clxx...",
  "amount": "500.00",
  "currencyId": "clxx...",
  "type": "TOP_UP",
  "status": "COMPLETED",
  "externalId": "pay_xyz789",
  "description": "Card top-up",
  "metadata": { "source": "card" }
}
```

**Example request (transfer out)**

```json
{
  "walletId": "clxx...",
  "toWalletId": "clxx...",
  "amount": "50.00",
  "currencyId": "clxx...",
  "type": "TRANSFER_OUT",
  "status": "COMPLETED",
  "description": "Sent to Jane"
}
```

**Example success response** `201`

Same shape as a single transaction object (includes decrypted `amount`, `description`, `metadata`, `externalId`, and `currency` with decrypted name/symbol).

**Error responses**

- **404 Not Found** – Wallet not found or not owned by the user  
  ```json
  { "statusCode": 404, "message": "Wallet not found", "error": "Not Found" }
  ```
- **404 Not Found** – Currency does not match the wallet  
  ```json
  { "statusCode": 404, "message": "Currency does not match wallet", "error": "Not Found" }
  ```
- **400 Bad Request** – Validation failed (e.g. invalid `amount`, `type`, or `status`)  
- **401 Unauthorized** – Missing or invalid/expired token

---

## Transaction object (in responses)

| Field        | Type   | Description                                                                 |
|-------------|--------|-----------------------------------------------------------------------------|
| `id`        | string | Unique transaction ID (cuid)                                                |
| `walletId`  | string | Wallet this transaction applies to                                          |
| `toWalletId`| string \| null | For transfers: the other wallet; otherwise `null`                   |
| `amount`    | string | Amount as decimal string (e.g. `"100.50"`) — decrypted by backend           |
| `currency`  | object | Currency at time of transaction (decrypted `name`, `symbol`; see below)      |
| `type`      | string | One of: `TOP_UP`, `TRANSFER_OUT`, `TRANSFER_IN`, `PAYMENT`, `FEE`, `REFUND` |
| `status`    | string | One of: `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`                        |
| `externalId`| string \| null | External reference (e.g. payment id) — decrypted                         |
| `description` | string \| null | Human-readable description — decrypted                                   |
| `metadata`  | object \| null | Arbitrary JSON — decrypted                                               |
| `createdAt` | string | ISO 8601 date-time                                                          |

---

## Currency object (nested in transaction)

Same as in the Wallets API:

| Field       | Type   | Description                          |
|------------|--------|--------------------------------------|
| `id`       | string | Unique currency ID (cuid)            |
| `code`     | string | 3-letter ISO code (e.g. `PHP`, `USD`)|
| `name`     | string | Display name (e.g. Philippine Peso)  |
| `symbol`   | string \| null | Symbol (e.g. ₱, $)              |
| `createdAt`| string | ISO 8601 date-time                   |
| `updatedAt`| string | ISO 8601 date-time                   |

---

## Encryption (backend only)

- **Amount**, **description**, **metadata**, and **externalId** are stored encrypted in the database (Supabase via Prisma).
- The frontend always sends and receives plain values. The backend encrypts on write and decrypts on read.

---

## Typical frontend flow

1. **Transaction history / statements:** Call `GET /transactions` (optionally with `walletId` and `limit`). Use the returned list for activity feeds and statements. Use `cursor` for “Load more” when you implement pagination.
2. **Single transaction (e.g. receipt or dispute):** Call `GET /transactions/:id` with the transaction ID from the list or from a deep link.
3. **Creating transactions:** The frontend typically does **not** call `POST /transactions` directly. When a user does a **deposit** (e.g. top-up) or **withdraw** (e.g. cash-out), the backend flow that handles that operation will update the wallet balance and create the transaction. So: deposit and withdraw both change the balance and both produce a transaction record; the transaction list is the history of those balance changes.

When the backend returns **401** on any transaction route, clear the stored token and redirect to login (or use your refresh flow).
