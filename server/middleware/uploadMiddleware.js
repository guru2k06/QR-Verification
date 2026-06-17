const multer = require('multer');

// Store files in memory so we can perform hashing and QR embedding on buffers directly
const storage = multer.memoryStorage();

// Filter to accept only PDF mimetypes
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB size limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
