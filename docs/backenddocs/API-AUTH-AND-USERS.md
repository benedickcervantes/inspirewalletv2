# API Documentation: Auth, Users & Crypto (Frontend Guide)

This document describes how the frontend should use the **Auth** and **Users** APIs. **Crypto** is used only on the backend (encryption at rest); the frontend does not call any crypto endpoints.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** Send `Content-Type: application/json` for request bodies.
- **Protected routes:** Send the JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** The API uses strict validation. Extra properties in the body are rejected (`forbidNonWhitelisted`). Only send the fields documented below.

---

## Frontend integration notes

- **Auth base path:** All auth routes use `{base}/auth` (e.g. `https://api.example.com/auth/login`). There is no `/api` prefix.
- **No refresh token:** There is no refresh token flow. JWT expiry is configurable (default 7 days). On 401, clear the token and redirect to Login.
- **Unverified email:** Users with `emailVerified: false` can use the app (view balance, transfer, etc.). Email verification is encouraged but not enforced.
- **Referral vs agent:** Use `referralCode` (8 chars, e.g. `ABC12XYZ`) for the referrer field. Do not use `agentNumber` (e.g. `AG12345678`). See [API-REFERRALS.md](API-REFERRALS.md).
- **Forgot password:** Not supported. Hide or disable the Forgot Password UI.

---

## Authentication

All auth endpoints are under the `/auth` prefix.

### 1. Register (Create account)

**`POST /auth/register`**

Creates a new user and returns an access token and user object (you can log the user in immediately).

**Request body**

| Field        | Type   | Required | Validation                          | Description                |
|-------------|--------|----------|-------------------------------------|----------------------------|
| `email`     | string | Yes      | Valid email format                  | Login identifier           |
| `password`  | string | Yes      | Min 8 characters, max 128          | Plain text (sent over HTTPS) |
| `firstName` | string | Yes      | 1–100 characters                   | Given name                 |
| `lastName`  | string | Yes      | 1–100 characters                   | Family name                |
| `middleName`| string | No       | 1–100 characters                   | Middle name                |
| `phone`     | string | No       | Max 30 characters                  | Phone number               |
| `dateOfBirth` | string | No     | ISO 8601 date (e.g. `1990-01-15`)  | Date of birth              |
| `countryCode` | string | No     | Exactly 2 characters (e.g. `US`)  | ISO country code           |
| `referralCode` | string | No    | 4–20 characters                   | Referrer's **referral ID** when signing up via referral link. See [API-REFERRALS.md](API-REFERRALS.md) |
| `companyName` | string | No     | Max 200 characters                | Company name (when user checks "I have a company") |
| `lineAccountLink` | string | No  | Max 500 characters                | LINE Account Link URL (optional) |
| `isAgent`     | boolean | No   |                                   | Whether user is an agent (default: false) |

**Example request**

```json
{
  "email": "jane@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Doe",
  "middleName": "Marie",
  "phone": "+1234567890",
  "dateOfBirth": "1990-05-20",
  "countryCode": "US"
}
```

