const rateLimit = require('express-rate-limit');

/**
 * Rate limiter specifically for verification endpoints.
 * Limits each IP to 20 verification checks per minute.
 */
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many verification requests from this IP. Please try again in a minute.'
  }
});

/**
 * Rate limiter specifically for upload endpoints.
 * Limits each IP to 5 uploads per minute.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload requests from this IP. Please try again in a minute.'
  }
});

module.exports = {
  verifyLimiter,
  uploadLimiter
};
