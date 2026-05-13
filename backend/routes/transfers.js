const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const auth = require('../middleware/auth');

// Get all transfers for an organization
router.get('/', auth, async (req, res) => {
  try {
    const { organization } = req.query;
    const transfers = await Transfer.find({ organization })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new transfer
router.post('/', auth, async (req, res) => {
  try {
    const transfer = new Transfer({
      ...req.body,
      createdBy: req.userType === 'user' ? req.user._id : null
    });
    const savedTransfer = await transfer.save();
    const populated = await Transfer.findById(savedTransfer._id)
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a transfer
router.put('/:id', auth, async (req, res) => {
  try {
    const transfer = await Transfer.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { returnDocument: 'after' }
    ).populate('createdBy', 'name email');
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }
    res.json(transfer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a transfer
router.delete('/:id', auth, async (req, res) => {
  try {
    const transfer = await Transfer.findByIdAndDelete(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }
    res.json({ message: 'Transfer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
