const express = require('express');
const router = express.Router();
const PDFTemplate = require('../models/PDFTemplate');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadToCloudinary } = require('../middleware/upload');

// Get all PDF templates for an organization
router.get('/', auth, async (req, res) => {
  try {
    const { organization } = req.query;
    
    if (!organization) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }
    
    const templates = await PDFTemplate.find({ organization })
      .sort({ country: 1 });
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get PDF template by organization and country
router.get('/country/:country', auth, async (req, res) => {
  try {
    const { organization } = req.query;
    const { country } = req.params;
    
    if (!organization) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }
    
    const template = await PDFTemplate.findOne({ 
      organization, 
      country,
      isActive: true 
    });
    
    if (!template) {
      // Return default template if none exists
      return res.json({
        organization,
        country,
        frontPageBackground: null,
        middlePageBackground: null,
        lastPageBackground: null,
        styles: {
          heading: {
            font: 'Helvetica-Bold',
            size: 24,
            color: '#000000',
            backgroundColor: 'transparent'
          },
          subheading: {
            font: 'Helvetica',
            size: 18,
            color: '#333333',
            backgroundColor: 'transparent'
          },
          table: {
            font: 'Helvetica',
            size: 12,
            color: '#000000',
            backgroundColor: '#f8f9fa',
            headerBackgroundColor: '#dee2e6',
            borderColor: '#dee2e6'
          },
          text: {
            font: 'Helvetica',
            size: 14,
            color: '#333333',
            backgroundColor: 'transparent'
          }
        },
        isActive: true
      });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update PDF template
router.post('/', auth, (req, res, next) => {
  // Check if there are any files in the request
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.fields([
      { name: 'frontPageBackground', maxCount: 1 },
      { name: 'middlePageBackground', maxCount: 1 },
      { name: 'lastPageBackground', maxCount: 1 }
    ])(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    const { organization, country, styles } = req.body;
    
    if (!organization || !country) {
      return res.status(400).json({ message: 'Organization and country are required' });
    }
    
    // Parse styles if sent as string
    let parsedStyles = styles;
    if (typeof styles === 'string') {
      parsedStyles = JSON.parse(styles);
    }
    
    // Check if template already exists
    const existingTemplate = await PDFTemplate.findOne({ organization, country });
    
    let templateData = {
      organization,
      country,
      styles: parsedStyles,
      isActive: true
    };
    
    // Handle background image uploads
    if (req.files) {
      if (req.files.frontPageBackground && req.files.frontPageBackground.length > 0) {
        const frontPageResult = await uploadToCloudinary(req.files.frontPageBackground[0]);
        templateData.frontPageBackground = frontPageResult.secure_url;
      }
      
      if (req.files.middlePageBackground && req.files.middlePageBackground.length > 0) {
        const middlePageResult = await uploadToCloudinary(req.files.middlePageBackground[0]);
        templateData.middlePageBackground = middlePageResult.secure_url;
      }
      
      if (req.files.lastPageBackground && req.files.lastPageBackground.length > 0) {
        const lastPageResult = await uploadToCloudinary(req.files.lastPageBackground[0]);
        templateData.lastPageBackground = lastPageResult.secure_url;
      }
    }
    
    let template;
    if (existingTemplate) {
      // Update existing template
      template = await PDFTemplate.findByIdAndUpdate(
        existingTemplate._id,
        templateData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new template
      template = new PDFTemplate(templateData);
      await template.save();
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error saving PDF template:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update only background images
router.put('/:id/backgrounds', auth, (req, res, next) => {
  upload.fields([
    { name: 'frontPageBackground', maxCount: 1 },
    { name: 'middlePageBackground', maxCount: 1 },
    { name: 'lastPageBackground', maxCount: 1 }
  ])(req, res, next);
}, async (req, res) => {
  try {
    const template = await PDFTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Update background images
    if (req.files) {
      if (req.files.frontPageBackground && req.files.frontPageBackground.length > 0) {
        const frontPageResult = await uploadToCloudinary(req.files.frontPageBackground[0]);
        template.frontPageBackground = frontPageResult.secure_url;
      }
      
      if (req.files.middlePageBackground && req.files.middlePageBackground.length > 0) {
        const middlePageResult = await uploadToCloudinary(req.files.middlePageBackground[0]);
        template.middlePageBackground = middlePageResult.secure_url;
      }
      
      if (req.files.lastPageBackground && req.files.lastPageBackground.length > 0) {
        const lastPageResult = await uploadToCloudinary(req.files.lastPageBackground[0]);
        template.lastPageBackground = lastPageResult.secure_url;
      }
    }
    
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete PDF template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await PDFTemplate.findByIdAndDelete(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
