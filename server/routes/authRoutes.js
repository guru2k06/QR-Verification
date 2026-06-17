const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Custom helper middleware to conditionally authenticate if token header is present
const optionalProtect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    return protect(req, res, next);
  }
  next();
};

router.post('/register', optionalProtect, register);
router.post('/login', login);

module.exports = router;
