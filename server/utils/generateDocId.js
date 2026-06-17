const Counter = require('../models/Counter');

/**
 * Generates a sequential document ID in the format DOC-YYYY-XXXX.
 * Uses atomic updates on the Counter collection to prevent duplicate IDs.
 * @returns {Promise<string>} Sequential document ID
 */
async function generateDocId() {
  const currentYear = new Date().getFullYear();
  const counterId = `documentId-${currentYear}`;

  // Find and increment the counter for this year atomically
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Pad the sequence number to 4 digits
  const paddedSeq = String(counter.seq).padStart(4, '0');

  return `DOC-${currentYear}-${paddedSeq}`;
}

module.exports = generateDocId;
