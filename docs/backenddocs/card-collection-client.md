# Card Collection — Client API Documentation

## Overview

The Card Collection feature lets users unlock or purchase card skins for their Inspire Wallet card. There are 5 cards available: 1 free default card and 4 premium cards across two categories.

| Category | Card | Unlock Method | Cost |
|---|---|---|---|
| — | Default | Always free | Free |
| VIP | Diamond Elite | Single Time Deposit contract ≥ ₱10,000,000 | Free (TD-gated) |
| VIP | Gold Elite | Monthly auto-renewal from Available Balance | ₱10,000/month |
| Design | Orange Elite | One-time payment from Available Balance | ₱250 |
| Design | Royal Curve | One-time payment from Available Balance | ₱5,000 |

---

## Card Display Data (on Card Tab)

When displaying a card in the app's Card Tab, the following data is shown on the card face:
- **Account Number** (12-digit, format: XXXX XXXX XXXX)
- **First Name**
- **Middle Name** (shown only if present)
- **Last Name**
- **Available Balance**
- **Company Name** (shown only if present)

This data is returned by `GET /card-collection/my-collection` inside the `cardDisplayData` field.

---

## Endpoints

### 1. Get Card Catalog

`GET /card-collection/catalog`

**Auth:** Bearer JWT required

**Description:** Returns all 5 card designs with per-user eligibility and ownership flags. Use this to render the "buy card" UI for each card with a "Buy Card" / "Cancel" button pair.

**Response:**
```json
{
  "catalog": [
    {
      "design": "DEFAULT",
      "category": "DEFAULT_CATEGORY",
      "price": null,
      "isOwned": true,
      "isActive": true,
      "isEligible": true,
      "collectionItem": { ... }
    },
    {
      "design": "DIAMOND_ELITE",
      "category": "VIP",
      "price": null,
      "isOwned": false,
      "isActive": false,
      "isEligible": false,
      "collectionItem": null
    },
    {
      "design": "GOLD_ELITE",
      "category": "VIP",
      "price": 10000,
      "isOwned": false,
      "isActive": false,
      "isEligible": true,
      "collectionItem": null
    },
    {
      "design": "ORANGE_ELITE",
      "category": "DESIGN",
      "price": 250,
      "isOwned": false,
      "isActive": false,
      "isEligible": true,
      "collectionItem": null
    },
    {
      "design": "ROYAL_CURVE",
      "category": "DESIGN",
      "price": 5000,
      "isOwned": false,
      "isActive": false,
      "isEligible": false,
      "collectionItem": null
    }
  ]
}
```

---

### 2. Get My Collection

`GET /card-collection/my-collection`

**Auth:** Bearer JWT required

**Description:** Returns the current user's owned card collection and card display data. Use this for the **Your Collection** screen.

**Response:**
```json
{
  "cardDisplayData": {
    "accountNumber": "123456789012",
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "middleName": "Santos",
    "companyName": null,
    "availableBalance": "25000.00"
  },
  "collection": [
    {
      "id": "...",
      "userId": "...",
      "design": "ORANGE_ELITE",
      "category": "DESIGN",
      "status": "ACTIVE",
      "unlockedAt": "2026-03-03T07:16:00.000Z",
      "updatedAt": "2026-03-03T07:16:00.000Z",
      "subscription": null
    }
  ],
  "activeCard": { ... }
}
```

**`activeCard`**: the most recently active card item, or `null` if none (fallback to Default card).

---

### 3. Buy / Unlock a Card

`POST /card-collection/buy`

**Auth:** Bearer JWT required

**Request Body:**
```json
{ "design": "ORANGE_ELITE" }
```

Valid `design` values: `DIAMOND_ELITE`, `GOLD_ELITE`, `ORANGE_ELITE`, `ROYAL_CURVE`

**Business Rules per Card:**

| Card | Rule |
|---|---|
| Diamond Elite | Must have a single ACTIVE or MATURED Time Deposit contract ≥ ₱10,000,000. Multiple smaller contracts do NOT qualify. |
| Gold Elite | Must have Available Balance ≥ ₱10,000. First month is charged immediately. Auto-renews every 30 days. Card expires if balance insufficient at renewal time. |
| Orange Elite | Must have Available Balance ≥ ₱250. One-time charge. Never expires. |
| Royal Curve | Must have Available Balance ≥ ₱5,000. One-time charge. Never expires. |

**Success Response (201):**
```json
{
  "id": "...",
  "userId": "...",
  "design": "ORANGE_ELITE",
  "category": "DESIGN",
  "status": "ACTIVE",
  "unlockedAt": "2026-03-03T07:16:00.000Z",
  "updatedAt": "2026-03-03T07:16:00.000Z"
}
```

**Error Responses:**
| Status | Reason |
|---|---|
| 400 | Cannot buy Default card |
| 409 | Card already owned and active |
| 422 | Insufficient balance or does not meet TD requirement |

---

## Card Status Lifecycle

```
ACTIVE ──(Gold Elite: insufficient balance at renewal)──► EXPIRED
ACTIVE ──(admin revoke)──► REVOKED
EXPIRED ──(re-subscribe Gold Elite)──► ACTIVE
```

- **Default card** is always available even if the user has no collection items.
- **Gold Elite** auto-renews every 30 days via a nightly background job. If balance < ₱10,000 at renewal time, card status becomes `EXPIRED`.
