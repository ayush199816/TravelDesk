const multer = require('multer');
const path = require('path');
// Changed 'as' to ':' for CommonJS destructuring
const cloudinary = require('../config/cloudinary');

// Configure memory storage for multer
const storage = multer.memoryStorage();

// Initialize multer with memory storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file) => {
  try {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'navidesk',
          resource_type: 'auto', // 'auto' is often safer for varying image formats
          public_id: `${file.originalname.split('.')[0]}_${Date.now()}`,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload successful:', result.secure_url);
            resolve(result);
          }
        }
      );
      stream.end(file.buffer);
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

module.exports = { upload, uploadToCloudinary };