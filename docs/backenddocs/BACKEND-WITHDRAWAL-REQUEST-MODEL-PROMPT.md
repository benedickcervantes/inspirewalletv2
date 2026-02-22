# Backend Implementation Prompt: WithdrawalRequest Model

**Purpose:** This document is an AI-ready prompt for implementing the `WithdrawalRequest` model and endpoints in the Inspire Wallet backend (NestJS + Prisma). Use it to generate Prisma schema, DTOs, service, controller, and wiring.

**Reference:** See [API-WITHDRAWAL-REQUESTS.md](API-WITHDRAWAL-REQUESTS.md) for the full API specification.

---

## 1. Context

The Inspire Wallet frontend submits **withdrawal requests** (Local Bank or E-Wallet). Users submit a request; admins approve or reject. On approval, the backend must **debit the user's wallet** using the existing `POST /withdrawals` logic (InspireBank ledger, PAYMENT transaction). The request flow is similar to deposit requests (top-up, stock-investment).

- **Backend stack:** NestJS, Prisma, Supabase (or PostgreSQL)
- **Encryption:** Use the existing crypto module (per [PLAN.md](PLAN.md)) for sensitive fields at rest
- **Auth:** JWT; `userId` from token. Role guards: USER (create, list own), ADMIN (list all, approve, reject)

---

## 2. Prisma Schema

Add to `prisma/schema.prisma`:

```prisma
enum WithdrawalMethod {
  LOCAL_BANK
  E_WALLET
}

enum WithdrawalRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

enum EWalletType {
  GCASH
  MAYA
}

model WithdrawalRequest {
  id          String                 @id @default(cuid())
  userId      String                 // from JWT
  walletId    String                 // source wallet to debit on approval
  currencyId  String
  method      WithdrawalMethod       // LOCAL_BANK or E_WALLET
  amount      String                 // encrypted at rest
  status      WithdrawalRequestStatus @default(PENDING)

  // Local Bank fields (encrypted; null when method is E_WALLET)
  accountNumber     String?
  accountHolderName String?
  bankName          String?
  branchName        String?

  // E-Wallet fields (encrypted; null when method is LOCAL_BANK)
  walletType   EWalletType?
  accountName  String?

  // Admin review
  adminNotes   String?   @db.Text
  reviewedAt   DateTime?
  reviewedById String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  wallet   Wallet   @relation(fields: [walletId], references: [id], onDelete: Restrict)
  currency Currency @relation(fields: [currencyId], references: [id], onDelete: Restrict)

  @@index([userId])
  @@index([status])
  @@index([userId, status])
}
```

Update `User`, `Wallet`, and `Currency` models to add the reverse relation:

```prisma
model User {
  // ... existing fields
  withdrawalRequests WithdrawalRequest[]
}

model Wallet {
  // ... existing fields
  withdrawalRequests WithdrawalRequest[]
}

model Currency {
  // ... existing fields
  withdrawalRequests WithdrawalRequest[]
}
```

Run `npx prisma migrate dev --name add_withdrawal_request` after schema change.

---

## 3. DTOs (class-validator)

Create DTOs in `src/withdrawal-requests/dto/`:

### CreateWithdrawalRequestDto

Use **discriminated validation** based on `method`:

- When `method === 'local_bank'`: require `accountNumber`, `accountHolderName`, `bankName`; `branchName` optional
- When `method === 'e_wallet'`: require `walletType` (gcash | maya), `accountNumber`, `accountName`

Common fields:
- `walletId`: `@IsNotEmpty()`, `@IsString()`
- `amount`: `@IsString()`, `@Matches(/^\d+(\.\d{1,2})?$/)` (decimal up to 2 places)
- `method`: `@IsIn(['local_bank', 'e_wallet'])`
- `email`: `@IsOptional()`, `@IsEmail()`

Local Bank:
- `accountNumber`: `@IsString()`, `@Length(1, 50)`
- `accountHolderName`: `@IsString()`, `@Length(1, 200)`
- `bankName`: `@IsString()`, `@Length(1, 200)`
- `branchName`: `@IsOptional()`, `@IsString()`, `@MaxLength(200)`

E-Wallet:
- `walletType`: `@IsIn(['gcash', 'maya'])`
- `accountNumber`: `@IsString()`, `@Length(1, 20)`
- `accountName`: `@IsString()`, `@Length(1, 200)`

Use `@ValidateIf` or custom validator so that method-specific fields are required only when that method is selected. Reject extra properties (`forbidNonWhitelisted`).

### ApproveRejectDto

- `notes`: `@IsOptional()`, `@IsString()`, `@MaxLength(500)`

---

## 4. Service (WithdrawalRequestsService)

Location: `src/withdrawal-requests/withdrawal-requests.service.ts`

Inject: `PrismaService`, `CryptoService` (or `EncryptionService`), `WithdrawalsService` (or the service that performs the actual wallet debit).

### Methods

