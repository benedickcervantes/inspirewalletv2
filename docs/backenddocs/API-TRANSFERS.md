# API Documentation: Transfers (Frontend Guide)

This document describes how the frontend should use the **Transfers** API. An authenticated user can send money to a **selected beneficiary**. The flow resolves the beneficiary to a destination wallet, debits the source wallet, credits the destination, and creates an encrypted **transaction** record—all in one atomic operation. Amount and description are encrypted at rest; the frontend sends and receives **plain JSON**.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** Send `Content-Type: application/json` for request bodies.
- **Protected routes:** All transfer endpoints require the JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** Request bodies use strict validation. Only send the fields documented below.

---

## Transfer to a beneficiary

**`POST /transfers`**  
**Protected:** Yes.

Transfers money from the authenticated user’s wallet to the wallet resolved from the selected beneficiary. The beneficiary must belong to the authenticated user (created via **Beneficiaries** API). Resolution rules:

- **`WALLET_ID`** – `accountIdentifier` is used directly as the destination wallet id.
- **`EMAIL`** – User is looked up by email; their main (PHP) wallet is used as the destination.
- **`PHONE`** – Not supported for resolution in the current version (use `WALLET_ID` or `EMAIL`).

The operation is **atomic**: source balance is debited, destination balance is credited, and a single transaction row is created with `type: TRANSFER_OUT` and `status: COMPLETED`. All sensitive fields (amount, description, wallet balances) are encrypted at rest.

**Request body**

| Field            | Type   | Required | Description                                                                 |
|------------------|--------|----------|-----------------------------------------------------------------------------|
| `beneficiaryId`  | string | Yes      | Id of the beneficiary to send to (must belong to the authenticated user).   |
| `fromWalletId`   | string | No       | Source wallet id. If omitted, the user’s main (PHP) wallet is used.        |
| `amount`         | string | Yes      | Decimal with up to 2 places (e.g. `"100.50"`). Stored encrypted.           |
| `description`    | string | No       | Optional memo. Max 2000 chars. Stored encrypted.                           |
| `passcode`       | string | Conditional | Exactly 4 digits (0–9). **Required when the user has a passcode set.** See [API-PASSCODE.md](API-PASSCODE.md). |

**Example request**

```json
{
  "beneficiaryId": "clxx...",
  "amount": "250.00",
  "description": "Payment for lunch",
  "passcode": "1234"
}
```

If the user has no passcode set, omit `passcode`. If they have one, include it; otherwise the request returns **400 Bad Request**.

**Example success response** `201`

Returns the created transaction (same shape as **Transactions** API), with decrypted `amount` and `description`:

```json
{
  "id": "clxx...",
  "walletId": "clxx...",
  "toWalletId": "clxx...",
  "amount": "250.00",
  "currencyId": "clxx...",
  "type": "TRANSFER_OUT",
  "status": "COMPLETED",
  "description": "Payment for lunch",
  "metadata": null,
  "externalId": null,
  "createdAt": "2026-02-18T12:00:00.000Z",
  "currency": { "id": "clxx...", "code": "PHP", "name": "Philippine Peso", "symbol": "₱", ... },
  "wallet": { ... },
  "toWallet": { ... }
}
```

**Error responses**

- **400 Bad Request** – Invalid input, insufficient balance, same source/destination wallet, different currencies, or passcode required/incorrect (when user has passcode set).
- **404 Not Found** – Beneficiary not found (or not owned by user), source wallet not found, or destination wallet could not be resolved.
- **401 Unauthorized** – Missing or invalid/expired token.

---

## Encryption and transactions

- **Amount** and **description** are stored encrypted in the database (Supabase via Prisma). The frontend always sends and receives plain values.
- A successful transfer **always** creates exactly one **transaction** row with `type: TRANSFER_OUT` and `status: COMPLETED`. You can list it via `GET /transactions` or `GET /transactions?walletId=...`.
- Wallet balances are updated atomically with the transaction; no separate balance endpoint call is required after a successful transfer.
