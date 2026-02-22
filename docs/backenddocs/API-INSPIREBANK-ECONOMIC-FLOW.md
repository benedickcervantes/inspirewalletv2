# API Documentation: InspireBank (Central Bank) & Economic Flow

This document describes the **internal central bank** named **InspireBank** and the economic flows: **deposit (top-up)**, **withdrawal**, and **transfer**. All flows are encrypted at rest; the frontend sends and receives plain JSON.

---

## Concept: InspireBank (Central Bank)

**InspireBank** is a single internal account per currency (e.g. one for PHP) that represents the system’s position for that currency. A partner bank can reconcile and settle against this account.

- **Deposit (top-up):** User adds balance from outside; admin approves. User wallet +amount, InspireBank +amount. Ledger: DEPOSIT.
- **Credit from reserve:** Bank gives money (interest, commission, gift). User wallet +amount, InspireBank -amount. Ledger: CREDIT_FROM_RESERVE.
- **Withdrawal:** User withdraws to external bank. User wallet -amount. Ledger: WITHDRAWAL only (InspireBank unchanged).
- **Transfer (user → user):** Only the two wallets change. Ledger: TRANSFER only (InspireBank unchanged).

All movements are recorded in the InspireBank ledger for full audit.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** `application/json` for request bodies
- **Protected routes:** All endpoints below require JWT: `Authorization: Bearer <access_token>`

**Security (roles):** **POST /deposits**, **POST /deposits/by-account-number**, and **GET /inspire-bank/balance** are restricted by role. Only **ADMIN** and **PAYMENT_SERVICE** can call deposits; only **ADMIN** can call deposits by account number and read InspireBank balance. Regular **USER** cannot credit themselves or see central bank position. See **SECURITY-INSPIREBANK.md** for full rules.

---

## Deposits (Top-Up)

**`POST /deposits`**  
**Protected:** Yes.

Increases the user’s wallet balance and the InspireBank balance. Creates a **TOP_UP** transaction and a central bank **DEPOSIT** ledger entry. All sensitive fields (amount, description, balances) are encrypted at rest.

**Request body**

| Field         | Type   | Required | Description                                      |
|---------------|--------|----------|--------------------------------------------------|
| `walletId`    | string | Yes      | Wallet to credit (must belong to the user).     |
| `amount`      | string | Yes      | Decimal with up to 2 places (e.g. `"100.50"`).  |
| `description` | string | No       | Optional memo. Max 2000 chars.                   |

**Example request**

```json
{
  "walletId": "clxx...",
  "amount": "500.00",
  "description": "Card top-up"
}
```

**Example success response** `201`

Returns the created transaction (same shape as **Transactions** API), with decrypted `amount` and `description`:

```json
{
  "id": "clxx...",
  "walletId": "clxx...",
  "toWalletId": null,
  "amount": "500.00",
  "currencyId": "clxx...",
  "type": "TOP_UP",
  "status": "COMPLETED",
  "description": "Card top-up",
  "createdAt": "2026-02-18T12:00:00.000Z",
  "currency": { ... },
  "wallet": { ... },
  "toWallet": null
}
```

**Errors**

- **404** – Wallet not found or not owned by user.

---

## Deposit by Account Number (Admin Only)

**`POST /deposits/by-account-number`**  
**Protected:** Yes. **ADMIN** role only.

Credits a user's main PHP wallet **from InspireBank reserve** (decreases InspireBank). Use when you have the recipient's account number (e.g. from a form). The target user's main (PHP) wallet is credited; it is created if it does not exist. Creates a **REFUND** transaction and **CREDIT_FROM_RESERVE** ledger entry.

**Request body**

| Field           | Type   | Required | Description                                                       |
|-----------------|--------|----------|-------------------------------------------------------------------|
| `accountNumber` | string | Yes      | 12-digit account number, with or without spaces (e.g. `"0196 8487 2308"` or `"019684872308"`). |
| `amount`        | string | Yes      | Decimal with up to 2 places (e.g. `"10000.00"`).                  |
| `description`   | string | No       | Optional memo. Max 2000 chars.                                    |

**Example request**

```json
{
  "accountNumber": "0196 8487 2308",
  "amount": "10000.00",
  "description": "Credit from Inspire Bank"
}
```

**Example success response** `201`

Same shape as `POST /deposits`: the created transaction with decrypted `amount` and `description`:

```json
{
  "id": "clxx...",
  "walletId": "clxx...",
  "toWalletId": null,
  "amount": "10000.00",
  "currencyId": "clxx...",
  "type": "REFUND",
  "status": "COMPLETED",
  "description": "Credit from Inspire Bank",
  "createdAt": "2026-02-18T12:00:00.000Z",
  "currency": { ... },
  "wallet": { ... },
  "toWallet": null
}
```

