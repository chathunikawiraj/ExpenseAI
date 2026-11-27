# Receipt Upload and OCR API

The endpoints below are part of the authenticated database-backed backend and use the `/api/v1` prefix. Send the existing JWT as `Authorization: Bearer <token>`. Upload endpoints accept one multipart file field named `receipt`.

## Upload and scan

`POST /api/v1/receipts/scan`

- Accepts JPG, JPEG, or PNG images up to 5 MB.
- Checks the file extension, media type, file signature, and decoded image content.
- Limits receipt uploads and replacements to 10 requests per authenticated user per 15 minutes.
- Stores the image, runs English-language Tesseract OCR, and parses vendor, date, total, and an existing category suggestion.
- Does **not** create an expense.

Example response:

```json
{
  "receiptId": "c0a80123-4567-4890-8123-456789abcdef",
  "fileUrl": "/api/v1/receipts/c0a80123-4567-4890-8123-456789abcdef/file",
  "ocrStatus": "SUCCEEDED",
  "confidence": 92,
  "manualEntryRequired": false,
  "extracted": {
    "vendor": "North Market",
    "date": "2028-02-29",
    "amount": 1234.5,
    "suggestedCategoryId": "b9e8e119-6f44-4ad0-9c2a-0cf52a6cc73c"
  },
  "receipt": {
    "id": "c0a80123-4567-4890-8123-456789abcdef",
    "receiptId": "c0a80123-4567-4890-8123-456789abcdef",
    "expenseId": null,
    "fileUrl": "/api/v1/receipts/c0a80123-4567-4890-8123-456789abcdef/file",
    "ocrVendor": "North Market",
    "ocrDate": "2028-02-29",
    "ocrAmount": 1234.5,
    "ocrStatus": "SUCCEEDED",
    "uploadedAt": "2028-02-29T10:00:00.000Z"
  }
}
```

Extraction values may be `null`; `ocrStatus` is `FAILED` and `manualEntryRequired` is `true` when OCR cannot provide all required fields. The uploaded image remains available for manual entry. OCR has a 30-second limit.

## Confirm an expense

`POST /api/v1/receipts/confirm`

Send the editable values reviewed by the user. Expense creation and receipt attachment happen in one database transaction and use the existing expense, category, budget, and notification behavior.

```json
{
  "receiptId": "c0a80123-4567-4890-8123-456789abcdef",
  "title": "North Market",
  "amount": 1234.5,
  "date": "2028-02-29",
  "categoryId": "b9e8e119-6f44-4ad0-9c2a-0cf52a6cc73c",
  "paymentMethod": "CREDIT_CARD",
  "description": "Weekly groceries"
}
```

The temporary receipt must belong to the authenticated user, be unconfirmed, and be less than 24 hours old. Expired receipts return `410`; already attached receipts return `409`. No expense is created by scanning alone.

## Receipt management

| Method and path | Behavior |
| --- | --- |
| `GET /api/v1/receipts/:id` | Return receipt metadata for the owning user. |
| `GET /api/v1/receipts/:id/file` | Return the local image or redirect to a short-lived signed Cloudinary URL. |
| `GET /api/v1/receipts/:id/view` | Alias for the secure file endpoint. |
| `PUT /api/v1/receipts/:id` | Validate and replace the image, then refresh OCR suggestions. It does not modify an attached expense. |
| `DELETE /api/v1/receipts/:id` | Delete receipt metadata and queue storage cleanup; an attached expense is retained. |

`PATCH /api/v1/receipts/:id/associate` remains available for compatibility with an existing expense owned by the same user. New receipt expense flows should use `/confirm`.

Every endpoint is authenticated and checks receipt ownership. Local files are served only through these authenticated routes. Cloudinary assets use authenticated delivery; the generated view URL expires after five minutes. Storage deletion failures are recorded in a retry queue.

## Configuration and migration

Copy `backend/.env.example` to `backend/.env`. For local development, omit all Cloudinary values to use the backend's `uploads/` directory. Production requires all three:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Do not expose these values to the frontend. Tesseract.js runs in the backend process and uses the English language model without an OCR API credential. By default, Tesseract.js fetches its trained data from jsDelivr during worker initialization, so the backend needs outbound network access on first use (the library caches the data). The additive receipt-storage migration is `20261128000000_receipt_storage_cleanup`. Review and back up the database, then use `npx prisma migrate deploy` from `backend/` to apply pending migrations. Do not reset or push the schema.
