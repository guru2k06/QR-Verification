export const mockDocuments = [
  {
    documentId: 'DOC-2026-0001',
    fileName: 'Internship Certificate.pdf',
    issuer: 'Aarav Mehta',
    recipientName: 'Aarav Mehta',
    documentType: 'Certificate',
    issueDate: '2026-05-20',
    status: 'Active',
    verificationCount: 187,
    uploadDate: '2026-05-20',
    issuedHash: 'b4c6f3c4a1e6f4c0a0e8f6b2d8d9c6f3a1e0d0c2b8b7a6c5d4e3f2a1b0c9d8e7',
    originalHash: '4f9a6db1f84d4e4b9c8b1c6f3a5e7d2c1b0a99887766554433221100ffeeddcc',
    qrCodeUrl: 'https://verify.example.com/doc/DOC-2026-0001',
    city: 'Bengaluru'
  },
  {
    documentId: 'DOC-2026-0002',
    fileName: 'Offer Letter.pdf',
    issuer: 'Sana Khan',
    recipientName: 'Sana Khan',
    documentType: 'Offer Letter',
    issueDate: '2026-06-02',
    status: 'Active',
    verificationCount: 94,
    uploadDate: '2026-06-02',
    issuedHash: 'c4d5e6f708192a3b4c5d6e7f8190a1b2c3d4e5f60718293a4b5c6d7e8f90123',
    originalHash: '9d8c7b6a594837261514131211100ffeeddccbbaa99887766554433221100aa',
    qrCodeUrl: 'https://verify.example.com/doc/DOC-2026-0002',
    city: 'Hyderabad'
  },
  {
    documentId: 'DOC-2026-0003',
    fileName: 'Semester Marksheet.pdf',
    issuer: 'Priya Sharma',
    recipientName: 'Priya Sharma',
    documentType: 'Marksheet',
    issueDate: '2026-04-14',
    status: 'Revoked',
    verificationCount: 41,
    uploadDate: '2026-04-14',
    issuedHash: 'f0e1d2c3b4a5968778695a4b3c2d1e0f1234567890abcdef1234567890abcde1',
    originalHash: '8e7d6c5b4a39281716050403020100ffeeddccbbaa9988776655443322110f',
    qrCodeUrl: 'https://verify.example.com/doc/DOC-2026-0003',
    city: 'Pune'
  },
  {
    documentId: 'DOC-2026-0004',
    fileName: 'Invoice-2048.pdf',
    issuer: 'Karan Verma',
    recipientName: 'Karan Verma',
    documentType: 'Invoice',
    issueDate: '2026-06-07',
    status: 'Active',
    verificationCount: 22,
    uploadDate: '2026-06-07',
    issuedHash: '1a2b3c4d5e6f708192a3b4c5d6e7f8190a1b2c3d4e5f60718293a4b5c6d7e8f0',
    originalHash: 'f1e2d3c4b5a697887766554433221100ffeeddccbbaa99887766554433221199',
    qrCodeUrl: 'https://verify.example.com/doc/DOC-2026-0004',
    city: 'Mumbai'
  }
];

export const activityFeed = [
  { label: 'DOC-2026-0001 verified', meta: '2 mins ago · Bengaluru' },
  { label: 'DOC-2026-0003 revoked', meta: '41 mins ago · User action' },
  { label: 'Tamper alert reviewed', meta: 'Today · 11:24 AM' },
  { label: 'Bulk issuance queued', meta: 'Yesterday · CSV import' }
];
