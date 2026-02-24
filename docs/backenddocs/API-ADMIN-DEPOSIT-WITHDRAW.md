# Admin Deposit & Withdraw APIs (Frontend Reference)

These endpoints allow admins to create deposit and withdrawal requests on behalf of users from the admin portal. All require `Authorization: Bearer <admin_token>` and ADMIN role.

---

## Admin Deposit Endpoints

### 1. Top-up (POST /deposit-requests/admin/top-up)

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | One of userId or accountNumber | Target user ID |
| `accountNumber` | string | One of userId or accountNumber | Target user's account (e.g. "0196 8487 2308") |
| `walletId` | string | Yes | Target wallet ID |
| `amount` | string | Yes | Decimal, e.g. "1000.50" |
| `reference` | string | No | Payment reference |

**Example**
```json
{
  "accountNumber": "019684872308",
  "walletId": "clxx...",
  "amount": "1000.50",
  "reference": "Bank transfer #123"
}
```

---

### 2. Stock investment (POST /deposit-requests/admin/stock-investment)

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | One of userId or accountNumber | Target user ID |
| `accountNumber` | string | One of userId or accountNumber | Target user's account |
| `walletId` | string | Yes | Target wallet ID |
| `amount` | string | Yes | Decimal, e.g. "5000.00" |
| `stockSymbol` | string | No | e.g. "AAPL" |

**Example**
```json
{
  "userId": "clxx...",
  "walletId": "clxx...",
  "amount": "5000.00",
  "stockSymbol": "AAPL"
}
```

---

### 3. Time deposit (POST /time-deposits/admin)

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | One of userId or accountNumber | Target user ID |
| `accountNumber` | string | One of userId or accountNumber | Target user's account |
| `contractType` | string | Yes* | "sixMonths" \| "oneYear" \| "twoYears" |
| `contractPeriod` | string | Yes* | Alternative: "6 Months" \| "1 Year" \| "2 Years" |
| `amount` | string | Yes | Decimal, e.g. "100000.00" |
| `walletId` | string | No | Defaults to user's main PHP wallet |
| `depositSource` | string | No | "AVAILABLE_BALANCE" (default) or "REQUEST_AMOUNT" |
| `depositMethod` | string | No | "available_balance" or "request_amount" |
| `interestRate` | string | No | Custom rate override (e.g. "5.25" for 5.25%). When omitted, use tier interpolation. |
| `referral` | object | No | Manual referrer override for agent commission. |
| `referral.referrerUserId` | string | Yes (if referral) | User ID of the referrer/agent |
| `referral.commissionPercentage` | number | No | Override commission % (0-100). Default from config. |
| `referral.mode` | string | No | "manual" or "hierarchy". Manual = single referrer 100%; hierarchy = referrer + upline 70/20/10. |

**Commission logic on approval:**
- If `referral` is provided: Use it for commission distribution (manual or hierarchy per mode).
- If `referral` is omitted and investor has referrers: Use automatic hierarchy (existing behavior).

**Example**
```json
{
  "accountNumber": "019684872308",
  "contractType": "oneYear",
  "amount": "100000.00",
  "depositMethod": "available_balance"
}
```

**Example with referral override**
```json
{
  "accountNumber": "019684872308",
  "contractType": "oneYear",
  "amount": "100000.00",
  "interestRate": "5.50",
  "referral": {
    "referrerUserId": "clxx...",
    "commissionPercentage": 6,
    "mode": "hierarchy"
  }
}
```

---

## Admin Withdrawal Endpoint

### POST /withdrawal-requests/admin

Creates a withdrawal request on behalf of a user. Either `targetUserId` or `targetAccountNumber` is required.

**Request body** — same as user withdrawal, plus target user identification:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetUserId` | string | One of these | Target user ID |
| `targetAccountNumber` | string | One of these | Target user's account (e.g. "0196 8487 2308") |
| `walletId` | string | Yes | Source wallet ID |
| `amount` | string | Yes | Decimal, e.g. "500.00" |
| `source` | string | No | "available_balance" (default) or "agent_commission" |
| `method` | string | Yes | "local_bank" or "e_wallet" |
| ... | | | Plus method-specific fields (accountNumber, bankName, etc.) |

**Local bank example**
```json
{
  "targetAccountNumber": "019684872308",
  "walletId": "clxx...",
  "amount": "500.00",
  "source": "available_balance",
  "method": "local_bank",
  "accountNumber": "1234567890",
  "accountHolderName": "Jane Doe",
  "bankName": "BDO Unibank"
}
```

**Agent commission withdrawal example**
```json
{
  "targetUserId": "clxx...",
  "walletId": "clxx...",
  "amount": "1000.00",
  "source": "agent_commission",
  "method": "local_bank",
  "accountNumber": "1234567890",
  "accountHolderName": "Jane Doe",
  "bankName": "BDO Unibank"
}
```

---

## Getting user wallets for the modal

Before creating a deposit or withdrawal, the admin needs the target user's wallets. Use:

- **GET /users/:id** (ADMIN) — returns user detail including `referralCode`, `referredById`, and `wallets` with `balance` and `agentCommission`.

Each wallet has `id`, `balance`, `agentCommission`, `currency`. Use `walletId` when creating deposits/withdrawals.

---

## Summary for frontend wiring

| Action | Endpoint | Target user field |
|--------|----------|-------------------|
| Admin top-up | POST /deposit-requests/admin/top-up | `userId` or `accountNumber` |
| Admin stock investment | POST /deposit-requests/admin/stock-investment | `userId` or `accountNumber` |
| Admin time deposit | POST /time-deposits/admin | `userId` or `accountNumber` |
| Admin withdrawal | POST /withdrawal-requests/admin | `targetUserId` or `targetAccountNumber` |

For withdrawals, set `source: "agent_commission"` when the user is withdrawing from their agent commission balance instead of available balance.