**Example success response** `201` or `200`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxx...",
    "email": "jane@example.com",
    "accountNumber": "1234 5678 9012",
    "firstName": "Jane",
    "lastName": "Doe",
    "middleName": "Marie",
    "status": "ACTIVE",
    "role": "USER",
    "emailVerified": false,
    "hasPasscode": false,
    "companyName": null,
    "lineAccountLink": null,
    "isAgent": false
  }
}
```

After registration, an **OTP verification email** is sent to the user's email address. Users can verify by either:
1. Typing the 6-digit OTP via `POST /auth/verify-email`, or
2. Clicking the verification link in the email (for users who prefer not to type the OTP). The link goes to your frontend; the frontend calls `POST /auth/verify-email-link` with the `token` from the URL.

Each new user is assigned a unique **12-digit account number** (displayed as `XXXX XXXX XXXX`). Use it for receiving transfers and sharing with others.

Each user also receives a unique **referral ID** (8 characters, e.g. `ABC12XYZ`) for the referral system. New users can include a referrer's ID in `referralCode` when registering. See **[API-REFERRALS.md](API-REFERRALS.md)**.

**Error responses**

- **409 Conflict** – Email already registered  
  ```json
  { "statusCode": 409, "message": "User with this email already exists", "error": "Conflict" }
  ```
- **400 Bad Request** – Validation failed (invalid or missing fields)  
  ```json
  {
    "statusCode": 400,
    "message": ["password must be longer than or equal to 8 characters", "..."],
    "error": "Bad Request"
  }
  ```

---

### 2. Verify email (OTP)

**`POST /auth/verify-email`**

Verifies the user's email address using the 6-digit OTP sent during registration. Sets `emailVerified` to `true` on success.

**Request body**

| Field  | Type   | Required | Validation        |
|--------|--------|----------|-------------------|
| `email`| string | Yes      | Valid email       |
| `otp`  | string | Yes      | Exactly 6 digits  |

**Example request**

```json
{
  "email": "jane@example.com",
  "otp": "123456"
}
```

**Example success response** `200`

```json
{
  "message": "Email verified successfully"
}
```

**Error responses**

- **400 Bad Request** – Invalid email, invalid OTP, or OTP expired  
  ```json
  { "statusCode": 400, "message": "Invalid email or OTP", "error": "Bad Request" }
  ```
  ```json
  { "statusCode": 400, "message": "OTP has expired. Please request a new one.", "error": "Bad Request" }
  ```

---

### 3. Verify email (link)

**Option A: `GET /auth/verify-email-link?token=xxx`** — Direct link (recommended)

When the user clicks the verification link in the email, they go directly to the backend. No frontend needed. Set `VERIFY_EMAIL_LINK_BASE_URL` or `APP_URL` in `.env`:

- `APP_URL=http://localhost:3000` → link = `http://localhost:3000/auth/verify-email-link?token=xxx`
- Prod: `APP_URL=https://api.yourdomain.com`

The backend returns an HTML page: "Email verified successfully" or "Verification failed".

---

**Option B: `POST /auth/verify-email-link`** — For frontend that calls API

If the link points to your frontend, the frontend extracts the token and calls this endpoint.

**Request body**

| Field   | Type   | Required | Validation |
|---------|--------|----------|------------|
| `token` | string | Yes      | Token from the verification link URL query param |

**Example request**

```json
{
  "token": "a1b2c3d4e5f6..."
}
```

**Example success response** `200`

```json
{
  "message": "Email verified successfully"
}
```

**Error responses**

- **400 Bad Request** – Invalid or expired link  
  ```json
  { "statusCode": 400, "message": "Invalid or expired verification link", "error": "Bad Request" }
  ```
  ```json
  { "statusCode": 400, "message": "Verification link has expired. Please request a new one.", "error": "Bad Request" }
  ```

---

### 4. Resend verification

**`POST /auth/resend-verification`**

Sends a new OTP verification email. Use when the user did not receive the email or the OTP expired.

**Request body**

| Field   | Type   | Required | Validation  |
|---------|--------|----------|-------------|
| `email` | string | Yes      | Valid email |

**Example request**

```json
{
  "email": "jane@example.com"
}
```

**Example success response** `200`

```json
{
  "message": "Verification email sent"
}
```

The email includes both the OTP and a verification link (`{{verify_link}}`). Both expire after a configurable period (default 10 minutes; set `VERIFY_LINK_EXPIRY_MINUTES` in `.env`). Use `{{expiry_minutes}}` in the email template (e.g. "This link expires in {{expiry_minutes}} minutes"). Set `VERIFY_EMAIL_LINK_BASE_URL` or `APP_URL` for the link to be included.

If the email is not registered or already verified, a generic success message is returned to avoid email enumeration.

---

### 5. Login

**`POST /auth/login`**

Authenticates with email and password and returns an access token and user object.

**Request body**

| Field      | Type   | Required | Validation     |
|-----------|--------|----------|----------------|
| `email`   | string | Yes      | Valid email    |
| `password`| string | Yes      | Non-empty      |

**Example request**

```json
{
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

**Example success response** `200`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxx...",
    "email": "jane@example.com",
    "accountNumber": "1234 5678 9012",
    "firstName": "Jane",
    "lastName": "Doe",
    "middleName": "Marie",
    "status": "ACTIVE",
    "role": "USER",
    "hasPasscode": false,
    "companyName": null,
    "lineAccountLink": null,
    "isAgent": false
  }
}
```

**Error responses**

- **401 Unauthorized** – Invalid email or password  
  ```json
  { "statusCode": 401, "message": "Invalid email or password", "error": "Unauthorized" }
  ```
- **400 Bad Request** – Validation failed (e.g. missing email/password)

---

### 6. Get current user (Me)

