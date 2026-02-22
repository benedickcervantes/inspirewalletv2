# Security: InspireBank & Economic Endpoints

Endpoints that **increase or decrease InspireBank balance** (or expose it) are sensitive. If any user could call them, they could credit themselves (deposits) or see internal position (balance). This document describes the **role-based rules** and how to operate safely.

---

## Risk Summary

| Endpoint | Risk if unrestricted |
|----------|----------------------|
| **POST /deposits** | Attacker credits their wallet and inflates InspireBank → unlimited self-credit. |
| **POST /deposits/by-account-number** | Attacker credits any user wallet from reserve by account number → unlimited credit to arbitrary accounts. |
| **POST /withdrawals** | User can only debit their own wallet (ownership checked); risk is limited to their balance. |
| **GET /inspire-bank/balance** | Leak of central bank position; useful for partner reconciliation but must be restricted. |
| **GET /inspire-bank/ledger** | Leak of full transaction ledger; ADMIN only. |
| **POST /credit-from-reserve** | Attacker credits any wallet from reserve; ADMIN only. |

So the **critical** restriction is on **deposits**. Balance read is restricted to avoid information leakage.

---

## Role-Based Access (RBAC)

Users have a **role** in the database: `USER`, `ADMIN`, or `PAYMENT_SERVICE`.

| Role | Purpose |
|------|--------|
| **USER** | Normal app user. Can use wallets, transfers, beneficiaries, withdrawals (own wallet only). |
| **ADMIN** | Back-office / operator. Can perform deposits, view InspireBank balance, and (if you add it) manage users. |
| **PAYMENT_SERVICE** | Server-side actor (e.g. payment gateway webhook handler). Can perform deposits so that top-ups are only credited after real payment. |

### Endpoint Rules

| Endpoint | Allowed roles | Notes |
|----------|----------------|--------|
| **POST /deposits** | **ADMIN**, **PAYMENT_SERVICE** only | Regular **USER** cannot call this. Prevents self-credit. |
| **POST /deposits/by-account-number** | **ADMIN** only | Credits a user's main PHP wallet by account number. Can credit any user. |
| **POST /withdrawals** | **USER**, **ADMIN**, **PAYMENT_SERVICE** | Ownership of `walletId` is always checked (must belong to authenticated user unless you add “on behalf” logic). |
| **GET /inspire-bank/balance** | **ADMIN** only | Hides central bank position from normal users and from PAYMENT_SERVICE. |
| **GET /inspire-bank/ledger** | **ADMIN** only | Paginated ledger for Inspire Admin. |
| **POST /credit-from-reserve** | **ADMIN** only | Credits any wallet from InspireBank reserve. Decreases InspireBank. |

Implementation: `JwtAuthGuard` + `RolesGuard` + `@Roles(...)` on the controller methods. The user’s role is read from the DB in the JWT strategy and attached to `request.user.role`.

---

## How to Use in Production

1. **Registration**  
   New users get `role = USER` by default. They **cannot** call **POST /deposits** or **GET /inspire-bank/balance**.

2. **Deposits (top-up)**  
   - **Option A:** Only your back-office (ADMIN) or a server-side service (PAYMENT_SERVICE) calls **POST /deposits** after verifying payment (e.g. after a payment gateway webhook). The client app never calls this directly.  
   - **Option B:** Your client calls a **your** endpoint (e.g. “request top-up”) that creates a pending request; an admin or an automated job approves it and then your server calls **POST /deposits** with an ADMIN/PAYMENT_SERVICE token.

3. **Withdrawals**  
   Users call **POST /withdrawals** for their own wallet. You can add per-user limits, approval for large amounts, or rate limiting in addition to ownership checks.

4. **InspireBank balance**  
   Only ADMIN tokens should call **GET /inspire-bank/balance** (e.g. internal dashboard or partner reporting).

---

## Assigning Roles (Admin Only)

Only an **ADMIN** user can assign or change another user’s role.

- **Endpoint:** `PATCH /users/:id/role`
- **Endpoint:** `DELETE /users/:id` — Delete a user by ID. Only ADMIN. Reparents referrals to grandparent; cascades wallets and beneficiaries.
- **Endpoint:** `DELETE /users/by-account-number/:accountNumber` — Delete a user by account number. Only ADMIN. Same cascade as above. See API-REFERRALS.md and API-AUTH-AND-USERS.md.
- **Body (role):** `{ "role": "USER" | "ADMIN" | "PAYMENT_SERVICE" }`
- **Auth:** JWT required; role must be **ADMIN**. Returns the updated user (with decrypted PII).
- **Use case:** Promote a registered user to ADMIN, or set a service account to PAYMENT_SERVICE.

---

## Creating the First ADMIN User

New users default to **USER**. To get an **ADMIN** (or **PAYMENT_SERVICE**):

- **Manual (one-off):** After registering a user, set their role in the database:
  ```sql
  UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
  ```
- **Seed script:** Create a seed that ensures an admin user exists (e.g. by email).  
- **Admin API (future):** Add an “update user role” endpoint restricted to ADMIN so they can promote users.

Do **not** expose a self-service “become admin” or “request deposit” that any USER can use to escalate or credit themselves.

---

## Optional Hardening

- **PAYMENT_SERVICE:** Use a dedicated service account (user with `role = PAYMENT_SERVICE`) and issue JWTs only from a secure server (e.g. after validating a webhook signature). Do not give PAYMENT_SERVICE JWTs to the client.
- **API key for webhooks:** If deposits are triggered by payment provider webhooks, you can add a separate guard (e.g. `X-Webhook-Secret` or signature verification) and a dedicated server-only route that calls the deposit logic without using a user JWT.
- **Rate limiting:** Add rate limits on **POST /withdrawals** and **POST /deposits** to reduce abuse and DoS.
- **Audit log:** Log who (user id / role) called deposit and withdrawal and when; keep InspireBank ledger as the financial audit trail.

These rules ensure that **only trusted roles can increase InspireBank balance or view it**, and prevent normal users from crediting themselves or seeing the central bank position.
