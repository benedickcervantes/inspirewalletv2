# API Documentation: Admin Fetch — Withdrawal Requests & Transfers

This document describes how **admins** fetch withdrawal requests and transfer-related data. The payloads for **creating** withdrawals and transfers are already defined in [API-WITHDRAWAL-REQUESTS.md](API-WITHDRAWAL-REQUESTS.md) and [API-TRANSFERS.md](API-TRANSFERS.md). Here we focus on **admin read** endpoints and the **response payloads** returned when the admin fetches this data.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or `EXPO_PUBLIC_WALLET_BACKEND_URL` / your deployed backend URL)
- **Content-Type:** `application/json` for request bodies where applicable.
- **Protected routes:** All admin endpoints require JWT and **ADMIN** role:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** Query parameters and responses follow the shapes below. Extra body properties are rejected on write endpoints.

---

## Part 1: Admin fetch — Withdrawal requests

Admins can list all withdrawal requests, list only pending ones, and get a pending count. Each item includes decrypted account details (Local Bank or E-Wallet) and a `user` summary.

### 1.1 List all withdrawal requests (optional filter by status)

**`GET /withdrawal-requests/admin`**  
**Role:** ADMIN.

Returns all withdrawal requests. Optionally filter by status.

**Query parameters**

| Param    | Type   | Required | Description                                                       |
| -------- | ------ | -------- | ----------------------------------------------------------------- |
| `status` | string | No       | Filter: `PENDING`, `APPROVED`, or `REJECTED`. Omit to return all. |

**Example request**

```http
GET /withdrawal-requests/admin?status=PENDING
Authorization: Bearer <access_token>
```

**Example success response** `200`

Array of withdrawal request objects. Each object includes a nested `user` (decrypted PII summary).

**Response payload (single item)**

| Field               | Type    | Description                                                                 |
| ------------------- | ------- | --------------------------------------------------------------------------- |
| `id`                | string  | Withdrawal request ID (cuid)                                                |
| `userId`            | string  | User who submitted the request                                              |
| `walletId`          | string  | Source wallet to debit on approval                                          |
| `currencyId`        | string  | Currency ID                                                                 |
| `method`            | string  | `"local_bank"` or `"e_wallet"`                                              |
| `source`            | string  | `"available_balance"` or `"agent_commission"`                                |
| `amount`            | string  | Decimal, e.g. `"1000.50"` (decrypted)                                       |
| `status`            | string  | `PENDING` \| `APPROVED` \| `REJECTED`                                       |
| `accountNumber`     | string  | Bank/e-wallet account number (decrypted); null if N/A                        |
| `accountHolderName` | string  | For Local Bank: account holder name (decrypted); null for E-Wallet          |
| `bankName`          | string  | For Local Bank: bank name (decrypted); null for E-Wallet                    |
| `branchName`        | string  | For Local Bank: branch (decrypted); null for E-Wallet                        |
| `walletType`        | string  | For E-Wallet: `"gcash"` or `"maya"`; null for Local Bank                    |
| `accountName`       | string  | For E-Wallet: name on e-wallet (decrypted); null for Local Bank             |
| `adminNotes`        | string  | Admin notes (approve/reject); null if not set                               |
| `reviewedAt`        | string  | ISO date when reviewed; null if pending                                     |
| `reviewedById`      | string  | Admin user ID who reviewed; null if pending                                |
| `createdAt`         | string  | ISO date                                                                    |
| `updatedAt`         | string  | ISO date                                                                    |
| `user`              | object  | Requesting user summary (see below)                                         |

**`user` object (in each list item)**

| Field       | Type   | Description        |
| ----------- | ------ | ------------------ |
| `firstName` | string | User first name    |
| `lastName`  | string | User last name     |
| `email`     | string | User email         |

