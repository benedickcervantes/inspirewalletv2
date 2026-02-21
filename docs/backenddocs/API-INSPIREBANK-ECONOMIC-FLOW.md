# API Documentation: InspireBank (Central Bank) & Economic Flow

This document describes the **internal central bank** named **InspireBank** and the economic flows: **deposit (top-up)**, **withdrawal**, and **transfer**. All flows are encrypted at rest; the frontend sends and receives plain JSON.

---

## Concept: InspireBank (Central Bank)

**InspireBank** is a single internal account per currency (e.g. one for PHP) that represents the system’s position for that currency. A partner bank can reconcile and settle against this account.

- **Deposit (top-up):** When a user adds balance (e.g. from card or bank), the user’s wallet balance **increases** and the **InspireBank balance also increases**. A ledger entry (DEPOSIT) is recorded.
- **Withdrawal:** When a user withdraws (e.g. to bank or cash-out), the user’s wallet balance **decreases** and the **InspireBank balance also decreases**. A ledger entry (WITHDRAWAL) is recorded.
- **Transfer (user → user):** When a user sends money to another user, only the two wallets change; **InspireBank balance does not change**. A ledger entry (TRANSFER) is still created for a full audit trail of all movements.

So:

- **Adding balance** and **withdrawing** always go through InspireBank (balance + ledger).
- **Transfers** are recorded in the InspireBank ledger but do not change the central bank balance.

Partner bank integration can focus on the InspireBank account and ledger to handle all client transactions.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** `application/json` for request bodies
- **Protected routes:** All endpoints below require JWT: `Authorization: Bearer <access_token>`

**Security (roles):** **POST /deposits** and **GET /inspire-bank/balance** are restricted by role. Only **ADMIN** and **PAYMENT_SERVICE** can call deposits; only **ADMIN** can read InspireBank balance. Regular **USER** cannot credit themselves or see central bank position. See **SECURITY-INSPIREBANK.md** for full rules.

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

## Withdrawals

**`POST /withdrawals`**  
**Protected:** Yes.

Decreases the user’s wallet balance and the InspireBank balance. Creates a **PAYMENT** transaction and a central bank **WITHDRAWAL** ledger entry. Fails if the user has insufficient balance or if InspireBank has insufficient balance.

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

- **400** – Insufficient balance in the user’s wallet, or **insufficient funds in the bank reserve** (InspireBank cannot cover this withdrawal). Message: `"Insufficient funds in bank reserve for this withdrawal. The bank cannot process this amount at the moment."`
- **404** – Wallet not found or not owned by user.

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

## Transfers (User → User)

Transfers are documented in **API-TRANSFERS.md**. They:

- Debit the sender’s wallet and credit the receiver’s wallet.
- Create a **TRANSFER_OUT** transaction.
- **Do not** change the InspireBank balance.
- **Do** create an InspireBank ledger entry of type **TRANSFER** for global audit.

So the central bank has a full record of deposits, withdrawals, and transfers, but only deposit and withdrawal change its balance.

---

## Encryption and Ledger

- **Amounts** and **descriptions** in transactions and in the InspireBank ledger are stored encrypted (Supabase via Prisma). The frontend always sends and receives plain values.
- The **InspireBankLedger** table stores every DEPOSIT, WITHDRAWAL, and TRANSFER with encrypted amount, wallet references, and optional transaction id for audit and partner bank reconciliation.
