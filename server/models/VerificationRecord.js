const mongoose = require('mongoose');

const VerificationRecordSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    trim: true
  },
  result: {
    type: String,
    enum: ['Valid', 'Invalid', 'Revoked', 'NotFound'],
    required: true
  },
  checkedHash: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

VerificationRecordSchema.index({ documentId: 1 });
VerificationRecordSchema.index({ timestamp: -1 });

module.exports = mongoose.model('VerificationRecord', VerificationRecordSchema);
