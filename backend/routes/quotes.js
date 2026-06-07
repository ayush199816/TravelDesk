const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const auth = require('../middleware/auth');
const currencyService = require('../services/currencyService');

// Get current exchange rates
router.get('/exchange-rates', async (req, res) => {
  try {
    const rates = await currencyService.getRealTimeRates();
    res.json({
      success: true,
      rates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates',
      fallbackRates: currencyService.fallbackRates
    });
  }
});

// Refresh exchange rates (admin endpoint)
router.post('/exchange-rates/refresh', auth, async (req, res) => {
  try {
    currencyService.clearCache();
    const rates = await currencyService.getRealTimeRates();
    res.json({
      success: true,
      message: 'Exchange rates refreshed successfully',
      rates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh exchange rates'
    });
  }
});

// Currency conversion function
async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!amount || fromCurrency === toCurrency) return amount;
  
  return await currencyService.convertCurrency(amount, fromCurrency, toCurrency);
}

// Get all quotes for an organization
router.get('/', auth, async (req, res) => {
  try {
    const { organization, lead } = req.query;
    let query = { organization };
    
    if (lead) {
      query.lead = lead;
    }
    
    const quotes = await Quote.find(query)
      .populate('lead', 'name email leadNumber')
      .populate('createdBy', 'name email')
      .populate('days.sightseeings.sightseeing', 'name location country duration images')
      .populate('days.transfers.transfer', 'name fromLocation toLocation country vehicleType')
      .populate('hotels.hotel', 'name city starRating images')
      .sort({ createdAt: -1 });
    
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available sightseeings and transfers for a specific country and date range
router.get('/available-services', auth, async (req, res) => {
  try {
    const { organization, country, startDate, endDate } = req.query;
    
    // Get sightseeings for the country
    const Sightseeing = require('../models/Sightseeing');
    const Transfer = require('../models/Transfer');
    
    const sightseeings = await Sightseeing.find({ 
      organization, 
      country: country 
    }).sort({ name: 1 });
    
    const transfers = await Transfer.find({ 
      organization, 
      country: country 
    }).sort({ name: 1 });
    
    res.json({
      sightseeings,
      transfers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new quote
router.post('/', auth, async (req, res) => {
  try {
    // Ensure hotel images are included
    const quoteData = { ...req.body };
    
    // Set default currency to INR if not provided
    if (!quoteData.currency) {
      quoteData.currency = 'INR';
    }
    
    // Ensure sightseeings have required rate field and transfers have complete data
    if (quoteData.days) {
      quoteData.days = await Promise.all(quoteData.days.map(async day => {
        // Handle sightseeings
        if (day.sightseeings) {
          day.sightseeings = await Promise.all(day.sightseeings.map(async sightseeing => {
            // If rate is missing but adultRate exists, use adultRate as fallback
            let updatedSightseeing = { ...sightseeing };
            if (!sightseeing.rate && sightseeing.adultRate) {
              updatedSightseeing.rate = sightseeing.adultRate;
            }
            
            // Always ensure images are saved with the quote (overwrite any existing)
            console.log(`Processing sightseeing:`, JSON.stringify(sightseeing, null, 2));
            
            if (sightseeing.sightseeing) {
              console.log(`Fetching sightseeing document for ID: ${sightseeing.sightseeing}`);
              const Sightseeing = require('../models/Sightseeing');
              const sightseeingDoc = await Sightseeing.findById(sightseeing.sightseeing);
              console.log(`Found sightseeing document:`, sightseeingDoc ? 'Yes' : 'No');
              
              if (sightseeingDoc) {
                console.log(`Sightseeing document images:`, sightseeingDoc.images);
                // Save images directly in the quote document
                updatedSightseeing.images = sightseeingDoc.images || [];
                // Also save other sightseeing details for redundancy
                updatedSightseeing.sightseeingName = sightseeingDoc.name;
                updatedSightseeing.sightseeingLocation = sightseeingDoc.location;
                updatedSightseeing.sightseeingDuration = sightseeingDoc.duration;
                updatedSightseeing.sightseeingDescription = sightseeingDoc.description;
                
                console.log(`Updated sightseeing with images:`, {
                  imagesCount: updatedSightseeing.images.length,
                  images: updatedSightseeing.images,
                  name: updatedSightseeing.sightseeingName
                });
                
                if (updatedSightseeing.images.length > 0) {
                  console.log(`✅ Saved ${updatedSightseeing.images.length} images for sightseeing: ${sightseeingDoc.name}`);
                } else {
                  console.log(`⚠️ No images to save for sightseeing: ${sightseeingDoc.name}`);
                }
              } else {
                console.log(`❌ Sightseeing document not found for ID: ${sightseeing.sightseeing}`);
                updatedSightseeing.images = [];
              }
            } else {
              console.log(`❌ No sightseeing ID found in:`, sightseeing);
              updatedSightseeing.images = [];
            }
            
            return updatedSightseeing;
          }));
        }
        
        // Handle transfers - ensure complete data is stored
        if (day.transfers) {
          day.transfers = await Promise.all(day.transfers.map(async transfer => {
            // If transfer details are missing, fetch from Transfer collection
            if (transfer.transfer && (!transfer.name || !transfer.fromLocation || !transfer.toLocation)) {
              const Transfer = require('../models/Transfer');
              const transferDoc = await Transfer.findById(transfer.transfer);
              if (transferDoc) {
                return {
                  ...transfer,
                  name: transfer.name || transferDoc.name,
                  fromLocation: transfer.fromLocation || transferDoc.fromLocation,
                  toLocation: transfer.toLocation || transferDoc.toLocation,
                  vehicleType: transfer.vehicleType || transferDoc.vehicleType,
                  capacity: transfer.capacity || transferDoc.capacity
                };
              }
            }
            return transfer;
          }));
        }
        
        return day;
      }));
    }
    
    // Handle hotel images
    if (quoteData.hotels) {
      quoteData.hotels = await Promise.all(quoteData.hotels.map(async (hotel) => {
        if (hotel.hotel && !hotel.images?.length) {
          // Fetch hotel to get images if not included
          const Hotel = require('../models/Hotel');
          const hotelDoc = await Hotel.findById(hotel.hotel);
          if (hotelDoc) {
            return {
              ...hotel,
              images: hotelDoc.images || []
            };
          }
        }
        return hotel;
      }));
    }
    
    const quote = new Quote({
      ...quoteData,
      createdBy: req.userType === 'user' ? req.user._id : null
    });
    
    const savedQuote = await quote.save();
    const populated = await Quote.findById(savedQuote._id)
      .populate('lead', 'name email leadNumber')
      .populate('createdBy', 'name email')
      .populate('days.sightseeings.sightseeing', 'name location country duration images')
      .populate('days.transfers.transfer', 'name fromLocation toLocation country vehicleType')
      .populate('hotels.hotel', 'name city starRating images');
    
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a quote
router.put('/:id', auth, async (req, res) => {
  try {
    // Ensure hotel images are included
    const quoteData = { ...req.body };
    if (quoteData.hotels) {
      quoteData.hotels = await Promise.all(quoteData.hotels.map(async (hotel) => {
        if (hotel.hotel && !hotel.images?.length) {
          // Fetch hotel to get images if not included
          const Hotel = require('../models/Hotel');
          const hotelDoc = await Hotel.findById(hotel.hotel);
          if (hotelDoc) {
            return {
              ...hotel,
              images: hotelDoc.images || []
            };
          }
        }
        return hotel;
      }));
    }
    
    // Ensure sightseeings have required rate field and transfers have complete data
    if (quoteData.days) {
      quoteData.days = await Promise.all(quoteData.days.map(async day => {
        // Handle sightseeings
        if (day.sightseeings) {
          day.sightseeings = await Promise.all(day.sightseeings.map(async sightseeing => {
            // If rate is missing but adultRate exists, use adultRate as fallback
            let updatedSightseeing = { ...sightseeing };
            if (!sightseeing.rate && sightseeing.adultRate) {
              updatedSightseeing.rate = sightseeing.adultRate;
            }
            
            // Always ensure images are saved with the quote (overwrite any existing)
            console.log(`Processing sightseeing:`, JSON.stringify(sightseeing, null, 2));
            
            if (sightseeing.sightseeing) {
              console.log(`Fetching sightseeing document for ID: ${sightseeing.sightseeing}`);
              const Sightseeing = require('../models/Sightseeing');
              const sightseeingDoc = await Sightseeing.findById(sightseeing.sightseeing);
              console.log(`Found sightseeing document:`, sightseeingDoc ? 'Yes' : 'No');
              
              if (sightseeingDoc) {
                console.log(`Sightseeing document images:`, sightseeingDoc.images);
                // Save images directly in the quote document
                updatedSightseeing.images = sightseeingDoc.images || [];
                // Also save other sightseeing details for redundancy
                updatedSightseeing.sightseeingName = sightseeingDoc.name;
                updatedSightseeing.sightseeingLocation = sightseeingDoc.location;
                updatedSightseeing.sightseeingDuration = sightseeingDoc.duration;
                updatedSightseeing.sightseeingDescription = sightseeingDoc.description;
                
                console.log(`Updated sightseeing with images:`, {
                  imagesCount: updatedSightseeing.images.length,
                  images: updatedSightseeing.images,
                  name: updatedSightseeing.sightseeingName
                });
                
                if (updatedSightseeing.images.length > 0) {
                  console.log(`✅ Saved ${updatedSightseeing.images.length} images for sightseeing: ${sightseeingDoc.name}`);
                } else {
                  console.log(`⚠️ No images to save for sightseeing: ${sightseeingDoc.name}`);
                }
              } else {
                console.log(`❌ Sightseeing document not found for ID: ${sightseeing.sightseeing}`);
                updatedSightseeing.images = [];
              }
            } else {
              console.log(`❌ No sightseeing ID found in:`, sightseeing);
              updatedSightseeing.images = [];
            }
            
            return updatedSightseeing;
          }));
        }
        
        // Handle transfers - ensure complete data is stored
        if (day.transfers) {
          day.transfers = await Promise.all(day.transfers.map(async transfer => {
            // If transfer details are missing, fetch from Transfer collection
            if (transfer.transfer && (!transfer.name || !transfer.fromLocation || !transfer.toLocation)) {
              const Transfer = require('../models/Transfer');
              const transferDoc = await Transfer.findById(transfer.transfer);
              if (transferDoc) {
                return {
                  ...transfer,
                  name: transfer.name || transferDoc.name,
                  fromLocation: transfer.fromLocation || transferDoc.fromLocation,
                  toLocation: transfer.toLocation || transferDoc.toLocation,
                  vehicleType: transfer.vehicleType || transferDoc.vehicleType,
                  capacity: transfer.capacity || transferDoc.capacity
                };
              }
            }
            return transfer;
          }));
        }
        
        return day;
      }));
    }
    
    const quote = await Quote.findByIdAndUpdate(
      req.params.id, 
      quoteData, 
      { returnDocument: 'after' }
    )
    .populate('lead', 'name email leadNumber')
    .populate('createdBy', 'name email')
    .populate('days.sightseeings.sightseeing', 'name location country duration images')
    .populate('days.transfers.transfer', 'name fromLocation toLocation country vehicleType')
    .populate('hotels.hotel', 'name city starRating images');
    
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    res.json(quote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a quote
router.delete('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recommended quotes based on country and tags
router.get('/recommendations', auth, async (req, res) => {
  try {
    const { organization, country, tags, excludeLead } = req.query;
    
    console.log('🔍 DEBUG - Recommendations API called:', {
      organization,
      country,
      tags,
      excludeLead,
      user: req.user?.organization?._id
    });
    
    let query = { organization };
    
    // Exclude quotes from the specified lead
    if (excludeLead) {
      const Lead = require('../models/Lead');
      const lead = await Lead.findById(excludeLead);
      console.log('🔍 DEBUG - Excluding lead:', lead?.name);
      if (lead) {
        query.lead = { $ne: excludeLead };
      }
    }
    
    // Filter by country if provided
    if (country) {
      query.country = country;
    }
    
    console.log('🔍 DEBUG - Query before country filter:', JSON.stringify(query, null, 2));
    
    // Get quotes matching the criteria
    let quotes = await Quote.find(query)
      .populate('lead', 'name tags')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to 10 recommendations
    
    console.log('🔍 DEBUG - Quotes found before tag filtering:', quotes.length);
    console.log('🔍 DEBUG - Sample quotes:', quotes.slice(0, 2).map(q => ({
      quoteNumber: q.quoteNumber,
      country: q.country,
      leadName: q.lead?.name,
      leadTags: q.lead?.tags
    })));
    
    // If tags are provided, filter quotes by matching tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      console.log('🔍 DEBUG - Filtering by tags:', tagArray);
      
      quotes = quotes.filter(quote => {
        if (!quote.lead || !quote.lead.tags) {
          console.log('🔍 DEBUG - Quote has no lead or tags:', quote.quoteNumber);
          return false;
        }
        const leadTags = quote.lead.tags.map(tag => tag.toLowerCase());
        const hasMatchingTag = tagArray.some(tag => leadTags.includes(tag.toLowerCase()));
        console.log('🔍 DEBUG - Quote tag match:', {
          quoteNumber: quote.quoteNumber,
          leadTags,
          searchTags: tagArray,
          hasMatch: hasMatchingTag
        });
        return hasMatchingTag;
      });
    }
    
    console.log('🔍 DEBUG - Final quotes after filtering:', quotes.length);
    
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching recommended quotes:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single quote by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    })
      .populate('lead', 'name email leadNumber phone')
      .populate('createdBy', 'name email')
      .populate('days.sightseeings.sightseeing', 'name location country duration description rate currency')
      .populate('days.transfers.transfer', 'name fromLocation toLocation country vehicleType description rate currency')
      .populate('hotels.hotel', 'name hotelName location country rating amenities images')
      .populate('hotels.rooms.roomCategory', 'name');
    
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark quote as converted
router.post('/:id/convert', auth, async (req, res) => {
  console.log('🔄 CONVERT REQUEST RECEIVED');
  try {
    console.log('🔄 QUOTE CONVERT DEBUG:');
    console.log('- Quote ID:', req.params.id);
    console.log('- User ID:', req.user._id);
    console.log('- User organization:', req.user.organization);
    console.log('- User org type:', typeof req.user.organization);
    
    const quote = await Quote.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    console.log('- Quote found:', !!quote);
    if (quote) {
      console.log('- Quote current status:', quote.isConverted);
    }
    
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    if (quote.isConverted) {
      return res.status(400).json({ message: 'Quote is already converted' });
    }
    
    quote.isConverted = true;
    quote.convertedAt = new Date();
    quote.convertedBy = req.user._id;
    
    await quote.save();
    
    await quote.populate('convertedBy', 'name email');
    
    res.json({
      message: 'Quote marked as converted',
      quote
    });
  } catch (error) {
    console.error('🔄 CONVERT ERROR:', error);
    console.error('🔄 ERROR STACK:', error.stack);
    console.error('🔄 ERROR DETAILS:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      message: error.message,
      error: error.name,
      details: error.stack
    });
  }
});

module.exports = router;
