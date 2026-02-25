# Admin Email Send API (Frontend Reference)

Admin endpoint for sending emails to recipients via EmailJS. Requires `Authorization: Bearer <admin_token>` and ADMIN role.

---

## POST /email/admin/send-recipient

Sends an email to a recipient via EmailJS using the recipient template. Uses `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, and `EMAILJS_RECIPIENT_EMAIL_TEMPLATE_ID` from .env.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestId` | string | Yes | Reference ID (e.g. deposit/withdrawal request ID) |
| `toEmail` | string | Yes | Recipient email address |
| `subject` | string | Yes | Email subject |
| `content` | string | Yes | Email body content |

**Response**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the email was sent |
| `requestId` | string | Echo of request ID |
| `toEmail` | string | Echo of recipient |
| `message` | string | Success message (when success is true) |
| `error` | string | Error message (when success is false) |

**EmailJS template params**  
The recipient template must define: `{{request_id}}`, `{{to_email}}`, `{{subject}}`, `{{content}}`.

**Example request**
```json
{
  "requestId": "clxx123",
  "toEmail": "user@example.com",
  "subject": "Your withdrawal request status",
  "content": "Your withdrawal request has been approved."
}
```
