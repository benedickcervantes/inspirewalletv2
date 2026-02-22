# API Documentation: Time Deposits (Frontend Guide)

This document describes the **time deposit** API for the frontend. Users create time deposit requests; admins approve or reject. On approval, the wallet is debited and the deposit becomes active. Agent commission is distributed automatically to referrers (see [API-AGENT-COMMISSION.md](API-AGENT-COMMISSION.md)).

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** `Content-Type: application/json` for request bodies
- **Protected routes:** `Authorization: Bearer <access_token>`

---

## Contract Types

| Value | Term | Dividend Payouts |
|-------|------|------------------|
| `sixMonths` | 6 months | 1 (at maturity) |
| `oneYear` | 12 months | 2 (every 6 months) |
| `twoYears` | 24 months | 4 (every 6 months) |

- **Minimum investment:** 50,000 PHP (or equivalent in deposit currency)
- **Dividend:** Computed per 6‑month period, 20% tax withheld
- **Principal:** Returned at maturity (last payout)

---

## Deposit Source (depositMethod)

When creating a time deposit, the user chooses how the amount will be funded:

| Value | Description |
|-------|-------------|
| `AVAILABLE_BALANCE` (default) | Deduct from user's wallet. Requires sufficient balance at creation. On approval, wallet is debited and InspireBank receives the funds. |
| `REQUEST_AMOUNT` | No deduction at creation. On approval, the amount is credited to the user (top-up flow), then debited for the time deposit. Same flow as external deposit approval. |

- **`available_balance`**: User must have the amount in their wallet. On approval: debit wallet → add to InspireBank → time deposit active.
- **`request_amount`**: User requests the amount (e.g. will deposit externally). On approval: credit user (top-up + InspireBank) → debit for time deposit → active. No prior balance required.

---

## Response Shape

All time deposit endpoints return the same object shape (`TimeDepositWithSchedule`):

```json
{
  "id": "clxx...",
  "contractType": "oneYear",
  "depositSource": "AVAILABLE_BALANCE",
  "amount": "500000.00",
  "createdAt": "2026-02-22T02:20:00.000Z",
  "interestRate": "5.25",
  "status": "PENDING",
  "startDate": null,
  "maturityDate": null,
  "projectedStartDate": "2026-02-22",
  "projectedMaturityDate": "2027-02-22",
  "payoutSchedule": [
    {
      "payoutIndex": 1,
      "expectedDate": "2026-08-22",
      "amount": "10500.00",
      "status": "PENDING"
    },
    {
      "payoutIndex": 2,
      "expectedDate": "2027-02-22",
      "amount": "10500.00",
      "status": "PENDING",
      "isLastPayout": true,
      "principalReturned": "500000.00"
    }
  ],
  "commission": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Time deposit id |
| `contractType` | `sixMonths` \| `oneYear` \| `twoYears` | Contract term |
| `depositSource` | `AVAILABLE_BALANCE` \| `REQUEST_AMOUNT` | How the amount is funded (see below) |
| `amount` | string | Investment amount |
| `createdAt` | string | Creation date in ISO 8601 format (e.g. `"2026-02-22T02:20:00.000Z"`) |
| `interestRate` | string | Interest rate (e.g. `"5.25"` for 5.25%) |
| `status` | `PENDING` \| `ACTIVE` \| `MATURED` \| `CANCELLED` | Status |
| `startDate` | string \| null | Start date (YYYY-MM-DD) when ACTIVE |
| `maturityDate` | string \| null | Maturity date when ACTIVE |
| `projectedStartDate` | string | Projected start (for PENDING) or same as startDate |
| `projectedMaturityDate` | string | Projected maturity |
| `payoutSchedule` | array | Dividend schedule (see below) |
| `commission` | object \| null | Commission preview or credited; see [API-AGENT-COMMISSION.md](API-AGENT-COMMISSION.md) |

**Payout schedule item:**

| Field | Type | Description |
|-------|------|-------------|
| `payoutIndex` | number | 1-based index |
| `expectedDate` | string | YYYY-MM-DD |
| `amount` | string | Dividend amount (after tax) |
| `status` | `PENDING` \| `PAID` | Payout status |
| `isLastPayout` | boolean? | True for final payout |
| `principalReturned` | string? | Principal returned (last payout only) |

---

## Client Endpoints

### Create time deposit

**`POST /time-deposits`**  
**Protected:** Yes (JWT).

Creates a PENDING time deposit. No wallet debit until admin approves.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contractType` | `sixMonths` \| `oneYear` \| `twoYears` | Yes* | Contract term (use this or `contractPeriod`) |
| `contractPeriod` | string | Yes* | Alias for contractType. Accepts `"6 Months"`, `"1 Year"`, `"2 Years"` or enum values. |
| `amount` | string | Yes | Decimal with up to 2 places (e.g. `"50000.00"`) |
| `walletId` | string | No | Wallet to debit. Defaults to user's main PHP wallet. |
| `depositSource` | `AVAILABLE_BALANCE` \| `REQUEST_AMOUNT` | No | How the amount is funded. Default `AVAILABLE_BALANCE`. |
| `depositMethod` | string | No | Alias for depositSource. Accepts `"available_balance"` or `"request_amount"`. |

