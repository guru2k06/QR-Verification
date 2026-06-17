const fs = require('fs');
const path = require('path');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Saves a file buffer to storage.
 * Defaults to local disk storage, but can be updated to S3/Cloudinary.
 * 
 * @param {string} fileName - Destination file name
 * @param {Buffer} fileBuffer - File binary data
 * @returns {Promise<object>} Object containing save path/URL and status
 */
async function saveFile(fileName, fileBuffer) {
  try {
    // Standardize filename to avoid conflicts (timestamp pre-pended)
    const sanitizedName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadDir, sanitizedName);

    // Write file to local disk
    fs.writeFileSync(filePath, fileBuffer);

    // Return the virtual/local paths
    return {
      success: true,
      fileName: sanitizedName,
      filePath: `/uploads/${sanitizedName}`, // public relative path
      absolutePath: filePath
    };
  } catch (error) {
    console.error('Storage save failure:', error);
    throw new Error(`Failed to save file: ${error.message}`);
  }
}

/**
 * Deletes a file from storage.
 * @param {string} filePath - Public relative path
 */
async function deleteFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const fullPath = path.join(uploadDir, fileName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Storage delete failure:', error);
  }
}

module.exports = {
  saveFile,
  deleteFile
};
