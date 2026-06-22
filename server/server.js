const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Set HTTP Security Headers
// We customize contentSecurityPolicy to allow static PDF serving/loading if needed
app.use(helmet({
  crossOriginResourcePolicy: false // Allows browsers to retrieve files from uploads statically
}));

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL,
        /^https:\/\/qr-verification.*\.vercel\.app$/,
        'http://localhost:5173'
      ].filter(Boolean)
    : '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// HTTP Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve stamped PDFs statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes mapping
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/verify', require('./routes/verifyRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Universal Secure PDF Verification API is running.'
  });
});

// Health check route for uptime monitors and free tier cold starts
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is awake'
  });
});

// Centralized error handler (Must be placed after all other app.use() and routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
