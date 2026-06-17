const QRCode = require('qrcode');

/**
 * Generates a QR code PNG buffer for a given URL.
 * @param {string} url - The URL to encode in the QR code
 * @returns {Promise<Buffer>} PNG image buffer of the QR code
 */
async function generateQR(url) {
  if (!url) {
    throw new Error('URL is required for QR code generation');
  }

  // Generate QR code as a PNG Buffer
  // Set margin to 1 and width to 200 for a crisp image
  return await QRCode.toBuffer(url, {
    type: 'png',
    margin: 1,
    width: 200
  });
}

module.exports = generateQR;
