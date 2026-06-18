const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  revokeDocument
} = require('../controllers/documentController');
const upload = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Public routes for upload, lookup, and revocation
router.post('/upload', uploadLimiter, upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/:documentId', getDocumentById);
router.patch('/:documentId/revoke', revokeDocument);

module.exports = router;
