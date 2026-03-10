# Seven iWallet — Stock & Wallet API Reference

> For frontend teams connecting to the NestJS backend.

All endpoints require a valid **JWT Bearer token** in the `Authorization` header (obtained from the login endpoint):

```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Understanding the Wallet Model

A user in Seven iWallet can have **multiple wallets**. Each wallet belongs to a specific **currency**. The two key currencies are:

| Currency Code | Purpose                                     | Where Shown in UI      |
| ------------- | ------------------------------------------- | ---------------------- |
| `PHP`         | Main available balance (spendable money)    | Dashboard balance card |
| `STOCK`       | Stock unit balance (number of shares/units) | Stock portfolio screen |

> [!IMPORTANT]
> These two balances are **completely separate wallet rows** in the database. Fetching and displaying them correctly requires knowing which wallet's `currency.code` to look at.

---

## 2. Wallet Endpoints

### `GET /wallets` — Get All Wallets (use this on the dashboard)

Returns all wallets belonging to the logged-in user. Use this to get both the PHP available balance and STOCK balance in a **single call**.

**Response:**

```json
[
  {
    "id": "wallet-id-1",
    "userId": "user-id",
    "currencyId": "currency-php-id",
    "balance": "12500.00",
    "agentCommission": "0.00",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "currency": {
      "id": "currency-php-id",
      "code": "PHP",
      "name": "Philippine Peso",
      "symbol": "₱"
    }
  },
  {
    "id": "wallet-id-2",
    "userId": "user-id",
    "currencyId": "currency-stock-id",
    "balance": "5.00",
    "agentCommission": "0.00",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "currency": {
      "id": "currency-stock-id",
      "code": "STOCK",
      "name": "System Stock",
      "symbol": "STK"
    }
  }
]
```

**Frontend Usage:**

```typescript
const wallets = await api.get('/wallets');

// Get PHP available balance
const phpWallet = wallets.find((w) => w.currency.code === 'PHP');
const availableBalance = phpWallet?.balance ?? '0.00';

// Get Stock balance (units)
const stockWallet = wallets.find((w) => w.currency.code === 'STOCK');
const stockBalance = stockWallet?.balance ?? '0.00';
```

---

### `GET /wallets/:id` — Get a Single Wallet by ID

**Response:** Same shape as a single item from `GET /wallets`.

---

### `POST /wallets/main` — Ensure PHP Wallet Exists (idempotent)

Creates the user's main PHP wallet if they don't have one. Safe to call multiple times. Use on first login or registration if needed.

**Response:** The PHP wallet object.

---

## 3. Transaction History Endpoints

### `GET /transactions` — Get All Transactions for the Logged-In User

Returns ALL transactions across ALL wallets (PHP + STOCK).

**Query Parameters:**

| Parameter  | Type                | Description                                                                        |
| ---------- | ------------------- | ---------------------------------------------------------------------------------- |
| `walletId` | `string` (optional) | Filter to one specific wallet. Pass the STOCK wallet ID to get only stock history. |
| `limit`    | `number` (optional) | Max records to return (default: 50, max: 100).                                     |
| `cursor`   | `string` (optional) | Transaction ID for cursor-based pagination (pass the last item's `id`).            |

**Example — Fetch Stock Transaction History:**

```
GET /transactions?walletId=<stock-wallet-id>&limit=20
```

**Response (array of transactions):**

```json
[
  {
    "id": "tx-id-1",
    "walletId": "stock-wallet-id",
    "toWalletId": null,
    "amount": "2.00",
    "description": "Stock Deposit",
    "metadata": {
      "senderEmail": "agent@example.com",
      "previousBalance": "3.00",
      "newBalance": "5.00",
      "stockSymbol": "STK"
    },
    "type": "TOP_UP",
    "status": "COMPLETED",
    "createdAt": "2024-03-01T10:30:00.000Z",
    "currency": {
      "code": "STOCK",
      "name": "System Stock",
      "symbol": "STK"
    }
  }
]
```

**Transaction Types for Stock (`type` field):**

| Type           | Meaning                     |
| -------------- | --------------------------- |
| `TOP_UP`       | Stock deposit or buy        |
| `TRANSFER_OUT` | Stock transfer sent or sold |
| `TRANSFER_IN`  | Stock transfer received     |

---

### `GET /transactions/:id` — Get One Transaction

Returns a single transaction by ID. Must belong to a wallet owned by the logged-in user.

---

## 4. Stock Investment (Buy) Request Lifecycle

When a user wants to **invest/buy stocks**, they create a `StockInvestmentRequest`. An admin must approve it before the stock balance is credited.

```
User submits → [PENDING] → Admin approves → [APPROVED] (balance credited)
                         → Admin rejects  → [REJECTED]