\* Provide either `contractType` or `contractPeriod` (not both required).

**Example**

```json
{
  "contractType": "oneYear",
  "amount": "500000.00",
  "walletId": "clxx..."
}
```

**Example (using contractPeriod)**

```json
{
  "contractPeriod": "1 Year",
  "amount": "500000.00"
}
```

**Example (request amount – no prior balance required)**

```json
{
  "contractType": "oneYear",
  "amount": "500000.00",
  "depositMethod": "request_amount"
}
```

**Example success response** `201`

Returns the created time deposit with `status: "PENDING"`, `projectedStartDate`, `projectedMaturityDate`, and `payoutSchedule`.

**Errors**

- **400** — Amount below minimum (50,000), invalid format, insufficient balance (when `depositSource` is `AVAILABLE_BALANCE`), or invalid `depositMethod`
- **404** — Wallet not found or not owned by user

---

### List my time deposits

**`GET /time-deposits`**  
**Protected:** Yes.

Returns all time deposits for the authenticated user, ordered by creation (newest first).

**Response:** Array of `TimeDepositWithSchedule`. Includes `commission` for ACTIVE/MATURED deposits when the investor has referrers.

---

### Get one time deposit

**`GET /time-deposits/:id`**  
**Protected:** Yes.

Returns a single time deposit. User must own it.

**Response:** `TimeDepositWithSchedule`. Includes `commission` when applicable (preview for PENDING, credited for ACTIVE/MATURED).

**Errors**

- **403** — Access denied (not owner)
- **404** — Not found

---

### Request cancellation

**`POST /time-deposits/:id/request-cancellation`**  
**Protected:** Yes.

User requests early withdrawal. Sets `cancellationRequestedAt`; admin must approve or reject.

**Response:** `{ "status": "string" }`

**Errors**

- **400** — Deposit not ACTIVE or already has cancellation requested
- **403** — Not owner
- **404** — Not found

---

## Admin Endpoints

### List interest rate tiers

**`GET /time-deposits/interest-rates`**  
**Protected:** Yes. **ADMIN** only.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `contractType` | `sixMonths` \| `oneYear` \| `twoYears` | No | Filter by contract type |

**Response:** Array of tiers

```json
[
  {
    "id": "clxx...",
    "contractType": "oneYear",
    "amount": "50000.00",
    "interestRate": "5.00"
  },
  {
    "id": "clxx...",
    "contractType": "oneYear",
    "amount": "100000.00",
    "interestRate": "5.25"
  }
]
```

---

### Set interest rate tier

**`POST /time-deposits/interest-rates`**  
**Protected:** Yes. **ADMIN** only.

Creates or updates an interest rate tier for a contract type and amount.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contractType` | `sixMonths` \| `oneYear` \| `twoYears` | Yes | Contract type |
| `amount` | string | Yes | Decimal (e.g. `"50000.00"`) |
| `interestRate` | string | Yes | Rate (e.g. `"5.00"` for 5%) |

**Response:** `{ id, contractType, amount, interestRate }`

---

### Admin create time deposit

**`POST /time-deposits/admin`**  
**Protected:** Yes. **ADMIN** only.

Creates a PENDING time deposit on behalf of a user. Same response shape as `POST /time-deposits`, plus `commission` preview when applicable.

**Request body:** Same as user create, plus `userId` or `accountNumber`, and optional admin overrides:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` \| `accountNumber` | string | One required | Target user |
| `interestRate` | string | No | Custom rate override (e.g. "5.25"). Omit for tier interpolation. |
| `referral` | object | No | Manual referrer override for agent commission. |
| `referral.referrerUserId` | string | Yes (if referral) | User ID of the referrer/agent |
| `referral.commissionPercentage` | number | No | Override commission % (0-100). |
| `referral.mode` | string | No | "manual" (single referrer) or "hierarchy" (referrer + upline). |

