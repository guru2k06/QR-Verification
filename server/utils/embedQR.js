const { PDFDocument, rgb } = require('pdf-lib');
const url = require('url');

/**
 * Embeds a QR code and verification details on the last page of a PDF.
 * @param {Buffer} pdfBuffer - Original PDF file buffer
 * @param {Buffer} qrBuffer - QR code PNG buffer
 * @param {string} documentId - Document ID (e.g. DOC-2026-0001)
 * @param {string} verifyUrl - Full verification URL
 * @param {string|Date} issueDate - Issue date of the document
 * @returns {Promise<Buffer>} Modified PDF buffer
 */
async function embedQR(pdfBuffer, qrBuffer, documentId, verifyUrl, issueDate) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error('PDF has no pages');
    }

    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Standard fonts
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
    const fontRegular = await pdfDoc.embedFont('Helvetica');

    // Stamp dimensions and positioning (bottom-right corner)
    const qrSize = 70;
    const marginRight = 25;
    const qrX = width - qrSize - marginRight;
    
    // We position qrY high enough to fit text below it
    const qrY = 45; 

    // Draw white background block for readability (optional, ensures text/QR is visible over dark backgrounds)
    lastPage.drawRectangle({
      x: qrX - 5,
      y: qrY - 35,
      width: qrSize + 10,
      height: qrSize + 50,
      color: rgb(1, 1, 1),
      opacity: 0.9
    });

    // Draw QR Code
    lastPage.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize
    });

    // Draw border around QR code
    lastPage.drawRectangle({
      x: qrX - 1,
      y: qrY - 1,
      width: qrSize + 2,
      height: qrSize + 2,
      borderColor: rgb(0.54, 0.36, 0.96), // Brand violet color
      borderWidth: 1.5
    });

    // Draw Header Text above QR code
    lastPage.drawText('VERIFY ORIGINAL', {
      x: qrX,
      y: qrY + qrSize + 6,
      size: 6.5,
      font: fontBold,
      color: rgb(0.54, 0.36, 0.96)
    });

    // Draw Document ID below QR code
    lastPage.drawText(`ID: ${documentId}`, {
      x: qrX,
      y: qrY - 10,
      size: 7,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16)
    });

    // Extract clean verify URL path for representation
    let hostStr = 'verify.yourdomain.com';
    try {
      const parsedUrl = new URL(verifyUrl);
      hostStr = `${parsedUrl.host}${parsedUrl.pathname}`.replace(/\/DOC-\d{4}-\d{4}$/i, '');
      hostStr = hostStr.split('?')[0];
      if (hostStr.endsWith('/')) {
        hostStr = hostStr.slice(0, -1);
      }
    } catch (e) {
      try {
        const parsedUrl = url.parse(verifyUrl);
        hostStr = parsedUrl.host || parsedUrl.hostname || hostStr;
      } catch (err) {}
    }

    // Draw "Verify at: domain"
    lastPage.drawText(`Verify at: ${hostStr}`, {
      x: qrX,
      y: qrY - 19,
      size: 6,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });

    // Format issue date nicely
    const dateObj = new Date(issueDate);
    const dateStr = !isNaN(dateObj.getTime()) 
      ? dateObj.toISOString().slice(0, 10) 
      : String(issueDate);

    // Draw Issue Date
    lastPage.drawText(`Issued: ${dateStr}`, {
      x: qrX,
      y: qrY - 28,
      size: 6,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4)
    });

    const modifiedPdfBytes = await pdfDoc.save();
    return Buffer.from(modifiedPdfBytes);
  } catch (error) {
    console.error('Failed to embed QR code in PDF:', error);
    throw error;
  }
}

module.exports = embedQR;
