# Travel Protection API

This document describes the API endpoints for the Travel Protection feature.

## Client Endpoints

### 1. Submit a Travel Protection Request

- **Endpoint:** `POST /travel-protection`
- **Auth:** Required (User Role: USER)
- **Description:** Submits a new travel protection request and calculates the price automatically (625 PHP if active time deposit, 1250 PHP otherwise).

**Request Body** (JSON format)
```json
{
  "email": "user@example.com",
  "mobile": "+639123456789",
  "landline": "02-123-4567",
  "homeAddress": "123 Main St, City",
  "gender": "Male",
  "dateOfBirth": "1990-01-01",
  "civilStatus": "Single",
  "citizenship": "Filipino",
  "sourceOfFund": "Employment",
  "grossMonthlyIncome": "50000",
  "cashOnHand": "20000",
  "destinationAddress": "Tokyo, Japan",
  "checkInDate": "2025-12-01",
  "duration": "7 days",
  "airlineType": "PAL",
  "departureTime": "08:00 AM",
  "arrivalTime": "12:00 PM",
  "passportNumber": "P12345678A",
  "purposeOfTravel": "Tourism",
  "passportPhoto": "data:image/jpeg;base64,... (base64 string)"
}
```

**Response** (201 Created)
```json
{
  "id": "cm...",
  "status": "PENDING",
  "price": "1250.00",
  "createdAt": "2025-10-01T12:00:00.000Z"
}
```

## Admin Endpoints

### 1. List Travel Protection Requests

- **Endpoint:** `GET /admin/travel-protection`
- **Auth:** Required (User Role: ADMIN)
- **Query Params:** `status` (optional, e.g., PENDING, APPROVED, REJECTED)

**Response** (200 OK)
```json
[
  {
    "id": "cm...",
    "userId": "usr_...",
    "status": "PENDING",
    "price": "1250.00",
    "createdAt": "2025-10-01T12:00:00.000Z",
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com"
    }
  }
]
```

### 2. Get Travel Protection Request Detail

- **Endpoint:** `GET /admin/travel-protection/:id`
- **Auth:** Required (User Role: ADMIN)
- **Description:** Retrieves fully decrypted details of the request, including a signed view URL and an image endpoint URL for the passport photo.

**Response** (200 OK)
```json
{
  "id": "cm...",
  "userId": "usr_...",
  "status": "PENDING",
  "price": "1250.00",
  "createdAt": "2025-10-01T12:00:00.000Z",
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com"
  },
  "personalInfo": {
    "gender": "Male",
    "dateOfBirth": "1990-01-01",
    "civilStatus": "Single",
    "citizenship": "Filipino",
    "passportNumber": "P12345678A"
  },
  "contactInfo": {
    "email": "user@example.com",
    "mobile": "+639123456789",
    "landline": "02-123-4567"
  },
  "addressInfo": {
    "homeAddress": "123 Main St, City"
  },
  "financialInfo": {
    "sourceOfFund": "Employment",
    "grossMonthlyIncome": "50000",
    "cashOnHand": "20000"
  },
  "travelInfo": {
    "destinationAddress": "Tokyo, Japan",
    "checkInDate": "2025-12-01",
    "duration": "7 days",
    "airlineType": "PAL",
    "departureTime": "08:00 AM",
    "arrivalTime": "12:00 PM",
    "purposeOfTravel": "Tourism"
  },
  "passportPhotoDocument": {
    "id": "doc_...",
    "viewUrl": "https://<supabase-url>/storage/v1/object/sign/uniqueID-files/...",
    "imageUrl": "travel-protection/admin/cm.../documents/doc_.../image"
  }
}
```

### 3. Update Request Status

- **Endpoint:** `PATCH /admin/travel-protection/:id/status`
- **Auth:** Required (User Role: ADMIN)

**Request Body**
```json
{
  "status": "APPROVED" // or REJECTED
}
```

**Response** (200 OK)
```json
{
  "id": "cm...",
  "status": "APPROVED"
}
```
