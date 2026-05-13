const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SupplierAssignment = require('../models/SupplierAssignment');
const Supplier = require('../models/Supplier');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');

// Get all assignments for organization
router.get('/', auth, async (req, res) => {
  try {
    const { quoteId, supplierId, paymentStatus, activityType } = req.query;
    
    let filter = { organization: req.user.organization };
    if (quoteId) filter.quote = quoteId;
    if (supplierId) filter.supplier = supplierId;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (activityType) filter.activityType = activityType;
    
    const assignments = await SupplierAssignment.find(filter)
      .populate('quote', 'quoteNumber country')
      .populate('lead', 'leadNumber name email')
      .populate('supplier', 'name type email phone')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
});

// Get assignments for a specific quote
router.get('/quote/:quoteId', auth, async (req, res) => {
  try {
    const assignments = await SupplierAssignment.find({ 
      quote: req.params.quoteId,
      organization: req.user.organization 
    })
      .populate('supplier', 'name type email phone')
      .populate('assignedBy', 'name email')
      .sort({ dayNumber: 1, activityType: 1 });
    
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching quote assignments:', error);
    res.status(500).json({ message: 'Error fetching quote assignments' });
  }
});

// Get assignments for a specific supplier
router.get('/supplier/:supplierId', auth, async (req, res) => {
  try {
    const assignments = await SupplierAssignment.find({ 
      supplier: req.params.supplierId,
      organization: req.user.organization 
    })
      .populate('quote', 'quoteNumber country')
      .populate('lead', 'leadNumber name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching supplier assignments:', error);
    res.status(500).json({ message: 'Error fetching supplier assignments' });
  }
});

// Create new assignment
router.post('/', auth, async (req, res) => {
  try {
    const {
      quoteId,
      supplierId,
      activityType,
      activityName,
      activityDescription,
      dayNumber,
      agreedPrice,
      currency,
      paymentSchedule,
      assignedItems
    } = req.body;
    
    // Verify quote exists and is converted
    const quote = await Quote.findOne({ 
      _id: quoteId,
      organization: req.user.organization 
    });
    
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    if (!quote.isConverted) {
      return res.status(400).json({ message: 'Quote must be converted before assigning suppliers' });
    }
    
    // Verify supplier exists and belongs to organization
    const supplier = await Supplier.findOne({ 
      _id: supplierId,
      organization: req.user.organization 
    });
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    // Check if assignment already exists (only for single item assignments)
    if (!assignedItems || assignedItems.length === 0) {
      const existingAssignment = await SupplierAssignment.findOne({
        quote: quoteId,
        supplier: supplierId,
        activityType,
        activityName,
        dayNumber
      });
      
      if (existingAssignment) {
        return res.status(400).json({ message: 'Assignment already exists for this activity' });
      }
    }
    
    const assignment = new SupplierAssignment({
      quote: quoteId,
      lead: quote.lead,
      supplier: supplierId,
      organization: req.user.organization,
      activityType,
      activityName: assignedItems ? `${assignedItems.length} ${activityType}(s) Assigned` : activityName,
      activityDescription,
      dayNumber: assignedItems ? 1 : dayNumber, // Default to day 1 for multi-item assignments
      agreedPrice,
      currency,
      paymentSchedule: paymentSchedule || [],
      assignedItems: assignedItems || [],
      assignedBy: req.user._id
    });
    
    await assignment.save();
    
    await assignment.populate('quote', 'quoteNumber country');
    await assignment.populate('lead', 'leadNumber name email');
    await assignment.populate('supplier', 'name type email phone');
    await assignment.populate('assignedBy', 'name email');
    
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Error creating assignment' });
  }
});

// Update assignment
router.put('/:id', auth, async (req, res) => {
  try {
    const assignment = await SupplierAssignment.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      assignment[key] = updates[key];
    });
    
    await assignment.save();
    
    await assignment.populate('quote', 'quoteNumber country');
    await assignment.populate('lead', 'leadNumber name email');
    await assignment.populate('supplier', 'name type email phone');
    await assignment.populate('assignedBy', 'name email');
    
    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Error updating assignment' });
  }
});

