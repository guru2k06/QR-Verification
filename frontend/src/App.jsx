import React, { useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { mockDocuments } from './data/mockDocuments';
import { getNextDocumentId, getVerificationOutcome, getVerificationRecordView } from './utils/verification';
import Tooltip from './components/Tooltip';
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

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
    { key: 'studentName', label: 'Student name', placeholder: 'Full student name', tooltip: 'The student\'s official registered name.' },
    { key: 'rollNumber', label: 'Roll number', placeholder: 'Roll / register number', tooltip: 'Unique academic identification or register number.' },
    { key: 'institution', label: 'Institution', placeholder: 'School / college / university', tooltip: 'The academic institution issuing this record.' },
    { key: 'course', label: 'Course', placeholder: 'Course or program name', tooltip: 'The degree or academic program completed.' },
    { key: 'gradeCgpa', label: 'Grade / CGPA', placeholder: 'Grade or CGPA', tooltip: 'Final grade, classification, or CGPA score.' },
    { key: 'yearOfPassing', label: 'Year of passing', placeholder: 'YYYY', tooltip: 'The calendar year of graduation or completion.' }
  ],
  Employment: [
    { key: 'employeeName', label: 'Employee name', placeholder: 'Full employee name', tooltip: 'Official full name of the employee.' },
    { key: 'designation', label: 'Designation', placeholder: 'Job title', tooltip: 'The job title or role held by the employee.' },
    { key: 'company', label: 'Company', placeholder: 'Organization name', tooltip: 'The employing organization or business entity.' },
    { key: 'joiningRelievingDate', label: 'Date of joining / relieving', placeholder: 'YYYY-MM-DD', tooltip: 'Start or end date of the employment contract.' }
  ],
  'Medical Report': [
    { key: 'patientName', label: 'Patient name', placeholder: 'Patient name or masked name', tooltip: 'Full name or masked privacy code for the patient.' },
    { key: 'hospital', label: 'Hospital', placeholder: 'Hospital or clinic name', tooltip: 'The medical facility where tests were conducted.' },
    { key: 'reportType', label: 'Report type', placeholder: 'Blood test, X-ray, etc.', tooltip: 'The specific type of clinical examination.' },
    { key: 'reportDate', label: 'Report date', placeholder: 'YYYY-MM-DD', tooltip: 'Date the clinical medical report was issued.' }
  ],
  Invoice: [
    { key: 'invoiceNumber', label: 'Invoice number', placeholder: 'INV-0001', tooltip: 'The unique auditing serial number for this invoice.' },
    { key: 'payerPayeeName', label: 'Payer / payee name', placeholder: 'Customer or vendor name', tooltip: 'Name of customer or vendor billing entity.' },
    { key: 'amount', label: 'Amount', placeholder: 'Total amount', tooltip: 'Total financial amount payable on this invoice.' },
    { key: 'gstin', label: 'GSTIN', placeholder: 'Tax identifier', tooltip: 'The tax registration number (GSTIN).' },
    { key: 'dueDate', label: 'Due date', placeholder: 'YYYY-MM-DD', tooltip: 'The final date for payment settlement.' }
  ],
  Legal: [
    { key: 'partyNames', label: 'Party names', placeholder: 'Primary parties', tooltip: 'Primary legal parties executing this contract.' },
    { key: 'legalDocumentType', label: 'Document type', placeholder: 'Agreement, deed, affidavit...', tooltip: 'Specific legal document classification.' },
    { key: 'notaryName', label: 'Notary / advocate name', placeholder: 'Name of verifying professional', tooltip: 'The notary or lawyer certifying document execution.' },
    { key: 'executionDate', label: 'Date of execution', placeholder: 'YYYY-MM-DD', tooltip: 'The date this legal record becomes binding.' }
  ],
  'Government ID': [
    { key: 'idName', label: 'Name', placeholder: 'Name on the ID', tooltip: 'The official name listed on the identification card.' },
    { key: 'idDocumentType', label: 'Document type', placeholder: 'Aadhaar, passport, etc.', tooltip: 'The official identity document type.' },
    { key: 'issuingAuthority', label: 'Issuing authority', placeholder: 'Authority or department', tooltip: 'Government department that authorized this ID.' },
    { key: 'validityDate', label: 'Validity date', placeholder: 'YYYY-MM-DD', tooltip: 'Document validity expiration date.' }
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

function AppLayout({ children }) {
  const location = useLocation();
  const isVerify = location.pathname.startsWith('/verify');

  return (
    <div className="page-shell">
      <header className="top-bar">
        <Link to="/" className="brand-link">
          <span className="brand-dot" />
          <strong>QR PDF Check</strong>
        </Link>
        <nav className="nav-tabs">
          <Link to="/" className={`nav-tab ${!isVerify ? 'active' : ''}`}>
            Issue
          </Link>
          <Link to="/verify" className={`nav-tab ${isVerify ? 'active' : ''}`}>
            Verify
          </Link>
        </nav>
      </header>

      <main>
        {children}
      </main>
    </div>
  );
}

/* Reusable Interactive Drag and Drop File Zone */
function CustomDropzone({ file, setFile }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputId = useMemo(() => `file-input-${Math.random().toString(36).slice(2, 9)}`, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`custom-dropzone ${file ? 'has-file' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById(inputId).click()}
    >
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      
      {file ? (
        <div className="file-info" onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: '1.25rem' }}>📄</span>
          <div className="file-name">
            <div>{file.name || file}</div>
            {file.size && (
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 'normal' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>
          <button
            type="button"
            className="remove-file-btn"
            onClick={() => setFile(null)}
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <div className="dropzone-icon">📥</div>
          <div className="dropzone-text">
            <strong>Choose a PDF file</strong> or drag it here
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            PDF up to 10MB
          </div>
        </>
      )}
    </div>
  );
}

async function stampPdfWithQr(pdfFile, qrUrl, documentId, issueDate) {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();
    
    const qrSize = 70;
    const marginRight = 25;
    const qrX = width - qrSize - marginRight;
    const qrY = 45;

    // Draw white background block for readability
    lastPage.drawRectangle({
      x: qrX - 5,
      y: qrY - 35,
      width: qrSize + 10,
      height: qrSize + 50,
      color: rgb(1, 1, 1),
      opacity: 0.9
    });

    // Draw QR Code
    lastPage.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });
    
    lastPage.drawRectangle({
      x: qrX - 1,
      y: qrY - 1,
      width: qrSize + 2,
      height: qrSize + 2,
      borderColor: rgb(0.54, 0.36, 0.96),
      borderWidth: 1.5,
    });
    
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
    const fontRegular = await pdfDoc.embedFont('Helvetica');
    
    lastPage.drawText('VERIFY ORIGINAL', {
      x: qrX,
      y: qrY + qrSize + 6,
      size: 6.5,
      font: fontBold,
      color: rgb(0.54, 0.36, 0.96),
    });

    if (documentId) {
      lastPage.drawText(`ID: ${documentId}`, {
        x: qrX,
        y: qrY - 10,
        size: 7,
        font: fontBold,
        color: rgb(0.06, 0.09, 0.16)
      });
    }

    let hostStr = 'verify.yourdomain.com';
    try {
      const parsedUrl = new URL(qrUrl);
      hostStr = `${parsedUrl.host}${parsedUrl.pathname}`.replace(/\/DOC-\d{4}-\d{4}$/i, '');
      hostStr = hostStr.split('?')[0];
      if (hostStr.endsWith('/')) {
        hostStr = hostStr.slice(0, -1);
      }
    } catch (e) {
      // ignore
    }

    lastPage.drawText(`Verify at: ${hostStr}`, {
      x: qrX,
      y: qrY - 19,
      size: 6,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });

    if (issueDate) {
      const dateObj = new Date(issueDate);
      const dateStr = !isNaN(dateObj.getTime()) 
        ? dateObj.toISOString().slice(0, 10) 
        : String(issueDate);

      lastPage.drawText(`Issued: ${dateStr}`, {
        x: qrX,
        y: qrY - 28,
        size: 6,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4)
      });
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
  } catch (error) {
    console.error('Failed to stamp PDF:', error);
    throw error;
  }
}

function resolvePdfMetadata(form) {
  const category = getDocumentCategory(form.documentType);
  let recipientName = 'Recipient Name';
  let organization = 'System Authority';

  if (category === 'Academic') {
    recipientName = form.studentName;
    organization = form.institution;
  } else if (category === 'Employment') {
    recipientName = form.employeeName;
    organization = form.company;
  } else if (category === 'Medical Report') {
    recipientName = form.patientName;
    organization = form.hospital;
  } else if (category === 'Invoice') {
    recipientName = form.payerPayeeName;
    organization = form.issuer || 'System Authority';
  } else if (category === 'Legal') {
    recipientName = form.partyNames;
    organization = form.notaryName || form.issuer || 'System Authority';
  } else if (category === 'Government ID') {
    recipientName = form.idName;
    organization = form.issuingAuthority;
  }

  if (!organization || organization === 'System Authority') {
    organization = form.issuer || 'System Authority';
  }

  return {
    recipientName: recipientName || 'Recipient Name',
    organization: organization || 'System Authority'
  };
}

async function createPdfFromScratch(form, qrUrl, documentId) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 750]);
    const { width, height } = page.getSize();
    
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: rgb(0.06, 0.72, 0.5),
      borderWidth: 3,
    });

    page.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: rgb(0.54, 0.36, 0.96),
      borderWidth: 1,
    });

    const helveticaFont = await pdfDoc.embedFont('Helvetica');
    const helveticaBold = await pdfDoc.embedFont('Helvetica-Bold');

    page.drawText('SECURED DOCUMENT RECORD', {
      x: 80,
      y: height - 80,
      size: 24,
      font: helveticaBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    page.drawText(`Document ID: ${documentId}`, {
      x: 80,
      y: height - 105,
      size: 11,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(`Document Type: ${form.documentType}`, {
      x: 80,
      y: height - 160,
      size: 16,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const { recipientName, organization } = resolvePdfMetadata(form);

    page.drawText(`Issued To: ${recipientName}`, {
      x: 80,
      y: height - 210,
      size: 14,
      font: helveticaBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    page.drawText(`Issued By: ${organization}`, {
      x: 80,
      y: height - 240,
      size: 14,
      font: helveticaFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(`Issue Date: ${form.issueDate}`, {
      x: 80,
      y: height - 270,
      size: 12,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawLine({
      start: { x: 80, y: height - 310 },
      end: { x: width - 80, y: height - 310 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });

    const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 250 });
    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    
    const qrSize = 140;
    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: height - 490,
      width: qrSize,
      height: qrSize,
    });

    page.drawText('Scan QR Code to Verify Authenticity', {
      x: 165,
      y: height - 520,
      size: 12,
      font: helveticaBold,
      color: rgb(0.54, 0.36, 0.96),
    });

    page.drawText('This document is digitally registered in the secure ledger.', {
      x: 130,
      y: height - 550,
      size: 10,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Failed to create PDF:', error);
    throw error;
  }
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
    studentName: '',
    institution: '',
    issueDate: '',
    issuer: ''
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [securedDoc, setSecuredDoc] = useState(null);

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
    setIsGenerating(true);
    try {
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
      query.set('uploadDate', today);
      query.set('verificationUrl', `https://verify.yourdomain.com/doc/${nextDocumentId}`);
      query.set('issuer', form.issuer || 'System Authority');
      issuanceFields.forEach((field) => {
        if (form[field.key]) {
          query.set(field.key, form[field.key]);
        }
      });
      query.set('originalHash', originalHash);
      query.set('issuedHash', issuedHash);
      query.set('file', pdfName);

      const verificationUrl = `${window.location.origin}/verify/${nextDocumentId}?${query.toString()}`;

      let pdfBytes;
      if (pdfFile) {
        pdfBytes = await stampPdfWithQr(pdfFile, verificationUrl, nextDocumentId, form.issueDate);
      } else {
        pdfBytes = await createPdfFromScratch(form, verificationUrl, nextDocumentId);
      }

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      let filename = pdfFile ? `stamped-${pdfFile.name}` : `secure-${nextDocumentId}.pdf`;
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const { recipientName } = resolvePdfMetadata(form);

      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 250 });

      setSecuredDoc({
        documentId: nextDocumentId,
        documentType: form.documentType,
        recipientName,
        verificationUrl,
        qrCodeUrl: qrDataUrl,
        downloadUrl,
        query: query.toString()
      });
    } catch (err) {
      alert('Failed to stamp or generate PDF.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (securedDoc) {
    return (
      <AppLayout>
        <div className="single-panel-layout">
          <div className="panel-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div className="status-orb" style={{ color: 'var(--success)', border: '1px solid var(--accent)', margin: '0 auto', textShadow: '0 0 10px rgba(var(--accent-rgb), 0.4)', display: 'grid', placeItems: 'center' }}>
              ✓
            </div>
            <div>
              <h1 style={{ background: 'linear-gradient(to right, #10b981, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
                PDF Secured Successfully!
              </h1>
              <p className="subtitle" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
                The cryptographic record has been generated and your stamped PDF has been automatically downloaded.
              </p>
            </div>

            <div className="hud-details-card" style={{ width: '100%', maxWidth: '500px', background: 'rgba(9, 14, 26, 0.4)', border: '1px solid var(--border)' }}>
              <div className="hud-details-grid" style={{ textAlign: 'left' }}>
                <div className="hud-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span>Document ID</span>
                  <strong style={{ fontSize: '1.25rem', color: '#fff', fontFamily: 'monospace', letterSpacing: '1px' }}>{securedDoc.documentId}</strong>
                </div>
                <div className="hud-detail-item">
                  <span>Document Type</span>
                  <strong>{securedDoc.documentType}</strong>
                </div>
                <div className="hud-detail-item">
                  <span>Recipient</span>
                  <strong>{securedDoc.recipientName}</strong>
                </div>
                <div className="hud-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span>Verification Link</span>
                  <a href={securedDoc.verificationUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--violet)', textDecoration: 'underline', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                    {`${window.location.origin.replace(/^https?:\/\//, '')}/verify/${securedDoc.documentId}`}
                  </a>
                </div>
              </div>
            </div>

            {securedDoc.qrCodeUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '14px', display: 'inline-block' }}>
                  <img src={securedDoc.qrCodeUrl} alt="Document QR Code" style={{ width: '150px', height: '150px', display: 'block' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Embedded Stamp QR Code
                </span>
              </div>
            )}

            <div className="success-actions">
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)' }}
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = securedDoc.downloadUrl;
                  let filename = pdfFile ? `stamped-${pdfFile.name}` : `secure-${securedDoc.documentId}.pdf`;
                  if (!filename.toLowerCase().endsWith('.pdf')) {
                    filename += '.pdf';
                  }
                  link.download = filename;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                📥 Download PDF
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  navigate(`/verify/${securedDoc.documentId}?${securedDoc.query}`);
                }}
              >
                🔍 Verify Record
              </button>
            </div>

            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', textDecoration: 'underline', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem' }}
              onClick={() => {
                if (securedDoc.downloadUrl) {
                  URL.revokeObjectURL(securedDoc.downloadUrl);
                }
                setSecuredDoc(null);
              }}
            >
              ← Secure another document
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="single-panel-layout">
        <div className="panel-card">
          <div>
            <h1>Issue a secure document</h1>
            <p className="subtitle">Only the fields needed for this document type are shown.</p>
          </div>
          
          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="full-span">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Document type
                  <Tooltip text={currentConfig.note} />
                </span>
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
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {field.label}
                    {field.tooltip && <Tooltip text={field.tooltip} />}
                  </span>
                  <input
                    value={form[field.key]}
                    placeholder={field.placeholder}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  />
                </label>
              ))}
              
              <label>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Issuer Authority
                  <Tooltip text="The organization or officer responsible for authorizing and generating this document." />
                </span>
                <input
                  value={form.issuer}
                  placeholder="Department / Officer Name"
                  onChange={(event) => setForm({ ...form, issuer: event.target.value })}
                />
              </label>
              
              <label>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Issue date
                  <Tooltip text="The date the document was officially signed and issued." />
                </span>
                <input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
              </label>
              
              <label className="full-span">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  PDF file to stamp
                  <Tooltip text="Upload the document PDF file here to embed the verification QR code directly onto it." />
                </span>
                <CustomDropzone file={pdfFile} setFile={setPdfFile} />
              </label>
            </div>

            <button className="btn-primary" type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating Stamped PDF...' : 'Create secure document record'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

