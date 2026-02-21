# API Documentation: Beneficiaries (Frontend Guide)

This document describes how the frontend should use the **Beneficiaries** API. Beneficiaries are stored recipients for transfers (e.g. “Send to Jane – account X”). Nickname and account identifier are encrypted at rest on the backend; the frontend sends and receives **plain JSON**.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** Send `Content-Type: application/json` for request bodies.
- **Protected routes:** All beneficiary endpoints require the JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** Request bodies use strict validation. Only send the fields documented below.

---

## Beneficiaries

All beneficiary endpoints are under the `/beneficiaries` prefix. Every beneficiary belongs to the authenticated user; you cannot access another user’s beneficiaries.

### 1. Create a beneficiary

**`POST /beneficiaries`**  
**Protected:** Yes.

Creates a stored recipient for the authenticated user.

**Request body**

| Field               | Type   | Required | Description                                      |
|---------------------|--------|----------|--------------------------------------------------|
| `nickname`          | string | Yes      | Display name (e.g. "Jane"). Max 200 chars.       |
| `accountIdentifier` | string | Yes      | Phone, email, or wallet id. Max 512 chars.       |
| `type`              | string | Yes      | One of: `PHONE`, `EMAIL`, `WALLET_ID`           |
| `isVerified`        | boolean| No       | Whether recipient has been verified. Default false. |
| `passcode`          | string | Conditional | Exactly 4 digits (0–9). **Required when user has passcode set.** See [API-PASSCODE.md](API-PASSCODE.md). |

**Example request**

```json
{
  "nickname": "Jane",
  "accountIdentifier": "+639171234567",
  "type": "PHONE",
  "isVerified": false,
  "passcode": "1234"
}
```

**Example success response** `201`

```json
{
  "id": "clxx...",
  "ownerUserId": "clxx...",
  "nickname": "Jane",
  "accountIdentifier": "+639171234567",
  "type": "PHONE",
  "isVerified": false,
  "createdAt": "2026-02-18T00:00:00.000Z",
  "updatedAt": "2026-02-18T00:00:00.000Z"
}
```

---

### 2. List my beneficiaries

**`GET /beneficiaries`**  
**Protected:** Yes.

Returns all beneficiaries for the authenticated user, newest first.

**Request**

- No body.
- Headers: `Authorization: Bearer <access_token>`.

**Example success response** `200`

```json
[
  {
    "id": "clxx...",
    "ownerUserId": "clxx...",
    "nickname": "Jane",
    "accountIdentifier": "+639171234567",
    "type": "PHONE",
    "isVerified": false,
    "createdAt": "2026-02-18T00:00:00.000Z",
    "updatedAt": "2026-02-18T00:00:00.000Z"
  }
]
```

---

### 3. Get one beneficiary

**`GET /beneficiaries/:id`**  
**Protected:** Yes.

Returns a single beneficiary by id. The beneficiary must belong to the authenticated user.

**Example success response** `200`

Same shape as one object in the list response above.

**Error responses**

- **404 Not Found** – Beneficiary not found or not owned by user.

---

### 4. Update a beneficiary

**`PATCH /beneficiaries/:id`**  
**Protected:** Yes.

Updates a beneficiary. All body fields are optional; only provided fields are updated.

**Request body**

| Field               | Type   | Required | Description                                |
|---------------------|--------|----------|--------------------------------------------|
| `nickname`          | string | No       | Display name. Max 200 chars.               |
| `accountIdentifier` | string | No       | Phone, email, or wallet id. Max 512 chars. |
| `type`              | string | No       | One of: `PHONE`, `EMAIL`, `WALLET_ID`     |
| `isVerified`        | boolean| No       | Whether recipient has been verified.       |
| `passcode`          | string | Conditional | Exactly 4 digits (0–9). **Required when user has passcode set.** |

**Example success response** `200`

Same shape as the create/get response.

**Error responses**

- **400 Bad Request** – Passcode required or incorrect (when user has passcode set).
- **404 Not Found** – Beneficiary not found or not owned by user.

---

### 5. Delete a beneficiary

**`DELETE /beneficiaries/:id`**  
**Protected:** Yes.

Deletes a beneficiary. The beneficiary must belong to the authenticated user. When the user has a passcode set, include `passcode` in the request body.

**Request body**

| Field      | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| `passcode`| string | Conditional | Exactly 4 digits (0–9). **Required when user has passcode set.** |

**Example success response** `200`

```json
{ "success": true }
```

**Error responses**

- **400 Bad Request** – Passcode required or incorrect (when user has passcode set).
- **404 Not Found** – Beneficiary not found or not owned by user.

---

## Encryption

- **Nickname** and **accountIdentifier** are stored encrypted in the database (Supabase via Prisma).
- The frontend always sends and receives plain values. The backend encrypts on write and decrypts on read using the existing crypto module (AES-256-GCM with entity-scoped key derivation).

---

## Transferring to a beneficiary

To **send money** to a selected beneficiary, use the **Transfers** API: **`POST /transfers`** with `beneficiaryId`, `amount`, and optional `fromWalletId` and `description`. See **API-TRANSFERS.md** for full request/response and encryption details.