See [API-ADMIN-DEPOSIT-WITHDRAW.md](API-ADMIN-DEPOSIT-WITHDRAW.md) for full request body and examples.

---

### List pending time deposits (admin)

**`GET /time-deposits/admin/pending`**  
**Protected:** Yes. **ADMIN** only.

Returns all PENDING time deposits for approval. Each item includes `userId`, `user` (firstName, lastName, email), `requestType`, and `createdAt` (aligned with top-up and stock investment request formats).

**Response:** Array of `TimeDepositForAdminList`

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "contractType": "oneYear",
    "depositSource": "REQUEST_AMOUNT",
    "requestType": "time_deposit",
    "createdAt": "2026-02-22T02:20:00.000Z",
    "amount": "500000.00",
    "interestRate": "5.25",
    "status": "PENDING",
    "startDate": null,
    "maturityDate": null,
    "projectedStartDate": "2026-02-22",
    "projectedMaturityDate": "2027-02-22",
    "payoutSchedule": [...],
    "commission": {
      "commissionRatePercent": 5,
      "totalCommission": "20000.00",
      "distribution": [...]
    },
    "user": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  }
]
```

---

### Approve time deposit

**`POST /time-deposits/:id/approve`**  
**Protected:** Yes. **ADMIN** only.

Approves a PENDING time deposit. Behavior depends on `depositSource`:

- **AVAILABLE_BALANCE**: Debits the user's wallet, adds to InspireBank ledger, sets status to ACTIVE, distributes agent commission.
- **REQUEST_AMOUNT**: Credits the user (top-up + InspireBank), then debits for the time deposit. Same flow as approving an external deposit. No prior balance required.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | string | No | Optional admin notes. Max 500 chars. |

**Example**

```json
{
  "notes": "Approved"
}
```

**Response:** `TimeDepositWithSchedule` with `status: "ACTIVE"`, `startDate`, `maturityDate`, and `commission` (credited amounts).

**Errors**

- **400** — Not PENDING, or insufficient wallet balance (after top-up for REQUEST_AMOUNT), or InspireBank insufficient for commission
- **404** — Not found

---

### Reject time deposit

**`POST /time-deposits/:id/reject`**  
**Protected:** Yes. **ADMIN** only.

Rejects a PENDING time deposit. Sets status to CANCELLED.

**Response:** `{ "status": "CANCELLED" }`

---

### Approve cancellation

**`POST /time-deposits/:id/approve-cancellation`**  
**Protected:** Yes. **ADMIN** only.

Approves a user's early withdrawal request. Returns principal to wallet, sets status to CANCELLED.

**Response:** `TimeDepositWithSchedule` with `status: "CANCELLED"`

---

### Reject cancellation

**`POST /time-deposits/:id/reject-cancellation`**  
**Protected:** Yes. **ADMIN** only.

Rejects a user's early withdrawal request. Clears `cancellationRequestedAt`; deposit remains ACTIVE.

**Response:** `TimeDepositWithSchedule`

---

## Status Flow

```
PENDING → (admin approve) → ACTIVE → (maturity or admin approve cancellation) → CANCELLED
PENDING → (admin reject)  → CANCELLED
ACTIVE  → (maturity)      → MATURED
```

---

## Realtime Events

- **Time deposit approval:** `WALLET_UPDATE` (investor balance), `TRANSACTION_CREATED` (investor)
- **Commission credited:** `WALLET_UPDATE` with `agentCommission` (each referrer)
- **Dividend payout:** `WALLET_UPDATE`, `TRANSACTION_CREATED` (investor)
- **Cancellation approved:** `WALLET_UPDATE` (investor balance restored)

See [API-REALTIME.md](API-REALTIME.md).

---

## Related Documentation

- [API-AGENT-COMMISSION.md](API-AGENT-COMMISSION.md) — Commission in time deposit responses
- [API-WALLETS-AND-CURRENCY.md](API-WALLETS-AND-CURRENCY.md) — Wallets for investment
- [API-REALTIME.md](API-REALTIME.md) — WebSocket events
