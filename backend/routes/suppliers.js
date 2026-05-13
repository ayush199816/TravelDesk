const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Supplier = require('../models/Supplier');
const SupplierAssignment = require('../models/SupplierAssignment');
const Organization = require('../models/Organization');
const User = require('../models/User');

// Get all suppliers for organization
router.get('/', auth, async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let filter = { organization: req.user.organization };
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const suppliers = await Supplier.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
});

// Get single supplier
router.get('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    })
      .populate('createdBy', 'name email');
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'Error fetching supplier' });
  }
});

// Create new supplier
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      type,
      contactPerson,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      bankDetails,
      services
    } = req.body;
    
    // Check if supplier already exists for this organization
    const existingSupplier = await Supplier.findOne({ 
      email, 
      organization: req.user.organization 
    });
    
    if (existingSupplier) {
      return res.status(400).json({ message: 'Supplier with this email already exists' });
    }
    
    const supplier = new Supplier({
      name,
      type,
      contactPerson,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      bankDetails,
      services,
      organization: req.user.organization,
      createdBy: req.user._id
    });
    
    await supplier.save();
    
    await supplier.populate('createdBy', 'name email');
    
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: 'Error creating supplier' });
  }
});

// Update supplier
router.put('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      supplier[key] = updates[key];
    });
    
    await supplier.save();
    
    await supplier.populate('createdBy', 'name email');
    
    res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'Error updating supplier' });
  }
});

// Delete supplier (soft delete - just change status)
router.delete('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    // Check if supplier has active assignments
    const activeAssignments = await SupplierAssignment.countDocuments({
      supplier: req.params.id,
      status: { $in: ['assigned', 'confirmed'] }
    });
    
    if (activeAssignments > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete supplier with active assignments' 
      });
    }
    
    supplier.status = 'inactive';
    await supplier.save();
    
    res.json({ message: 'Supplier deactivated successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'Error deleting supplier' });
  }
});

// Get suppliers by type for dropdown
router.get('/by-type/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    
    const suppliers = await Supplier.find({ 
      type,
      organization: req.user.organization,
      status: 'active'
    })
      .select('name contactPerson email phone')
      .sort({ name: 1 });
    
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers by type:', error);
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
});

module.exports = router;
