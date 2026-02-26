# Backend Changes: Personal Profile (Personal Information Page)

This document specifies the backend changes required to fully support the **Personal Information page** (Dashboard → person icon → Personal) in the InspireWallet frontend. The frontend uses `GET /auth/me` and `PATCH /auth/profile`; some fields displayed or editable on the Personal page are not yet supported by `PATCH /auth/profile` or are missing from the User model.

---

## Context

**Frontend screen:** [app/Placeholder.tsx](../../app/Placeholder.tsx) — displayed when the user taps the person icon on the dashboard.

**Current API usage:** The frontend already calls `GET /auth/me` (via `getMe`) to fetch the user profile. To enable editing and persist all displayed fields, the backend must support updates for the fields listed below.

---

## Current PATCH /auth/profile Support (No Changes Needed)

The following fields are **already supported** by `PATCH /auth/profile` per [API-AUTH-AND-USERS.md](API-AUTH-AND-USERS.md):

| Field         | Validation        | Description                         |
| ------------- | ----------------- | ----------------------------------- |
| `firstName`   | 1–100 characters  | Given name                          |
| `lastName`    | 1–100 characters  | Family name                         |
| `middleName`  | 1–100 characters  | Middle name                         |
| `phone`       | Max 30 characters | Contact number                      |
| `dateOfBirth` | ISO 8601 date     | Date of birth                       |
| `countryCode` | Exactly 2 chars   | ISO country code                    |
| `passcode`    | 4 digits          | Required when user has passcode set |

The frontend can use these today. No backend changes required for these fields.

---

## Backend Changes Required

### 1. Extend PATCH /auth/profile DTO

Add the following fields to the `PATCH /auth/profile` request body (all optional):

| Field             | Type   | Validation        | Description                                 |
| ----------------- | ------ | ----------------- | ------------------------------------------- |
| `companyName`     | string | No; max 200 chars | Company name (already in register)          |
| `lineAccountLink` | string | No; max 500 chars | LINE Account Link URL (already in register) |

**Implementation notes:**

- Both fields already exist in the User model (from register). Add them to the profile update DTO and handler so users can edit them from the Personal page.
- Apply same validation as in `POST /auth/register`.
- If PII is encrypted at rest, ensure these are included in the encryption/decryption flow.

---

### 2. New User Fields (Optional)

If the Personal page should persist these fields, add them to the User model and APIs:

| Field          | Type   | Validation              | Description                               |
| -------------- | ------ | ----------------------- | ----------------------------------------- |
| `viberLink`    | string | Optional; max 500 chars | Viber account link                        |
| `whatsappLink` | string | Optional; max 500 chars | WhatsApp account link                     |
| `language`     | string | Optional; max 50 chars  | User language preference (e.g. "English") |

**Implementation steps:**

1. Add columns to the User entity (or extend encrypted PII payload).
2. Add to `PATCH /auth/profile` DTO.
3. Update profile handler to persist these fields.
4. Include in `GET /auth/me` response.
5. Include in register/login response if they are set during registration.

---

### 3. Return createdAt in GET /auth/me (Optional)

The Personal page displays "Member Since" (registration date). If `createdAt` is not yet returned by `GET /auth/me`, add it to the response:

| Field       | Type   | Description                                     |
| ----------- | ------ | ----------------------------------------------- |
| `createdAt` | string | ISO 8601 date (e.g. `2025-01-15T10:00:00.000Z`) |

---

### 4. Agent Referrer / Referrals

The Personal page shows "Agent Referrer". The referrer may be available from the referrals system:

- Check if `GET /referrals/tree` or `GET /auth/me` already returns referrer info.
- If not, consider adding `referrerName` or `referredBy` (or similar) to the user object or referrals API response so the frontend can display it without extra calls.

---

## Summary Checklist

| Change                             | Priority | Required for basic edit flow?          |
| ---------------------------------- | -------- | -------------------------------------- |
| Add `companyName` to PATCH DTO     | Medium   | Yes (Personal page shows Company Name) |
| Add `lineAccountLink` to PATCH DTO | Medium   | Yes (Personal page shows LINE Link)    |
| Add `viberLink` field              | Low      | No (optional)                          |
| Add `whatsappLink` field           | Low      | No (optional)                          |
| Add `language` field               | Low      | No (optional)                          |
| Return `createdAt` in GET /auth/me | Low      | No (optional, for Member Since)        |
| Referrer info for display          | Low      | No (optional)                          |

---

## API Documentation Updates

After implementing these changes, update [API-AUTH-AND-USERS.md](API-AUTH-AND-USERS.md):

1. Extend the **PATCH /auth/profile** request body table with `companyName`, `lineAccountLink`, and any new fields.
2. Extend the **User object** table with `createdAt`, `viberLink`, `whatsappLink`, `language`, and any new fields.
3. Add example request/response snippets if helpful.
