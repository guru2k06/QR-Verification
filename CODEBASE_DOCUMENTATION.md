# System Codebase & Workflow Documentation

This document provides a comprehensive overview of the Secure QR-Verification platform. It breaks down the high-level workflow, the purpose of every active file in the repository, and the responsibility of every function within those files.

---

## 1. High-Level Workflow

The system operates in two primary phases: **Document Issuance (Registration)** and **Document Verification (Auditing)**.

### A. Document Issuance Workflow
1. **Frontend**: The user accesses the `UploadPage` (`/`), selects a document category, fills in metadata, and optionally uploads a raw PDF.
2. **Submission**: The frontend sends a `multipart/form-data` POST request to the backend at `/api/documents/upload`.
3. **Backend Middleware**: The request passes through a rate limiter (`rateLimiter.js`) and a file parser (`uploadMiddleware.js`).
4. **Backend Controller (`uploadDocument`)**:
   - Computes the `originalHash` of the raw uploaded PDF.
   - Generates a unique Document ID (`generateDocId.js`).
   - Generates a secure QR code pointing to the public verification URL (`generateQR.js`).
   - Stamps the QR code and metadata onto the PDF (`embedQR.js`).
   - Computes the `issuedHash` of the final stamped PDF.
   - Saves the final PDF to disk (`storage.js`).
   - Saves the document record to MongoDB (`Document.js`).
5. **Response**: The backend returns the stamped PDF buffer directly to the frontend, allowing the user to download the final secure document.

### B. Document Verification Workflow
1. **Frontend**: The user accesses the `VerifyPage` (`/verify`) and uploads a stamped PDF they wish to verify.
2. **Submission**: The frontend sends the PDF to the backend at `/api/verify/upload`.
3. **Backend Controller (`verifyUpload`)**:
   - Calculates the SHA-256 hash of the uploaded file.
   - Queries MongoDB to find a document where `issuedHash` matches the calculated hash.
   - If found, it ensures the document is not "Revoked".
   - Logs an audit trail in the database (`VerificationRecord.js`).
   - Returns the verification metadata (Issuer, Issue Date, Status) to the frontend.
4. **Result**: The frontend displays a "Verified" success screen or an "Invalid/Tampered" alert based on the backend response.

---

## 2. Frontend Directory (`frontend/src/`)

### `App.jsx`
**Purpose**: The central entry point, router, and UI host for the React application. It defines the layout, handles page navigation, and renders the upload and verification forms.

**Functions**:
- **`getDocumentTypeConfig(type)`**: Returns schema configurations (keys, categories) for a specific document type.
- **`getDocumentCategory(documentType)`**: Helper to extract the broad category (e.g., 'Academic') from a specific document type.
- **`getIssuanceFieldSchema(documentType)`**: Returns the specific metadata fields required when issuing a new document of this type.
- **`getVerificationFieldSchema(documentType)`**: Returns the specific metadata fields to display when successfully verifying this type of document.
- **`getTodayDateString()`**: Helper to get the current date formatted as `YYYY-MM-DD` for default form values.
- **`AppLayout({ children })`**: The UI wrapper component. It renders the top navigation bar, the logo, and handles the "Waking up server" loading banner for free-tier hosting cold starts.
- **`CustomDropzone({ file, setFile })`**: A reusable, interactive drag-and-drop file input component used by both the Upload and Verify pages.
- **`UploadPage()`**: The React component for the "Issue" tab. It manages the issuance form state, handles the `fetch` POST to `/api/documents/upload`, and triggers the browser download of the returned stamped PDF.
- **`VerificationState({ status, reason, message })`**: A pure UI component that renders the success, warning, or error banners based on the backend's verification response.
- **`ResultDetails({ record })`**: A UI component that dynamically renders a table of metadata (like Student Name, Grade, etc.) based on the document's category.
- **`VerifyPage()`**: The React component for the "Verify" tab. It handles file selection, sends the file to `/api/verify/upload` via `fetch`, and stores the verification outcome in state to be rendered by `VerificationState` and `ResultDetails`.
- **`HomeRedirect()`**: A simple utility component that catches invalid routes and redirects the user back to the homepage (`/`).
- **`App()`**: The root component that sets up the `BrowserRouter` and maps URL paths to their respective page components.

### `utils/verification.js`
**Purpose**: Contains frontend utility functions for formatting and displaying verification records.
- **`getVerificationRecordView(record)`**: A UI helper function that restructures complex, nested verification data from the backend into a flat, easy-to-read object so the `ResultDetails` component can display it simply.

### `components/Tooltip.jsx`
**Purpose**: A reusable, purely presentational UI component.
- **`Tooltip({ children, text })`**: Wraps any UI element to display a small hover-over text box with helpful hints or descriptions.

---

## 3. Backend Directory (`server/`)

### `server.js`
**Purpose**: The primary entry point for the Node.js/Express backend.
**Functions**:
- Initializes the Express app.
- Configures global middleware (CORS, Helmet security headers, Morgan logging, JSON parsing).
- Connects to the MongoDB database.
- Mounts all API route handlers (`/api/documents` and `/api/verify`).
- Serves static files from the `/uploads` directory.
- Mounts the global `errorHandler`.
- Starts the HTTP server listening on a specified port.

### `config/db.js`
**Purpose**: Manages the connection to the MongoDB cluster.
- **`connectDB()`**: An asynchronous function that uses Mongoose to connect to the database URL provided in the `.env` file, handling connection success or immediate process exit on failure.