// Delete assignment
router.delete('/:id', auth, async (req, res) => {
  try {
    const assignment = await SupplierAssignment.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    await SupplierAssignment.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Error deleting assignment' });
  }
});

// Add payment installment to assignment
router.post('/:id/payment-installments', auth, async (req, res) => {
  try {
    const { amount, dueDate } = req.body;
    
    const assignment = await SupplierAssignment.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    await assignment.addPaymentInstallment(amount, new Date(dueDate));
    
    await assignment.populate('quote', 'quoteNumber country');
    await assignment.populate('lead', 'leadNumber name email');
    await assignment.populate('supplier', 'name type email phone');
    
    res.json(assignment);
  } catch (error) {
    console.error('Error adding payment installment:', error);
    res.status(500).json({ message: 'Error adding payment installment' });
  }
});

// Mark payment as paid
router.post('/:id/payments/:installmentNumber/pay', auth, async (req, res) => {
  try {
    const { installmentNumber } = req.params;
    const { paidAmount, paymentReference, utrNumber } = req.body;
    
    const assignment = await SupplierAssignment.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    await assignment.markPaymentAsPaid(
      parseInt(installmentNumber),
      paidAmount,
      paymentReference,
      utrNumber
    );
    
    await assignment.populate('quote', 'quoteNumber country');
    await assignment.populate('lead', 'leadNumber name email');
    await assignment.populate('supplier', 'name type email phone');
    
    res.json(assignment);
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ message: 'Error marking payment as paid' });
  }
});

// Get payment summary for supplier
router.get('/supplier/:supplierId/payment-summary', auth, async (req, res) => {
  try {
    const assignments = await SupplierAssignment.find({ 
      supplier: req.params.supplierId,
      organization: req.user.organization 
    })
      .populate('quote', 'quoteNumber')
      .populate('lead', 'leadNumber name');
    
    const summary = {
      totalAssignments: assignments.length,
      totalAgreedAmount: assignments.reduce((sum, a) => sum + a.agreedPrice, 0),
      totalPaidAmount: assignments.reduce((sum, a) => sum + a.totalPaidAmount, 0),
      totalRemainingAmount: assignments.reduce((sum, a) => sum + a.remainingAmount, 0),
      assignments: assignments.map(a => ({
        id: a._id,
        quoteNumber: a.quote.quoteNumber,
        leadNumber: a.lead.leadNumber,
        leadName: a.lead.name,
        activityType: a.activityType,
        activityName: a.activityName,
        agreedPrice: a.agreedPrice,
        totalPaid: a.totalPaidAmount,
        remaining: a.remainingAmount,
        paymentStatus: a.paymentStatus,
        status: a.status
      }))
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ message: 'Error fetching payment summary' });
  }
});

// Mark entire assignment as paid
router.patch('/:id/mark-paid', auth, async (req, res) => {
  try {
    const { paymentReference, utrNumber, notes } = req.body;
    
    // Check if user has permission (operations or accounts)
    const userRole = req.user.role || 'user';
    if (!['operations', 'accounts', 'admin'].includes(userRole)) {
      return res.status(403).json({ message: 'Only operations and accounts teams can mark payments as paid' });
    }
    
    const assignment = await SupplierAssignment.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    if (assignment.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Assignment is already marked as paid' });
    }
    
    await assignment.markAsPaid(req.user._id, paymentReference, utrNumber, notes);
    
    await assignment.populate('quote', 'quoteNumber country');
    await assignment.populate('lead', 'leadNumber name email');
    await assignment.populate('supplier', 'name type email phone');
    await assignment.populate('assignedBy', 'name email');
    await assignment.populate('paymentSchedule.markedPaidBy', 'name email');
    
    res.json({
      message: 'Assignment marked as paid successfully',
      assignment
    });
  } catch (error) {
    console.error('Error marking assignment as paid:', error);
    res.status(500).json({ message: 'Error marking assignment as paid' });
  }
});

module.exports = router;
