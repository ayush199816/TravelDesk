const mongoose = require('mongoose');

const paymentCycleSchema = new mongoose.Schema({
  cycleNumber: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  utrNumber: {
    type: String,
    default: ''
  },
  utrVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  paidDate: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    default: ''
  },
  quote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote',
    required: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Guest Information
  guestName: {
    type: String,
    required: true
  },
  packageCountry: {
    type: String,
    required: true
  },
  
  // Financial Details
  packageAmount: {
    type: Number,
    required: true
  },
  markupAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true
  },
  tcsAmount: {
    type: Number,
    default: 0
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Payment Cycle Configuration
  totalCycles: {
    type: Number,
    required: true,
    min: 2,
    max: 7
  },
  firstCycleAmount: {
    type: Number,
    required: true
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  cycleAmount: {
    type: Number,
    required: true
  },
  
  // Payment Cycles
  paymentCycles: [paymentCycleSchema],
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['draft', 'sent', 'partially_paid', 'fully_paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  
  // Dates
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  
  // Company Details (from organization)
  companyName: {
    type: String,
    required: true
  },
  companyAddress: {
    type: String,
    required: true
  },
  companyPhone: {
    type: String,
    required: true
  },
  companyGST: {
    type: String,
    default: 'N/A'
  },
  companyEmail: {
    type: String,
    default: 'contact@company.com'
  },
  
  // Additional Details
  notes: {
    type: String,
    default: ''
  },
  terms: {
    type: String,
    default: 'Payment is due within 30 days of invoice date. Late payments may incur additional charges.'
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Invoice number is generated in the route to avoid pre-save hook issues

// Calculate payment cycles
invoiceSchema.methods.calculatePaymentCycles = function() {
  const cycles = [];
  const cycleInterval = Math.floor(30 / this.totalCycles); // Distribute over 30 days
  
  // First cycle (already paid or to be paid)
  cycles.push({
    cycleNumber: 1,
    amount: this.firstCycleAmount,
    dueDate: this.issueDate,
    status: 'pending',
    utrNumber: '',
    utrVerified: false
  });
  
  // Remaining cycles
  for (let i = 2; i <= this.totalCycles; i++) {
    const dueDate = new Date(this.issueDate);
    dueDate.setDate(dueDate.getDate() + (cycleInterval * (i - 1)));
    
    cycles.push({
      cycleNumber: i,
      amount: this.cycleAmount,
      dueDate: dueDate,
      status: 'pending',
      utrNumber: '',
      utrVerified: false
    });
  }
  
  this.paymentCycles = cycles;
  return cycles;
};

// Update payment status
invoiceSchema.methods.updatePaymentStatus = function() {
  const paidCycles = this.paymentCycles.filter(cycle => cycle.status === 'paid').length;
  const totalCycles = this.paymentCycles.length;
  
  if (paidCycles === 0) {
    this.status = 'sent';
  } else if (paidCycles === totalCycles) {
    this.status = 'fully_paid';
  } else {
    this.status = 'partially_paid';
  }
  
  // Check for overdue cycles
  const now = new Date();
  const hasOverdue = this.paymentCycles.some(cycle => 
    cycle.status === 'pending' && new Date(cycle.dueDate) < now
  );
  
  if (hasOverdue && this.status !== 'fully_paid') {
    this.status = 'overdue';
  }
};

// Mark payment cycle as paid
invoiceSchema.methods.markCycleAsPaid = function(cycleNumber, utrNumber, verifiedBy) {
  const cycle = this.paymentCycles.find(c => c.cycleNumber === cycleNumber);
  if (cycle) {
    cycle.utrNumber = utrNumber;
    cycle.utrVerified = true;
    cycle.verifiedBy = verifiedBy;
    cycle.verifiedAt = new Date();
    cycle.status = 'paid';
    cycle.paidDate = new Date();
    this.updatePaymentStatus();
    return true;
  }
  return false;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