**Errors**

- **404** – No user found with the given account number.
- **401** – Missing or invalid token.
- **403** – Caller does not have ADMIN role.
- **400** – InspireBank has insufficient reserve to credit this amount.

---

## Credit from Reserve (Admin Only)

**`POST /credit-from-reserve`**  
**Protected:** Yes. **ADMIN** role only.

Credits a user wallet from InspireBank reserve (decreases InspireBank). Use for explicit credit by walletId (e.g. interest, commission automation). Same behavior as deposit-by-account-number but requires walletId directly.

**Request body:** Same as `POST /deposits` (walletId, amount, description).

**Response:** Same shape as deposit, with `type: "REFUND"`.

---

## Withdrawals

**`POST /withdrawals`**  
**Protected:** Yes.

Decreases the user’s wallet balance and the InspireBank balance. Creates a **PAYMENT** transaction and a central bank **WITHDRAWAL** ledger entry. Fails only if the user has insufficient balance.

**Request body**

| Field         | Type   | Required | Description                                      |
|---------------|--------|----------|--------------------------------------------------|
| `walletId`    | string | Yes      | Wallet to debit (must belong to the user).      |
| `amount`      | string | Yes      | Decimal with up to 2 places (e.g. `"100.50"`).  |
| `description` | string | No       | Optional memo. Max 2000 chars.                   |

**Example request**

```json
{
  "walletId": "clxx...",
  "amount": "200.00",
  "description": "Bank payout"
}
```

**Example success response** `201`

Same shape as deposit: the created transaction with `type: "PAYMENT"` and `status: "COMPLETED"`.

**Errors**

- **400** – Insufficient balance in the user’s wallet- **404** – Wallet not found or not owned by user.

---

## InspireBank Balance

**`GET /inspire-bank/balance`**  
**Protected:** Yes.

Returns the InspireBank (central bank) balance for a currency. Use for partner reconciliation or internal dashboards.

**Query parameters**

| Parameter      | Type   | Required | Description                          |
|----------------|--------|----------|--------------------------------------|
| `currencyId`   | string | No       | Currency id.                         |
| `currencyCode` | string | No       | Currency code (e.g. `PHP`). Default `PHP` if neither is set. |

**Example**

```http
GET /inspire-bank/balance?currencyCode=PHP
```

**Example success response** `200`

```json
{
  "currencyId": "clxx...",
  "currencyCode": "PHP",
  "balance": "12500.50"
}
```

If no InspireBank row exists for the currency yet, the API returns `null` (or 404 depending on implementation).

---

## InspireBank Ledger

**`GET /inspire-bank/ledger`**  
**Protected:** Yes. **ADMIN** role only.

Returns paginated InspireBank ledger entries for a currency. All records (DEPOSIT, WITHDRAWAL, TRANSFER, CREDIT_FROM_RESERVE) are included.

**Query parameters**

| Parameter      | Type   | Required | Description                          |
|----------------|--------|----------|--------------------------------------|
| `currencyId`   | string | No       | Currency id.                         |
| `currencyCode` | string | No       | Currency code (e.g. `PHP`). Default `PHP` if neither is set. |
| `page`         | number | No       | Page number (1-based). Default 1.    |
| `limit`        | number | No       | Items per page. Default 20, max 100. |

**Example**

```http
GET /inspire-bank/ledger?currencyCode=PHP&page=1&limit=20
```

**Example success response** `200`

```json
{
  "items": [
    {
      "id": "clxx...",
      "type": "DEPOSIT",
      "amount": "500.00",
      "walletId": "clxx...",
      "toWalletId": null,
      "transactionId": "clxx...",
      "createdAt": "2026-02-18T12:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

## Transfers (User → User)

Transfers are documented in **API-TRANSFERS.md**. They:

- Debit the sender’s wallet and credit the receiver’s wallet.
- Create a **TRANSFER_OUT** transaction.
- **Do not** change the InspireBank balance.
- **Do** create an InspireBank ledger entry of type **TRANSFER** for global audit.

So the central bank has a full record of deposits, withdrawals, transfers, and credits-from-reserve. Only DEPOSIT (increases) and CREDIT_FROM_RESERVE (decreases) change InspireBank balance.

---

## Encryption and Ledger

- **Amounts** and **descriptions** in transactions and in the InspireBank ledger are stored encrypted (Supabase via Prisma). The frontend always sends and receives plain values.
- The **InspireBankLedger** table stores every DEPOSIT, WITHDRAWAL, TRANSFER, and CREDIT_FROM_RESERVE with encrypted amount, wallet references, and optional transaction id for audit and partner bank reconciliation.
