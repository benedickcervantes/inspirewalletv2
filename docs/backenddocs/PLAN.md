# E-Wallet Backend – Build Plan (Phase 1)

## Decisions Locked In

| # | Decision | Choice |
|---|----------|--------|
| 1 | Wallet in first build | **No** – add Wallet (and balance) in a later phase |
| 2 | Encryption in first build | **Yes** – build reusable encryption module so any new model can use it |
| 3 | Which User fields to encrypt | **All PII** – encrypt `firstName`, `lastName`, `middleName`, `phone`, `dateOfBirth`, `countryCode`. Keep `email` plain for login lookup |
| 4 | JWT | Add **JWT_SECRET** (and optionally **JWT_EXPIRES_IN**) to `.env` |
| 5 | Registration | **Identity only** – no balance in registration; balance will be added with Wallet later |

---

## Scope (Phase 1)

- **Encryption module** – Option C (key derivation + per-entity). Reusable for User now and any future models.
- **User model** – Prisma schema with PII fields encrypted at rest via encryption service.
- **Users module** – UsersService (create, findByEmail); uses encryption for PII.
- **Auth module** – Register (identity only), Login (email + password → JWT), JWT guard.
- **No Wallet** in this phase.

---

## 1. Environment

Add to `.env` (do not commit secrets):

- `JWT_SECRET` – used to sign JWTs (e.g. generate with `openssl rand -hex 32`).
- `JWT_EXPIRES_IN` – optional (e.g. `7d`); default in code if omitted.
- `ENCRYPTION_MASTER_KEY` – already present; used for key derivation.

---

## 2. Prisma – User Model

**File:** `prisma/schema.prisma`

- **User**: `id` (cuid), `email` (unique), `accountNumber` (unique 12-digit, stored without spaces; displayed as XXXX XXXX XXXX), `passwordHash`, `firstName`, `lastName`, `middleName?`, `phone?`, `dateOfBirth?`, `countryCode?`, `emailVerified` (default false), `phoneVerified` (default false), `status` (enum: e.g. PENDING, ACTIVE, SUSPENDED), `createdAt`, `updatedAt`, `lastLoginAt?`.
- Stored **encrypted** (via service before write): `firstName`, `lastName`, `middleName`, `phone`, `dateOfBirth`, `countryCode`. Stored **plain**: `id`, `email`, `accountNumber`, `passwordHash`, verification flags, `status`, timestamps. Every user (new and existing) has a generated `accountNumber`; existing users were backfilled via migration.
- Run migration after schema change.

---

## 3. Encryption Module (Option C)

**Location:** `src/crypto/` (or `src/encryption/`).

- **Purpose:** Reusable encrypt/decrypt with key derivation per entity. Any module (users now, others later) can inject and use it.
- **Config:** Read `ENCRYPTION_MASTER_KEY` from ConfigService; optional fixed KDF info string (e.g. app name).
- **API:**
  - `encrypt(plaintext: string, entityContext: string): Promise<string>` – returns single payload (e.g. base64: IV + ciphertext + auth tag).
  - `decrypt(ciphertext: string, entityContext: string): Promise<string>` – same entity context as at encrypt time.
- **Internals:** HKDF (or similar) to derive key from master key + entity context (+ optional info). AES-256-GCM for encrypt/decrypt; IV/nonce generated per encrypt, stored with ciphertext.
- **Dependencies:** Node `crypto` (no new npm deps required for core logic).

---

## 4. Users Module

**Location:** `src/users/`

- **UsersService:** `findByEmail(email)`, `create(data)`.
- **Create flow:** For PII fields (`firstName`, `lastName`, `middleName`, `phone`, `dateOfBirth`, `countryCode`), call crypto service `encrypt(value, userId)` before DB write. Use `userId` only after user is created (e.g. create user with placeholders then update, or derive context from a temp id – recommend: create with encrypted values using a pre-generated `id` so entity context is stable).
- **Read flow:** When loading user, call crypto `decrypt(encryptedValue, userId)` for each encrypted field.
- **DTO:** Internal create DTO (e.g. for AuthService) with plaintext PII; UsersService encrypts before passing to Prisma.
- No public controller in phase 1; Auth module uses UsersService.

---

## 5. Auth Module

**Location:** `src/auth/`

- **Register:** POST body – required: `email`, `password`, `firstName`, `lastName`; optional: `middleName`, `phone`, `dateOfBirth`, `countryCode`. Validate (class-validator), hash password (bcrypt), call UsersService.create (which encrypts PII). Return 201 and optionally JWT.
- **Login:** POST body – `email`, `password`. Validate user, compare password, update `lastLoginAt`, issue JWT. Response: `{ access_token }` (and optionally user info).
- **Strategies:** Local (login), JWT (protected routes). Guard: JwtAuthGuard.
- **Dependencies:** @nestjs/passport, passport, passport-local, passport-jwt, @nestjs/jwt, bcrypt, class-validator, class-transformer.

---

## 6. App Wiring

- **app.module.ts:** Import `ConfigModule`, `PrismaModule`, `SupabaseModule`, `CryptoModule` (or `EncryptionModule`), `UsersModule`, `AuthModule`.
- **main.ts:** Global ValidationPipe (class-validator) for DTOs.

---

## 7. Build Order

1. Add **JWT_SECRET** (and optionally **JWT_EXPIRES_IN**) to `.env`.
2. **Prisma:** Define User model; run `prisma migrate dev`.
3. **Crypto module:** Implement key derivation + AES-256-GCM; expose `encrypt(plaintext, entityContext)` and `decrypt(ciphertext, entityContext)`.
4. **Users module:** UsersService with create (encrypt PII using user id as context) and findByEmail (decrypt on read).
5. **Auth module:** Install auth deps; implement AuthService (register, login), AuthController (POST register, POST login), Local + JWT strategies, JWT guard.
6. **Validation:** ValidationPipe + DTOs with class-validator.
7. **Optional:** One protected route (e.g. GET /auth/me) to verify JWT.

---

## 8. Out of Scope (Phase 1)

- Wallet and balance (phase 2).
- Email/phone verification flows.
- Password reset.
- Rate limiting (add later).

---

## 9. Future Use of Encryption

When adding new models that need encrypted data: inject the crypto service and call `encrypt(plaintext, entityContext)` / `decrypt(ciphertext, entityContext)` with a stable context (e.g. that entity’s id or a composite key). Use the same master key and KDF so the module stays reusable.
