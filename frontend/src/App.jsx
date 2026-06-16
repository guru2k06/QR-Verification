import React, { useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mockDocuments } from './data/mockDocuments';
import { getNextDocumentId, getVerificationOutcome, getVerificationRecordView } from './utils/verification';

const DOCUMENT_TYPE_CONFIG = {
  Certificate: { category: 'Academic', note: 'Best for certificates and academic completion documents.' },
  Marksheet: { category: 'Academic', note: 'Use the official academic record details.' },
  Degree: { category: 'Academic', note: 'Use final degree details.' },
  Bonafide: { category: 'Academic', note: 'Use institutional confirmation details.' },
  'Offer Letter': { category: 'Employment', note: 'Use pre-joining offer details.' },
  'Experience Letter': { category: 'Employment', note: 'Use employment history details.' },
  'Medical Report': { category: 'Medical Report', note: 'Keep diagnosis and results out of the verification page.' },
  Invoice: { category: 'Invoice', note: 'Use billing information only.' },
  'Legal Document': { category: 'Legal', note: 'Use notarized or execution details only.' },
  'Identity Document': { category: 'Government ID', note: 'Mask sensitive ID numbers on the verification page.' }
};

const ISSUANCE_FIELD_SCHEMAS = {
  Academic: [
    { key: 'studentName', label: 'Student name', placeholder: 'Full student name' },
    { key: 'rollNumber', label: 'Roll number', placeholder: 'Roll / register number' },
    { key: 'institution', label: 'Institution', placeholder: 'School / college / university' },
    { key: 'course', label: 'Course', placeholder: 'Course or program name' },
    { key: 'gradeCgpa', label: 'Grade / CGPA', placeholder: 'Grade or CGPA' },
    { key: 'yearOfPassing', label: 'Year of passing', placeholder: 'YYYY' }
  ],
  Employment: [
    { key: 'employeeName', label: 'Employee name', placeholder: 'Full employee name' },
    { key: 'designation', label: 'Designation', placeholder: 'Job title' },
    { key: 'company', label: 'Company', placeholder: 'Organization name' },
    { key: 'joiningRelievingDate', label: 'Date of joining / relieving', placeholder: 'YYYY-MM-DD' }
  ],
  'Medical Report': [
    { key: 'patientName', label: 'Patient name', placeholder: 'Patient name or masked name' },
    { key: 'hospital', label: 'Hospital', placeholder: 'Hospital or clinic name' },
    { key: 'reportType', label: 'Report type', placeholder: 'Blood test, X-ray, etc.' },
    { key: 'reportDate', label: 'Report date', placeholder: 'YYYY-MM-DD' }
  ],
  Invoice: [
    { key: 'invoiceNumber', label: 'Invoice number', placeholder: 'INV-0001' },
    { key: 'payerPayeeName', label: 'Payer / payee name', placeholder: 'Customer or vendor name' },
    { key: 'amount', label: 'Amount', placeholder: 'Optional' },
    { key: 'gstin', label: 'GSTIN', placeholder: 'Tax identifier' },
    { key: 'dueDate', label: 'Due date', placeholder: 'YYYY-MM-DD' }
  ],
  Legal: [
    { key: 'partyNames', label: 'Party names', placeholder: 'Primary parties' },
    { key: 'legalDocumentType', label: 'Document type', placeholder: 'Agreement, deed, affidavit...' },
    { key: 'notaryName', label: 'Notary / advocate name', placeholder: 'Name of verifying professional' },
    { key: 'executionDate', label: 'Date of execution', placeholder: 'YYYY-MM-DD' }
  ],
  'Government ID': [
    { key: 'idName', label: 'Name', placeholder: 'Name on the ID' },
    { key: 'idDocumentType', label: 'Document type', placeholder: 'Aadhaar, passport, etc.' },
    { key: 'issuingAuthority', label: 'Issuing authority', placeholder: 'Authority or department' },
    { key: 'validityDate', label: 'Validity date', placeholder: 'YYYY-MM-DD' }
  ]
};

