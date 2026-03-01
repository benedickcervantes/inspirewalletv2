# Backend: Banking & E-Wallet Applications API

This document specifies the backend API and models required to support **Banking** and **E-Wallet** application flows in the InspireWallet frontend.

> **Frontend integration:** See [FRONTEND-BANKING-EWALLET-INTEGRATION.md](./FRONTEND-BANKING-EWALLET-INTEGRATION.md) for how to send requests (JSON + base64 images) so documents reach Supabase. The frontend collects application data (bank/provider, personal info, address, contact, financial info, and ID documents) and will submit it to the backend once these endpoints and models exist.

---

## Context

**Frontend flows:**

- **Banking:** [BankingService.tsx](../../app/ServicesFunction/Banking/BankingService.tsx) → Contact Info → Personal Info → Address Info → Financial Info → Required Info (ID). Banks offered: **UnionBank**, **Security Bank**, **CTBC**, **BDO**.
- **E-Wallet:** [EwalletService.jsx](../../app/ServicesFunction/E-Wallet/EwalletService.jsx) → Contact Info → Personal Info → Address Info → Financial Info (no ID step).

**Current state:** The frontend currently navigates to Main after submit; there is no backend submission yet. This doc describes what the backend must implement so the frontend can call it.

---

## Application Payload (Request Body)

The frontend will send the following fields when submitting an application. All fields from prior steps (personal, contact, address) should be included in the payload or sent in a single multipart request.

### Common (both Banking and E-Wallet)

| Field                        | Type   | Required | Validation                                                                        | Description                 |
| ---------------------------- | ------ | -------- | --------------------------------------------------------------------------------- | --------------------------- |
| `applicationType`            | string | Yes      | `"BANKING"` or `"EWALLET"`                                                        | Type of application         |
| `sourceOfFund`               | string | Yes      | One of: `Employment`, `Business`, `Investment`, `Inheritance`, `Pension`, `Other` | Source of fund              |
| `grossMonthlyIncome`         | string | Yes      | Numeric (user-entered amount)                                                     | Gross monthly income amount |
| `grossMonthlyIncomeCurrency` | string | Yes      | One of: `PHP`, `USD`, `EUR`                                                       | Currency for income         |

### Banking only

| Field           | Type        | Required    | Validation                                                   | Description                                    |
| --------------- | ----------- | ----------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `bank`          | string      | Yes         | One of: `UnionBank`, `Security Bank`, `CTBC`, `BDO`          | Selected bank                                  |
| `idType`        | string      | Yes         | One of: `Passport`, `Driver License`, `National ID`, `OTHER` | ID type chosen (see below)                     |
| `passportPhoto` | file/base64 | Conditional | Single image                                                 | When `idType === "Passport"`                   |
| `idFront`       | file/base64 | Conditional | Image                                                        | When `idType` is Driver License or National ID |
| `idBack`        | file/base64 | Conditional | Image                                                        | When `idType` is Driver License or National ID |

**ID rules:**

- **Passport:** One image only (`passportPhoto`).
- **Driver License / National ID:** Two images required: `idFront` and `idBack`.
- **OTHER** (None of these): User is directed to Message under Services; frontend does not allow submit. Backend may still accept a future flow where user submits after contacting support; if so, `idType: "OTHER"` with no documents.

### E-Wallet only

| Field      | Type   | Required | Validation             | Description       |
| ---------- | ------ | -------- | ---------------------- | ----------------- |
| `provider` | string | Yes      | e.g. GCash, Maya, etc. | E-Wallet provider |

E-Wallet flow has no ID step; no `idType` or document fields.

### Personal, contact, address (from prior steps)

Include fields collected in Contact Info, Personal Info, and Address Info screens (e.g. name, phone, date of birth, civil status, citizenship, full address). Exact key names should align with the frontend form state; backend can define a single application DTO that includes:

- Personal: `firstName`, `lastName`, `middleName`, `gender`, `dateOfBirth`, `civilStatus`, `citizenship`
- Contact: `phone`, `email` (from auth)
- Address: `completeAddress` or structured fields (street, city, province, zip, etc.)

---

## Backend Models to Create

### 1. BankingApplication (or equivalent)

Store banking account opening / KYC applications.

**Suggested fields:**

- `id` (cuid)
- `userId` (FK to User)
- `bank` (enum or string: UnionBank, Security Bank, CTBC, BDO)
- `sourceOfFund`, `grossMonthlyIncome`, `grossMonthlyIncomeCurrency`
- `idType` (enum: Passport, Driver License, National ID, OTHER)
- `passportPhotoId` (FK to document/store) — optional
- `idFrontDocumentId`, `idBackDocumentId` — optional
- Personal/contact/address fields (or JSON blob, or FKs to structured data)
- `status` (e.g. PENDING, APPROVED, REJECTED)
- `createdAt`, `updatedAt`

### 2. EwalletApplication (or equivalent)

Store e-wallet provider applications.

**Suggested fields:**

