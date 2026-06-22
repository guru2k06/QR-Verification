const Document = require('../models/Document');
const VerificationRecord = require('../models/VerificationRecord');
const hashFile = require('../utils/hashFile');

// @desc    Verify document by Document ID (Public API)
// @route   GET /api/verify/:documentId
// @access  Public
const verifyById = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    // 1. Find document
    const document = await Document.findOne({ documentId });

    // 2. If not found, log audit record and return generic 404
    if (!document) {
      await VerificationRecord.create({
        documentId,
        result: 'NotFound',
        checkedHash: null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // 3. If Revoked, log audit record and return revoked info only
    if (document.status === 'Revoked') {
      await VerificationRecord.create({
        documentId,
        result: 'Revoked',
        checkedHash: document.issuedHash,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        data: {
          documentId: document.documentId,
          status: 'Revoked',
          revokedAt: document.revokedAt || document.updatedAt,
          revocationReason: document.revocationReason || 'Invalidated by issuer'
        },
        message: 'This document has been revoked'
      });
    }

    // 4. If Active, increment verification count and log audit record
    document.verificationCount += 1;
    await document.save();

    await VerificationRecord.create({
      documentId,
      result: 'Valid',
      checkedHash: document.issuedHash,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 5. Construct public-safe verification payload (No internal hashes or uploader info)
    const verificationResponse = {
      documentId: document.documentId,
      documentType: document.documentType,
      issuer: document.issuer,
      recipientName: document.recipientName,
      issueDate: document.issueDate,
      uploadDate: document.uploadDate,
      status: document.status,
      verificationCount: document.verificationCount,
      typeSpecificData: document.typeSpecificData
    };

    return res.status(200).json({
      success: true,
      data: verificationResponse,
      message: 'Document verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify document by uploading the file for hash comparison (Public API)
// @route   POST /api/verify/upload
// @access  Public
const verifyUpload = async (req, res, next) => {
  try {
    const { documentId } = req.body;

    let fileBuffer;
    if (req.file) {
      fileBuffer = req.file.buffer;
    } else if (req.body.fileBase64) {
      fileBuffer = Buffer.from(req.body.fileBase64, 'base64');
    }

    if (!fileBuffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    // 1. Recompute SHA-256 hash of the uploaded file
    const computedHash = hashFile(fileBuffer);

    // 2. Find document
    let document;
    if (documentId) {
      document = await Document.findOne({ documentId });
    } else {
      document = await Document.findOne({ issuedHash: computedHash });
    }

    // 3. If not found, log audit record and return generic 404
    if (!document) {
      await VerificationRecord.create({
        documentId: documentId || 'UNKNOWN_UPLOAD',
        result: 'NotFound',
        checkedHash: computedHash,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // 4. Compare computed hash with the issuedHash stored in the database
    if (computedHash !== document.issuedHash) {
      // Log tampering attempt
      await VerificationRecord.create({
        documentId: document.documentId,
        result: 'Invalid',
        checkedHash: computedHash,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: false,
        status: 'INVALID',
        reason: 'Hash Mismatch Detected',
        message: 'Possible Tampering Found'
      });
    }

    // 5. If match and status is Revoked, log and return revoked response
    if (document.status === 'Revoked') {
      await VerificationRecord.create({
        documentId: document.documentId,
        result: 'Revoked',
        checkedHash: computedHash,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        data: {
          documentId: document.documentId,
          status: 'Revoked',
          revokedAt: document.revokedAt || document.updatedAt,
          revocationReason: document.revocationReason || 'Invalidated by issuer'
        },
        message: 'This document has been revoked'
      });
    }

    // 6. If match and Active, increment verify count, log audit record, and return metadata
    document.verificationCount += 1;
    await document.save();

    await VerificationRecord.create({
      documentId: document.documentId,
      result: 'Valid',
      checkedHash: computedHash,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const verificationResponse = {
      documentId: document.documentId,
      documentType: document.documentType,
      issuer: document.issuer,
      recipientName: document.recipientName,
      issueDate: document.issueDate,
      uploadDate: document.uploadDate,
      status: document.status,
      verificationCount: document.verificationCount,
      typeSpecificData: document.typeSpecificData
    };

    return res.status(200).json({
      success: true,
      data: verificationResponse,
      message: 'Document verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyById,
  verifyUpload
};
