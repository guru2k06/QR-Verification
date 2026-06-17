# Secure PDF Verification System Backend

This Node.js/Express backend provides a robust and secure solution for issuing and verifying digital certificates, transcripts, and credentials. It enables authentic PDF issuance by hashing documents, generating and embedding QR codes, and permitting public verification via an API or file-upload comparisons while preserving data privacy with type-specific masking.

This server runs in a **fully public configuration** (no authentication or user account registration required), allowing immediate public document issuance, retrieval, and verification.

---

## Technical Stack
* **Runtime**: Node.js (version 18+)
* **Framework**: Express.js
* **Database**: MongoDB (Mongoose ORM)
* **Cryptographic Hashing**: Node `crypto` (SHA-256)
* **PDF Stamping**: `pdf-lib`
* **QR Code Generation**: `qrcode`
* **Security**: `helmet`, `cors`, `express-rate-limit`

---

## Directory Structure

```
/server
  /config
    db.js              # Database connection configuration
  /controllers
    documentController.js # Upload, query, details, and revoke controllers (Public)
    verifyController.js # Public ID lookup & file upload check controllers (Public)
  /middleware
    uploadMiddleware.js # Multer configurations for PDF uploads
    rateLimiter.js     # Rate limits for public endpoints
    errorHandler.js    # Centralized exception response sanitization
  /models
    Counter.js         # Sequenced document counter
    Document.js        # Core issued metadata & masked document details
    VerificationRecord.js # Audit verification logging
  /routes
    documentRoutes.js  # Document issuance & revoke routes (Public)
    verifyRoutes.js    # Public verification lookup routes (Public)
  /scripts
    seed.js            # Sequential counter bootstrap script
    createTestPdf.js   # Dummy PDF generation tool for local REST testing
  /utils
    hashFile.js        # SHA-256 hex digest utility
    generateDocId.js   # Sequential atomic ID generator
    generateQR.js      # QR code generator buffer tool
    embedQR.js         # PDF drawing & metadata overlay utility
    maskSensitiveData.js # Privacy filters based on document type
    storage.js         # Upload disk writer abstraction
  server.js            # Entry application setup
```

---

## Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0+)
* [MongoDB](https://www.mongodb.com/) (running instance locally or Atlas cloud connection URI)

### Setup Steps
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   copy .env.example .env
   ```
4. Update `.env` with your Mongo URI configuration if necessary.

---

## Database Seeding
To initialize the database counter for the current year, run:
```bash
npm run seed
```

---

## Development Execution
To run the Express development server with live reload / watch mode:
```bash
npm run dev
```
The server starts by default on `http://localhost:5000`.

---

## API Endpoints Reference

### 1. Document Issuance Router (`/api/documents`)
All endpoints below are public.

* **POST `/api/documents/upload`** (Public Access)
  * **Content-Type**: `multipart/form-data`
  * **Form Fields**:
    * `file`: (Binary PDF File)
    * `documentType`: (String e.g. `Academic`, `Employment`, `Medical Report`, `Invoice`, `Legal Document`, `Identity Document`)
    * `studentName`/`employeeName`/`patientName`/`payerPayeeName`/`partyNames`/`idName`: (Category-specific required fields)
    * Additional fields (e.g. `rollNumber`, `course`, `gradeCgpa`, `yearOfPassing` etc.) passed in form-data parameters.
  * **Response (201)**:
    ```json
    {
      "success": true,
      "message": "Document issued successfully",
      "data": {
        "documentId": "DOC-2026-0001",
        "downloadUrl": "/uploads/1726512312-test-sample.pdf",
        "qrCodeUrl": "http://localhost:5173/verify/DOC-2026-0001"
      }
    }
    ```

* **GET `/api/documents`** (Public Access)
  * Lists all issued documents. Supports query filtering: `?page=1&limit=10&documentType=Academic&status=Active`.
  * **Response (200)**:
    ```json
    {
      "success": true,
      "count": 1,
      "pagination": {},
      "data": [
        {
          "_id": "64efca12...",
          "documentId": "DOC-2026-0001",
          "documentType": "Academic",
          "fileName": "1726512312-test-sample.pdf",
          "status": "Active",
          "recipientName": "Guru N",
          "issuer": "Guru Academy",
          "verificationCount": 3
        }
      ]
    }
    ```

* **GET `/api/documents/:documentId`** (Public Access)
  * Returns detailed metadata details including complete verification check records.
  * **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "document": { ... },
        "verificationHistory": [
          {
            "documentId": "DOC-2026-0001",
            "result": "Valid",
            "checkedHash": "b4c6f3...",
            "ipAddress": "::1",
            "userAgent": "Mozilla...",
            "timestamp": "2026-06-17..."
          }
        ]
      }
    }
    ```

* **PATCH `/api/documents/:documentId/revoke`** (Public Access)
  * Revokes document verification status.
  * **Payload**:
    ```json
    {
      "reason": "Transcript adjusted due to score errors"
    }
    ```
  * **Response (200)**:
    ```json
    {
      "success": true,
      "message": "Document successfully revoked",
      "data": {
        "documentId": "DOC-2026-0001",
        "status": "Revoked",
        "revocationReason": "Transcript adjusted due to score errors"
      }
    }
    ```

---

### 2. Public Verification Router (`/api/verify`)
All endpoints below are public and rate-limited (max 20 requests/min per IP).

* **GET `/api/verify/:documentId`** (Public Access)
  * Checks document authenticity.
  * **Response (200 - Active Document)**:
    ```json
    {
      "success": true,
      "data": {
        "documentId": "DOC-2026-0001",
        "documentType": "Academic",
        "issuer": "Guru Academy",
        "recipientName": "Guru N",
        "issueDate": "2026-06-17T00:00:00.000Z",
        "status": "Active",
        "verificationCount": 4,
        "typeSpecificData": {
          "rollNumber": "ROLL-2026-9051",
          "course": "Computer Science and Engineering",
          "gradeCgpa": "9.8/10",
          "yearOfPassing": "2026"
        }
      },
      "message": "Document verified successfully"
    }
    ```
  * **Response (200 - Revoked Document)**:
    ```json
    {
      "success": true,
      "data": {
        "documentId": "DOC-2026-0001",
        "status": "Revoked",
        "revokedAt": "2026-06-17T09:44:12.123Z",
        "revocationReason": "Transcript adjusted due to score errors"
      },
      "message": "This document has been revoked"
    }
    ```
  * **Response (404 - Not Found / Unregistered)**:
    ```json
    {
      "success": false,
      "message": "Document not found"
    }
    ```

* **POST `/api/verify/upload`** (Public cryptographic recheck)
  * Recompute hash of the uploaded document and compare against database.
  * **Content-Type**: `multipart/form-data`
  * **Fields**:
    * `file`: (Binary PDF File)
    * `documentId`: `DOC-2026-0001`
  * **Response (200 - Hash Match)**:
    * Same structure as GET verify: returns public-safe metadata.
  * **Response (200 - Mismatch/Tampered)**:
    ```json
    {
      "success": false,
      "status": "INVALID",
      "reason": "Hash Mismatch Detected",
      "message": "Possible Tampering Found"
    }
    ```

---

## Security Features Built-In
1. **No Data Leakage**: Public endpoints hide original hashes, raw sensitive data, database internal errors, or system stack traces.
2. **CORS lock**: Origins restricted in production.
3. **Helmet**: Protection against clickjacking, script injection, and MIME types sniffing.
4. **Rate Limiter**: Express-rate-limit caps requests on `/api/verify` namespace to 20 queries/min to block automated harvesting.
5. **Secure PDF QR Overlay**: Places stamps strictly on the last page footer using `pdf-lib` coordinates to leave main content readable.
