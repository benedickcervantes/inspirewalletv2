# API Documentation: Deposit Requests (Frontend Guide)

Three deposit options are available as **request-only** flows (no bank participation yet). Users submit requests; admins approve or reject.

---

## Admin: Unified Deposit Requests (Recommended)

**`GET /deposit-requests/admin`** — **ADMIN** only.

Returns **all** deposit requests (time deposit, top-up, stock investment) in one call. Supports two dropdown filters. Records are **never deleted** on approve/reject; they stay in the database and remain visible with the correct status filter.

**Query parameters**

| Parameter     | Type   | Required | Description                                                             |
| ------------- | ------ | -------- | ----------------------------------------------------------------------- |
| `status`      | string | No       | `PENDING` \| `APPROVED` \| `REJECTED`. Omit for ALL.                    |
| `requestType` | string | No       | `time_deposit` \| `stock_investment` \| `top_up_balance`. Omit for ALL. |

**Example calls**

| Dropdown 1 (Status) | Dropdown 2 (Type) | Request                                                                  |
| ------------------- | ----------------- | ------------------------------------------------------------------------ |
| ALL                 | ALL               | `GET /deposit-requests/admin`                                            |
| PENDING             | ALL               | `GET /deposit-requests/admin?status=PENDING`                             |
| APPROVED            | TIME DEPOSIT      | `GET /deposit-requests/admin?status=APPROVED&requestType=time_deposit`   |
| REJECTED            | TOP UP            | `GET /deposit-requests/admin?status=REJECTED&requestType=top_up_balance` |

**Response:** Array of deposit requests. Each item includes:

- `id`, `userId`, `user` (firstName, lastName, email)
- `requestType`: `"time_deposit"` \| `"stock_investment"` \| `"top_up_balance"`
- `requestStatus`: `"PENDING"` \| `"APPROVED"` \| `"REJECTED"` (normalized; time deposits map ACTIVE/MATURED → APPROVED, CANCELLED → REJECTED)
- `amount`, `createdAt` (ISO 8601)
- Type-specific fields (e.g. `contractType`, `stockSymbol`, `reference`)

**Important:** Use this unified endpoint for the admin deposit requests page. Do not rely on separate pending-only endpoints; after approve/reject, items will still appear when the matching status filter is selected.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** `Content-Type: application/json` for request bodies
- **Protected routes:** `Authorization: Bearer <access_token>`
- **Validation:** Extra properties in request bodies are rejected (`forbidNonWhitelisted`). Send only the fields documented below.

---

## 1. Time Deposit

See **[API-TIME-DEPOSITS.md](API-TIME-DEPOSITS.md)** for full documentation.

Summary:

- **Create request:** `POST /time-deposits` (user). Body: `{ contractType, amount, walletId?, depositSource?, depositMethod? }` or `{ contractPeriod, amount, walletId? }`. Use `contractType`: `"sixMonths"` | `"oneYear"` | `"twoYears"`, or `contractPeriod`: `"6 Months"` | `"1 Year"` | `"2 Years"`. Use `depositMethod`: `"available_balance"` (default, deduct from wallet) or `"request_amount"` (top-up on approval).
- **Admin list:** Use unified `GET /deposit-requests/admin?requestType=time_deposit` or `GET /time-deposits/admin?status=PENDING|APPROVED|REJECTED` (time deposit only).
- **Admin list pending:** `GET /time-deposits/admin/pending` (ADMIN only) — shortcut for pending only.
- **Admin approve:** `POST /time-deposits/:id/approve` (ADMIN only). Body: `{ notes? }`
- **Admin reject:** `POST /time-deposits/:id/reject` (ADMIN only)

Admin list includes `user` (firstName, lastName, email), `requestType: "time_deposit"`, `requestStatus`, `createdAt` (ISO 8601), and `commission` (for pending).

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

**Top-up create request body** — `POST /deposit-requests/top-up`

| Field       | Type   | Required | Description                                       |
| ----------- | ------ | -------- | ------------------------------------------------- |
| `walletId`  | string | Yes      | Target wallet ID                                  |
| `amount`    | string | Yes      | Decimal (e.g. `"1000.50"`). Max 2 decimal places. |
| `reference` | string | No       | Payment reference (e.g. bank)                     |

**Example request**

```json
{
  "walletId": "clxx...",
  "amount": "1000.50",
  "reference": "Bank transfer ref #123"
}
```

Only these fields are allowed. The backend identifies the user from the JWT (`userId`).

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

**Stock investment create request body** — `POST /deposit-requests/stock-investment`

| Field         | Type   | Required | Description                                       |
| ------------- | ------ | -------- | ------------------------------------------------- |
| `walletId`    | string | Yes      | Source wallet ID                                  |
| `amount`      | string | Yes      | Decimal (e.g. `"5000.00"`). Max 2 decimal places. |
| `stockSymbol` | string | No       | Stock symbol (optional)                           |

**Example request**

```json
{
  "walletId": "clxx...",
  "amount": "5000.00",
  "stockSymbol": "AAPL"
}
```

Only these fields are allowed. The backend identifies the user from the JWT (`userId`).

---

## Approve / Reject request body (optional)

For **top-up** and **stock investment** approve/reject endpoints:

- `POST /deposit-requests/admin/top-up/:id/approve`
- `POST /deposit-requests/admin/top-up/:id/reject`
- `POST /deposit-requests/admin/stock-investment/:id/approve`
- `POST /deposit-requests/admin/stock-investment/:id/reject`

| Field   | Type   | Required | Description                 |
| ------- | ------ | -------- | --------------------------- |
| `notes` | string | No       | Admin notes (max 500 chars) |

**Example**

```json
{
  "notes": "Approved via bank transfer"
}
```

**Note:** Time deposit approve uses `POST /time-deposits/:id/approve` and also accepts `{ notes? }`. See [API-TIME-DEPOSITS.md](API-TIME-DEPOSITS.md).

---

## Troubleshooting

**Items disappear after approve/reject** — Use the unified endpoint `GET /deposit-requests/admin` with the appropriate `status` filter. Records are not deleted; they change status. Use `status=APPROVED` or `status=REJECTED` to see processed requests.

**Only top-up appears** — Call `GET /deposit-requests/admin` (no `requestType` filter) or use `requestType=time_deposit` / `requestType=stock_investment` to include time deposits and stock investments.

**"property X should not exist"** — The API rejects unknown fields. Send only the properties documented in the request body tables. For time deposits, valid fields include `contractType`, `contractPeriod`, `amount`, `walletId`, `depositSource`, and `depositMethod` — see [API-TIME-DEPOSITS.md](API-TIME-DEPOSITS.md).