const VERIFICATION_FIELD_ALIASES = {
  Academic: [
    { label: 'Student Name', keys: ['studentName', 'recipientName'] },
    { label: 'Roll Number', keys: ['rollNumber'] },
    { label: 'Institution', keys: ['institution', 'issuer'] },
    { label: 'Course', keys: ['course'] },
    { label: 'Grade / CGPA', keys: ['gradeCgpa'] },
    { label: 'Year of Passing', keys: ['yearOfPassing'] }
  ],
  Employment: [
    { label: 'Employee Name', keys: ['employeeName', 'recipientName'] },
    { label: 'Designation', keys: ['designation'] },
    { label: 'Company', keys: ['company', 'issuer'] },
    { label: 'Date of Joining / Relieving', keys: ['joiningRelievingDate'] }
  ],
  'Medical Report': [
    { label: 'Patient Name', keys: ['patientName', 'recipientName'] },
    { label: 'Hospital', keys: ['hospital', 'issuer'] },
    { label: 'Report Type', keys: ['reportType'] },
    { label: 'Report Date', keys: ['reportDate', 'issueDate'] }
  ],
  Invoice: [
    { label: 'Invoice Number', keys: ['invoiceNumber', 'documentId'] },
    { label: 'Payer / Payee Name', keys: ['payerPayeeName', 'recipientName'] },
    { label: 'Amount', keys: ['amount'] },
    { label: 'GSTIN', keys: ['gstin'] },
    { label: 'Due Date', keys: ['dueDate'] }
  ],
  Legal: [
    { label: 'Party Names', keys: ['partyNames', 'recipientName'] },
    { label: 'Document Type', keys: ['legalDocumentType', 'documentType'] },
    { label: 'Notary / Advocate Name', keys: ['notaryName'] },
    { label: 'Date of Execution', keys: ['executionDate', 'issueDate'] }
  ],
  'Government ID': [
    { label: 'Name', keys: ['idName', 'recipientName'] },
    { label: 'Document Type', keys: ['idDocumentType', 'documentType'] },
    { label: 'Issuing Authority', keys: ['issuingAuthority', 'issuer'] },
    { label: 'Validity Date', keys: ['validityDate'] }
  ]
};

function getDocumentTypeConfig(type) {
  return DOCUMENT_TYPE_CONFIG[type] || DOCUMENT_TYPE_CONFIG.Certificate;
}

function getDocumentCategory(documentType) {
  return getDocumentTypeConfig(documentType).category;
}

function getIssuanceFieldSchema(documentType) {
  return ISSUANCE_FIELD_SCHEMAS[getDocumentCategory(documentType)] || ISSUANCE_FIELD_SCHEMAS.Academic;
}

