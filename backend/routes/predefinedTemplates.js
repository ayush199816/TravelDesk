const express = require('express');
const router = express.Router();
const PredefinedTemplate = require('../models/PredefinedTemplate');
const auth = require('../middleware/auth');

// Get all predefined templates
router.get('/', async (req, res) => {
  try {
    const templates = await PredefinedTemplate.find({ isActive: true })
      .sort({ category: 1, name: 1 });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching predefined templates:', error);
    res.status(500).json({ message: 'Error fetching predefined templates' });
  }
});

// Get predefined template by name
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const template = await PredefinedTemplate.findOne({ 
      name: name, 
      isActive: true 
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Predefined template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching predefined template:', error);
    res.status(500).json({ message: 'Error fetching predefined template' });
  }
});

// Get templates by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const templates = await PredefinedTemplate.find({ 
      category: category, 
      isActive: true 
    }).sort({ name: 1 });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ message: 'Error fetching templates by category' });
  }
});

module.exports = router;
