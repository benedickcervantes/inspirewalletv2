# API Documentation: Passcode (Frontend Guide)

This document describes how the frontend should use the **Passcode** API. Each registered user can set an optional 4-digit passcode for additional security (e.g. for sensitive operations). The passcode is encrypted at rest on the backend; the frontend sends plain values over HTTPS.

---

## Base URL & Conventions

- **Base URL:** `http://localhost:3000` (or your deployed backend URL)
- **Content-Type:** Send `Content-Type: application/json` for request bodies.
- **Protected routes:** All passcode endpoints require the JWT in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Validation:** Request bodies use strict validation. The passcode must be exactly 4 digits (0–9). Only send the fields documented below.

---

## Passcode

All passcode endpoints are under the `/auth` prefix. The passcode belongs to the authenticated user.

### 1. Set passcode

**`POST /auth/passcode`**  
**Protected:** Yes.

Sets a 4-digit passcode for the authenticated user. The user must not already have a passcode.

**Request body**

| Field      | Type   | Required | Validation                     | Description           |
|-----------|--------|----------|--------------------------------|-----------------------|
| `passcode`| string | Yes      | Exactly 4 digits (0–9)         | The passcode to set   |

**Example request**

```json
{
  "passcode": "1234"
}
```

**Example success response** `201` or `200`

```json
{
  "message": "Passcode set successfully"
}
```

**Error responses**

- **409 Conflict** – Passcode is already set  
  ```json
  { "statusCode": 409, "message": "Passcode is already set", "error": "Conflict" }
  ```
- **400 Bad Request** – Validation failed (passcode must be exactly 4 digits)  
  ```json
  {
    "statusCode": 400,
    "message": ["Passcode must be exactly 4 digits", "Passcode must contain only digits (0-9)"],
    "error": "Bad Request"
  }
  ```
- **401 Unauthorized** – Missing or invalid/expired token  
  ```json
  { "statusCode": 401, "message": "Unauthorized" }
  ```

---

### 2. Update passcode

**`PATCH /auth/passcode`**  
**Protected:** Yes.

Updates the user's passcode. Requires the current passcode for verification.

**Request body**

| Field             | Type   | Required | Validation                     | Description                |
|------------------|--------|----------|--------------------------------|----------------------------|
| `currentPasscode`| string | Yes      | Exactly 4 digits (0–9)         | Current passcode to verify |
| `newPasscode`    | string | Yes      | Exactly 4 digits (0–9)         | New passcode to set        |

**Example request**

```json
{
  "currentPasscode": "1234",
  "newPasscode": "5678"
}
```

**Example success response** `200`

```json
{
  "message": "Passcode updated successfully"
}
```

**Error responses**

- **400 Bad Request** – Current passcode incorrect or no passcode set  
  ```json
  { "statusCode": 400, "message": "Current passcode is incorrect", "error": "Bad Request" }
  ```
  ```json
  { "statusCode": 400, "message": "No passcode set. Use set passcode first.", "error": "Bad Request" }
  ```
- **400 Bad Request** – Validation failed (invalid format)  
- **401 Unauthorized** – Missing or invalid/expired token  

---

### 3. Delete passcode

**`DELETE /auth/passcode`**  
**Protected:** Yes.

Removes the user's passcode. Requires the current passcode for verification.

**Request body**

| Field      | Type   | Required | Validation                     | Description           |
|-----------|--------|----------|--------------------------------|-----------------------|
| `passcode`| string | Yes      | Exactly 4 digits (0–9)         | Current passcode to verify |

**Example request**

```json
{
  "passcode": "1234"
}
```

**Example success response** `200`

```json
{
  "message": "Passcode removed successfully"
}
```

**Error responses**

- **400 Bad Request** – Passcode incorrect or no passcode set  
  ```json
  { "statusCode": 400, "message": "Passcode is incorrect", "error": "Bad Request" }
  ```
  ```json
  { "statusCode": 400, "message": "No passcode set", "error": "Bad Request" }
  ```
- **401 Unauthorized** – Missing or invalid/expired token  

---

## Security

- **Encryption:** The passcode is encrypted at rest using AES-256-GCM with per-user key derivation (HKDF). The same crypto module used for PII (e.g. name, phone) is used for the passcode.
- **Never exposed:** The passcode is never returned in API responses or logged.
- **Transport:** Always use HTTPS in production. The passcode is sent as plain JSON in the request body; TLS encrypts it in transit.
- **Verification:** For update and delete, the backend decrypts the stored passcode and compares it with the provided value. Never store the passcode in plaintext on the client after submission.

---

## Typical frontend flow

1. **Set passcode (first time):** Call `POST /auth/passcode` with `{ "passcode": "1234" }` after the user chooses a 4-digit code (e.g. in a settings or security screen).
2. **Update passcode:** Call `PATCH /auth/passcode` with `{ "currentPasscode": "1234", "newPasscode": "5678" }` when the user wants to change it.
3. **Delete passcode:** Call `DELETE /auth/passcode` with `{ "passcode": "1234" }` when the user wants to remove the passcode (e.g. to disable it for sensitive operations).

---

## Passcode verification for sensitive operations

When a user has a passcode set, they **must provide it** for these operations:

| Operation | Endpoint | Passcode field |
|-----------|----------|----------------|
| Transfer money | `POST /transfers` | `passcode` in body |
| Update profile | `PATCH /auth/profile` | `passcode` in body |
| Create beneficiary | `POST /beneficiaries` | `passcode` in body |
| Update beneficiary | `PATCH /beneficiaries/:id` | `passcode` in body |
| Delete beneficiary | `DELETE /beneficiaries/:id` | `passcode` in body |

- **If the user has no passcode set:** No passcode is required; the operation proceeds.
- **If the user has a passcode set:** The `passcode` field must be included and must match. If missing or wrong, the API returns **400 Bad Request**.

Use the `hasPasscode` field in the user object (from `GET /auth/me`, login, register) to determine whether to prompt the user for their passcode before calling these endpoints.
