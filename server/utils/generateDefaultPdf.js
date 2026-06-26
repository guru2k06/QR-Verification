const { getTemplate } = require('./templates');
const puppeteer = require('puppeteer');

function fillTemplate(template, data) {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    const trimmedKey = key.trim();
    // Convert snake_case to camelCase
    const camelKey = trimmedKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

    // Explicit mappings for keys that differ
    if (trimmedKey === 'issuer_authority') return data.issuer || '';
    if (trimmedKey === 'joining_date' || trimmedKey === 'relieving_date') return data.joiningRelievingDate || '';
    if (trimmedKey === 'payer_name') return data.payerPayeeName || '';
    if (trimmedKey === 'name') return data.idName || '';
    if (trimmedKey === 'advocate_name') return data.notaryName || '';

    return data[camelKey] || data[trimmedKey] || '';
  });
}

/**
 * Auto-generates a clean A4 PDF document containing the provided metadata using HTML templates.
 * @param {Object} metadata 
 * @returns {Promise<Buffer>}
 */
async function generateDefaultPdf(metadata) {
  try {
    const template = getTemplate(metadata.documentType);

    const issueDateStr = metadata.issueDate instanceof Date
      ? metadata.issueDate.toISOString().slice(0, 10)
      : String(metadata.issueDate || '');

    const data = {
      ...metadata,
      ...metadata.typeSpecificData,
      issueDate: issueDateStr
    };

    const htmlContent = fillTemplate(template, data);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center; color:#555; padding-bottom:10px;"><strong>Disclaimer:</strong> This is an auto-generated document, cryptographically secured by veriDoc. Scan the embedded QR code to verify authenticity.</div>',
      margin: {
        top: '40px',
        bottom: '80px',
        left: '40px',
        right: '40px'
      }
    });

    await browser.close();

    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Failed to generate default PDF with Puppeteer:', error);
    throw error;
  }
}

module.exports = generateDefaultPdf;
