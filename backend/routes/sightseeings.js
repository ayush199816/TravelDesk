const express = require('express');
const router = express.Router();
const Sightseeing = require('../models/Sightseeing');
const auth = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

// Get all sightseeings for an organization
router.get('/', auth, async (req, res) => {
  try {
    const { organization } = req.query;
    const sightseeings = await Sightseeing.find({ organization })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(sightseeings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new sightseeing
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    console.log('Creating sightseeing with data:', req.body);
    console.log('Uploaded files:', req.files);
    
    // Parse sightseeing data from FormData
    const sightseeingData = {
      name: req.body.name,
      description: req.body.description,
      rate: parseFloat(req.body.rate) || 0,
      childRate: parseFloat(req.body.childRate) || 0,
      currency: req.body.currency,
      duration: req.body.duration,
      location: req.body.location,
      country: req.body.country,
      organization: req.body.organization
    };
    
    // Upload images to Cloudinary
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file);
          imageUrls.push(result.secure_url);
          console.log('Uploaded sightseeing image:', result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading sightseeing image:', uploadError);
          // Continue with other images even if one fails
        }
      }
    }
    
    const sightseeing = new Sightseeing({
      ...sightseeingData,
      images: imageUrls,
      createdBy: req.userType === 'user' ? req.user._id : null
    });
    const savedSightseeing = await sightseeing.save();
    const populated = await Sightseeing.findById(savedSightseeing._id)
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error saving sightseeing:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a sightseeing
router.put('/:id', auth, (req, res, next) => {
  // Check if there are any files in the request
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.array('images', 5)(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    console.log('Updating sightseeing with data:', req.body);
    console.log('Uploaded files:', req.files);
    
    const sightseeing = await Sightseeing.findById(req.params.id);
    if (!sightseeing) {
      return res.status(404).json({ message: 'Sightseeing not found' });
    }
    
    // Parse existing images from FormData
    let existingImages = [];
    if (req.body.existingImages) {
      existingImages = JSON.parse(req.body.existingImages);
    }
    
    // Upload new images to Cloudinary
    const newImageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file);
          newImageUrls.push(result.secure_url);
          console.log('Uploaded new sightseeing image:', result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading new sightseeing image:', uploadError);
        }
      }
    }
    
    // Combine existing and new images
    const allImages = [...existingImages, ...newImageUrls];
    
    // Update sightseeing fields
    if (req.body.name) sightseeing.name = req.body.name;
    if (req.body.description) sightseeing.description = req.body.description;
    if (req.body.rate) sightseeing.rate = parseFloat(req.body.rate);
    if (req.body.childRate) sightseeing.childRate = parseFloat(req.body.childRate);
    if (req.body.currency) sightseeing.currency = req.body.currency;
    if (req.body.duration) sightseeing.duration = req.body.duration;
    if (req.body.location) sightseeing.location = req.body.location;
    if (req.body.country) sightseeing.country = req.body.country;
    
    // Update images only if new images were uploaded or existing images changed
    if (newImageUrls.length > 0 || req.body.existingImages) {
      sightseeing.images = allImages;
    }
    
    const updatedSightseeing = await sightseeing.save();
    const populated = await Sightseeing.findById(updatedSightseeing._id).populate('createdBy', 'name email');
    
    res.json(populated);
  } catch (error) {
    console.error('Error updating sightseeing:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a sightseeing
router.delete('/:id', auth, async (req, res) => {
  try {
    const sightseeing = await Sightseeing.findByIdAndDelete(req.params.id);
    if (!sightseeing) {
      return res.status(404).json({ message: 'Sightseeing not found' });
    }
    res.json({ message: 'Sightseeing deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