| Method | Description |
|--------|-------------|
| `create(userId: string, dto: CreateWithdrawalRequestDto)` | Validate wallet belongs to user, get currencyId from wallet, encrypt sensitive fields, create WithdrawalRequest with status PENDING. Return decrypted entity. |
| `findByUser(userId: string)` | List all withdrawal requests for user. Decrypt on read. |
| `findById(userId: string, id: string)` | Get one by ID; ensure ownership. 404 if not found or not owned. Decrypt on read. |
| `adminList(status?: WithdrawalRequestStatus)` | List all (or filter by status). Include `user` (firstName, lastName, email) — decrypt user PII. Decrypt request fields. |
| `adminListPending()` | Same as adminList with status PENDING. |
| `approve(id: string, adminUserId: string, notes?: string)` | Verify status is PENDING. Call withdrawals service to debit wallet (walletId, amount, description). On success, update request: status APPROVED, reviewedAt, reviewedById, adminNotes. Return updated entity. On insufficient balance, throw 400. |
| `reject(id: string, adminUserId: string, notes?: string)` | Verify status is PENDING. Update: status REJECTED, reviewedAt, reviewedById, adminNotes. No debit. |

### Encryption

Encrypt before write, decrypt after read (same pattern as User, DepositRequest):
- **amount**
- **accountNumber**, **accountHolderName**, **bankName**, **branchName** (Local Bank)
- **accountName** (E-Wallet)

Use entity context: `WithdrawalRequest:${id}` (generate id before create if needed, or use a temp context then re-encrypt after create — prefer generating id first).

---

## 5. Controller (WithdrawalRequestsController)

Location: `src/withdrawal-requests/withdrawal-requests.controller.ts`

Base path: `/withdrawal-requests`

| Method | Route | Guard | Handler |
|--------|-------|-------|---------|
| POST | `/` | JwtAuthGuard, Roles(USER) | create |
| GET | `/` | JwtAuthGuard, Roles(USER) | listOwn |
| GET | `/:id` | JwtAuthGuard, Roles(USER) | getOne |
| GET | `/admin` | JwtAuthGuard, Roles(ADMIN) | adminList (query: status?) |
| GET | `/admin/pending` | JwtAuthGuard, Roles(ADMIN) | adminListPending |
| POST | `/admin/:id/approve` | JwtAuthGuard, Roles(ADMIN) | approve |
| POST | `/admin/:id/reject` | JwtAuthGuard, Roles(ADMIN) | reject |

Use `@Req()` to get `user` from JWT (`req.user.sub` or `req.user.id`). Pass `userId` to service.

For approve/reject, parse optional body `{ notes?: string }` with ApproveRejectDto.

---

## 6. Approval Flow (Critical)

When admin calls **approve**:

1. Load WithdrawalRequest by id. Ensure status is PENDING.
2. Check wallet balance (via Wallet/WithdrawalsService). If insufficient, return 400.
3. Call the existing **withdrawals** flow:
   - Debit `walletId` by `amount`
   - Create PAYMENT transaction
   - Create InspireBank WITHDRAWAL ledger entry
   - (See API-INSPIREBANK-ECONOMIC-FLOW.md, POST /withdrawals)
4. Update WithdrawalRequest: status=APPROVED, reviewedAt=now, reviewedById=adminUserId, adminNotes=notes.
5. Return updated request (decrypted).

Use a transaction if needed to ensure atomicity (debit + update request).

---

## 7. Module Wiring

Create `WithdrawalRequestsModule`:
- Import: `PrismaModule`, `CryptoModule`, and the module that provides the withdrawals/debit logic
- Provide: `WithdrawalRequestsService`
- Controller: `WithdrawalRequestsController`
- Export: `WithdrawalRequestsService` (if other modules need it)

Register `WithdrawalRequestsModule` in `AppModule`.

---

## 8. Request Format Reference

The frontend sends these request bodies. See [request-formats/withdrawal-request-local-bank.json](request-formats/withdrawal-request-local-bank.json) and [request-formats/withdrawal-request-e-wallet.json](request-formats/withdrawal-request-e-wallet.json) for exact field specs.

**Local Bank example:**
```json
{
  "walletId": "clxx...",
  "amount": "1000.50",
  "method": "local_bank",
  "email": "jane@example.com",
  "accountNumber": "1234567890",
  "accountHolderName": "Jane Doe",
  "bankName": "BDO Unibank",
  "branchName": "Makati Branch"
}
```

**E-Wallet example:**
```json
{
  "walletId": "clxx...",
  "amount": "500.00",
  "method": "e_wallet",
  "email": "jane@example.com",
  "walletType": "gcash",
  "accountNumber": "09171234567",
  "accountName": "Jane Doe"
}
```

---

## 9. Error Handling

| Case | HTTP | Message |
|------|------|---------|
| Validation failed | 400 | Validation error messages from class-validator |
| Wallet not found / not owned by user | 404 | "Wallet not found" |
| Withdrawal request not found | 404 | "Withdrawal request not found" |
| Request not PENDING (already approved/rejected) | 400 | "Withdrawal request is not pending" |
| Insufficient balance on approve | 400 | "Insufficient balance" |
| Missing/invalid JWT | 401 | Unauthorized |
| User lacks ADMIN role for admin endpoints | 403 | Forbidden |

---

## 10. Checklist

- [ ] Prisma schema added; migration run
- [ ] DTOs with discriminated validation (local_bank vs e_wallet)
- [ ] Service: create, findByUser, findById, adminList, adminListPending, approve, reject
- [ ] Encryption applied to amount and account fields; decryption on read
- [ ] Controller with all 7 endpoints; JWT + role guards
- [ ] Approve flow calls withdrawals/debit logic; atomic where possible
- [ ] Admin list includes nested `user` (firstName, lastName, email) with decrypted PII
- [ ] Module registered in AppModule
