const Document = require('../models/Document');

/**
 * Generates a unique 6-character alphanumeric document ID.
 * @returns {Promise<string>} Unique 6-character alphanumeric ID
 */
async function generateDocId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let docId = '';

  while (!isUnique) {
    docId = '';
    for (let i = 0; i < 6; i++) {
      docId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await Document.findOne({ documentId: docId });
    if (!existing) {
      isUnique = true;
    }
  }

  return docId;
}

module.exports = generateDocId;
