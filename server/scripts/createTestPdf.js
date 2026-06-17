const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createDummyPdf() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    page.drawText('Sample Document for Secure Verification System', {
      x: 50,
      y: 750,
      size: 20,
      color: rgb(0.1, 0.2, 0.3)
    });

    page.drawText('This is a raw template PDF file used for upload and QR stamping tests.', {
      x: 50,
      y: 700,
      size: 12,
      color: rgb(0.3, 0.3, 0.3)
    });

    page.drawText('Verification system will append verification stamp and QR in bottom-right corner.', {
      x: 50,
      y: 680,
      size: 11,
      color: rgb(0.4, 0.4, 0.4)
    });

    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(__dirname, '../test-sample.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`Generated dummy test PDF at: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to generate dummy PDF:', error);
    process.exit(1);
  }
}

createDummyPdf();