function VerificationState({ outcome, documentId, record, uploadedFile }) {
  if (!documentId) {
    return (
      <div className="result-banner-hud" style={{ background: 'rgba(255, 255, 255, 0.01)', borderColor: 'var(--border)', padding: '2.5rem 2rem' }}>
        <div className="status-orb" style={{ color: 'var(--muted)', fontSize: '2rem' }}>?</div>
        <div>
          <div className="hud-status-text" style={{ color: '#fff', fontSize: '1.25rem' }}>Ready for verification</div>
          <div className="hud-status-reason" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Enter a valid Document ID on the left and click the **Verify Document** button to run cryptographic audits.
          </div>
        </div>
      </div>
    );
  }

  const view = getVerificationRecordView({ documentId, record, uploadedFile });

  if (outcome === 'missing') {
    return (
      <div className="result-banner-hud hud-danger">
        <div className="status-orb">✕</div>
        <div>
          <div className="hud-status-text">Document Invalid</div>
          <div className="hud-status-reason">
            Status: <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Unregistered</span>
          </div>
          <div className="hud-status-reason" style={{ marginTop: '0.25rem' }}>
            Reason: Record not found in registration database.
          </div>
        </div>
      </div>
    );
  }

  if (outcome === 'flagged') {
    return (
      <div className="result-banner-hud hud-danger scanner-container">
        <div className="scanner-line"></div>
        <div className="status-orb">!</div>
        <div>
          <div className="hud-status-text">Document Tampered</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#fff' }}>
            {view.userName}
          </div>
          <div className="hud-status-reason" style={{ marginTop: '0.4rem' }}>
            Status: <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>TAMPER_ALERT</span>
          </div>
          <div className="hud-status-reason" style={{ marginTop: '0.25rem' }}>
            Reason: Binary fingerprint does not match the registered stamp.
          </div>
        </div>

        <details className="advanced-crypto-details" style={{ width: '100%' }}>
          <summary className="advanced-crypto-summary" style={{ textAlign: 'center' }}>View Cryptographic Discrepancies</summary>
          <div className="hash-comparison-card" style={{ marginTop: '0.5rem' }}>
            <div className="hash-row">
              <span>Registered Stamp Hash</span>
              <div className="hash-code">{view.originalHash || 'b4c6f3c4a1e6f4c0a0e8f6b2d8d9c6f3...'}</div>
            </div>
            <div className="hash-row">
              <span>Uploaded File Hash</span>
              <div className="hash-code" style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)' }}>
                {view.issuedHash ? view.issuedHash.replace(/.$/, 'a') : 'f4a6b3c4d1e2f4c0a0e8f6b2d8d9c6f3...'} (MISMATCH)
              </div>
            </div>
          </div>
        </details>
      </div>
    );
  }

  if (outcome === 'revoked') {
    return (
      <div className="result-banner-hud hud-warning">
        <div className="status-orb">!</div>
        <div>
          <div className="hud-status-text">Document Revoked</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#fff' }}>
            {view.userName}
          </div>
          <div className="hud-status-reason" style={{ marginTop: '0.4rem' }}>
            Status: <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{view.status}</span>
          </div>
          <div className="hud-status-reason" style={{ marginTop: '0.25rem' }}>
            Revoked on: {view.revokedOn || view.issueDate}<br />
            {view.revocationReason ? `Reason: ${view.revocationReason}` : 'Reason: Invalidated by issuing authority.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="result-banner-hud hud-success">
        <div className="status-orb">✓</div>
        <div>
          <div className="hud-status-text">Verified Authentic</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#fff' }}>
            {view.userName}
          </div>
          <div className="hud-status-reason" style={{ marginTop: '0.4rem' }}>
            Status: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{view.status}</span>
          </div>
        </div>
      </div>

      <div className="hud-title">Secure Registry Metadata</div>
      <ResultDetails view={view} />

      <details className="advanced-crypto-details">
        <summary className="advanced-crypto-summary">View Cryptographic Audit Log</summary>
        <div className="hash-comparison-card" style={{ marginTop: '0.5rem' }}>
          <div className="hash-row">
            <span>Registered Cryptographic Hash</span>
            <div className="hash-code" style={{ color: 'var(--accent)', background: 'rgba(16, 185, 129, 0.08)' }}>
              {view.originalHash}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function ResultDetails({ view }) {
  const verificationCategory = getDocumentCategory(view.documentType);
  const verificationTimestamp = view.verificationTimestamp || new Date().toLocaleString();
  const fieldSchema = getVerificationFieldSchema(view.documentType);
  const fields = fieldSchema
    .map((field) => ({
      label: field.label,
      value: field.keys.map((key) => view[key]).find((value) => Boolean(value)) || ''
    }))
    .filter((field) => field.value !== '' && field.value.toUpperCase() !== 'N/A');

  return (
    <div className="hud-details-card">
      <div className="hud-details-grid">
        <div className="hud-detail-item">
          <span>Document ID</span>
          <strong>{view.documentId}</strong>
        </div>
        <div className="hud-detail-item">
          <span>Status</span>
          <strong style={{ color: 'var(--success)' }}>Active (Verified)</strong>
        </div>
        <div className="hud-detail-item">
          <span>Document Type</span>
          <strong>{view.documentType}</strong>
        </div>
        <div className="hud-detail-item">
          <span>Issuer</span>
          <strong>{view.issuer}</strong>
        </div>
        <div className="hud-detail-item">
          <span>Issued Date</span>
          <strong>{view.issueDate}</strong>
        </div>
        <div className="hud-detail-item">
          <span>Verification time</span>
          <strong>{verificationTimestamp}</strong>
        </div>
        <div className="hud-detail-item full-span">
          <span>Verification Category</span>
          <strong>{verificationCategory}</strong>
        </div>
        
        {fields.map((field) => (
          <div key={field.label} className="hud-detail-item">
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyPage() {
  const { documentId: routeDocumentId } = useParams();
  const [searchParams] = useSearchParams();
  const [inputDocId, setInputDocId] = useState(routeDocumentId || '');
  const [checkedDocId, setCheckedDocId] = useState(routeDocumentId || '');
  const [uploadedFile, setUploadedFile] = useState(null);

  const record = useMemo(
    () => {
      if (!checkedDocId) return null;
      return mockDocuments.find((item) => item.documentId.toLowerCase() === checkedDocId.toLowerCase());
    },
    [checkedDocId]
  );

  const fileName = uploadedFile?.name || uploadedFile || '';
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
    fullName: searchParams.get('name') || record?.recipientName || ''
  };
  const hasQueryMetadata = ['name', 'issuer', 'type', 'issueDate', 'uploadDate', 'originalHash', 'issuedHash'].some((key) => searchParams.get(key)) &&
    (searchParams.get('documentId')?.toLowerCase() === checkedDocId?.toLowerCase());
  const verificationRecord = record || (hasQueryMetadata ? queryDrivenRecord : null);
  const outcome = getVerificationOutcome({ record: verificationRecord, fileName });
  const verificationTimestamp = new Date().toLocaleString();
  const detailedView = getVerificationRecordView({ documentId: checkedDocId, record: verificationRecord, uploadedFile: fileName });
  const mergedView = { ...detailedView, ...(hasQueryMetadata ? queryDrivenRecord : {}), verificationTimestamp };

  return (
    <AppLayout>
      <div className="dashboard-split">
        <div className="panel-card">
          <div>
            <h1>Verify a secure document</h1>
            <p className="subtitle">Authenticity verification and cryptographic audit logging console.</p>
          </div>

          <div className="stack-form">
            <div className="form-grid">
              <label className="full-span">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Document ID
                  <Tooltip text="The unique registration identifier of the document to pull registry details from the secure ledger." />
                </span>
                <input value={inputDocId} onChange={(event) => setInputDocId(event.target.value)} placeholder="DOC-2026-0001" />
              </label>
              <label className="full-span">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Compare Document PDF file
                  <Tooltip text="Upload a PDF file to run a cryptographic audit comparing its binary signature with the registered stamp." />
                </span>
                <CustomDropzone file={uploadedFile} setFile={setUploadedFile} />
              </label>
              
              <button
                type="button"
                className="btn-primary full-span"
                onClick={() => setCheckedDocId(inputDocId)}
                style={{ marginTop: '0.5rem' }}
              >
                🔍 Verify Document
              </button>
            </div>
          </div>
        </div>

        <div className="preview-container">
          <div className="hud-title">Verification Outcome HUD</div>
          <VerificationState outcome={outcome} documentId={checkedDocId} record={mergedView} uploadedFile={fileName} />
        </div>
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
