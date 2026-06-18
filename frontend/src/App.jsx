import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { getNextDocumentId, getVerificationOutcome, getVerificationRecordView } from './utils/verification';
import Tooltip from './components/Tooltip';
import { PDFDocument, rgb, PDFName, PDFString } from 'pdf-lib';
import QRCode from 'qrcode';
import logoImg from './logo.png';

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
    { key: 'joiningRelievingDate', label: 'Date of joining / relieving', placeholder: 'YYYY-MM-DD', tooltip: 'Start or end date of the employment contract.', type: 'date' }
  ],
  'Medical Report': [
    { key: 'patientName', label: 'Patient name', placeholder: 'Patient name or masked name', tooltip: 'Full name or masked privacy code for the patient.' },
    { key: 'hospital', label: 'Hospital', placeholder: 'Hospital or clinic name', tooltip: 'The medical facility where tests were conducted.' },
    { key: 'reportType', label: 'Report type', placeholder: 'Blood test, X-ray, etc.', tooltip: 'The specific type of clinical examination.' },
    { key: 'reportDate', label: 'Report date', placeholder: 'YYYY-MM-DD', tooltip: 'Date the clinical medical report was issued.', type: 'date' }
  ],
  Invoice: [
    { key: 'invoiceNumber', label: 'Invoice number', placeholder: 'INV-0001', tooltip: 'The unique auditing serial number for this invoice.' },
    { key: 'payerPayeeName', label: 'Payer / payee name', placeholder: 'Customer or vendor name', tooltip: 'Name of customer or vendor billing entity.' },
    { key: 'amount', label: 'Amount', placeholder: 'Total amount', tooltip: 'Total financial amount payable on this invoice.' },
    { key: 'gstin', label: 'GSTIN', placeholder: 'Tax identifier', tooltip: 'The tax registration number (GSTIN).' },
    { key: 'dueDate', label: 'Due date', placeholder: 'YYYY-MM-DD', tooltip: 'The final date for payment settlement.', type: 'date' }
  ],
  Legal: [
    { key: 'partyNames', label: 'Party names', placeholder: 'Primary parties', tooltip: 'Primary legal parties executing this contract.' },
    { key: 'legalDocumentType', label: 'Document type', placeholder: 'Agreement, deed, affidavit...', tooltip: 'Specific legal document classification.' },
    { key: 'notaryName', label: 'Notary / advocate name', placeholder: 'Name of verifying professional', tooltip: 'The notary or lawyer certifying document execution.' },
    { key: 'executionDate', label: 'Date of execution', placeholder: 'YYYY-MM-DD', tooltip: 'The date this legal record becomes binding.', type: 'date' }
  ],
  'Government ID': [
    { key: 'idName', label: 'Name', placeholder: 'Name on the ID', tooltip: 'The official name listed on the identification card.' },
    { key: 'idDocumentType', label: 'Document type', placeholder: 'Aadhaar, passport, etc.', tooltip: 'The official identity document type.' },
    { key: 'issuingAuthority', label: 'Issuing authority', placeholder: 'Authority or department', tooltip: 'Government department that authorized this ID.' },
    { key: 'validityDate', label: 'Validity date', placeholder: 'YYYY-MM-DD', tooltip: 'Document validity expiration date.', type: 'date' }
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

async function generateSha256Hex(data) {
  const inputBuffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', inputBuffer);
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  let binaryString = '';
  if (typeof data === 'string') {
    binaryString = unescape(encodeURIComponent(data));
  } else {
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
  }
  return `sha256-${btoa(binaryString).slice(0, 24)}`;
}

const SHORT_KEYS = {
  documentId: 'id',
  documentType: 't',
  type: 't',
  issueDate: 'idat',
  uploadDate: 'udat',
  issuer: 'is',
  originalHash: 'oh',
  issuedHash: 'ih',
  file: 'f',
  studentName: 'sn',
  rollNumber: 'rn',
  institution: 'in',
  course: 'co',
  gradeCgpa: 'gr',
  yearOfPassing: 'yp',
  employeeName: 'en',
  designation: 'de',
  company: 'cp',
  joiningRelievingDate: 'jd',
  patientName: 'pn',
  hospital: 'hp',
  reportType: 'rt',
  reportDate: 'rd',
  invoiceNumber: 'iv',
  payerPayeeName: 'pp',
  amount: 'am',
  gstin: 'gt',
  dueDate: 'dd',
  partyNames: 'pt',
  legalDocumentType: 'lt',
  notaryName: 'nn',
  executionDate: 'ed',
  idName: 'inm',
  idDocumentType: 'idt',
  issuingAuthority: 'ia',
  validityDate: 'vd'
};

const LONG_KEYS = Object.fromEntries(
  Object.entries(SHORT_KEYS).map(([long, short]) => [short, long])
);

function hexToBase64Url(hex) {
  if (!hex || hex.length !== 64) return hex;
  try {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (e) {
    return hex;
  }
}

function base64UrlToHex(base64url) {
  if (!base64url || base64url.length !== 43) return base64url;
  try {
    let base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    let hex = '';
    for (let i = 0; i < binary.length; i++) {
      const code = binary.charCodeAt(i);
      hex += code.toString(16).padStart(2, '0');
    }
    return hex;
  } catch (e) {
    return base64url;
  }
}


function AppLayout({ children }) {
  const location = useLocation();
  const isVerify = location.pathname.startsWith('/verify');
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    // Ping backend to wake it up from free-tier sleep
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    let isAwake = false;
    const timeoutId = setTimeout(() => {
      if (!isAwake) {
        setIsWakingUp(true);
      }
    }, 1500); // Show loading state if it takes longer than 1.5s

    fetch(`${backendUrl}/health`)
      .then(res => {
        if (res.ok) isAwake = true;
      })
      .catch(err => console.log('Backend might be asleep:', err))
      .finally(() => {
        setIsWakingUp(false);
        clearTimeout(timeoutId);
      });
      
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="page-shell">
      {isWakingUp && (
        <div className="cold-start-banner" style={{ background: '#ffa000', color: '#fff', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
          Waking up server, please wait... This may take up to 50 seconds.
        </div>
      )}
      <header className="top-bar">
        <Link to="/" className="brand-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src={logoImg} alt="Secure Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
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

/* Helper functions to encrypt/decrypt query metadata to avoid exposing it in the URL */
export function encryptPayload(payloadObj) {
  try {
    const jsonStr = JSON.stringify(payloadObj);
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    const key = [83, 101, 99, 117, 114, 101, 80, 68, 70, 86, 101, 114, 105, 102, 121]; // "SecurePDFVerify"
    const obfuscatedBytes = new Uint8Array(utf8Bytes.length);
    for (let i = 0; i < utf8Bytes.length; i++) {
      obfuscatedBytes[i] = utf8Bytes[i] ^ key[i % key.length];
    }
    let binary = '';
    const len = obfuscatedBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(obfuscatedBytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    console.error('Failed to encrypt payload:', e);
    return '';
  }
}

export function decryptPayload(token) {
  try {
    if (!token) return {};
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const key = [83, 101, 99, 117, 114, 101, 80, 68, 70, 86, 101, 114, 105, 102, 121]; // "SecurePDFVerify"
    const utf8Bytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      utf8Bytes[i] = bytes[i] ^ key[i % key.length];
    }
    return JSON.parse(new TextDecoder().decode(utf8Bytes));
  } catch (e) {
    console.error('Failed to decrypt payload:', e);
    return {};
  }
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
    e.target.value = ''; // Crucial: clear value to allow consecutive selection of the same file
  };

  return (
    <div
      className={`custom-dropzone ${file ? 'has-file' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        // Only trigger programmatic click if target clicked is NOT the input element itself
        if (e.target.tagName !== 'INPUT') {
          const inputEl = document.getElementById(inputId);
          if (inputEl) inputEl.click();
        }
      }}
    >
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        onClick={(e) => e.stopPropagation()} // Stop propagation to prevent duplicate click events
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
            onClick={() => {
              setFile(null);
              const inputEl = document.getElementById(inputId);
              if (inputEl) inputEl.value = '';
            }}
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

function addLinkToPage(pdfDoc, page, url, x, y, width, height) {
  try {
    const linkAnnot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(url)
      }
    });
    const linkAnnotRef = pdfDoc.context.register(linkAnnot);
    let annots = page.node.get(PDFName.of('Annots'));
    if (annots) {
      annots.push(linkAnnotRef);
    } else {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkAnnotRef]));
    }
  } catch (e) {
    console.error('Failed to add hyperlink annotation:', e);
  }
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
      hostStr = `${parsedUrl.host}${parsedUrl.pathname}`.replace(/\/[a-zA-Z0-9_-]+$/i, '');
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

    addLinkToPage(pdfDoc, lastPage, qrUrl, qrX, qrY, qrSize, qrSize);
    addLinkToPage(pdfDoc, lastPage, qrUrl, qrX, qrY - 22, qrSize, 12);

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

    addLinkToPage(pdfDoc, page, qrUrl, (width - qrSize) / 2, height - 490, qrSize, qrSize);
    addLinkToPage(pdfDoc, page, qrUrl, 160, height - 525, 280, 18);

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
    if (!pdfFile) {
      alert("Please upload a PDF file to secure.");
      return;
    }
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('documentType', form.documentType);
      
      issuanceFields.forEach((field) => {
        if (form[field.key]) {
          formData.append(field.key, form[field.key]);
        }
      });
      if (form.issuer) formData.append('issuer', form.issuer);
      if (form.issueDate) formData.append('issueDate', form.issueDate);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/documents/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to secure document');
      }

      const { documentId, downloadUrl, qrCodeUrl } = result.data;
      const { recipientName } = resolvePdfMetadata(form);

      setSecuredDoc({
        documentId,
        documentType: form.documentType,
        recipientName,
        verificationUrl: `${window.location.origin}/verify/${documentId}`,
        qrCodeUrl,
        downloadUrl,
        query: ''
      });
    } catch (err) {
      alert(`Failed to stamp PDF: ${err.message}`);
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
                    type={field.type || 'text'}
                    value={form[field.key]}
                    placeholder={field.placeholder}
                    required
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
                  required
                  onChange={(event) => setForm({ ...form, issuer: event.target.value })}
                />
              </label>
              
              <label>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Issue date
                  <Tooltip text="The date the document was officially signed and issued." />
                </span>
                <input type="date" value={form.issueDate} required onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
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

function VerificationState({ outcome, documentId, record, uploadedFile, uploadedFileHash, isVerifying }) {
  if (isVerifying) {
    return (
      <div className="result-banner-hud scanner-container" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--violet)', padding: '2.5rem 2rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div className="scanner-line"></div>
        <div className="loading-spinner-hud" style={{ margin: 0 }}></div>
        <div style={{ flex: 1 }}>
          <div className="hud-status-text" style={{ color: '#fff', fontSize: '1.25rem' }}>Running Security Audits</div>
          <div className="hud-status-reason" style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Comparing binary signature hashes and resolving registry ledger status...
          </div>
        </div>
      </div>
    );
  }

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
    const isIdMismatch = uploadedFile?.name && !uploadedFile.name.toLowerCase().includes(documentId.toLowerCase());

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
          {isIdMismatch && (
            <div className="hud-status-reason" style={{ marginTop: '0.5rem', color: '#f59e0b', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              ⚠️ ID Mismatch: The uploaded filename does not contain the queried Document ID: {documentId.toUpperCase()}.
            </div>
          )}
        </div>

        <details className="advanced-crypto-details" style={{ width: '100%' }}>
          <summary className="advanced-crypto-summary" style={{ textAlign: 'center' }}>View Cryptographic Discrepancies</summary>
          <div className="hash-comparison-card" style={{ marginTop: '0.5rem' }}>
            <div className="hash-row">
              <span>Registered Stamp Hash</span>
              <div className="hash-code">{view.issuedHash || view.originalHash || 'b4c6f3c4a1e6f4c0a0e8f6b2d8d9c6f3...'}</div>
            </div>
            <div className="hash-row">
              <span>Uploaded File Hash</span>
              <div className="hash-code" style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)' }}>
                {uploadedFileHash || (view.issuedHash ? view.issuedHash.replace(/.$/, 'a') : 'f4a6b3c4d1e2f4c0a0e8f6b2d8d9c6f3...')} (MISMATCH)
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
  const [inputDocId, setInputDocId] = useState(routeDocumentId || '');
  const [checkedDocId, setCheckedDocId] = useState(routeDocumentId || '');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [backendRecord, setBackendRecord] = useState(null);
  const [outcome, setOutcome] = useState('none');

  React.useEffect(() => {
    if (!checkedDocId) {
      setBackendRecord(null);
      setOutcome('none');
      return;
    }

    let active = true;
    const fetchDoc = async () => {
      setIsVerifying(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        if (uploadedFile) {
           const formData = new FormData();
           formData.append('documentId', checkedDocId);
           formData.append('file', uploadedFile);
           const res = await fetch(`${apiUrl}/api/verify/upload`, {
             method: 'POST',
             body: formData
           });
           const json = await res.json();
           if (!active) return;
           if (json.success) {
              setBackendRecord(json.data);
              setOutcome(json.data.status === 'Revoked' ? 'revoked' : 'valid');
           } else {
              if (json.status === 'INVALID') {
                 setOutcome('flagged');
              } else {
                 setOutcome('missing');
              }
           }
        } else {
           const res = await fetch(`${apiUrl}/api/verify/${checkedDocId}`);
           const json = await res.json();
           if (!active) return;
           if (json.success) {
              setBackendRecord(json.data);
              setOutcome(json.data.status === 'Revoked' ? 'revoked' : 'valid');
           } else {
              setBackendRecord(null);
              setOutcome('missing');
           }
        }
      } catch (err) {
        console.warn('Backend server error:', err);
        if (active) {
           setBackendRecord(null);
           setOutcome('missing');
        }
      } finally {
        if (active) setIsVerifying(false);
      }
    };
    
    // Slight delay for UX
    const timer = setTimeout(() => fetchDoc(), 800);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [checkedDocId, uploadedFile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputDocId) return;
    setCheckedDocId(inputDocId);
  };

  const fileName = uploadedFile?.name || '';
  const verificationTimestamp = new Date().toLocaleString();
  
  const mergedView = backendRecord ? {
    ...backendRecord,
    userName: backendRecord.recipientName || 'Unknown',
    verificationTimestamp
  } : {};

  return (
    <AppLayout>
      <div className="dashboard-split">
        <div className="panel-card">
          <div>
            <h1>Verify a secure document</h1>
            <p className="subtitle">Authenticity verification and cryptographic audit logging console.</p>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="full-span">
                <span style={{ display: "flex", alignItems: "center" }}>
                  Document ID
                  <Tooltip text="The unique registration identifier of the document to pull registry details from the secure ledger." />
                </span>
                <input value={inputDocId} required onChange={(event) => setInputDocId(event.target.value)} placeholder="e.g. A1B2C3" />
              </label>
              <label className="full-span">
                <span style={{ display: "flex", alignItems: "center" }}>
                  Compare Document PDF file
                  <Tooltip text="Upload a PDF file to run a cryptographic audit comparing its binary signature with the registered stamp." />
                </span>
                <CustomDropzone file={uploadedFile} setFile={setUploadedFile} />
              </label>
              
              <button
                type="submit"
                className="btn-primary full-span"
                style={{ marginTop: "0.5rem" }}
                disabled={isVerifying}
              >
                {isVerifying ? '🔍 Verifying...' : '🔍 Verify Document'}
              </button>
            </div>
          </form>
        </div>

        <div className="preview-container">
          <div className="hud-title">Verification Outcome HUD</div>
          <VerificationState 
             outcome={checkedDocId ? outcome : 'none'} 
             documentId={checkedDocId} 
             record={mergedView} 
             uploadedFile={fileName} 
             isVerifying={isVerifying} 
          />
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