**`GET /auth/me`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>`.

Returns the profile of the authenticated user.

**Request**

- No body.
- Headers: `Authorization: Bearer <access_token>`.

**Example success response** `200`

```json
{
  "id": "clxx...",
  "email": "jane@example.com",
  "accountNumber": "1234 5678 9012",
  "firstName": "Jane",
  "lastName": "Doe",
  "middleName": "Marie",
  "status": "ACTIVE",
  "role": "USER",
  "hasPasscode": false,
  "companyName": null,
  "lineAccountLink": null,
  "isAgent": false
}
```

`role` is one of `USER`, `ADMIN`, or `PAYMENT_SERVICE`. Use it to gate admin-only UI (e.g. admin portal) or to verify the user can access admin endpoints.

The `hasPasscode` field indicates whether the user has set a 4-digit passcode. If `true`, the frontend should prompt for the passcode when performing sensitive operations (transfers, profile updates, beneficiary changes). See **[API-PASSCODE.md](API-PASSCODE.md)** for details.

**Error responses**

- **401 Unauthorized** – Missing or invalid/expired token  
  ```json
  { "statusCode": 401, "message": "Unauthorized" }
  ```

---

### 7. Update profile

**`PATCH /auth/profile`**  
**Protected:** Yes.

Updates the authenticated user's profile. All body fields are optional; only provided fields are updated. When the user has a passcode set, `passcode` must be included for verification.

**Request body**

| Field        | Type   | Required | Validation                     | Description                |
|-------------|--------|----------|--------------------------------|----------------------------|
| `firstName` | string | No       | 1–100 characters               | Given name                 |
| `lastName`  | string | No       | 1–100 characters               | Family name                |
| `middleName`| string | No       | 1–100 characters               | Middle name                |
| `phone`     | string | No       | Max 30 characters              | Phone number               |
| `dateOfBirth` | string | No     | ISO 8601 date (e.g. `1990-01-15`) | Date of birth           |
| `countryCode` | string | No     | Exactly 2 characters (e.g. `US`) | ISO country code        |
| `passcode`  | string | Conditional | Exactly 4 digits (0–9)     | Required when user has passcode set |

**Example request**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "middleName": "Marie",
  "passcode": "1234"
}
```

**Example success response** `200`

Same shape as `GET /auth/me` (including `hasPasscode`).

**Error responses**

- **400 Bad Request** – Passcode required but missing or incorrect (when user has passcode set)  
  ```json
  { "statusCode": 400, "message": "Passcode is required for this operation. Set a passcode first or provide your current passcode.", "error": "Bad Request" }
  ```
  ```json
  { "statusCode": 400, "message": "Passcode is incorrect", "error": "Bad Request" }
  ```
- **401 Unauthorized** – Missing or invalid/expired token  

---

### 8. Verify passcode

**`POST /auth/verify-passcode`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>`.

Verifies the user's 4-digit passcode. Use for the app-entry gate: after login, if the user has a passcode set, prompt for it before granting access to the main app. When correct, returns success; when wrong or user has no passcode, returns 400.

**Request body**

| Field      | Type   | Required | Validation        |
|-----------|--------|----------|-------------------|
| `passcode`| string | Yes      | Exactly 4 digits (0–9) |

**Example request**

```json
{
  "passcode": "1234"
}
```

**Example success response** `200`

```json
{
  "message": "Passcode verified"
}
```

**Error responses**

- **400 Bad Request** – User has no passcode set  
  ```json
  { "statusCode": 400, "message": "No passcode set. Set a passcode first.", "error": "Bad Request" }
  ```
- **400 Bad Request** – Passcode is incorrect  
  ```json
  { "statusCode": 400, "message": "Passcode is incorrect", "error": "Bad Request" }
  ```
- **401 Unauthorized** – Missing or invalid/expired token  

---

### 9. Passcode

Each user can optionally set a **4-digit passcode** for additional security. See **[API-PASSCODE.md](API-PASSCODE.md)** for full documentation of:

- `POST /auth/passcode` – Set passcode
- `PATCH /auth/passcode` – Update passcode
- `DELETE /auth/passcode` – Remove passcode

All passcode endpoints require JWT authentication. The passcode is encrypted at rest.

---

## User object (from Auth)

The **user** object returned by register, login, `GET /auth/me`, and `PATCH /auth/profile` has the same shape:

| Field          | Type    | Description                                              |
|----------------|---------|----------------------------------------------------------|
| `id`           | string  | Unique user ID (cuid)                                   |
| `email`        | string  | Email address                                           |
| `accountNumber`| string  | 12-digit account number, formatted as **XXXX XXXX XXXX** (e.g. `1234 5678 9012`). Unique per user; use for receiving transfers and sharing with others. |
| `firstName`    | string  | First name                                              |
| `lastName`     | string  | Last name                                               |
| `middleName`   | string \| null | Middle name (optional)                        |
| `status`       | string  | One of: `PENDING`, `ACTIVE`, `SUSPENDED`                |
| `role`         | string  | One of: `USER`, `ADMIN`, `PAYMENT_SERVICE`              |
| `emailVerified`| boolean | Whether the user has verified their email via OTP. New users receive an OTP email; call `POST /auth/verify-email` to verify. |
| `hasPasscode`  | boolean | Whether the user has set a 4-digit passcode. Use to decide when to prompt for passcode on transfers, profile updates, etc. |
| `companyName`  | string \| null | Company name (optional)                      |
| `lineAccountLink` | string \| null | LINE Account Link URL (optional)         |
| `isAgent`      | boolean | Whether the user is an agent (default: false)           |

Every user (new and existing) has an account number. New users receive one at registration; existing users were backfilled via migration.

To show or update profile, use `GET /auth/me` and `PATCH /auth/profile`. Sensible fields (e.g. phone, dateOfBirth, countryCode) are stored and encrypted on the backend; include them in the profile update body to change them.

---

## Admin endpoints (Users API)

These endpoints are under `/users` and require JWT authentication with **ADMIN** role.

### List users

**`GET /users`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` and **ADMIN** role.