---

### `models/` (Database Schemas)

#### `Document.js`
**Purpose**: Defines the Mongoose schema for the core Document entity.
- Represents a registered document, storing its IDs, type, issuer, recipient details, security hashes (`originalHash` and `issuedHash`), status (`Active`, `Revoked`), and verification count.

#### `VerificationRecord.js`
**Purpose**: Defines the schema for the audit trail.
- Represents a single instance of someone attempting to verify a document. Stores the timestamp, result (`Valid`, `Invalid`, `Revoked`, `NotFound`), IP address, and User-Agent.


---

### `routes/` (API Endpoints)

#### `documentRoutes.js`
**Purpose**: Maps HTTP routes related to document issuance and management to their controller functions.
- `POST /upload`: Maps to `uploadDocument` (Wrapped in `uploadLimiter` and Multer `upload.single('file')`).
- `GET /`: Maps to `getDocuments`.
- `GET /:documentId`: Maps to `getDocumentById`.
- `PATCH /:documentId/revoke`: Maps to `revokeDocument`.

#### `verifyRoutes.js`
**Purpose**: Maps HTTP routes related to document auditing.
- `GET /:documentId`: Maps to `verifyById`.
- `POST /upload`: Maps to `verifyUpload` (Wrapped in `apiLimiter` and Multer `upload.single('file')`).

---

### `controllers/` (Core Business Logic)

#### `documentController.js`
**Purpose**: Handles the logic for creating, viewing, and revoking documents.
- **`getCategory(documentType)`**: A private helper that maps a specific document type string back to its parent category for database storage purposes.
- **`uploadDocument(req, res)`**: The heaviest controller. Parses the incoming form, handles cases where a PDF is uploaded vs when the system must generate a default PDF, computes initial hashes, delegates PDF stamping to the utils, computes final hashes, saves files to disk, and saves the final record to MongoDB. Returns the raw PDF buffer to the client.
- **`getDocuments(req, res)`**: Retrieves a paginated list of all registered documents. Often used for administrative dashboards.
- **`getDocumentById(req, res)`**: Retrieves a specific document's full details, including its historical verification audit trail (`VerificationRecord` entries).
- **`revokeDocument(req, res)`**: Allows an issuer to flag a document as 'Revoked' (invalidated) and appends a reason. Subsequent verification attempts will flag the document as revoked.

#### `verifyController.js`
**Purpose**: Handles the cryptographic auditing and verification logic.
- **`verifyById(req, res)`**: Looks up a document by its text ID. Increments its verification count, logs a `VerificationRecord` audit entry, and returns public metadata (does not return internal hashes).
- **`verifyUpload(req, res)`**: The core verification engine. Accepts an uploaded PDF, re-calculates its SHA-256 hash using `hashFile`, queries the database for a matching `issuedHash`, logs the attempt (whether it is a match, a tampering attempt, or a revoked document), and returns the final validation outcome to the frontend.

---

### `middleware/` (Request Interceptors)

#### `uploadMiddleware.js`
**Purpose**: Configures the `multer` package.
- **`upload`**: Intercepts incoming requests containing `multipart/form-data`, extracts the file (enforcing a 10MB size limit and PDF-only restriction), and stores it in memory (`memoryStorage`) so the controllers can mathematically manipulate it before saving.

#### `rateLimiter.js`
**Purpose**: Defends against DDoS and brute-force spam attacks.
- **`apiLimiter`**: Restricts general API endpoints to 100 requests per 15 minutes per IP.
- **`uploadLimiter`**: Restricts heavier upload/stamping endpoints to 20 requests per 15 minutes per IP.

#### `errorHandler.js`
**Purpose**: The global fail-safe for the backend.
- **`errorHandler(err, req, res, next)`**: Catches any unhandled exceptions, mongoose validation errors, or multer file-size errors thrown anywhere in the app, preventing server crashes and returning a cleanly formatted JSON error response to the client.

---

### `utils/` (Helper Services)

#### `hashFile.js`
- **`hashFile(buffer)`**: Takes a raw file buffer in memory and uses Node's native `crypto` library to calculate and return its secure SHA-256 cryptographic hash.

#### `generateDocId.js`
- **`generateDocId(documentType)`**: Generates a random, unique 6-character alphanumeric document ID and ensures it doesn't collide with existing records in the database.

#### `generateQR.js`
- **`generateQR(url)`**: Uses the `qrcode` library to take a string (the verification URL) and render it into a Base64 PNG image string.

#### `embedQR.js`
- **`embedQR(pdfBuffer, qrDataUrl, metadata)`**: Uses the `pdf-lib` library to parse an existing PDF buffer. It calculates coordinates on the last page, draws a white background box, paints the QR code PNG on top, draws text (like Issue Date and Verification URL), embeds clickable hyperlinks over the QR code, and returns the mathematically altered PDF buffer.

#### `generateDefaultPdf.js`
- **`generateDefaultPdf(metadata)`**: Used when the user issues a document *without* uploading their own PDF. It uses `pdf-lib` to create a blank PDF from scratch, draws a custom bordered template, writes the metadata onto the page, and prepares it for the `embedQR` function.

#### `storage.js`
- **`savePdfLocally(pdfBuffer, documentId)`**: Takes the final stamped PDF buffer and writes it to the server's local file system inside the `/uploads` directory, returning the final file path for database storage.


---
*End of Documentation*