function getVerificationFieldSchema(documentType) {
  return VERIFICATION_FIELD_ALIASES[getDocumentCategory(documentType)] || VERIFICATION_FIELD_ALIASES.Academic;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function generateSha256Hex(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `sha256-${btoa(unescape(encodeURIComponent(text))).slice(0, 24)}`;
}

function AppLayout({ title, subtitle, children }) {
  return (
    <div className="page-shell">
      <header className="top-bar">
        <Link to="/" className="brand-link">
          <span className="brand-dot" />
          <span>
            <strong>QR PDF Check</strong>
          </span>
        </Link>
      </header>

      <main className="content-grid">
        <section className="surface-card">
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
          {children}
        </section>
      </main>
    </div>
  );
}

function UploadPage() {
  const navigate = useNavigate();
  const initialType = 'Certificate';
  const today = getTodayDateString();
  const initialFields = Object.fromEntries(
    Object.values(ISSUANCE_FIELD_SCHEMAS).flat().map((field) => [field.key, ''])
  );
  const [form, setForm] = useState({
    documentType: initialType,
    ...initialFields,
    studentName: 'Guru N',
    institution: 'Guru Academy',
    issueDate: today,
  });
  const [pdfFile, setPdfFile] = useState(null);

  const currentConfig = getDocumentTypeConfig(form.documentType);
  const issuanceFields = getIssuanceFieldSchema(form.documentType);

  const updateDocumentType = (documentType) => {
    setForm((previous) => ({
      ...previous,
      documentType
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextDocumentId = getNextDocumentId(mockDocuments);
    const pdfName = pdfFile ? pdfFile.name : 'selected-document.pdf';
    const originalHash = await generateSha256Hex([
      nextDocumentId,
      form.documentType,
      ...issuanceFields.map((field) => form[field.key] || ''),
      form.issueDate,
      pdfName,
      'original'
    ].join('|'));
    const issuedHash = await generateSha256Hex([
      nextDocumentId,
      form.documentType,
      ...issuanceFields.map((field) => form[field.key] || ''),
      form.issueDate,
      pdfName,
      'issued'
    ].join('|'));
    const query = new URLSearchParams();
    query.set('documentId', nextDocumentId);
    query.set('type', form.documentType);
    query.set('issueDate', form.issueDate);
    query.set('uploadDate', today); // This line is kept for reference but will be removed in the next change
    query.set('verificationUrl', `https://verify.yourdomain.com/doc/${nextDocumentId}`);
    issuanceFields.forEach((field) => {
      if (form[field.key]) {
        query.set(field.key, form[field.key]);
      }
    });
    query.set('originalHash', originalHash);
    query.set('issuedHash', issuedHash);
    query.set('file', pdfName);
    navigate(
      `/verify/${nextDocumentId}?${query.toString()}`
    );
  };

  return (
    <AppLayout
      title="Issue a secure document"
      subtitle="Only the fields needed for this document type are shown."
    >
      <form className="stack-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="full-span">
            <span>Document type</span>
            <select value={form.documentType} onChange={(event) => updateDocumentType(event.target.value)}>
              <option>Certificate</option>
              <option>Marksheet</option>
              <option>Degree</option>
              <option>Bonafide</option>
              <option>Offer Letter</option>
              <option>Experience Letter</option>
              <option>Medical Report</option>
              <option>Invoice</option>
              <option>Legal Document</option>
              <option>Identity Document</option>
            </select>
          </label>
          {issuanceFields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                value={form[field.key]}
                placeholder={field.placeholder}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              />
            </label>
          ))}
          <label>
            <span>Issue date</span>
            <input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
          </label>
          <label className="full-span">
            <span>PDF file</span>
            <input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} />
          </label>
        </div>

        <button className="primary-button" type="submit">Create document record</button>
      </form>
    </AppLayout>
  );
}

function VerificationState({ outcome, documentId, record, uploadedFile }) {
  const view = getVerificationRecordView({ documentId, record, uploadedFile });

  if (outcome === 'missing') {
    return (
      <div className="result-card danger">
        <div className="result-mark">✕</div>
        <h2>Document invalid</h2>
        <p>Reason: Not found.</p>
      </div>
    );
  }

  if (outcome === 'flagged') {
    return (
      <div className="result-card danger">
        <div className="result-mark">!</div>
        <h2>Document invalid</h2>
        <p>Reason: Hash mismatch detected.</p>
        <p>Possible tampering found.</p>
      </div>
    );
  }

  if (outcome === 'revoked') {
    return (
      <div className="result-card warning">
        <div className="result-mark">!</div>
        <h2>Document revoked</h2>
        <p>Revoked on: {view.revokedOn || view.issueDate}</p>
        {view.revocationReason ? <p>Reason: {view.revocationReason}</p> : null}
      </div>
    );
  }

  return (
    <div className="result-card success">
      <div className="result-mark">✓</div>
      <h2>Verified</h2>
      <p>The document reference is valid.</p>
      <ResultDetails view={view} />
    </div>
  );
}

function ResultDetails({ view }) {
  const verificationCategory = getDocumentCategory(view.documentType);
  const verificationTimestamp = view.verificationTimestamp || new Date().toLocaleString();
  const fieldSchema = getVerificationFieldSchema(view.documentType);
  const fields = fieldSchema.map((field) => ({
    label: field.label,
    value: field.keys.map((key) => view[key]).find((value) => Boolean(value)) || 'N/A'
  }));

  return (
    <div className="detail-grid">
      <div><span>Document ID</span><strong>{view.documentId}</strong></div>
      <div><span>Status</span><strong>Verified</strong></div>
      <div><span>Document Type</span><strong>{view.documentType}</strong></div>
      <div><span>Issuer</span><strong>{view.issuer}</strong></div>
      <div><span>Issued Date</span><strong>{view.issueDate}</strong></div>
      <div><span>Verification timestamp</span><strong>{verificationTimestamp}</strong></div>
      <div className="full-span"><span>Verification category</span><strong>{verificationCategory}</strong></div>
      {fields.map((field) => (
        <div key={field.label}><span>{field.label}</span><strong>{field.value}</strong></div>
      ))}
    </div>
  );
}

function VerifyPage() {
  const { documentId: routeDocumentId } = useParams();
  const [searchParams] = useSearchParams();
  const [documentId, setDocumentId] = useState(routeDocumentId || 'DOC-2026-0001');
  const [uploadedFile, setUploadedFile] = useState(null);

  const record = useMemo(
    () => mockDocuments.find((item) => item.documentId.toLowerCase() === documentId.toLowerCase()),
    [documentId]
  );

  const fileName = uploadedFile?.name || '';
  const queryDrivenRecord = {
    ...record,
    recipientName: searchParams.get('name') || record?.recipientName,
    issuer: searchParams.get('issuer') || record?.issuer,
    documentType: searchParams.get('type') || record?.documentType,
    issueDate: searchParams.get('issueDate') || record?.issueDate,
    uploadDate: searchParams.get('uploadDate') || record?.uploadDate,
    status: searchParams.get('status') || record?.status || 'Active',
    studentName: searchParams.get('studentName') || record?.studentName,
    rollNumber: searchParams.get('rollNumber') || record?.rollNumber,
    institution: searchParams.get('institution') || record?.institution,
    course: searchParams.get('course') || record?.course,
    gradeCgpa: searchParams.get('gradeCgpa') || record?.gradeCgpa,
    yearOfPassing: searchParams.get('yearOfPassing') || record?.yearOfPassing,
    employeeName: searchParams.get('employeeName') || record?.employeeName,
    designation: searchParams.get('designation') || record?.designation,
    company: searchParams.get('company') || record?.company,
    joiningRelievingDate: searchParams.get('joiningRelievingDate') || record?.joiningRelievingDate,
    patientName: searchParams.get('patientName') || record?.patientName,
    hospital: searchParams.get('hospital') || record?.hospital,
    reportType: searchParams.get('reportType') || record?.reportType,
    reportDate: searchParams.get('reportDate') || record?.reportDate,
    invoiceNumber: searchParams.get('invoiceNumber') || record?.invoiceNumber,
    payerPayeeName: searchParams.get('payerPayeeName') || record?.payerPayeeName,
    amount: searchParams.get('amount') || record?.amount,
    gstin: searchParams.get('gstin') || record?.gstin,
    dueDate: searchParams.get('dueDate') || record?.dueDate,
    partyNames: searchParams.get('partyNames') || record?.partyNames,
    legalDocumentType: searchParams.get('legalDocumentType') || record?.legalDocumentType,
    notaryName: searchParams.get('notaryName') || record?.notaryName,
    executionDate: searchParams.get('executionDate') || record?.executionDate,
    idName: searchParams.get('idName') || record?.idName,
    idDocumentType: searchParams.get('idDocumentType') || record?.idDocumentType,
    issuingAuthority: searchParams.get('issuingAuthority') || record?.issuingAuthority,
    validityDate: searchParams.get('validityDate') || record?.validityDate,
    originalHash: record?.originalHash || searchParams.get('originalHash') || '',
    issuedHash: record?.issuedHash || searchParams.get('issuedHash') || '',
    fullName: searchParams.get('name') || record?.recipientName || 'Aarav Mehta'
  };
  const hasQueryMetadata = ['name', 'issuer', 'type', 'issueDate', 'uploadDate', 'originalHash', 'issuedHash'].some((key) => searchParams.get(key));
  const verificationRecord = record || (hasQueryMetadata ? queryDrivenRecord : null);
  const outcome = getVerificationOutcome({ record: verificationRecord, fileName });
  const verificationTimestamp = new Date().toLocaleString();
  const detailedView = getVerificationRecordView({ documentId, record: verificationRecord, uploadedFile: fileName });
  const mergedView = { ...detailedView, ...queryDrivenRecord, verificationTimestamp };

  return (
    <AppLayout
      title="Verify a document"
      subtitle="Status, metadata, and privacy-safe details only."
    >
      <div className="stack-form">
        <div className="form-grid">
            <label className="full-span">
              <span>Document ID</span>
              <div style={{display:'flex',alignItems:'center'}}>
                <input value={documentId} onChange={(event) => setDocumentId(event.target.value)} placeholder="DOC-2026-0001" />
              </div>
            </label>
            <label className="full-span">
              <span>Upload PDF to compare</span>
              <div style={{display:'flex',alignItems:'center'}}>
                <input type="file" accept="application/pdf" onChange={(event) => setUploadedFile(event.target.files?.[0] || null)} />
              </div>
            </label>
        </div>

        <VerificationState outcome={outcome} documentId={documentId} record={mergedView} uploadedFile={fileName} />
      </div>
    </AppLayout>
  );
}

function HomeRedirect() {
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/verify/:documentId" element={<VerifyPage />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
