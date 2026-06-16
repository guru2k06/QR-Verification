export function getNextDocumentId(records) {
  return `DOC-2026-${String(records.length + 1).padStart(4, '0')}`;
}

export function getVerificationOutcome({ record, fileName }) {
  if (!record) {
    return 'missing';
  }

  if (fileName && /tamper|alter|edit|mismatch/i.test(fileName)) {
    return 'flagged';
  }

  if (record.status === 'Revoked') {
    return 'revoked';
  }

  return 'verified';
}

export function getVerificationRecordView({ documentId, record, uploadedFile }) {
  const fallback = {
    issuer: 'Aarav Mehta',
    recipientName: 'Aarav Mehta',
    email: 'aarav@example.com',
    documentType: 'Certificate',
    issueDate: '2026-06-15',
    uploadDate: '2026-06-15',
    originalHash: '4f9a6db1f84d4e4b9c8b1c6f3a5e7d2c1b0a99887766554433221100ffeeddcc',
    issuedHash: 'b4c6f3c4a1e6f4c0a0e8f6b2d8d9c6f3a1e0d0c2b8b7a6c5d4e3f2a1b0c9d8e7',
    status: 'Active',
    verificationCount: 0,
    fileName: 'certificate.pdf',
    qrCodeUrl: `https://verify.example.com/doc/${documentId}`
  };

  const details = record || fallback;
  const userName = details.fullName || details.recipientName || details.issuer || 'Aarav Mehta';

  return {
    documentId,
    userName,
    issuer: details.issuer || userName,
    email: details.email || 'aarav@example.com',
    documentType: details.documentType || 'Certificate',
    issueDate: details.issueDate || '2026-06-15',
    uploadDate: details.uploadDate || details.issueDate || '2026-06-15',
    originalHash: details.originalHash || fallback.originalHash,
    issuedHash: details.issuedHash || fallback.issuedHash,
    status: details.status || 'Active',
    verificationCount: details.verificationCount ?? 0,
    uploadedFile: uploadedFile || details.fileName || 'selected-document.pdf',
    referenceUrl: details.qrCodeUrl || `https://verify.example.com/doc/${documentId}`
  };
}