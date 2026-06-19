# Secure QR Verification System Workflow & Architecture

This document describes how the QR-Verification system secures, registers, stamps, and cryptographically verifies documents.

---

## 1. System Overview

The system consists of a robust full-stack architecture:
1. **Frontend App (Vite + React)**: A premium single-page application that provides the user interface for document issuance and verification. It securely transmits data to the backend and performs client-side hashing for visual verification feedback.
2. **Backend API (Node.js + Express + MongoDB)**: A production-ready REST API that handles secure document registration, server-side PDF generation/stamping (using `pdf-lib`), cryptographic hashing, database storage, and audit logging.

---

## 2. Core Cryptographic Concepts

To guarantee document integrity and prevent forgery, the system relies on standard cryptographic primitives:

- **SHA-256 Hashing**: Generates a unique 256-bit (32-byte) binary signature of any input (metadata text or binary PDF file). Even a single-bit change in the document will result in a completely different hash.
- **Dual-Hash System**:
  - `originalHash`: The hash of the un-stamped, source PDF (or the auto-generated blank template).
  - `issuedHash`: The hash of the final PDF *after* the QR code has been embedded.
- **QR Code Verification URL**: Contains a direct link to the system's `/verify/:documentId` route.

---

## 3. Workflow Diagrams

### A. Document Issuance & Stamping

```mermaid
sequenceDiagram
    actor Issuer as Document Issuer
    participant UI as React Frontend
    participant API as Express Backend
    participant DB as MongoDB
    participant Storage as File System

    Issuer->>UI: Fills metadata form and optionally uploads PDF
    UI->>API: POST /api/documents/upload (FormData)
    API->>API: Validates metadata & generates Document ID (e.g., DOC-2026-X9K2PJ)
    alt No PDF Uploaded
        API->>API: Generates default PDF template using metadata
    end
    API->>API: Computes SHA-256 of original PDF (originalHash)
    API->>API: Generates QR Code pointing to verify URL
    API->>API: Embeds QR Code into PDF (stampedPdfBuffer)
    API->>API: Computes SHA-256 of stamped PDF (issuedHash)
    API->>Storage: Saves final stamped PDF to /uploads
    API->>DB: Stores metadata, hashes, and masked sensitive data
    API-->>UI: Returns Document ID, QR DataURL, and PDF Base64
    UI->>Issuer: Triggers automatic download of stamped PDF
```

### B. Document Verification

```mermaid
sequenceDiagram
    actor Verifier as Document Verifier
    participant UI as React Frontend
    participant API as Express Backend
    participant DB as MongoDB

    Verifier->>UI: Enters Document ID or scans QR code
    UI->>API: GET /api/verify/:documentId
    API->>DB: Looks up Document ID
    API->>DB: Logs Verification Audit Record
    DB-->>API: Returns public metadata (status, issuer, dates)
    API-->>UI: Displays verified record HUD
    Verifier->>UI: Drags & drops the stamped PDF for crypto audit
    UI->>API: POST /api/verify/upload (FormData with file)
    API->>API: Computes SHA-256 hash of uploaded file
    API->>DB: Looks up Document by Document ID or Hash
    alt Hash matches issuedHash
        API->>DB: Logs "Valid" Audit Record
        API-->>UI: Returns success metadata
        UI-->>Verifier: Displays "Verified Authentic" (Green HUD)
    else Hash does not match
        API->>DB: Logs "Invalid" Tamper Attempt
        API-->>UI: Returns TAMPER ALERT
        UI-->>Verifier: Displays "TAMPERED / Flagged" (Red Warning HUD)
    end
```

---

## 4. Component-by-Component Walkthrough

### A. Frontend React Application (`/frontend`)

#### 1. Registration (`UploadPage`)
- **Metadata Form**: Allows selection of document category (e.g., Certificate, Marksheet, Medical Report) and dynamic rendering of input fields based on the selected schema.
- **API Integration**: Collects form data and files into a `FormData` object and POSTs to `/api/documents/upload`.

#### 2. Verification (`VerifyPage` & `CustomDropzone`)
- **Interactive Dropzone**: Allows dragging and dropping a PDF file for verification.
- **Backend Audit**: Forwards the file to `/api/verify/upload` where the complete cryptographic audit occurs.
- **Visual HUD**: Displays the status (Active, Revoked), document metadata, and clearly flags if a tamper attempt (Hash Mismatch) is detected.

---

### B. Backend REST API (`/server`)

1. **Database Models (`/models`)**:
   - `Document`: Holds document metadata, `originalHash`, `issuedHash`, QR URL, verification count, and dynamically masked `typeSpecificData`.
   - `VerificationRecord`: Logs every public verification request (IP address, user agent, timestamp, result) for audit trail tracking.
   - `User`: Handles issuer accounts.


2. **Routes & Controllers (`/routes`, `/controllers`)**:
   - `documentController`: Handles issuance. It isolates common fields from type-specific fields, delegates PDF generation if no file is uploaded, computes both `originalHash` and `issuedHash`, and saves to MongoDB.
   - `verifyController`: Handles public verification checks. Returns only safe, public metadata, preventing exposure of internal hashes or sensitive user details unless successfully matched.

3. **Stamping & Storage (`/utils`)**:
   - `generateDefaultPdf.js`: Creates a premium PDF template if the user didn't upload one.
   - `embedQR.js`: Uses `pdf-lib` to overlay the QR code onto the final page of the PDF.
   - `hashFile.js`: Performs the crucial SHA-256 binary fingerprinting.
   - Files are stored in the `/uploads` folder.