/**
 * Centralized error handler middleware.
 * Formats errors nicely and hides stack traces in production.
 * Sanitizes errors from public verification endpoints to prevent data leakage.
 */
function errorHandler(err, req, res, next) {
  // Log the complete error internally for debugging
  console.error('API Error:', err);

  const isVerifyRoute = req.originalUrl.includes('/api/verify');
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Handle validation or type errors from Multer/Mongoose
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate entry detected';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // 2. Sanitize verification route responses
  if (isVerifyRoute) {
    // Public verification should not receive internal hashes, db info, or detailed stack errors.
    // Return standard responses.
    const cleanMessage = statusCode === 404 ? 'Document not found' : 'Verification failed';
    return res.status(statusCode).json({
      success: false,
      message: cleanMessage
    });
  }

  // 3. Regular routes
  const response = {
    success: false,
    message
  };

  // Leak stack trace only in development
  if (!isProduction) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
