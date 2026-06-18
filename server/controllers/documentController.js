const Document = require('../models/Document');
const VerificationRecord = require('../models/VerificationRecord');
const hashFile = require('../utils/hashFile');
const generateDocId = require('../utils/generateDocId');
const generateQR = require('../utils/generateQR');
const embedQR = require('../utils/embedQR');
const maskSensitiveData = require('../utils/maskSensitiveData');
const storage = require('../utils/storage');

// Helper to determine high-level document category
const getCategory = (documentType) => {
  const t = String(documentType).trim().toLowerCase();
  if (['certificate', 'marksheet', 'degree', 'bonafide', 'academic'].some(x => t.includes(x))) return 'Academic';
  if (['offer', 'experience', 'employment', 'job'].some(x => t.includes(x))) return 'Employment';
  if (['medical'].some(x => t.includes(x))) return 'Medical Report';
  if (['invoice', 'billing'].some(x => t.includes(x))) return 'Invoice';
  if (['legal', 'contract', 'agreement'].some(x => t.includes(x))) return 'Legal';
  if (['identity', 'id', 'government', 'passport', 'aadhaar'].some(x => t.includes(x))) return 'Government ID';
  return 'Academic';
};

// @desc    Upload new document, stamp QR, store in DB
// @route   POST /api/documents/upload
// @access  Protected (Admin/Issuer)
const uploadDocument = async (req, res, next) => {
  try {
    const { documentType } = req.body;
    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Please specify documentType in the metadata'
      });
    }

    const category = getCategory(documentType);

    // 2. Validate metadata based on category
    const errors = [];
    if (category === 'Academic') {
      if (!req.body.studentName) errors.push('studentName is required for Academic documents');
      if (!req.body.rollNumber) errors.push('rollNumber is required for Academic documents');
      if (!req.body.institution) errors.push('institution is required for Academic documents');
      if (!req.body.course) errors.push('course is required for Academic documents');
    } else if (category === 'Employment') {
      if (!req.body.employeeName) errors.push('employeeName is required for Employment documents');
      if (!req.body.designation) errors.push('designation is required for Employment documents');
      if (!req.body.company) errors.push('company is required for Employment documents');
    } else if (category === 'Medical Report') {
      if (!req.body.patientName) errors.push('patientName is required for Medical Reports');
      if (!req.body.hospital) errors.push('hospital is required for Medical Reports');
      if (!req.body.reportType) errors.push('reportType is required for Medical Reports');
    } else if (category === 'Invoice') {
      if (!req.body.invoiceNumber) errors.push('invoiceNumber is required for Invoices');
      if (!req.body.payerPayeeName) errors.push('payerPayeeName is required for Invoices');
      if (!req.body.amount) errors.push('amount is required for Invoices');
    } else if (category === 'Legal') {
      if (!req.body.partyNames) errors.push('partyNames is required for Legal documents');
      if (!req.body.legalDocumentType) errors.push('legalDocumentType is required for Legal documents');
    } else if (category === 'Government ID') {
      if (!req.body.idName) errors.push('idName is required for Government IDs');
      if (!req.body.idDocumentType) errors.push('idDocumentType is required for Government IDs');
      if (!req.body.issuingAuthority) errors.push('issuingAuthority is required for Government IDs');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // 3. Derive standard fields
    const recipientName = req.body.recipientName || 
      req.body.studentName || 
      req.body.employeeName || 
      req.body.patientName || 
      req.body.payerPayeeName || 
      req.body.partyNames || 
      req.body.idName || 
      'Unknown Recipient';

    const issuer = req.body.issuer || 
      req.body.institution || 
      req.body.company || 
      req.body.hospital || 
      req.body.issuingAuthority || 
      req.body.notaryName || 
      'System Authority';

    const issueDate = req.body.issueDate ? new Date(req.body.issueDate) : new Date();

    // 4. Isolate typeSpecificData from req.body
    const typeSpecificData = {};
    const commonKeys = ['documentType', 'issuer', 'recipientName', 'issueDate'];
    
    Object.keys(req.body).forEach(key => {
      if (!commonKeys.includes(key)) {
        typeSpecificData[key] = req.body[key];
      }
    });

    // 5. Ensure we have a PDF buffer
    let pdfBuffer;
    let originalName;
    if (req.file) {
      pdfBuffer = req.file.buffer;
      originalName = req.file.originalname;
    } else {
      const generateDefaultPdf = require('../utils/generateDefaultPdf');
      pdfBuffer = await generateDefaultPdf({
        documentType,
        recipientName,
        issuer,
        issueDate,
        typeSpecificData
      });
      originalName = `${documentType.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    }

    // 6. Compute hash of the original file (uploaded or generated)
    const originalHash = hashFile(pdfBuffer);

    // 7. Generate sequential documentId (DOC-YYYY-XXXX)
    const documentId = await generateDocId();

    // 8. Build base verification URL
    let baseUrl = process.env.BASE_VERIFY_URL || 'https://qr-verification-92l0iafpv-guru2k06s-projects.vercel.app/verify';
    
    // Force override if the cached environment variable is still stuck on localhost
    if (baseUrl.includes('localhost')) {
      baseUrl = 'https://qr-verification-92l0iafpv-guru2k06s-projects.vercel.app/verify';
    }

    const verifyUrl = `${baseUrl}/${documentId}`;

    // 9. Generate QR code PNG buffer
    const qrBuffer = await generateQR(verifyUrl);

    // 10. Stamp QR Code into the PDF
    const stampedPdfBuffer = await embedQR(
      pdfBuffer,
      qrBuffer,
      documentId,
      verifyUrl,
      issueDate
    );

    // 11. Compute hash of the final stamped PDF
    const issuedHash = hashFile(stampedPdfBuffer);

    // 12. Save final stamped PDF to storage
    const storageResult = await storage.saveFile(
      originalName,
      stampedPdfBuffer
    );

    const maskedData = maskSensitiveData(documentType, typeSpecificData);

    // 12. Save to database
    const document = await Document.create({
      documentId,
      documentType,
      fileName: storageResult.fileName,
      fileUrl: storageResult.filePath,
      originalHash,
      issuedHash,
      issuer,
      recipientName,
      issueDate,
      uploadDate: new Date(),
      status: 'Active',
      qrCodeUrl: verifyUrl,
      typeSpecificData: maskedData,
      sensitiveDataMasked: true
    });

    return res.status(201).json({
      success: true,
      message: 'Document issued successfully',
      data: {
        documentId: document.documentId,
        downloadUrl: `data:application/pdf;base64,${stampedPdfBuffer.toString('base64')}`,
        qrCodeUrl: document.qrCodeUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all issued documents (filtered by issuer or all if admin)
// @route   GET /api/documents
// @access  Protected (Admin/Issuer)
const getDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Publicly get all documents without restricting by user
    const query = {};

    // Apply filtering
    if (req.query.documentType) {
      query.documentType = req.query.documentType;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.recipientName) {
      query.recipientName = { $regex: req.query.recipientName, $options: 'i' };
    }

    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    return res.status(200).json({
      success: true,
      count: documents.length,
      pagination,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed document record (includes audit/verification history)
// @route   GET /api/documents/:documentId
// @access  Protected (Admin/Issuer)
const getDocumentById = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findOne({ documentId });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: `Document not found with ID of ${documentId}`
      });
    }

    // Retrieve verification records (audit history)
    const verificationHistory = await VerificationRecord.find({ documentId })
      .sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      data: {
        document,
        verificationHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke document
// @route   PATCH /api/documents/:documentId/revoke
// @access  Protected (Admin or original Issuer)
const revokeDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { reason } = req.body;

    const document = await Document.findOne({ documentId });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: `Document not found with ID of ${documentId}`
      });
    }

    // Public revocation without authentication checks

    if (document.status === 'Revoked') {
      return res.status(400).json({
        success: false,
        message: 'Document is already revoked'
      });
    }

    // Revoke document
    document.status = 'Revoked';
    document.revokedAt = new Date();
    document.revocationReason = reason || 'Revoked by issuing authority';
    await document.save();

    // Log the revocation in verification audits
    await VerificationRecord.create({
      documentId,
      result: 'Revoked',
      checkedHash: document.issuedHash,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      message: 'Document successfully revoked',
      data: document
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  revokeDocument
};
