const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Quote = require('../models/Quote');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all leads for an organization (Organization Admin, Manager, and Operations)
router.get('/', auth, async (req, res) => {
  try {
    const { organization } = req.query;
    
    // Check if user can see all leads
    if (req.user.role !== 'organization_admin' && req.user.role !== 'operations' && req.user.role !== 'manager') {
      // For sales role, only show their assigned leads
      const leads = await Lead.find({ assignedTo: req.user._id, organization })
        .populate('assignedTo', 'name email')
        .populate('editHistory.editedBy', 'name email')
        .sort({ createdAt: -1 });
      return res.json(leads);
    }
    
    // Organization admin, manager, and operations can see all leads
    const leads = await Lead.find({ organization })
      .populate('assignedTo', 'name email')
      .populate('editHistory.editedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leads assigned to the current user (Sales)
router.get('/my-leads', auth, async (req, res) => {
  try {
    const { assignedTo, organization } = req.query;
    const leads = await Lead.find({ assignedTo, organization })
      .populate('editHistory.editedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new lead
router.post('/', auth, async (req, res) => {
  try {
    const Organization = require('../models/Organization');
    const organization = await Organization.findById(req.body.organization);
    
    // Validate lead status against organization's configured statuses
    if (organization && organization.leadStatuses && organization.leadStatuses.length > 0) {
      if (!organization.leadStatuses.includes(req.body.status)) {
        return res.status(400).json({ 
          message: 'Invalid lead status',
          validStatuses: organization.leadStatuses
        });
      }
    }
    
    const lead = new Lead(req.body);
    const savedLead = await lead.save();
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a lead
router.put('/:id', auth, async (req, res) => {
  try {
    const originalLead = await Lead.findById(req.params.id);
    if (!originalLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Track changes
    const changes = [];
    const previousValues = {};
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'editHistory') {
        // Handle date comparison properly
        const originalValue = originalLead[key];
        const newValue = req.body[key];
        
        let isChanged = false;
        if (originalValue instanceof Date && newValue) {
          isChanged = new Date(originalValue).getTime() !== new Date(newValue).getTime();
        } else if (Array.isArray(originalValue) && Array.isArray(newValue)) {
          isChanged = JSON.stringify(originalValue.sort()) !== JSON.stringify(newValue.sort());
        } else {
          isChanged = originalValue !== newValue;
        }
        
        if (isChanged) {
          changes.push(key);
          previousValues[key] = originalValue;
        }
      }
    });

    // Add edit history entry if there are changes
    if (changes.length > 0) {
      const editHistoryEntry = {
        editedBy: req.userType === 'user' ? req.user._id : null,
        editedAt: new Date(),
        changes: changes.join(', '),
        previousValues: previousValues
      };
      
      // Initialize editHistory array if it doesn't exist
      const currentHistory = originalLead.editHistory || [];
      req.body.editHistory = [...currentHistory, editHistoryEntry];
    }

    // Validate lead status against organization's configured statuses
    if (req.body.status) {
      const Organization = require('../models/Organization');
      const organization = await Organization.findById(originalLead.organization);
      
      if (organization && organization.leadStatuses && organization.leadStatuses.length > 0) {
        if (!organization.leadStatuses.includes(req.body.status)) {
          return res.status(400).json({ 
            message: 'Invalid lead status',
            validStatuses: organization.leadStatuses
          });
        }
      }
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
      .populate('editHistory.editedBy', 'name email')
      .populate('assignedTo', 'name email');
    
    // If lead status was changed to 'converted', update associated quotes
    if (req.body.status === 'converted' && originalLead.status !== 'converted') {
      await Quote.updateMany(
        { lead: req.params.id, organization: originalLead.organization },
        { 
          status: 'accepted',
          isConverted: true,
          convertedAt: new Date(),
          convertedBy: req.userType === 'user' ? req.user._id : null
        }
      );
    }
    
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a lead by leadNumber with organization validation (must come before /:id)
router.get('/by-number/:leadNumber', auth, async (req, res) => {
  try {
    const { leadNumber } = req.params;
    const { organization } = req.query;
    
    // Find lead by leadNumber and validate organization
    const lead = await Lead.findOne({ leadNumber, organization })
      .populate('assignedTo', 'name email')
      .populate('editHistory.editedBy', 'name email');
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    // Additional check: ensure user belongs to the same organization
    if (req.userType === 'user' && req.user.organization._id.toString() !== organization) {
      return res.status(403).json({ message: 'Access denied: You can only view leads from your organization' });
    }
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lead statuses for an organization
router.get('/statuses', auth, async (req, res) => {
  try {
    const { organization } = req.query;
    const Organization = require('../models/Organization');
    
    // Get organization to fetch configured lead statuses
    const org = await Organization.findById(organization);
    
    if (org && org.leadStatuses && org.leadStatuses.length > 0) {
      // Return organization-specific lead statuses
      res.json(org.leadStatuses);
    } else {
      // Return default lead statuses if organization doesn't have custom ones
      const defaultStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'booking_confirmed', 'lost'];
      res.json(defaultStatuses);
    }
  } catch (error) {
    console.error('Error fetching lead statuses:', error);
    // Return default statuses on error
    const defaultStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'booking_confirmed', 'lost'];
    res.json(defaultStatuses);
  }
});

// Get a single lead by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('editHistory.editedBy', 'name email');
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a lead
router.delete('/:id', auth, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sales users for an organization (for lead assignment)
router.get('/users/sales', auth, async (req, res) => {
  try {
    const { organization } = req.query;
    const salesUsers = await User.find({ 
      organization, 
      role: 'sales' 
    }).select('name email _id');
    res.json(salesUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
