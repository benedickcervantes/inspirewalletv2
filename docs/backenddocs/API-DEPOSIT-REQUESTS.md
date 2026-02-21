# API Documentation: Deposit Requests (Frontend Guide)

Three deposit options are available as **request-only** flows (no bank participation yet). Users submit requests; admins approve or reject.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** `Content-Type: application/json` for request bodies
- **Protected routes:** `Authorization: Bearer <access_token>`

---

## 1. Time Deposit

- **Create request:** `POST /time-deposits` (user) — creates PENDING time deposit
- **Admin list all:** `GET /time-deposits/admin` (ADMIN only) — returns all time deposits (pending, approved, rejected). Same response shape as list pending. *Frontend falls back to `/pending` if this returns 404.*
- **Admin list pending:** `GET /time-deposits/admin/pending` (ADMIN only)
- **Admin approve:** `POST /time-deposits/:id/approve` (ADMIN only) — updates status to APPROVED/COMPLETED; record is not deleted
- **Admin reject:** `POST /time-deposits/:id/reject` (ADMIN only) — updates status to REJECTED; record is not deleted

**Time deposit request body**

| Field         | Type   | Required | Description                                               |
|---------------|--------|----------|-----------------------------------------------------------|
| `amount`      | string | Yes      | Decimal (e.g. `"50000.00"`)                               |
| `contractPeriod` | string | Yes   | e.g. `"6 Months"`, `"1 Year"`, `"2 Years"`                |
| `depositMethod`  | string | Yes   | `"Request Amount"` or `"Available Balance"`               |
| `walletId`    | string | Conditional | Required when `depositMethod` is `"Available Balance"` |

Only these fields are allowed. The backend identifies the user from the JWT (`userId`) and joins with the User table to populate `user` (firstName, lastName, email) in admin list responses.

**Admin list pending response** — Each item includes a nested `user` object with decrypted PII:

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "contractType": "oneYear",
    "amount": "50000",
    "interestRate": "5.25",
    "status": "PENDING",
    "startDate": null,
    "maturityDate": null,
    "projectedStartDate": "2026-02-21",
    "projectedMaturityDate": "2027-02-21",
    "payoutSchedule": [...],
    "user": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  }
]
```

---

## 2. Top Up Available Balance

- **Create request:** `POST /deposit-requests/top-up` (user)
- **List own:** `GET /deposit-requests/top-up` (user)
- **Get one:** `GET /deposit-requests/top-up/:id` (user)
- **Admin list all:** `GET /deposit-requests/admin/top-up` (ADMIN only) — returns all top-up requests. Optional query: `?status=PENDING|APPROVED|REJECTED` to filter. Omit to return all. Same response shape as list pending (includes `user` and `requestType`).
- **Admin list pending:** `GET /deposit-requests/admin/top-up/pending` (ADMIN only) — shortcut for pending only
- **Admin approve:** `POST /deposit-requests/admin/top-up/:id/approve` (ADMIN only) — updates status; record is not deleted
- **Admin reject:** `POST /deposit-requests/admin/top-up/:id/reject` (ADMIN only) — updates status; record is not deleted

**Admin list pending response** — Each item includes a nested `user` object and `requestType`:

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "walletId": "clxx...",
    "currencyId": "clxx...",
    "amount": "1000",
    "reference": "...",
    "status": "PENDING",
    "adminNotes": null,
    "reviewedAt": null,
    "createdAt": "2026-02-21T12:00:00.000Z",
    "requestType": "top_up_balance",
    "user": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  }
]
```

**Top-up request body**

| Field       | Type   | Required | Description                    |
|------------|--------|----------|--------------------------------|
| `walletId` | string | Yes      | Target wallet ID               |
| `amount`   | string | Yes      | Decimal (e.g. `"1000.50"`)     |
| `reference`| string | No       | Payment reference (e.g. bank)  |

Only these fields are allowed. The backend identifies the user from the JWT (`userId`) and joins with the User table to populate `user` (firstName, lastName, email) in admin list responses.

---

## 3. Stock Investment

- **Create request:** `POST /deposit-requests/stock-investment` (user)
- **List own:** `GET /deposit-requests/stock-investment` (user)
- **Get one:** `GET /deposit-requests/stock-investment/:id` (user)
- **Admin list all:** `GET /deposit-requests/admin/stock-investment` (ADMIN only) — returns all stock investment requests. Optional query: `?status=PENDING|APPROVED|REJECTED` to filter. Omit to return all. Same response shape as list pending (includes `user` and `requestType`).
- **Admin list pending:** `GET /deposit-requests/admin/stock-investment/pending` (ADMIN only) — shortcut for pending only
- **Admin approve:** `POST /deposit-requests/admin/stock-investment/:id/approve` (ADMIN only) — updates status; record is not deleted
- **Admin reject:** `POST /deposit-requests/admin/stock-investment/:id/reject` (ADMIN only) — updates status; record is not deleted

**Admin list pending response** — Same shape as top-up; each item includes `user` and `requestType: "stock_investment"`:

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "walletId": "clxx...",
    "currencyId": "clxx...",
    "amount": "5000",
    "stockSymbol": "AAPL",
    "status": "PENDING",
    "adminNotes": null,
    "reviewedAt": null,
    "createdAt": "2026-02-21T12:00:00.000Z",
    "requestType": "stock_investment",
    "user": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  }
]
```

**Stock investment request body**

| Field        | Type   | Required | Description           |
|-------------|--------|----------|-----------------------|
| `walletId`  | string | Yes      | Source wallet ID      |
| `amount`    | string | Yes      | Decimal (e.g. `"5000"`) |
| `stockSymbol` | string | No     | Stock symbol (optional) |

Only these fields are allowed. The backend identifies the user from the JWT (`userId`) and joins with the User table to populate `user` (firstName, lastName, email) in admin list responses.

---

## Approve/Reject body (optional)

For all deposit request types:

| Field  | Type   | Description              |
|--------|--------|--------------------------|
| `notes`| string | Admin notes (max 500 chars) |