**Example response body (Local Bank)**

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "walletId": "clxx...",
    "currencyId": "clxx...",
    "method": "local_bank",
    "source": "available_balance",
    "amount": "1000.50",
    "status": "PENDING",
    "accountNumber": "1234567890",
    "accountHolderName": "Jane Doe",
    "bankName": "BDO Unibank",
    "branchName": "Makati Branch",
    "walletType": null,
    "accountName": null,
    "adminNotes": null,
    "reviewedAt": null,
    "reviewedById": null,
    "createdAt": "2026-02-21T12:00:00.000Z",
    "updatedAt": "2026-02-21T12:00:00.000Z",
    "user": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  }
]
```

**Example response body (E-Wallet)**

For `method: "e_wallet"`, bank-related fields are null and e-wallet fields are set:

```json
{
  "id": "clxx...",
  "userId": "clxx...",
  "walletId": "clxx...",
  "currencyId": "clxx...",
  "method": "e_wallet",
  "source": "available_balance",
  "amount": "500.00",
  "status": "PENDING",
  "accountNumber": "09171234567",
  "accountHolderName": null,
  "bankName": null,
  "branchName": null,
  "walletType": "gcash",
  "accountName": "Jane Doe",
  "adminNotes": null,
  "reviewedAt": null,
  "reviewedById": null,
  "createdAt": "2026-02-21T12:00:00.000Z",
  "updatedAt": "2026-02-21T12:00:00.000Z",
  "user": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com"
  }
}
```

**Error responses**

- **401 Unauthorized** – Missing or invalid token
- **403 Forbidden** – Caller is not ADMIN

---

### 1.2 List pending withdrawal requests only

**`GET /withdrawal-requests/admin/pending`**  
**Role:** ADMIN.

Returns only withdrawal requests with `status: "PENDING"`. Same response shape as **List all** (array of objects with `user`).

**Example request**

```http
GET /withdrawal-requests/admin/pending
Authorization: Bearer <access_token>
```

**Example success response** `200`

Same payload structure as **1.1**; only PENDING items are returned.

---

### 1.3 Get pending count (stats)

**`GET /withdrawal-requests/admin/stats`**  
**Role:** ADMIN.

Returns the number of pending withdrawal requests. Useful for dashboard badges or summaries.

**Example request**

```http
GET /withdrawal-requests/admin/stats
Authorization: Bearer <access_token>
```

**Example success response** `200`

```json
{
  "pending": 5
}
```

**Error responses**

- **401 Unauthorized** – Missing or invalid token
- **403 Forbidden** – Caller is not ADMIN

---

## Part 2: Admin fetch — Transfers (via transactions)

Transfers are stored as **transactions** with `type: "TRANSFER_OUT"` (sender) or `type: "TRANSFER_IN"` (receiver). There is no separate “transfers” collection. To fetch transfer data for admin (e.g. for a specific user), use the **Transactions** API with the `userId` query parameter (ADMIN only).

### 2.1 List a user’s transactions (includes transfers)

**`GET /transactions`**  
**Role:** User for own data; **ADMIN** may pass `userId` to list another user’s transactions.

**Query parameters**

| Parameter  | Type   | Required | Description                                                                 |
| ---------- | ------ | -------- | --------------------------------------------------------------------------- |
| `userId`   | string | No       | **ADMIN only.** Target user ID; omit for own transactions.                 |
| `walletId` | string | No       | Filter by wallet (must belong to target user).                              |
| `limit`    | string | No       | Max items (default 50, max 100).                                            |
| `cursor`   | string | No       | Transaction ID for cursor-based pagination.                                 |

**Example request (admin fetches a user’s transactions)**

```http
GET /transactions?userId=clxx...&limit=20
Authorization: Bearer <access_token>
```

**Example success response** `200`

Array of transaction objects. For **transfers**, each item has `type: "TRANSFER_OUT"` or `"TRANSFER_IN"`, and typically includes `toWalletId`, `amount`, `description` (decrypted), and related `wallet` / `toWallet` when the API includes them.

**Response payload (transaction object, transfer example)**

| Field         | Type   | Description                                                                 |
| ------------- | ------ | --------------------------------------------------------------------------- |
| `id`          | string | Transaction ID (cuid)                                                       |
| `walletId`    | string | Source wallet (for TRANSFER_OUT) or destination wallet (for TRANSFER_IN)   |
| `toWalletId`  | string | For transfers: counterpart wallet ID; null for non-transfer types           |
| `amount`      | string | Decimal, e.g. `"250.00"` (decrypted)                                        |
| `currencyId`  | string | Currency ID                                                                 |
| `currency`    | object | Currency details (code, name, symbol, etc.)                                 |
| `type`        | string | `TRANSFER_OUT` \| `TRANSFER_IN` \| `TOP_UP` \| `PAYMENT` \| `FEE` \| `REFUND` |
| `status`      | string | e.g. `COMPLETED`                                                            |
| `description` | string | Optional memo (decrypted); null if not set                                  |
| `metadata`    | object | Optional key-value data                                                     |
| `externalId`  | string | Optional external reference                                                 |
| `createdAt`   | string | ISO date                                                                    |
| `wallet`      | object | Optional; wallet details when included                                      |
| `toWallet`    | object | Optional; for transfers, counterpart wallet details when included           |

**Example transfer item in list**

```json
{
  "id": "clxx...",
  "walletId": "clxx...",
  "toWalletId": "clxx...",
  "amount": "250.00",
  "currencyId": "clxx...",
  "currency": {
    "id": "clxx...",
    "code": "PHP",
    "name": "Philippine Peso",
    "symbol": "₱"
  },
  "type": "TRANSFER_OUT",
  "status": "COMPLETED",
  "description": "Payment for lunch",
  "metadata": null,
  "externalId": null,
  "createdAt": "2026-02-18T12:00:00.000Z",
  "wallet": { "id": "clxx...", "userId": "clxx...", ... },
  "toWallet": { "id": "clxx...", "userId": "clxx...", ... }
}
```

**Error responses**

- **403 Forbidden** – Non-admin calling with `userId`  
  ```json
  { "statusCode": 403, "message": "Only admins can list transactions for another user", "error": "Forbidden" }
  ```
- **404 Not Found** – `walletId` provided but wallet not found or not owned by target user
- **401 Unauthorized** – Missing or invalid token

---

## Summary: Admin fetch endpoints

| Method | Endpoint                              | Role  | Description                                              |
| ------ | ------------------------------------- | ----- | -------------------------------------------------------- |
| GET    | `/withdrawal-requests/admin`          | ADMIN | List all withdrawal requests (optional `?status=`)       |
| GET    | `/withdrawal-requests/admin/pending`  | ADMIN | List pending withdrawal requests only                    |
| GET    | `/withdrawal-requests/admin/stats`    | ADMIN | Get pending withdrawal count                             |
| GET    | `/transactions?userId=...`             | ADMIN | List a user’s transactions (includes transfers)         |

---

## Related documentation

- **Create payloads (user):**  
  - Withdrawal: [API-WITHDRAWAL-REQUESTS.md](API-WITHDRAWAL-REQUESTS.md) (Local Bank and E-Wallet request bodies).  
  - Transfer: [API-TRANSFERS.md](API-TRANSFERS.md) (request body with `beneficiaryId`, `amount`, `description`, `passcode` when required).
- **Passcode:** [API-PASSCODE.md](API-PASSCODE.md), [API-PASSCODE-REQUIREMENTS.md](API-PASSCODE-REQUIREMENTS.md).
- **Transactions (full reference):** [API-TRANSACTIONS.md](API-TRANSACTIONS.md).
