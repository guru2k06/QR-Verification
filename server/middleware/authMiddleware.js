const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - ensures user is authenticated with a valid JWT.
 */
const protect = async (req, res, next) => {
  let token;

  // Check headers for Authorization: Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Token missing.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secure_pdf_verification_jwt_secret_key_2026');

    // Get user from the database and attach to request
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this id.'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Token invalid or expired.'
    });
  }
};

/**
 * Grant access to specific roles.
 * @param {string[]} roles - Array of authorized roles (e.g. ['admin', 'issuer'])
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  }
};

module.exports = {
  protect,
  requireRole
};
