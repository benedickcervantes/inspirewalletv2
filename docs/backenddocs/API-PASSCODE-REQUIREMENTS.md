# Backend: Passcode Requirements

This document is for **backend implementers**. It summarizes when and how the passcode must be enforced so the backend can validate requests correctly.

---

## Purpose

- The passcode is a **4-digit PIN** (digits 0–9 only) for extra security.
- When `user.hasPasscode` is `true`, certain operations **require** the passcode in the request body (or a prior `POST /auth/verify-passcode` for app-entry).
- If the user has no passcode set, no passcode is required for these operations.

---

## Lifecycle (reference)

| Action | Endpoint | Notes |
|--------|----------|--------|
| Set passcode | `POST /auth/passcode` | First time; user must not already have a passcode. |
| Update passcode | `PATCH /auth/passcode` | Body: `currentPasscode`, `newPasscode`. |
| Delete passcode | `DELETE /auth/passcode` | Body: `passcode`. |
| Verify (e.g. app entry) | `POST /auth/verify-passcode` | Body: `passcode`. |

Full request/response details: [API-PASSCODE.md](API-PASSCODE.md) and [API-AUTH-AND-USERS.md](API-AUTH-AND-USERS.md).

---

## Registration and first-time passcode

- The **backend** does not enforce “passcode at registration”; it only provides `POST /auth/passcode`.
- The **frontend** enforces “passcode before Main” after register by routing to CreatePasscode and not allowing access until passcode is set.
- The backend returns `user.hasPasscode` (e.g. from register, login, `GET /auth/me`) so the client knows when to prompt for passcode.

---

## Operations that require passcode when `hasPasscode` is true

When the authenticated user has `hasPasscode === true`, the backend **must** require a `passcode` field in the request body and **verify** it (decrypt stored passcode, compare with provided value) before performing the operation. If missing or incorrect, return **400 Bad Request** with a clear message (e.g. “Passcode is required for this operation” / “Passcode is incorrect”).

| Operation | Endpoint | Passcode in body | Backend behavior |
|-----------|----------|------------------|------------------|
| App entry (unlock) | `POST /auth/verify-passcode` | `passcode` | Verify only; no other operation. |
| Transfer money | `POST /transfers` | `passcode` | Require and verify when hasPasscode; else 400. |
| Update profile | `PATCH /auth/profile` | `passcode` | Require and verify when hasPasscode; else 400. |
| Create beneficiary | `POST /beneficiaries` | `passcode` | Require and verify when hasPasscode; else 400. |
| Update beneficiary | `PATCH /beneficiaries/:id` | `passcode` | Require and verify when hasPasscode; else 400. |
| Delete beneficiary | `DELETE /beneficiaries/:id` | `passcode` | Require and verify when hasPasscode; else 400. |
| Create withdrawal request | `POST /withdrawal-requests` | `passcode` | Require and verify when hasPasscode; else 400. |

- **If the user has no passcode set:** Do not require `passcode`; the operation proceeds without it.
- **If the user has a passcode set:** The `passcode` field must be present and must match the stored (encrypted) value. Do not return or log the passcode.

Use the same verification logic as for `PATCH /auth/profile` (decrypt stored passcode, compare with request body).

---

## Request contract (what the frontend sends)

- **Transfers:** The frontend will send `POST /transfers` with body: `beneficiaryId`, optional `fromWalletId`, `amount`, optional `description`, and `passcode` (when user has passcode set). See [API-TRANSFERS.md](API-TRANSFERS.md).
- **Withdrawal requests:** The frontend will send `POST /withdrawal-requests` with the same fields as today (walletId, amount, method, method-specific fields) **plus** `passcode` when user has passcode set. See [API-WITHDRAWAL-REQUESTS.md](API-WITHDRAWAL-REQUESTS.md).

---

## Optional: Resolve recipient by account number (transfer flow)

The app transfer flow may resolve a recipient by **account number** (e.g. user enters “1234 5678 9012”) before creating or using a beneficiary. If the backend supports this, it can expose an authenticated endpoint such as:

- **`GET /transfers/recipient-by-account-number?accountNumber=...`**  
  Returns minimal recipient info (e.g. `userId`, `accountNumber`, `mainWalletId`, `firstName`, `lastName`) so the frontend can create a beneficiary and call `POST /transfers` with `beneficiaryId`.  
  If no user is found for the account number, return **404**.

This is optional; the frontend can also rely on the user selecting an existing beneficiary.