Returns a paginated list of users with decrypted PII. Supports search by email and filters.

**Query parameters**

| Param   | Type    | Required | Description                                      |
|---------|---------|----------|--------------------------------------------------|
| `page`  | number  | No       | Page number (default: 1)                         |
| `limit` | number  | No       | Items per page, 1–100 (default: 20)              |
| `search`| string  | No       | Partial match on email (case-insensitive)        |
| `status`| string  | No       | Filter by status: `PENDING`, `ACTIVE`, `SUSPENDED` |
| `agent` | boolean | No       | Filter by agent: `true` or `false`               |

**Example request**

```http
GET /users?page=1&limit=20&search=jane&status=ACTIVE
Authorization: Bearer <access_token>
```

**Example success response** `200`

```json
{
  "users": [
    {
      "id": "clxx...",
      "email": "jane@example.com",
      "accountNumber": "1234 5678 9012",
      "firstName": "Jane",
      "lastName": "Doe",
      "middleName": "Marie",
      "status": "ACTIVE",
      "role": "USER",
      "emailVerified": true,
      "isAgent": false,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Error responses**

- **401 Unauthorized** – Missing or invalid/expired token
- **403 Forbidden** – Caller does not have ADMIN role

---

### Delete user

**`DELETE /users/:id`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` and **ADMIN** role.

Permanently deletes a user. Referral cascading: users who had this user as referrer are reparented to the deleted user's referrer (grandparent). Wallets and beneficiaries are removed via cascade. See [API-REFERRALS.md](API-REFERRALS.md) for details.

**Request**

- **URL param:** `id` — user ID (cuid) to delete.
- **Headers:** `Authorization: Bearer <access_token>` (admin JWT).

**Example success response** `200`

```json
{
  "success": true
}
```

**Error responses**

- **401 Unauthorized** – Missing or invalid/expired token, or caller is not ADMIN  
  ```json
  { "statusCode": 401, "message": "Unauthorized" }
  ```
- **403 Forbidden** – Caller does not have ADMIN role  
  ```json
  { "statusCode": 403, "message": "Forbidden resource", "error": "Forbidden" }
  ```
