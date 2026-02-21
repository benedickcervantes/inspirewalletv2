# API Documentation: Agent Commission (Frontend Guide)

This document describes the **agent commission system** for time deposits and how the frontend (client app and admin app) should integrate with it.

---

## Overview

When an admin approves a time deposit creation, the system **automatically** distributes commission to up to 3 referrers in the investor's referral hierarchy. Commission is credited to each referrer's **agent commission balance** on their wallet (same currency as the deposit). Each commission credit is recorded in the **AgentCommission** table for audit and display.

---

## Commission in Time Deposit Responses

All time deposit responses include a `commission` field when applicable:

| Endpoint | When `commission` is present |
|----------|-----------------------------|
| `GET /time-deposits` | For approved deposits (ACTIVE, MATURED) with referrers |
| `GET /time-deposits/:id` | For pending (preview) or approved (credited) deposits |
| `GET /time-deposits/admin/pending` | Always (preview of what will be credited on approval) |
| `POST /time-deposits/:id/approve` | In the response (actual amounts credited) |

**Commission shape:**

```json
{
  "commission": {
    "commissionRatePercent": 5,
    "totalCommission": "20000.00",
    "distribution": [
      {
        "referrerUserId": "clxx...",
        "referralCode": "ABC12XYZ",
        "firstName": "Juan",
        "lastName": "Dela Cruz",
        "amount": "14000.00",
        "sharePercent": 70
      },
      {
        "referrerUserId": "clxx...",
        "referralCode": "K7MN2PQR",
        "firstName": "Maria",
        "lastName": "Santos",
        "amount": "4000.00",
        "sharePercent": 20
      },
      {
        "referrerUserId": "clxx...",
        "referralCode": "XY9Z3ABC",
        "firstName": "Pedro",
        "lastName": "Reyes",
        "amount": "2000.00",
        "sharePercent": 10
      }
    ]
  }
}
```

- **`commissionRatePercent`** — Commission rate used (e.g. `5` for 5%). From `AGENT_COMMISSION_RATE` env.
- **`totalCommission`** — Total commission (after tax) to be or already distributed.
- **`distribution[].referrerUserId`** — Referrer's user id.
- **`distribution[].referralCode`** — Referrer's 8-char referral code (e.g. `ABC12XYZ`).
- **`distribution[].firstName`**, **`distribution[].lastName`** — Referrer's name.
- **`distribution`** — Per-referrer breakdown. `sharePercent` is 70, 20, 10 for 3 referrers; 70, 30 for 2; 100 for 1.
- **`commission`** is `null` when the investor has no referrers.

**Formula:**
- Commission Credit = Investment Amount × Commission Rate × (1 − 20% tax)
- Distribution:
  - 1 referrer: 100%
  - 2 referrers: 70% / 30%
  - 3 referrers: 70% / 20% / 10%

**Example:** 500,000 PHP at 5% rate → 25,000 gross → 20,000 after tax. With 3 referrers: 14,000 / 4,000 / 2,000 PHP.

---

## For Client App (Investor / Referrer)

### No New Endpoints

Commission is automatic. There are no dedicated commission endpoints to call.

### Wallet `agentCommission`

The `agentCommission` field is already returned by:

- **`GET /wallets`** — list of user wallets
- **`GET /wallets/:id`** — single wallet
- **`POST /wallets/main`** — get or create main wallet

Each wallet includes:

```json
{
  "id": "clxx...",
  "userId": "clxx...",
  "balance": "1000.00",
  "agentCommission": "14000.00",
  "status": "ACTIVE",
  "currency": { "code": "PHP", "name": "Philippine Peso", "symbol": "₱" }
}
```

**Frontend tasks:**
- Display `agentCommission` when the user has referral activity (e.g. referral dashboard, wallet card).
- Use the same decimal formatting as `balance` (2 decimal places).

### Realtime Updates

Subscribe to **`WALLET_UPDATE`** events (see API-REALTIME.md). The payload supports optional fields:

```json
{
  "walletId": "clxx...",
  "balance": "1000.00",
  "agentCommission": "14000.00"
}
```

When `agentCommission` is present, refresh the agent commission display for that wallet. Either field may be omitted (partial update); treat missing fields as "no change" and keep existing values or refetch the wallet.

---

## For Admin App

### Time Deposit Approval

- **`POST /time-deposits/:id/approve`** — On success, commission is distributed and credited. The response includes `commission` with the actual amounts credited to each referrer.
- If InspireBank has insufficient reserve for the commission amount, the approval will fail.

**Frontend tasks:**
- Show commission preview in the pending list (`GET /time-deposits/admin/pending`) before approving.
- After approve, display the `commission` from the response (amounts credited).
- Consider showing InspireBank balance before approving large time deposits so admins know there is enough reserve for commission.

### Audit and Reconciliation

- **AgentCommission table** — Each commission credit is stored with `timeDepositId`, `referrerUserId`, `referredClientUserId` (the investor), `amountEnc`, `sharePercent`, `transactionId`.
- **`GET /inspire-bank/ledger`** — filter or search for `CREDIT_FROM_RESERVE` entries related to commission.
- **Transactions API** — filter by `type: "AGENT_COMMISSION"` to list commission payouts per wallet.

---

## Commission Calculation (Reference)

| Step | Formula |
|------|---------|
| Gross commission | Investment Amount × Commission Rate (default 5%) |
| After tax | Gross × (1 − 0.20) |
| 1 referrer | 100% of Commission Credit |
| 2 referrers | 70% / 30% |
| 3 referrers | 70% / 20% / 10% |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| No referrer | No commission; approval succeeds |
| Referrer has no wallet in deposit currency | Wallet is created with 0.00 balance, then commission is credited |
| InspireBank insufficient | Approval fails |
| Referrer deleted before approval | Hierarchy already adjusted; commission goes to remaining referrers |

---

## Related Documentation

- [API-WALLETS-AND-CURRENCY.md](API-WALLETS-AND-CURRENCY.md) — wallet balance and agent commission fields
- [API-REFERRALS.md](API-REFERRALS.md) — referral hierarchy and cascading
- [API-INSPIREBANK-ECONOMIC-FLOW.md](API-INSPIREBANK-ECONOMIC-FLOW.md) — InspireBank and credit from reserve
- [API-REALTIME.md](API-REALTIME.md) — WebSocket events including `WALLET_UPDATE`
