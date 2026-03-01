# Frontend Integration: Banking & E-Wallet Applications

This guide explains how the frontend must send application data to the backend so that **ID documents reach Supabase storage** and are stored correctly. The backend expects **JSON with base64-encoded images**, not `FormData` or `File` objects.

---

## Critical: Request Format

| Requirement | Details |
|-------------|---------|
| **Content-Type** | `application/json` |
| **Body format** | JSON object (not FormData) |
| **Image format** | Base64 string (e.g. `data:image/jpeg;base64,/9j/4AAQ...`) |
| **Auth** | `Authorization: Bearer <JWT>` |

**Do not use `FormData` or send `File` objects.** The backend does not parse multipart form data for these endpoints. If you send FormData, the backend will not receive the images and Supabase will remain empty.

---

## Converting File to Base64

When the user selects an image (e.g. from `<input type="file">`), you must convert the `File` to a base64 data URL before including it in the JSON payload.

### Using `FileReader` (recommended)

```javascript
/**
 * Convert a File to a base64 data URL string.
 * @param {File} file - The file from input[type=file]
 * @returns {Promise<string>} - e.g. "data:image/jpeg;base64,/9j/4AAQ..."
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### React/JSX example

```javascript
// Before submit, convert each File to base64
const handleSubmit = async () => {
  let passportPhoto = null;
  let idFront = null;
  let idBack = null;

  if (passportFile) {
    passportPhoto = await fileToBase64(passportFile);
  }
  if (idFrontFile) {
    idFront = await fileToBase64(idFrontFile);
  }
  if (idBackFile) {
    idBack = await fileToBase64(idBackFile);
  }

  const payload = {
    bank: selectedBank,
    sourceOfFund: sourceOfFund,
    grossMonthlyIncome: grossMonthlyIncome,
    grossMonthlyIncomeCurrency: grossMonthlyIncomeCurrency,
    idType: idType,
    passportPhoto,  // base64 string or undefined
    idFront,        // base64 string or undefined
    idBack,         // base64 string or undefined
    personalInfo: { firstName, lastName, middleName, gender, dateOfBirth, civilStatus, citizenship },
    contactInfo: { phone, email },
    addressInfo: { completeAddress, street, city, province, zip },
  };

  const response = await fetch(`${API_BASE}/applications/banking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  // ...
};
```

---

## Banking Application Request

**Endpoint:** `POST /applications/banking`

### Full payload example (Passport)

```json
{
  "bank": "UnionBank",
  "sourceOfFund": "Employment",
  "grossMonthlyIncome": "50000",
  "grossMonthlyIncomeCurrency": "PHP",
  "idType": "Passport",
  "passportPhoto": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQACEQADAL8Af//Z",
  "personalInfo": {
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "middleName": "Santos",
    "gender": "Male",
    "dateOfBirth": "1990-01-15",
    "civilStatus": "Single",
    "citizenship": "Filipino"
  },
  "contactInfo": {
    "phone": "+639171234567",
    "email": "juan@example.com"
  },
  "addressInfo": {
    "completeAddress": "123 Main St, Manila"
  }
}
```

### Full payload example (Driver License / National ID)

```json
{
  "bank": "Security Bank",
  "sourceOfFund": "Business",
  "grossMonthlyIncome": "80000",
  "grossMonthlyIncomeCurrency": "PHP",
  "idType": "Driver License",
  "idFront": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "idBack": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "personalInfo": { "firstName": "Maria", "lastName": "Santos", "..." },
  "contactInfo": { "phone": "...", "email": "..." },
  "addressInfo": { "completeAddress": "..." }
}
```

---

## E-Wallet Application Request

**Endpoint:** `POST /applications/ewallet`  
No ID documents; omit `passportPhoto`, `idFront`, `idBack`.

```json
{
  "provider": "GCash",
  "sourceOfFund": "Employment",
  "grossMonthlyIncome": "60000",
  "grossMonthlyIncomeCurrency": "PHP",
  "personalInfo": { "..." },
  "contactInfo": { "..." },
  "addressInfo": { "..." }
}
```

---

## Validation Rules

| Field | Valid values |
|-------|--------------|
| `bank` | `UnionBank`, `Security Bank`, `CTBC`, `BDO` |
| `sourceOfFund` | `Employment`, `Business`, `Investment`, `Inheritance`, `Pension`, `Other` |
| `grossMonthlyIncomeCurrency` | `PHP`, `USD`, `EUR` |
| `idType` | `Passport`, `Driver License`, `National ID`, `OTHER` |
| `passportPhoto` | Base64 or data URL; required when `idType === "Passport"` |
| `idFront` | Base64 or data URL; required when `idType` is Driver License or National ID |
| `idBack` | Base64 or data URL; required when `idType` is Driver License or National ID |

- **Image formats:** JPEG, PNG, GIF, WebP  
- **Max image size:** 5 MB (decoded)  
- **Base64 format:** Either `data:image/jpeg;base64,<data>` or raw `<data>`

---

## Troubleshooting: Why Isn't Data Reaching Supabase?

### Checklist

1. **Are you using JSON, not FormData?**
   - ❌ `new FormData()` + `formData.append('passportPhoto', file)`
   - ✅ `JSON.stringify({ passportPhoto: base64String })`

2. **Are images base64 strings?**
   - ❌ Sending `File` or `Blob` directly
   - ✅ Convert with `FileReader.readAsDataURL(file)` and send the result

3. **Is Content-Type correct?**
   - ❌ `Content-Type: multipart/form-data` (or omitted)
   - ✅ `Content-Type: application/json`

4. **Is the JWT included?**
   - ✅ `Authorization: Bearer <token>`

5. **Is the payload under body size limits?**
   - Large base64 images increase payload size. Ensure your HTTP client and server allow larger bodies if needed.

### Verify in DevTools

1. Open **Network** tab.
2. Submit the application.
3. Select the `POST /applications/banking` request.
4. Check **Request Headers**: `Content-Type: application/json`.
5. Check **Request Payload**: You should see `passportPhoto`, `idFront`, and/or `idBack` as long strings starting with `data:image/...;base64,` or a long base64 block.

If those fields are missing or empty, the backend never receives the images and nothing is uploaded to Supabase.

---

## Response

- **201 Created:** Application created; documents stored in DB and Supabase.
- **400 Bad Request:** Validation error (check response body for details).
- **401 Unauthorized:** Missing or invalid JWT.

---

## Reference

- Backend API spec: [API-BANKING-EWALLET-APPLICATIONS.md](./API-BANKING-EWALLET-APPLICATIONS.md)
- Storage layout: `uniqueID-files` bucket, path `{userId}-{date}-{idType}/{documentId}.{ext}`
