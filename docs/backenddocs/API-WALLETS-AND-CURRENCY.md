# API Documentation: Wallets & Currency (Frontend Guide)

This document describes how the frontend should use the **Wallets** API. Wallets hold user balances per currency. The default currency is **PHP** (Philippine Peso). Balance and currency display data are encrypted at rest on the backend; the frontend sends and receives **plain JSON**.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** Send `Content-Type: application/json` for request bodies.
- **Protected routes:** All wallet endpoints require the JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** Request bodies use strict validation. Only send the fields documented below.

---

## Wallets

All wallet endpoints are under the `/wallets` prefix. Every wallet belongs to the authenticated user; you cannot access another user’s wallets.

### 1. List my wallets

**`GET /wallets`**  
**Protected:** Yes.

Returns all wallets for the authenticated user. Each wallet includes decrypted balance and currency (name, symbol).

**Request**

- No body.
- Headers: `Authorization: Bearer <access_token>`.

**Example success response** `200`

```json
[
  {
    "id": "clxx...",
    "userId": "clxx...",
    "currencyId": "clxx...",
    "balance": "0.00",
    "status": "ACTIVE",
    "createdAt": "2026-02-18T00:00:00.000Z",
    "updatedAt": "2026-02-18T00:00:00.000Z",
    "currency": {
      "id": "clxx...",
      "code": "PHP",
      "name": "Philippine Peso",
      "symbol": "₱",
      "createdAt": "2026-02-18T00:00:00.000Z",
      "updatedAt": "2026-02-18T00:00:00.000Z"
    }
  }
]
```

**Error responses**

- **401 Unauthorized** – Missing or invalid/expired token  
  ```json
  { "statusCode": 401, "message": "Unauthorized" }
  ```

---

### 2. Get or create main wallet (PHP)

**`POST /wallets/main`**  
**Protected:** Yes.

Idempotent: returns the user’s main (PHP) wallet, creating it if it doesn’t exist. Use this after login to ensure the user has a wallet before showing balance or doing transfers.

**Request**

- No body.
- Headers: `Authorization: Bearer <access_token>`.

**Example success response** `200` or `201`

```json
{
  "id": "clxx...",
  "userId": "clxx...",
  "currencyId": "clxx...",
  "balance": "0.00",
  "status": "ACTIVE",
  "createdAt": "2026-02-18T00:00:00.000Z",
  "updatedAt": "2026-02-18T00:00:00.000Z",
  "currency": {
    "id": "clxx...",
    "code": "PHP",
    "name": "Philippine Peso",
    "symbol": "₱",
    "createdAt": "2026-02-18T00:00:00.000Z",
    "updatedAt": "2026-02-18T00:00:00.000Z"
  }
}
```

**Error responses**

- **401 Unauthorized** – Missing or invalid/expired token

---

### 3. Create a wallet (e.g. another currency)

**`POST /wallets`**  
**Protected:** Yes.

Creates a new wallet for the authenticated user. Default currency is PHP. A user can have at most one wallet per currency (e.g. one PHP, one USD).

**Request body**

| Field           | Type   | Required | Validation                              | Description                          |
|----------------|--------|----------|-----------------------------------------|--------------------------------------|
| `currencyCode` | string | No       | 3-letter ISO code (e.g. `PHP`, `USD`)   | Default: `PHP`                       |
| `initialBalance` | string | No     | Decimal, up to 2 decimal places         | Default: `0.00`                      |
| `status`       | string | No       | One of: `ACTIVE`, `FROZEN`, `CLOSED`    | Default: `ACTIVE`                    |

**Example request (default PHP wallet)**

```json
{}
```

**Example request (USD wallet with initial balance)**

```json
{
  "currencyCode": "USD",
  "initialBalance": "100.50"
}
```

**Example success response** `201`

Same shape as the wallet object in “Get or create main wallet” above (includes `balance` and `currency` with decrypted name/symbol).

**Error responses**

- **409 Conflict** – User already has a wallet for this currency  
  ```json
  { "statusCode": 409, "message": "User already has a wallet for currency PHP", "error": "Conflict" }
  ```
- **404 Not Found** – Currency code not supported (e.g. invalid or not seeded)  
  ```json
  { "statusCode": 404, "message": "Currency USD not found", "error": "Not Found" }
  ```
- **400 Bad Request** – Validation failed (e.g. invalid `currencyCode` or `initialBalance`)  
- **401 Unauthorized** – Missing or invalid/expired token

---

### 4. Get one wallet by ID

**`GET /wallets/:id`**  
**Protected:** Yes.

Returns a single wallet by ID. The wallet must belong to the authenticated user.

**Request**

- **URL parameter:** `id` – wallet ID (cuid).
- Headers: `Authorization: Bearer <access_token>`.

**Example success response** `200`

Same shape as a single wallet object in the list (includes `balance` and `currency`).

**Error responses**

- **404 Not Found** – Wallet not found or not owned by the user  
  ```json
  { "statusCode": 404, "message": "Wallet not found", "error": "Not Found" }
  ```
- **401 Unauthorized** – Missing or invalid/expired token

---

## Wallet object (in responses)

| Field        | Type   | Description                                              |
|-------------|--------|----------------------------------------------------------|
| `id`        | string | Unique wallet ID (cuid)                                  |
| `userId`    | string | Owner user ID                                            |
| `currencyId`| string | Reference to the currency                                |
| `balance`   | string | Current balance as decimal string (e.g. `"0.00"`) — decrypted by backend |
| `status`    | string | One of: `ACTIVE`, `FROZEN`, `CLOSED`                     |
| `createdAt` | string | ISO 8601 date-time                                       |
| `updatedAt` | string | ISO 8601 date-time                                       |
| `currency`  | object | Currency with decrypted `name` and `symbol` (see below)   |

---

## Currency object (nested in wallet)

| Field       | Type   | Description                          |
|------------|--------|--------------------------------------|
| `id`       | string | Unique currency ID (cuid)            |
| `code`     | string | 3-letter ISO code (e.g. `PHP`, `USD`)|
| `name`     | string | Display name (e.g. Philippine Peso)   |
| `symbol`   | string \| null | Symbol (e.g. ₱, $)              |
| `createdAt`| string | ISO 8601 date-time                   |
| `updatedAt`| string | ISO 8601 date-time                   |

---

## Encryption (backend only)

- **Balance** and **currency name/symbol** are stored encrypted in the database (Supabase via Prisma).
- The frontend never sends or receives encrypted values. All wallet and currency fields in the API are plain JSON; the backend encrypts on write and decrypts on read.

---

## Typical frontend flow

1. **After login (or app load with valid token):** Call `POST /wallets/main` to get or create the user’s main (PHP) wallet. Use this wallet for the primary balance display.
2. **Wallet list:** Call `GET /wallets` to show all of the user’s wallets (e.g. PHP, USD).
3. **Single wallet:** Call `GET /wallets/:id` when you need one wallet by ID (e.g. from a deep link or after creating a new wallet).
4. **Additional currencies:** When the user wants a wallet in another currency (e.g. USD), call `POST /wallets` with `currencyCode: "USD"`. The backend will return 404 if that currency is not yet seeded.

Token expiry is the same as for Auth. When the backend returns **401** on any wallet route, clear the stored token and redirect to login (or trigger your refresh flow if you have one).
