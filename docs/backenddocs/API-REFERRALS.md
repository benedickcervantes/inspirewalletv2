# Referral System

This document describes the **referral hierarchy**, how each user's **referral ID** works, and **cascading behaviour** when users are deleted.

---

## Overview: Each User Has Their Own Referral ID

- **Every user** has a unique **referral ID** (stored as `referralCode` in the API). It is created at registration.
- Format: **5 uppercase alphanumeric characters** (A–Z excluding O/I, digits 2–9) — e.g. `ABCDE`, `K7M2P`.
- Users share their referral ID in links (e.g. sign-up URLs) so new users can register under them.
- Each user can have **at most one referrer**: `referredById` points to the referrer's user id (or is null for root users).
- **Tree structure**: referrer → referred users. No cycles (enforced by application logic).

---

## Cascading When Someone Is Deleted

When users are deleted, the referral hierarchy is adjusted so no referred users are left with broken references.

### 1. Deleting the referrer (upper in hierarchy)

The database uses `ON DELETE SET NULL` on `referredById`. When user A (referrer) is deleted, every user who had `referredById = A` gets `referredById` set to `null` and becomes a root user. No application code is needed.

### 2. Deleting a user in the middle (they have referrals)

Before deleting user B, the service **reparents** B's direct referrals to B's referrer (grandparent). Example: A → B → C. When B is deleted, C's referrer becomes A. This is done in `ReferralsService.reparentReferralsOfUser()` and is called from `UsersService.deleteUser()` before the user is deleted.

### 3. Effects on referral IDs

- When a user is deleted, their **referral ID is lost** (the user record is removed).
- Any sign-up link using that referral ID will no longer resolve to a valid referrer; registration will proceed without a referrer if the code is invalid or belongs to an inactive/deleted user.
- Resolving a referral ID returns a referrer only if the user exists and is **ACTIVE**.

---

## API (protected by JWT)

Base path: `/referrals`.

### Get referral tree

**`GET /referrals/tree`**

Returns the current user's referral ID, referrer, ancestor chain, and counts.

**Response**

- `referralCode`: current user's referral ID (created if missing). This is the code to share in links.
- `referrerId`: direct referrer's user id, or `null`.
- `ancestors`: list of nodes from direct referrer up to root (each with `userId`, `referredById`, `referralCode`, `depth`, `directReferralCount`).
- `directReferralCount`: number of users who were directly referred by this user.
- `totalDescendantCount`: total users in the subtree (direct + indirect).

### Get referral ID / code

**`GET /referrals/code`**

Returns `{ "referralCode": "..." }`. This is the user's referral ID. Creates it if the user does not have one yet.

### Get QR Payload

**`GET /referrals/qr-payload`**

Returns the information necessary for the frontend to generate a QR code for referrals, including the user's name, referral code, and a fully qualified registration URL.

**Response**
```json
{
  "referralCode": "ABCDE",
  "referralUrl": "http://localhost:3000/register?ref=ABCDE",
  "referrerName": "John Doe"
}
```

### Generate referral code

**`POST /referrals/generate`**

Generates the current user's referral ID. If the user already has one, returns it; otherwise creates a new unique code and returns it. Response: `{ "referralCode": "..." }`.

---

## Registration with Referral ID

**`POST /auth/register`**

Request body may include optional `referralCode` (5 chars). This should be the **referrer's referral ID**. If present and valid (matches an active user), the new user's `referredById` is set to that user's id.

---

## Admin Assignment

**`PATCH /users/:id/referral-code`**

Assigns a custom, manual 5-character referral code to a specific user. This endpoint allows admins to give users vanity codes or override existing ones.
- **Requires Admin Role.**

Request body:
```json
{
  "referralCode": "VANIT"
}
```

Response:
```json
{
  "referralCode": "VANIT"
}
```

### Reassign Referrer (Change Hierarchy)

**`PATCH /users/:id/referrer`**

Changes a user's position in the referral hierarchy by explicitly reassigning their referrer. The system will protect against circular references (e.g., trying to place user A under user B, when user B is already under user A).
- **Requires Admin Role.**

Request body:
```json
{
  "referrerId": "new-referrer-user-id"
}
```
*(Pass `null` or omit the field to remove the user's referrer and make them a root user)*

Response:
```json
{
  "success": true
}
```

---

## Deleting a User

User deletion is performed by `UsersService.deleteUser(userId)`. It:

1. Reparents all users who had this user as referrer to this user's referrer (grandparent), so the hierarchy stays consistent.
2. Deletes the user (wallets and beneficiaries are removed by existing cascade rules).

`deleteUser` is exposed via `DELETE /users/:id` and `DELETE /users/by-account-number/:accountNumber` (admin only). See API-AUTH-AND-USERS.md.
