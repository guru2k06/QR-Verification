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
    
    // Create an upload stream to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'qr-verification',
        public_id: sanitizedName,
        resource_type: 'raw', // Ensure PDF is treated correctly
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
    // Extract public_id from Cloudinary raw URL 
    // e.g. https://res.cloudinary.com/.../raw/upload/v1234/qr-verification/123-file.pdf
    const urlParts = fileUrl.split('/');
    // Get everything after the 'upload/' segment (and version string if present)
    const uploadIndex = urlParts.findIndex(p => p === 'upload');
    if (uploadIndex > -1) {
      let relativeParts = urlParts.slice(uploadIndex + 1);
      // Remove version string like 'v123456'
      if (relativeParts[0].match(/^v\d+$/)) {
        relativeParts = relativeParts.slice(1);
      }
      const publicId = relativeParts.join('/');
      
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
  } catch (error) {
    console.error('Cloudinary delete failure:', error);
  }
}

module.exports = {
  saveFile,
  deleteFile
};
