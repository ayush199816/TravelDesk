const express = require('express');
const router = express.Router();
const TemporaryHotel = require('../models/TemporaryHotel');
const auth = require('../middleware/auth');

// Get all temporary hotels for an organization
router.get('/', auth, async (req, res) => {
  try {
    const { city, country } = req.query;
    const query = { 
      organization: req.user.organization._id,
      isActive: true 
    };
    
    if (city) query.city = city;
    if (country) query.country = country;
    
    const hotels = await TemporaryHotel.find(query).sort({ createdAt: -1 });
    res.json(hotels);
  } catch (error) {
    console.error('Error fetching temporary hotels:', error);
    res.status(500).json({ message: 'Error fetching temporary hotels' });
  }
});

// Create a new temporary hotel
router.post('/', auth, async (req, res) => {
  try {
    const hotelData = {
      ...req.body,
      organization: req.user.organization._id
    };
    
    const hotel = new TemporaryHotel(hotelData);
    await hotel.save();
    
    res.status(201).json(hotel);
  } catch (error) {
    console.error('Error creating temporary hotel:', error);
    res.status(500).json({ message: 'Error creating temporary hotel' });
  }
});

// Update a temporary hotel
router.put('/:id', auth, async (req, res) => {
  try {
    const hotel = await TemporaryHotel.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organization: req.user.organization._id 
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!hotel) {
      return res.status(404).json({ message: 'Temporary hotel not found' });
    }
    
    res.json(hotel);
  } catch (error) {
    console.error('Error updating temporary hotel:', error);
    res.status(500).json({ message: 'Error updating temporary hotel' });
  }
});

// Delete a temporary hotel (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const hotel = await TemporaryHotel.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organization: req.user.organization._id 
      },
      { isActive: false },
      { new: true }
    );
    
    if (!hotel) {
      return res.status(404).json({ message: 'Temporary hotel not found' });
    }
    
    res.json({ message: 'Temporary hotel deleted successfully' });
  } catch (error) {
    console.error('Error deleting temporary hotel:', error);
    res.status(500).json({ message: 'Error deleting temporary hotel' });
  }
});

module.exports = router;
