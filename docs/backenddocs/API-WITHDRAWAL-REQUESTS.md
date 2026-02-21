# API Documentation: Withdrawal Requests (Frontend Guide)

Users submit withdrawal requests (Local Bank or E-Wallet); admins approve or reject. On approval, the backend debits the user's wallet and records the transaction. The requesting user (`userId`) is stored with each request.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or `EXPO_PUBLIC_WALLET_BACKEND_URL` from the frontend)
- **Content-Type:** Send `Content-Type: application/json` for request bodies.
- **Protected routes:** Send the JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** The API uses strict validation. Extra properties in the body are rejected (`forbidNonWhitelisted`). Only send the fields documented below.

---

## Frontend integration notes

- **Auth:** Obtain JWT via `POST /auth/login`. The backend identifies `userId` from the JWT.
- **Wallet ID:** The frontend must obtain `walletId` (e.g. via `GET /wallets` or `POST /wallets/main`) before submitting a withdrawal request. This is the source wallet to debit on approval.
- **Firebase migration:** The frontend currently submits to Firebase Firestore (`withdrawalRequests` collection). When integrated with the backend, the frontend will call these endpoints instead.

---

## Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/withdrawal-requests` | USER | Create withdrawal request |
| GET | `/withdrawal-requests` | USER | List own requests |
| GET | `/withdrawal-requests/:id` | USER | Get one request |
| GET | `/withdrawal-requests/admin` | ADMIN | List all (optional `?status=PENDING\|APPROVED\|REJECTED`) |
| GET | `/withdrawal-requests/admin/pending` | ADMIN | List pending only |
| POST | `/withdrawal-requests/admin/:id/approve` | ADMIN | Approve (triggers actual withdrawal) |
| POST | `/withdrawal-requests/admin/:id/reject` | ADMIN | Reject |

---

## 1. Create withdrawal request

**`POST /withdrawal-requests`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` (USER role).

Creates a new withdrawal request with status `PENDING`. The wallet is **not** debited until an admin approves.

### Request body (Local Bank)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `walletId` | string | Yes | Non-empty | Source wallet to debit on approval |
| `amount` | string | Yes | Decimal, up to 2 places (e.g. `"1000.50"`) | Amount to withdraw |
| `method` | string | Yes | `"local_bank"` | Withdrawal method |
| `email` | string | No | Valid email | Contact email (user may override) |
| `accountNumber` | string | Yes | 1–50 chars | Bank account number |
| `accountHolderName` | string | Yes | 1–200 chars | Account holder name |
| `bankName` | string | Yes | 1–200 chars | Bank name |
| `branchName` | string | No | Max 200 chars | Branch name (optional) |

### Request body (E-Wallet)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `walletId` | string | Yes | Non-empty | Source wallet to debit on approval |
| `amount` | string | Yes | Decimal, up to 2 places (e.g. `"500.00"`) | Amount to withdraw |
| `method` | string | Yes | `"e_wallet"` | Withdrawal method |
| `email` | string | No | Valid email | Contact email (user may override) |
| `walletType` | string | Yes | `"gcash"` or `"maya"` | E-wallet provider |
| `accountNumber` | string | Yes | 1–20 chars | E-wallet account / mobile number |
| `accountName` | string | Yes | 1–200 chars | Name registered with e-wallet |

### Example request (Local Bank)

```json
{
  "walletId": "clxx1234567890abcdef",
  "amount": "1000.50",
  "method": "local_bank",
  "email": "jane@example.com",
  "accountNumber": "1234567890",
  "accountHolderName": "Jane Doe",
  "bankName": "BDO Unibank",
  "branchName": "Makati Branch"
}
```

### Example request (E-Wallet)

```json
{
  "walletId": "clxx1234567890abcdef",
  "amount": "500.00",
  "method": "e_wallet",
  "email": "jane@example.com",
  "walletType": "gcash",
  "accountNumber": "09171234567",
  "accountName": "Jane Doe"
}
```

### Example success response `201`

```json
{
  "id": "clxx...",
  "userId": "clxx...",
  "walletId": "clxx...",
  "currencyId": "clxx...",
  "method": "local_bank",
  "amount": "1000.50",
  "status": "PENDING",
  "accountNumber": "1234567890",
  "accountHolderName": "Jane Doe",
  "bankName": "BDO Unibank",
  "branchName": "Makati Branch",
  "adminNotes": null,
  "reviewedAt": null,
  "reviewedById": null,
  "createdAt": "2026-02-21T12:00:00.000Z",
  "updatedAt": "2026-02-21T12:00:00.000Z"
}
```

For E-Wallet, `walletType`, `accountNumber`, and `accountName` are returned instead of bank fields.

### Error responses

- **400 Bad Request** – Validation failed (invalid or missing fields)
  ```json
  {
    "statusCode": 400,
    "message": ["amount must be a decimal with up to 2 places", "method must be one of: local_bank, e_wallet"],
    "error": "Bad Request"
  }
  ```
- **404 Not Found** – Wallet not found or not owned by user
  ```json
  { "statusCode": 404, "message": "Wallet not found", "error": "Not Found" }
  ```
- **400 Bad Request** – Insufficient balance (validation at creation optional; can be checked on approval)
- **401 Unauthorized** – Missing or invalid token

---

## 2. List own withdrawal requests

**`GET /withdrawal-requests`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` (USER role).

