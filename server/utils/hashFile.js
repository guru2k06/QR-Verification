const crypto = require('crypto');
const fs = require('fs');

/**
 * Computes the SHA-256 hash of a file path or buffer.
 * @param {string|Buffer} input - File path or buffer to hash
 * @returns {string} SHA-256 hex digest
 */
function hashFile(input) {
  const hash = crypto.createHash('sha256');

  if (Buffer.isBuffer(input)) {
    hash.update(input);
    return hash.digest('hex');
  } else if (typeof input === 'string') {
    // If it's a file path, read the file synchronously
    const fileBuffer = fs.readFileSync(input);
    hash.update(fileBuffer);
    return hash.digest('hex');
  } else {
    throw new Error('Invalid input to hashFile. Expected path string or buffer.');
  }
}

module.exports = hashFile;