- **404 Not Found** – User does not exist  
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  ```

---

### Delete user by account number

**`DELETE /users/by-account-number/:accountNumber`**  
**Protected:** Yes — requires `Authorization: Bearer <access_token>` and **ADMIN** role.

Permanently deletes a user identified by their 12-digit account number. Same cascade as `DELETE /users/:id`: removes the user, wallets, beneficiaries, time deposits, top-up requests, stock investment requests, and email verification OTPs. Referrals are reparented to the grandparent. See [API-REFERRALS.md](API-REFERRALS.md) for details.

**Request**

- **URL param:** `accountNumber` — 12-digit account number, with or without spaces (e.g. `6381 4540 6439` or `638145406439`).
- **Headers:** `Authorization: Bearer <access_token>` (admin JWT).

**Example**

```http
DELETE /users/by-account-number/6381%204540%206439
Authorization: Bearer <access_token>
```

**Example success response** `200`

```json
{
  "success": true
}
```

**Error responses**

- **404 Not Found** – No user found with the given account number.
- **401 Unauthorized** – Missing or invalid/expired token, or caller is not ADMIN.
- **403 Forbidden** – Caller does not have ADMIN role.

---

## Direct InspireBank Deposit (Admin Only)

**`POST /deposits/by-account-number`** — Credit a user's main PHP wallet by account number (e.g. `"0196 8487 2308"`). See **[API-INSPIREBANK-ECONOMIC-FLOW.md](API-INSPIREBANK-ECONOMIC-FLOW.md)** for full request/response details.

---

## Deposit Requests (Time Deposit, Stock Investment, Top Up)

Three deposit options are available as **request-only** flows (no bank participation yet). Users submit requests; admins approve or reject.

### 1. Time Deposit (existing)

- **Create request:** `POST /time-deposits` (user) — creates PENDING time deposit
- **Admin list pending:** `GET /time-deposits/admin/pending` (ADMIN only)
- **Admin approve:** `POST /time-deposits/:id/approve` (ADMIN only)
- **Admin reject:** `POST /time-deposits/:id/reject` (ADMIN only)

### 2. Top Up Available Balance

- **Create request:** `POST /deposit-requests/top-up` (user)
- **List own:** `GET /deposit-requests/top-up` (user)
- **Get one:** `GET /deposit-requests/top-up/:id` (user)
- **Admin list pending:** `GET /deposit-requests/admin/top-up/pending` (ADMIN only)
- **Admin approve:** `POST /deposit-requests/admin/top-up/:id/approve` (ADMIN only)
- **Admin reject:** `POST /deposit-requests/admin/top-up/:id/reject` (ADMIN only)

**Top-up request body**

| Field       | Type   | Required | Description                    |
|------------|--------|----------|--------------------------------|
| `walletId` | string | Yes      | Target wallet ID               |
| `amount`   | string | Yes      | Decimal (e.g. `"1000.50"`)     |
| `reference`| string | No       | Payment reference (e.g. bank)  |

### 3. Stock Investment

- **Create request:** `POST /deposit-requests/stock-investment` (user)
- **List own:** `GET /deposit-requests/stock-investment` (user)
- **Get one:** `GET /deposit-requests/stock-investment/:id` (user)
- **Admin list pending:** `GET /deposit-requests/admin/stock-investment/pending` (ADMIN only)
- **Admin approve:** `POST /deposit-requests/admin/stock-investment/:id/approve` (ADMIN only)
- **Admin reject:** `POST /deposit-requests/admin/stock-investment/:id/reject` (ADMIN only)

**Stock investment request body**

| Field        | Type   | Required | Description           |
|-------------|--------|----------|-----------------------|
| `walletId`  | string | Yes      | Source wallet ID      |
| `amount`    | string | Yes      | Decimal (e.g. `"5000"`) |
| `stockSymbol` | string | No     | Stock symbol (optional) |

**Approve/Reject body (optional)**

| Field  | Type   | Description              |
|--------|--------|--------------------------|
| `notes`| string | Admin notes (max 500 chars) |

---

## Crypto (backend only)

- **Encryption** is applied on the backend only (per-user key derivation and AES-256-GCM for PII).
- The frontend **does not** call any crypto endpoints and **does not** send encrypted data.
- Send and receive **plain JSON**; the backend encrypts/decrypts stored PII (e.g. name, phone, dateOfBirth, countryCode) transparently.

---

## Typical frontend flow

1. **Register:** `POST /auth/register` with email, password, firstName, lastName (and optional fields: middleName, phone, dateOfBirth, countryCode). Store `access_token` and optionally `user` (e.g. in memory, secure storage, or auth context).
2. **Login:** `POST /auth/login` with email and password. Store `access_token` and optionally `user`.
3. **Authenticated requests:** For any protected route, send `Authorization: Bearer <access_token>`.
4. **Current user:** Call `GET /auth/me` with the stored token to get the latest profile (e.g. on app load or after token refresh).

Token expiry is configured on the backend (e.g. 7 days). When the backend returns **401** on a protected route, clear the stored token and redirect the user to login (or trigger refresh if you add a refresh flow later).
