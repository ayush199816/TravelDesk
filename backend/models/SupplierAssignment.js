const mongoose = require('mongoose');

const supplierAssignmentSchema = new mongoose.Schema({
  // Association
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
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Activity Details
  activityType: {
    type: String,
    required: true,
    enum: ['hotel', 'flight', 'transport', 'sightseeing', 'activity', 'other']
  },
  activityName: {
    type: String,
    required: true
  },
  activityDescription: {
    type: String,
    default: ''
  },
  
  // Day-wise assignment (for multi-day activities) - keeping for backward compatibility
  dayNumber: {
    type: Number,
    default: 1
  },
  
  // Multiple assigned items (for multi-hotel/multi-night assignments)
  assignedItems: [{
    name: {
      type: String,
      required: true
    },
    dayNumber: {
      type: Number,
      required: true
    },
    nights: {
      type: Number,
      default: 1
    },
    price: {
      type: Number,
      required: true
    },
    itemData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Pricing Details
  agreedPrice: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  
  // Payment Tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  
  paymentSchedule: [{
    installmentNumber: {
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
    paidDate: Date,
    paidAmount: {
      type: Number,
      default: 0
    },
    paymentReference: String,
    utrNumber: String,
    notes: String,
    markedPaidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    markedPaidAt: Date
  }],
  
  // Total Payment Tracking
  totalPaidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  
  // Communication and Documents
  confirmationDetails: {
    bookingReference: String,
    confirmationSent: {
      type: Boolean,
      default: false
    },
    confirmationDate: Date,
    voucherReceived: {
      type: Boolean,
      default: false
    },
    voucherDate: Date
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['assigned', 'confirmed', 'cancelled', 'completed'],
    default: 'assigned'
  },
  
  notes: {
    type: String,
    default: ''
  },
  
  assignedBy: {
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

// Pre-save middleware to calculate remaining amount
supplierAssignmentSchema.pre('save', function() {
  this.updatedAt = Date.now();
  
  // Calculate total paid and remaining amounts
  const totalPaid = this.paymentSchedule
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.paidAmount, 0);
  
  this.totalPaidAmount = totalPaid;
  this.remainingAmount = this.agreedPrice - totalPaid;
  
  // Update payment status based on payments
  if (totalPaid === 0) {
    this.paymentStatus = 'pending';
  } else if (totalPaid >= this.agreedPrice) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }
});

// Instance methods
supplierAssignmentSchema.methods.addPaymentInstallment = function(amount, dueDate) {
  const installmentNumber = this.paymentSchedule.length + 1;
  this.paymentSchedule.push({
    installmentNumber,
    amount,
    dueDate,
    status: 'pending'
  });
  this.remainingAmount = this.agreedPrice - this.totalPaidAmount;
  return this.save();
};

supplierAssignmentSchema.methods.markPaymentAsPaid = function(installmentNumber, paidAmount, paymentReference, utrNumber) {
  const installment = this.paymentSchedule.find(p => p.installmentNumber === installmentNumber);
  if (installment) {
    installment.status = 'paid';
    installment.paidDate = new Date();
    installment.paidAmount = paidAmount;
    installment.paymentReference = paymentReference;
    installment.utrNumber = utrNumber;
    return this.save();
  }
  throw new Error('Installment not found');
};

// Method to mark entire assignment as paid
supplierAssignmentSchema.methods.markAsPaid = function(userId, paymentReference, utrNumber, notes) {
  this.paymentStatus = 'paid';
  this.totalPaidAmount = this.agreedPrice;
  this.remainingAmount = 0;
  
  // If there's a payment schedule, mark all installments as paid
  if (this.paymentSchedule && this.paymentSchedule.length > 0) {
    this.paymentSchedule.forEach(installment => {
      if (installment.status === 'pending') {
        installment.status = 'paid';
        installment.paidDate = new Date();
        installment.paidAmount = installment.amount;
        installment.paymentReference = paymentReference;
        installment.utrNumber = utrNumber;
        installment.notes = notes;
        installment.markedPaidBy = userId;
        installment.markedPaidAt = new Date();
      }
    });
  } else {
    // If no payment schedule exists, create one payment record
    this.paymentSchedule = [{
      installmentNumber: 1,
      amount: this.agreedPrice,
      dueDate: new Date(),
      status: 'paid',
      paidDate: new Date(),
      paidAmount: this.agreedPrice,
      paymentReference: paymentReference,
      utrNumber: utrNumber,
      notes: notes,
      markedPaidBy: userId,
      markedPaidAt: new Date()
    }];
  }
  
  return this.save();
};

// Indexes
supplierAssignmentSchema.index({ quote: 1, activityType: 1 });
supplierAssignmentSchema.index({ supplier: 1, paymentStatus: 1 });
supplierAssignmentSchema.index({ organization: 1, status: 1 });

module.exports = mongoose.model('SupplierAssignment', supplierAssignmentSchema);
