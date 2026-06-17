const express = require('express');
const router = express.Router();
const { verifyById, verifyUpload } = require('../controllers/verifyController');
const { verifyLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/uploadMiddleware');

// Apply rate limiting to all public verification endpoints (max 20 req/min per IP)
router.use(verifyLimiter);

// Public lookup by ID
router.get('/:documentId', verifyById);

// Public check by uploading stamped file
router.post('/upload', upload.single('file'), verifyUpload);

module.exports = router;
