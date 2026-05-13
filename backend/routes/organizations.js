const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const auth = require('../middleware/auth');

// Get organization by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Check if user belongs to this organization
    const userOrgId = req.user.organization._id ? req.user.organization._id.toString() : req.user.organization.toString();
    console.log('Get org debug - User org ID:', userOrgId);
    console.log('Get org debug - Requested org ID:', req.params.id);
    
    if (userOrgId !== req.params.id && req.user.role !== 'organization_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(organization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update organization settings (only organization admin)
router.put('/:id', auth, async (req, res, next) => {
  try {
    console.log('=== PUT ORGANIZATION DEBUG ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    console.log('Found organization:', organization);
    
    // Check if user is organization admin
    const userOrgId = req.user.organization._id ? req.user.organization._id.toString() : req.user.organization.toString();
    console.log('Debug - User role:', req.user.role);
    console.log('Debug - User organization ID:', userOrgId);
    console.log('Debug - Requested organization ID:', req.params.id);
    
    if (req.user.role !== 'organization_admin' || userOrgId !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. Only organization admin can update settings.' });
    }
    
    const { currency, leadStatuses, name, address, phone, logo } = req.body;
    console.log('Update data:', { currency, leadStatuses, name, address, phone, logo });
    
    // Update allowed fields
    if (currency) {
      console.log('Updating currency to:', currency);
      organization.currency = currency;
    }
    if (leadStatuses && Array.isArray(leadStatuses)) {
      console.log('Updating leadStatuses to:', leadStatuses);
      organization.leadStatuses = leadStatuses;
    }
    if (name) organization.name = name;
    if (address) organization.address = address;
    if (phone) organization.phone = phone;
    if (logo) organization.logo = logo;
    
    console.log('Organization before save:', organization);
    const updatedOrganization = await organization.save();
    console.log('Organization after save:', updatedOrganization);
    console.log('=== END PUT DEBUG ===');
    
    res.json(updatedOrganization);
  } catch (error) {
    console.error('=== DETAILED ERROR DEBUG ===');
    console.error('Error in PUT /organizations/:id:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.errors) {
      console.error('Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  ${key}:`, error.errors[key].message);
      });
    }
    
    if (error.name === 'ValidationError') {
      console.error('MongoDB Validation Error');
      return res.status(400).json({ 
        message: 'Validation failed', 
        details: error.message,
        errors: error.errors 
      });
    }
    
    console.error('=== END ERROR DEBUG ===');
    res.status(500).json({ 
      message: 'Internal server error', 
      details: error.message 
    });
  }
});

// Get available lead statuses for organization
router.get('/:id/lead-statuses', auth, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Check if user belongs to this organization
    const userOrgId = req.user.organization._id ? req.user.organization._id.toString() : req.user.organization.toString();
    console.log('Lead statuses debug - User org ID:', userOrgId);
    console.log('Lead statuses debug - Requested org ID:', req.params.id);
    
    if (userOrgId !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Return default statuses if organization doesn't have custom ones
    const statuses = organization.leadStatuses && organization.leadStatuses.length > 0 
      ? organization.leadStatuses 
      : ['new', 'contacted', 'qualified', 'converted', 'lost'];
    
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