```

### `POST /deposit-requests/stock-investment` — Submit a Buy Request

**Request Body:**

```json
{
  "amount": "2000000",
  "stockSymbol": "STK"
}
```

**Response:**

```json
{
  "id": "request-id",
  "userId": "user-id",
  "walletId": "stock-wallet-id",
  "amount": "2000000",
  "stockSymbol": "STK",
  "status": "PENDING",
  "createdAt": "2024-03-01T00:00:00.000Z"
}
```

---

### `GET /deposit-requests/stock-investment` — List User's Buy Requests

Returns all stock investment requests for the logged-in user.

---

### `GET /deposit-requests/stock-investment/:id` — Get One Buy Request

---

## 5. Stock Sell Request Lifecycle

When a user wants to **sell stocks**, they create a `StockSellRequest`. An admin must approve it before the balance is debited.

```
User submits → [PENDING] → Admin approves → [APPROVED] (balance debited)
                         → Admin rejects  → [REJECTED]
```

### `POST /deposit-requests/stock-sell` — Submit a Sell Request

**Request Body:**

```json
{
  "stocksToSell": 2
}
```

**Response:**

```json
{
  "id": "request-id",
  "userId": "user-id",
  "walletId": "stock-wallet-id",
  "stocksToSell": 2,
  "amount": "4000000",
  "balanceBefore": "5.00",
  "status": "PENDING",
  "createdAt": "2024-03-01T00:00:00.000Z"
}
```

---

### `GET /deposit-requests/stock-sell` — List User's Sell Requests

### `GET /deposit-requests/stock-sell/:id` — Get One Sell Request

---

## 6. Admin-Only Endpoints

> [!NOTE]
> These endpoints require the user to have the `ADMIN` role.

| Method | Endpoint                                               | Description                                 |
| ------ | ------------------------------------------------------ | ------------------------------------------- |
| `GET`  | `/deposit-requests/admin/stock-investment`             | List all stock buy requests                 |
| `GET`  | `/deposit-requests/admin/stock-investment/pending`     | List only pending buy requests              |
| `POST` | `/deposit-requests/admin/stock-investment/:id/approve` | Approve a buy request                       |
| `POST` | `/deposit-requests/admin/stock-investment/:id/reject`  | Reject a buy request                        |
| `GET`  | `/deposit-requests/admin/stock-sell`                   | List all stock sell requests                |
| `POST` | `/deposit-requests/admin/stock-sell/:id/approve`       | Approve a sell request                      |
| `POST` | `/deposit-requests/admin/stock-sell/:id/reject`        | Reject a sell request                       |
| `POST` | `/deposit-requests/admin/stock-investment`             | Admin creates buy request on behalf of user |

**Approve/Reject Body (optional notes):**

```json
{
  "notes": "Approved — verified receipt."
}
```

---

## 7. Recommended Frontend Flow (Dashboard)

```
1. On app load / login:
   GET /wallets
   → Find wallet where currency.code === 'PHP'  → display as "Available Balance"
   → Find wallet where currency.code === 'STOCK' → display as "Stock Units"
   → Store both wallet IDs for use in later calls

2. Stock Transaction History screen:
   GET /transactions?walletId=<stockWalletId>

3. User wants to buy stocks:
   POST /deposit-requests/stock-investment

4. User wants to sell stocks:
   POST /deposit-requests/stock-sell

5. Check status of requests:
   GET /deposit-requests/stock-investment
   GET /deposit-requests/stock-sell
```
