const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Saves a file buffer to Cloudinary storage.
 * 
 * @param {string} fileName - Destination file name
 * @param {Buffer} fileBuffer - File binary data
 * @returns {Promise<object>} Object containing save path/URL and status
 */
async function saveFile(fileName, fileBuffer) {
  return new Promise((resolve, reject) => {
    // Standardize filename to avoid conflicts
    const sanitizedName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    
    // Strip extension from public_id to prevent Cloudinary from appending .pdf.pdf
    const publicId = sanitizedName.replace(/\.[^/.]+$/, "");

    // Create an upload stream to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'qr-verification',
        public_id: publicId,
        resource_type: 'image', // Use 'image' instead of 'raw' for PDFs to bypass restricted delivery
        use_filename: true,
        unique_filename: false
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload failure:', error);
          return reject(new Error(`Failed to save file to Cloudinary: ${error.message}`));
        }
        
        // Return the Cloudinary CDN URL instead of a local path
        resolve({
          success: true,
          fileName: sanitizedName,
          filePath: result.secure_url, // Using secure_url
          absolutePath: result.secure_url
        });
      }
    );

    // Write the buffer to the stream
    uploadStream.end(fileBuffer);
  });
}

/**
 * Deletes a file from Cloudinary storage.
 * @param {string} fileUrl - Cloudinary URL
 */
async function deleteFile(fileUrl) {
  try {
    // Extract public_id from Cloudinary URL 
    const urlParts = fileUrl.split('/');
    // Get everything after the 'upload/' segment (and version string if present)
    const uploadIndex = urlParts.findIndex(p => p === 'upload');
    if (uploadIndex > -1) {
      let relativeParts = urlParts.slice(uploadIndex + 1);
      // Remove version string like 'v123456'
      if (relativeParts[0].match(/^v\d+$/)) {
        relativeParts = relativeParts.slice(1);
      }
      let publicId = relativeParts.join('/');
      
      // Strip .pdf extension as image resource types don't include it in public_id
      if (publicId.endsWith('.pdf')) {
        publicId = publicId.slice(0, -4);
      }
      
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }
  } catch (error) {
    console.error('Cloudinary delete failure:', error);
  }
}

module.exports = {
  saveFile,
  deleteFile
};
