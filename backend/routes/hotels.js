const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const auth = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

// Get all hotels for an organization
router.get('/', auth, async (req, res) => {
  try {
    const { organization, city, country } = req.query;
    let query = { organization, isActive: true };
    
    if (city) query.city = new RegExp(city, 'i');
    if (country) query.country = new RegExp(country, 'i');
    
    const hotels = await Hotel.find(query)
      .populate('createdBy', 'name email')
      .sort({ name: 1 });
    
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single hotel by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new hotel
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    console.log('Creating hotel with data:', req.body);
    console.log('Uploaded files:', req.files);
    
    // Parse JSON fields from FormData
    const hotelData = {
      name: req.body.name,
      description: req.body.description,
      address: req.body.address,
      city: req.body.city,
      country: req.body.country,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      website: req.body.website,
      starRating: parseInt(req.body.starRating) || 3,
      checkInTime: req.body.checkInTime,
      checkOutTime: req.body.checkOutTime,
      organization: req.body.organization,
      roomCategories: req.body.roomCategories ? JSON.parse(req.body.roomCategories) : [],
      amenities: req.body.amenities ? JSON.parse(req.body.amenities) : []
    };
    
    // Upload images to Cloudinary
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file);
          imageUrls.push(result.secure_url);
          console.log('Uploaded image:', result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue with other images even if one fails
        }
      }
    }
    
    const hotel = new Hotel({
      ...hotelData,
      images: imageUrls,
      createdBy: req.userType === 'user' ? req.user._id : null
    });
    
    console.log('Hotel object created:', hotel);
    
    const savedHotel = await hotel.save();
    console.log('Hotel saved successfully:', savedHotel._id);
  
    const populated = await Hotel.findById(savedHotel._id)
      .populate('createdBy', 'name email');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error saving hotel:', error);
    console.error('Error details:', error.errors);
    res.status(400).json({ message: error.message });
  }
});

// Update a hotel
router.put('/:id', auth, (req, res, next) => {
  // Check if there are any files in the request
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.array('images', 5)(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    console.log('Updating hotel with data:', req.body);
    console.log('Uploaded files:', req.files);
    
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
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
          console.log('Uploaded new image:', result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading new image:', uploadError);
        }
      }
    }
    
    // Combine existing and new images
    const allImages = [...existingImages, ...newImageUrls];
    
    // Update hotel fields
    if (req.body.name) hotel.name = req.body.name;
    if (req.body.description) hotel.description = req.body.description;
    if (req.body.address) hotel.address = req.body.address;
    if (req.body.city) hotel.city = req.body.city;
    if (req.body.country) hotel.country = req.body.country;
    if (req.body.phoneNumber) hotel.phoneNumber = req.body.phoneNumber;
    if (req.body.email) hotel.email = req.body.email;
    if (req.body.website) hotel.website = req.body.website;
    if (req.body.starRating) hotel.starRating = parseInt(req.body.starRating);
    if (req.body.checkInTime) hotel.checkInTime = req.body.checkInTime;
    if (req.body.checkOutTime) hotel.checkOutTime = req.body.checkOutTime;
    if (req.body.roomCategories) hotel.roomCategories = JSON.parse(req.body.roomCategories);
    if (req.body.amenities) hotel.amenities = JSON.parse(req.body.amenities);
    
    // Update images only if new images were uploaded or existing images changed
    if (newImageUrls.length > 0 || req.body.existingImages) {
      hotel.images = allImages;
    }
    
    const updatedHotel = await hotel.save();
    const populated = await Hotel.findById(updatedHotel._id).populate('createdBy', 'name email');
    
    res.json(populated);
  } catch (error) {
    console.error('Error updating hotel:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a hotel (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    res.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add room category to hotel
router.post('/:id/rooms', auth, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    hotel.roomCategories.push(req.body);
    await hotel.save();
    
    const updated = await Hotel.findById(req.params.id).populate('createdBy', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update room category
router.put('/:id/rooms/:roomId', auth, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    const roomIndex = hotel.roomCategories.findIndex(
      room => room._id.toString() === req.params.roomId
    );
    
    if (roomIndex === -1) {
      return res.status(404).json({ message: 'Room category not found' });
    }
    
    hotel.roomCategories[roomIndex] = { ...hotel.roomCategories[roomIndex].toObject(), ...req.body };
    await hotel.save();
    
    const updated = await Hotel.findById(req.params.id).populate('createdBy', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete room category
router.delete('/:id/rooms/:roomId', auth, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    hotel.roomCategories = hotel.roomCategories.filter(
      room => room._id.toString() !== req.params.roomId
    );
    
    await hotel.save();
    
    const updated = await Hotel.findById(req.params.id).populate('createdBy', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
