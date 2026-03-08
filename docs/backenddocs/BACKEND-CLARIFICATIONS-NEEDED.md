# Backend Clarifications Needed for Frontend Auth Integration

This document lists questions and gaps that the frontend team needs the backend team to clarify or implement before connecting the Login and Register screens to the Auth API.

---

## 1. Passcode verification endpoint

**Context:** The frontend app uses passcode as an **app-entry gate**: after the user logs in with email/password, they must enter their 4-digit passcode before reaching the main app. The backend currently verifies passcode only when it is included in sensitive operations (transfers, profile updates, beneficiary changes).

**Gap:** There is no standalone endpoint to verify a passcode without performing another operation.

**Question:** Can the backend add a **passcode verification** endpoint?

- **Proposed:** `POST /auth/verify-passcode`
  - **Request body:** `{ "passcode": "1234" }`
  - **Response 200:** `{ "message": "Passcode verified" }` (when correct)
  - **Response 400:** `{ "statusCode": 400, "message": "Passcode is incorrect", "error": "Bad Request" }` (when wrong or not set)

**Alternative:** If no new endpoint is added, the frontend will remove the passcode gate and only prompt for passcode when performing sensitive operations (transfers, profile updates, etc.).

---

## 2. Agent number vs. referral code

**Context:** The frontend Register screen has an "agent" concept:
- User selects "Yes, I'm an agent" or "No, I'm an investor"
- Agents get an `agentNumber` in format `AG` + 8 digits (e.g. `AG12345678`)
- Users can add a referrer by entering an agent number or scanning a QR code with `{ type: "inspire_agent_referral", agentNumber: "AG12345678", agentName: "..." }`

**Backend:** The Auth API expects `referralCode` — 8 uppercase alphanumeric characters (A–Z excluding O/I, digits 2–9), e.g. `ABC12XYZ`.

**Questions:**
1. Are `agentNumber` (e.g. `AG12345678`) and `referralCode` (e.g. `ABC12XYZ`) the same concept? If yes, does the backend support or plan to support the `AG12345678` format?
2. If they are different, does the backend need to add support for:
   - `agentNumber` (agent-specific ID)
   - `isAgent` (boolean)
   - `companyName`
3. For registration, should the frontend send `agentReferral` (the referrer's agent number) as `referralCode`? Will the backend resolve `AG12345678` to the correct referrer user?

---

## 3. Forgot password

**Context:** The Login screen has a "Forgot Password?" button. There is no endpoint documented for password reset.

**Question:** Will the backend provide forgot-password and reset-password endpoints?

- **Proposed:**
  - `POST /auth/forgot-password` — body: `{ "email": "user@example.com" }` — sends reset email
  - `POST /auth/reset-password` — body: `{ "token": "...", "newPassword": "..." }` — resets password using token from email

If not, the frontend will disable or remove the Forgot Password flow.

---

## 4. Token refresh

**Context:** The Auth API returns a JWT with expiry (e.g. 7 days). On 401, the frontend is expected to redirect to login.

**Question:** Is there a refresh token flow?

- If **yes:** Please document the refresh endpoint (e.g. `POST /auth/refresh`) and response format.
- If **no:** The frontend will store the JWT and redirect to Login on any 401 response.

---

## 5. Auth base path

**Context:** Existing wallet API uses `{base}/api/deposit-requests`. Auth docs describe endpoints under `/auth` (e.g. `POST /auth/register`, `POST /auth/login`).

**Question:** What is the full base path for auth?

- Option A: `{base}/auth/register`, `{base}/auth/login`, etc. (auth at root)
- Option B: `{base}/api/auth/register`, `{base}/api/auth/login`, etc. (auth under /api)

Please confirm so the frontend configures the correct URLs.

---

## 6. Register fields: companyName, lineAccountLink, isAgent

**Context:** The frontend Register form collects:
- `companyName` (when user checks "I have a company")
- `lineAccountLink` (LINE Account Link, optional)
- `isAgent` (Yes/No — agent vs. investor)

**Backend:** The `POST /auth/register` DTO does not include these fields.

**Question:** Should the backend add these fields to the register endpoint or store them elsewhere (e.g. profile, extended user attributes)? Or should the frontend omit them for now?

---

## 7. Unverified email access

**Context:** After registration, the backend sends an OTP verification email. The user can verify via `POST /auth/verify-email` or the verification link.

**Question:** Can users with `emailVerified: false` access the app and perform normal operations (view balance, transfer, etc.)? Or must they verify before using the app?

---

## Summary table

| # | Topic              | Action needed                                      | Priority |
|---|--------------------|----------------------------------------------------|----------|
| 1 | Passcode verify    | Add `POST /auth/verify-passcode` or confirm removal of passcode gate | High     |
| 2 | Agent vs referral  | Clarify mapping of agentNumber to referralCode     | High     |
| 3 | Forgot password    | Add endpoints or confirm they will not exist       | Medium   |
| 4 | Token refresh      | Document refresh flow or confirm none              | Low      |
| 5 | Auth base path     | Confirm `/auth` vs `/api/auth`                     | High     |
| 6 | Extra register fields | Add companyName, lineAccountLink, isAgent or omit | Medium   |
| 7 | Unverified email   | Clarify if unverified users can use the app        | Medium   |

---

*Document created for frontend–backend alignment. Last updated: Feb 2025.*