- `id` (cuid)
- `userId` (FK to User)
- `provider` (string)
- `sourceOfFund`, `grossMonthlyIncome`, `grossMonthlyIncomeCurrency`
- Personal/contact/address (same as above)
- `status`, `createdAt`, `updatedAt`

### 3. Document storage

- Store uploaded images (passport, idFront, idBack) in a secure store (e.g. S3, local encrypted storage).
- **Implemented:** Encrypted copy in DB (ApplicationDocument) and file upload to bucket **`uniqueID-files`** with path `{userId}-{date}-{idType}/{documentId}.{ext}` (see [Document storage (uniqueID-files)](#document-storage-uniqueid-files)).
- Reference documents by ID in the application record.
- Accept multipart/form-data or JSON with base64-encoded images; validate file type and size.

---

## API Endpoints (Recommendation)

### Option A: Separate endpoints

- **`POST /applications/banking`**  
  Protected (JWT).  
  Body: multipart/form-data or JSON (with base64 images).  
  Creates a `BankingApplication` and associated documents.

- **`POST /applications/ewallet`**  
  Protected (JWT).  
  Body: same structure (no ID fields).  
  Creates an `EwalletApplication`.

### Option B: Single endpoint

- **`POST /applications`**  
  Protected (JWT).  
  Body includes `applicationType: "BANKING"` or `"EWALLET"`.  
  Backend branches on `applicationType` and validates/creates the appropriate model.

---

## Example Request (Banking, JSON with base64)

```json
{
  "applicationType": "BANKING",
  "bank": "UnionBank",
  "sourceOfFund": "Employment",
  "grossMonthlyIncome": "50000",
  "grossMonthlyIncomeCurrency": "PHP",
  "idType": "Passport",
  "passportPhoto": "data:image/jpeg;base64,..."
}
```

For Driver License / National ID, send `idFront` and `idBack` instead of `passportPhoto`.

---

## Example Request (E-Wallet)

```json
{
  "applicationType": "EWALLET",
  "provider": "GCash",
  "sourceOfFund": "Business",
  "grossMonthlyIncome": "80000",
  "grossMonthlyIncomeCurrency": "PHP"
}
```

---

## Response

- **201 Created:** Return the created application (e.g. `id`, `status`, `createdAt`).
- **400 Bad Request:** Validation errors (missing/invalid fields, invalid file type/size).
- **401 Unauthorized:** Missing or invalid JWT.

---

## Summary Checklist for Backend

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Create BankingApplication model (and migration)             | High     |
| Create EwalletApplication model (and migration)             | High     |
| Document storage for passport/idFront/idBack                | High     |
| POST /applications/banking (or /applications)               | High     |
| POST /applications/ewallet (or /applications)               | High     |
| Validate enums (bank, sourceOfFund, currency, idType)       | High     |
| Include personal/contact/address in payload or linked model | Medium   |

After implementing, update this document or [API-AUTH-AND-USERS.md](API-AUTH-AND-USERS.md) with the final endpoint paths and request/response shapes.

---

## Implemented API (Backend)

### Endpoints

| Method | Path                    | Auth | Description                                              |
| ------ | ----------------------- | ---- | -------------------------------------------------------- |
| POST   | `/applications/banking` | JWT  | Create banking application (with optional ID documents). |
| POST   | `/applications/ewallet` | JWT  | Create e-wallet application.                             |

### Request / Response

- **POST /applications/banking**  
  Body: JSON (see Example Request (Banking) above). Personal/contact/address can be sent as nested objects: `personalInfo`, `contactInfo`, `addressInfo`.  
  Response **201**: `{ id, bank, sourceOfFund, grossMonthlyIncome, grossMonthlyIncomeCurrency, idType, status, createdAt }`.

- **POST /applications/ewallet**  
  Body: JSON (see Example Request (E-Wallet) above). Same optional `personalInfo`, `contactInfo`, `addressInfo`.  
  Response **201**: `{ id, provider, sourceOfFund, grossMonthlyIncome, grossMonthlyIncomeCurrency, status, createdAt }`.

- **400**: Validation errors (missing/invalid fields, image type/size).
- **401**: Missing or invalid JWT.

---

## Admin API (Banking Applications)

Admin can list banking applications, view full details (including applicant info and uploaded ID documents), view each ID image, and approve or reject.

### Admin endpoints

| Method | Path                                                             | Auth        | Description                                                                                     |
| ------ | ---------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/applications/admin/banking`                                    | JWT + Admin | List banking applications (optional `?status=PENDING` \| `APPROVED` \| `REJECTED`).             |
| GET    | `/applications/admin/banking/:id`                                | JWT + Admin | Get one banking application with full details and ID document view info.                        |
| PATCH  | `/applications/admin/banking/:id`                                | JWT + Admin | Update status: approve or reject. Body: `{ "status": "APPROVED" \| "REJECTED" }`.               |
| GET    | `/applications/admin/banking/:appId/documents/:documentId/image` | JWT + Admin | Stream the uploaded ID document image (decrypted). Use in `<img src="...">` or open in new tab. |

### List response (GET admin/banking)

Each item includes:

| Field                        | Type    | Description                                                |
| ---------------------------- | ------- | ---------------------------------------------------------- |
| `id`                         | string  | Application ID.                                            |
| `userId`                     | string  | Applicant user ID.                                         |
| `bank`                       | string  | Bank requested (e.g. UnionBank, Security Bank, CTBC, BDO). |
| `accountNumber`              | string  | Applicant’s account number (12-digit).                     |
| `grossMonthlyIncome`         | string  | Monthly income amount.                                     |
| `grossMonthlyIncomeCurrency` | string  | PHP, USD, or EUR.                                          |
| `sourceOfFund`               | string  | Employment, Business, Investment, etc.                     |
| `idType`                     | string  | Passport, Driver License, National ID, or OTHER.           |
| `status`                     | string  | PENDING, APPROVED, or REJECTED.                            |
| `dateRequested`              | string  | ISO date/time of submission.                               |
| `createdAt`                  | string  | Same as dateRequested.                                     |
| `user`                       | object? | `{ firstName, lastName, email }` (decrypted).              |

### Detail response (GET admin/banking/:id)

Extends the list fields with:

| Field          | Type           | Description                                                                                |
| -------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `personalInfo` | object \| null | Decrypted: firstName, lastName, middleName, gender, dateOfBirth, civilStatus, citizenship. |
| `contactInfo`  | object \| null | Decrypted: phone, email.                                                                   |
| `addressInfo`  | object \| null | Decrypted: completeAddress and/or street, city, province, zip.                             |
| `documents`    | array          | Uploaded ID documents (passport and/or id_front, id_back).                                 |

Each element of `documents`:

| Field      | Type           | Description                                                                                                                 |
| ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`       | string         | Document ID.                                                                                                                |
| `kind`     | string         | PASSPORT_PHOTO, ID_FRONT, ID_BACK.                                                                                          |
| `label`    | string         | Human label (e.g. "Passport photo", "ID (front)").                                                                          |
| `viewUrl`  | string \| null | Short-lived signed URL to storage (if available).                                                                           |
| `imageUrl` | string         | Relative path to backend image endpoint. Use as: `GET ${API_BASE}/${imageUrl}` to load the image in `<img src>` or new tab. |

### Viewing uploaded IDs

- **Option 1:** Use `documents[].imageUrl`: `GET /applications/admin/banking/:appId/documents/:documentId/image` with the same JWT. Response is the image binary with correct `Content-Type`. Frontend can use `<img src="${API_BASE}/applications/admin/banking/${appId}/documents/${docId}/image" />` with credentials (e.g. fetch with credentials and blob URL, or pass JWT in header if using a custom header).
- **Option 2:** If `viewUrl` is present, open it in a new tab (signed URL, no auth needed for the duration).

### PATCH admin/banking/:id (approve/reject)

- **Body:** `{ "status": "APPROVED" | "REJECTED" }`.
- **Response:** Same shape as one list item (bank, accountNumber, grossMonthlyIncome, dateRequested, idType, status, etc.).

---

## Document storage (uniqueID-files)

ID document images (passport, idFront, idBack) are:

1. **Stored encrypted in the database** (ApplicationDocument: `contentEnc`, `mimeTypeEnc`).
2. **Uploaded to object storage** in the bucket **`uniqueID-files`** (Supabase Storage) for backup and admin access.

### Storage layout

- **Bucket name:** `uniqueID-files`
- **Path pattern:** `{userId}-{date}-{idType}/{documentId}.{ext}`

| Part         | Example       | Description                         |
| ------------ | ------------- | ----------------------------------- |
| `userId`     | `clx1abc2...` | Application owner’s user ID (cuid). |
| `date`       | `2026-02-26`  | Date of upload (YYYY-MM-DD).        |
| `idType`     | see below     | Document type folder name.          |
| `documentId` | `clx9doc3...` | ApplicationDocument ID (cuid).      |
| `ext`        | `jpeg`, `png` | From image MIME type.               |

**`idType` folder names:**

- `passport` — passport photo
- `id_front` — ID front image
- `id_back` — ID back image

**Examples:**

- Passport: `uniqueID-files/clx1abc2...-2026-02-26-passport/clx9doc3....jpeg`
- ID front: `uniqueID-files/clx1abc2...-2026-02-26-id_front/clx9doc4....png`
- ID back: `uniqueID-files/clx1abc2...-2026-02-26-id_back/clx9doc5....jpeg`

The backend stores the full object path in `ApplicationDocument.storagePath` (e.g. `userId-date-passport/documentId.jpeg`) for reference. The bucket **`uniqueID-files`** must exist in Supabase Storage (create it in the Supabase dashboard or via API if needed).

---

## Frontend impact

**No frontend changes are required.** The API contract is unchanged:

- **Request:** Same JSON body (including base64 `passportPhoto`, `idFront`, `idBack` when applicable).
- **Response:** Same 201 payload (`id`, `status`, `createdAt`, etc.).

Storage in `uniqueID-files` is an internal backend behavior; the frontend continues to submit applications as before.
