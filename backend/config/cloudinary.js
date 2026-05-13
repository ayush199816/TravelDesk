require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqwh56nzb',
  api_key: process.env.CLOUDINARY_API_KEY || '423422493738484',
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
