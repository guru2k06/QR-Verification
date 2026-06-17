const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  revokeDocument
} = require('../controllers/documentController');
const upload = require('../middleware/uploadMiddleware');

// Public routes for upload, lookup, and revocation
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/:documentId', getDocumentById);
router.patch('/:documentId/revoke', revokeDocument);

module.exports = router;