Returns all withdrawal requests for the authenticated user.

### Example success response `200`

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "walletId": "clxx...",
    "currencyId": "clxx...",
    "method": "local_bank",
    "amount": "1000.50",
    "status": "PENDING",
    "accountNumber": "1234567890",
    "accountHolderName": "Jane Doe",
    "bankName": "BDO Unibank",
    "branchName": "Makati Branch",
    "adminNotes": null,
    "reviewedAt": null,
    "createdAt": "2026-02-21T12:00:00.000Z",
    "updatedAt": "2026-02-21T12:00:00.000Z"
  }
]
```

---

## 3. Get one withdrawal request

**`GET /withdrawal-requests/:id`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` (USER role).

Returns a single withdrawal request by ID. User can only access their own requests.

### Example success response `200`

Same shape as a single item in the list response above.

### Error responses

- **404 Not Found** – Request not found or not owned by user
  ```json
  { "statusCode": 404, "message": "Withdrawal request not found", "error": "Not Found" }
  ```
- **401 Unauthorized** – Missing or invalid token

---

## 4. Admin: List all withdrawal requests

**`GET /withdrawal-requests/admin`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` and **ADMIN** role.

Returns all withdrawal requests. Optional query param to filter by status.

### Query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter: `PENDING`, `APPROVED`, or `REJECTED`. Omit to return all. |

### Example request

```http
GET /withdrawal-requests/admin?status=PENDING
Authorization: Bearer <access_token>
```

### Example success response `200`

Same shape as list own, but includes requests from all users. Each item includes a nested `user` object:

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "walletId": "clxx...",
    "currencyId": "clxx...",
    "method": "local_bank",
    "amount": "1000.50",
    "status": "PENDING",
    "accountNumber": "1234567890",
    "accountHolderName": "Jane Doe",
    "bankName": "BDO Unibank",
    "branchName": "Makati Branch",
    "adminNotes": null,
    "reviewedAt": null,
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

### Error responses

- **401 Unauthorized** – Missing or invalid token
- **403 Forbidden** – Caller does not have ADMIN role

---

## 5. Admin: List pending withdrawal requests

**`GET /withdrawal-requests/admin/pending`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` and **ADMIN** role.

Returns only withdrawal requests with status `PENDING`. Same response shape as list all (includes `user` object).

### Error responses

- **401 Unauthorized** – Missing or invalid token
- **403 Forbidden** – Caller does not have ADMIN role

---

## 6. Admin: Approve withdrawal request

**`POST /withdrawal-requests/admin/:id/approve`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` and **ADMIN** role.

Approves the withdrawal request and **triggers the actual withdrawal** (debit wallet via `POST /withdrawals` logic, InspireBank ledger entry). Status is updated to `APPROVED`.

### Request body (optional)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `notes` | string | No | Max 500 chars | Admin notes (stored in `adminNotes`) |

### Example request

```json
{
  "notes": "Approved and processed"
}
```

### Example success response `200`

Returns the updated withdrawal request with `status: "APPROVED"`, `reviewedAt` and `reviewedById` populated.

### Error responses

- **404 Not Found** – Request not found
  ```json
  { "statusCode": 404, "message": "Withdrawal request not found", "error": "Not Found" }
  ```
- **400 Bad Request** – Request is not PENDING (already approved or rejected)
  ```json
  { "statusCode": 400, "message": "Withdrawal request is not pending", "error": "Bad Request" }
  ```
- **400 Bad Request** – Insufficient balance in wallet
  ```json
  { "statusCode": 400, "message": "Insufficient balance", "error": "Bad Request" }
  ```
- **401 Unauthorized** – Missing or invalid token
- **403 Forbidden** – Caller does not have ADMIN role

---

## 7. Admin: Reject withdrawal request

**`POST /withdrawal-requests/admin/:id/reject`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` and **ADMIN** role.

Rejects the withdrawal request. Status is updated to `REJECTED`. No debit occurs.

### Request body (optional)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `notes` | string | No | Max 500 chars | Admin notes (reason for rejection, stored in `adminNotes`) |

### Example request

```json
{
  "notes": "Unable to verify account details"
}
```

### Example success response `200`

Returns the updated withdrawal request with `status: "REJECTED"`, `reviewedAt` and `reviewedById` populated.

### Error responses

- **404 Not Found** – Request not found
- **400 Bad Request** – Request is not PENDING
- **401 Unauthorized** – Missing or invalid token
- **403 Forbidden** – Caller does not have ADMIN role

---

## Flow diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Frontend                                                                     │
│   User fills form (Local Bank or E-Wallet) → POST /withdrawal-requests       │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Backend                                                                      │
│   WithdrawalRequestService.create → Save PENDING                              │
│   Admin lists pending → GET /withdrawal-requests/admin/pending                │
│   Admin approve/reject → POST .../approve or .../reject                       │
│   On approve: call existing POST /withdrawals (debit wallet, InspireBank)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Reference: Request format JSON files

The exact request payload contract for the frontend is defined in:

- [docs/request-formats/withdrawal-request-local-bank.json](request-formats/withdrawal-request-local-bank.json)
- [docs/request-formats/withdrawal-request-e-wallet.json](request-formats/withdrawal-request-e-wallet.json)
