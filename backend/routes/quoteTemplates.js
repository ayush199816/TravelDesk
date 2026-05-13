const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const QuoteTemplate = require('../models/QuoteTemplate');
const Organization = require('../models/Organization');

// Get all templates for an organization
router.get('/', auth, async (req, res) => {
  try {
    const { country } = req.query;
    const filter = { 
      organization: req.user.organization,
      isActive: true 
    };
    
    if (country) {
      filter.country = country;
    }
    
    const templates = await QuoteTemplate.find(filter).sort({ isDefault: -1, createdAt: -1 });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Error fetching templates' });
  }
});

// Get default template for an organization
router.get('/default', auth, async (req, res) => {
  try {
    const { country } = req.query;
    console.log('Getting default template for country:', country);
    
    // First, try to find a default template for this country
    let template = await QuoteTemplate.findOne({ 
      organization: req.user.organization,
      country: country || 'Default',
      isDefault: true,
      isActive: true 
    });
    
    console.log('Found default template for country:', template ? template.name : 'None');
    
    // If no country-specific default template exists, get the most recent template for that country
    if (!template && country && country !== 'Default') {
      template = await QuoteTemplate.findOne({ 
        organization: req.user.organization,
        country: country,
        isActive: true 
      }).sort({ createdAt: -1 });
      
      console.log('Found most recent template for country:', template ? template.name : 'None');
    }
    
    // If still no template, try to get the general default
    if (!template) {
      template = await QuoteTemplate.findOne({ 
        organization: req.user.organization,
        country: 'Default',
        isDefault: true,
        isActive: true 
      });
      
      console.log('Found general default template:', template ? template.name : 'None');
    }
    
    // If still no template, create a default one
    if (!template) {
      template = await createDefaultTemplate(req.user.organization, req.user._id, country || 'Default');
      console.log('Created new default template:', template.name);
    }
    
    console.log('Returning template:', template.name, 'Country:', template.country);
    res.json(template);
  } catch (error) {
    console.error('Error fetching default template:', error);
    res.status(500).json({ message: 'Error fetching default template' });
  }
});

// Get a specific template
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await QuoteTemplate.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Error fetching template' });
  }
});

// Create a new template
router.post('/', auth, async (req, res) => {
  try {
    const { 
      name, 
      country, 
      colors, 
      fonts, 
      fontSizes, 
      backgrounds, 
      borders, 
      shadows, 
      table, 
      messages, 
      layout 
    } = req.body;
    
    // Verify organization exists
    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(400).json({ message: 'Organization not found' });
    }
    
    const template = new QuoteTemplate({
      name: name || 'Custom Template',
      organization: req.user.organization,
      country: country || 'Default',
      colors: colors || {},
      fonts: fonts || {},
      fontSizes: fontSizes || {},
      backgrounds: backgrounds || {},
      borders: borders || {},
      shadows: shadows || {},
      table: table || {},
      messages: messages || {},
      layout: layout || {},
      createdBy: req.user._id
    });
    
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Error creating template' });
  }
});

// Update a template
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name,
      colors,
      fonts,
      fontSizes,
      backgrounds,
      borders,
      shadows,
      table,
      hotel,
      messages,
      layout,
      isActive
    } = req.body;
    
    const template = await QuoteTemplate.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Update fields
    if (name) template.name = name;
    if (colors) template.colors = { ...template.colors, ...colors };
    if (fonts) template.fonts = { ...template.fonts, ...fonts };
    if (fontSizes) template.fontSizes = { ...template.fontSizes, ...fontSizes };
    if (backgrounds) template.backgrounds = { ...template.backgrounds, ...backgrounds };
    if (borders) template.borders = { ...template.borders, ...borders };
    if (shadows) template.shadows = { ...template.shadows, ...shadows };
    if (table) template.table = { ...template.table, ...table };
    if (hotel) {
      // Handle hotel updates with proper nested merging
      if (!template.hotel) template.hotel = {};
      
      // Merge top-level hotel properties
      Object.keys(hotel).forEach(key => {
        if (key === 'nightBox' && hotel.nightBox) {
          // Handle nightBox nested object separately
          if (!template.hotel.nightBox) template.hotel.nightBox = {};
          template.hotel.nightBox = { ...template.hotel.nightBox, ...hotel.nightBox };
        } else {
          // Merge other hotel properties
          template.hotel[key] = hotel[key];
        }
      });
    }
    if (messages) template.messages = { ...template.messages, ...messages };
    if (layout) template.layout = { ...template.layout, ...layout };
    if (isActive !== undefined) template.isActive = isActive;
    
    await template.save();
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Error updating template' });
  }
});

// Set template as default
router.put('/:id/set-default', auth, async (req, res) => {
  try {
    // Remove default from all templates for this organization
    await QuoteTemplate.updateMany(
      { organization: req.user.organization },
      { isDefault: false }
    );
    
    // Set new default
    const template = await QuoteTemplate.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    template.isDefault = true;
    await template.save();
    
    res.json(template);
  } catch (error) {
    console.error('Error setting default template:', error);
    res.status(500).json({ message: 'Error setting default template' });
  }
});

// Delete a template (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await QuoteTemplate.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Don't allow deletion of default template
    if (template.isDefault) {
      return res.status(400).json({ message: 'Cannot delete default template' });
    }
    
    template.isActive = false;
    await template.save();
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Error deleting template' });
  }
});

// Helper function to create default template
async function createDefaultTemplate(organizationId, userId, country = 'Default') {
  const defaultTemplate = new QuoteTemplate({
    name: country === 'Default' ? 'Default Quote Template' : `Default ${country} Template`,
    organization: organizationId,
    country: country,
    isDefault: true,
    createdBy: userId,
    table: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      headerBackgroundColor: 'rgba(0, 0, 0, 0.9)',
      textColor: 'white',
      headerTextColor: 'white',
      borderRadius: 0,
      fontSize: 14,
      headerFontSize: 15,
      padding: '10px 8px'
    },
    messages: {
      greeting: 'Greetings from',
      greetingMessage: 'Our sales team has put up this Quote regarding your upcoming trip. Please go through it and let\'s know if you would like any changes in any of the provided services. Contact details are provided at the end.'
    },
    hotel: {
      showBox: true,
      backgroundColor: '#f8f9fa',
      borderColor: '#e9ecef',
      borderWidth: 1,
      borderRadius: 8,
      titleFont: 'Arial, sans-serif',
      titleFontSize: 18,
      titleColor: '#333333',
      bodyFont: 'Arial, sans-serif',
      bodyFontSize: 14,
      bodyColor: '#666666',
      imageHeight: 120,
      imageWidth: 120,
      imageBorderRadius: 8,
      nightBox: {
        showNightBox: true,
        backgroundColor: '#ffffff',
        borderColor: '#dee2e6',
        borderWidth: 1,
        borderRadius: 6,
        titleFont: 'Arial, sans-serif',
        titleFontSize: 14,
        titleColor: '#495057',
        bodyFont: 'Arial, sans-serif',
        bodyFontSize: 12,
        bodyColor: '#6c757d',
        highlightColor: '#007bff'
      }
    }
  });
  
  await defaultTemplate.save();
  return defaultTemplate;
}

module.exports = router;
