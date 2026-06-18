const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    documentType: {
      type: String,
      required: [true, 'Please specify a document type'],
      trim: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    originalHash: {
      type: String,
      required: true,
      trim: true
    },
    issuedHash: {
      type: String,
      required: true,
      trim: true
    },
    issuer: {
      type: String,
      required: true,
      trim: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    recipientName: {
      type: String,
      required: true,
      trim: true
    },
    issueDate: {
      type: Date,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Active', 'Revoked', 'Expired'],
      default: 'Active'
    },
    qrCodeUrl: {
      type: String,
      required: true
    },
    verificationCount: {
      type: Number,
      default: 0
    },
    typeSpecificData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    sensitiveDataMasked: {
      type: Boolean,
      default: false
    },
    revokedAt: {
      type: Date
    },
    revocationReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Create index for fast lookups
DocumentSchema.index({ originalHash: 1 });
DocumentSchema.index({ issuedHash: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
