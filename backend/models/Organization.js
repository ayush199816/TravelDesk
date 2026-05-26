const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  adminUsername: { type: String, required: true, unique: true },
  adminPassword: { type: String, required: true },
  currency: { type: String, required: true, default: 'USD', enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'HKD', 'JPY', 'CNY', 'KRW'] },
  leadCounter: { type: Number, default: 0 },
  leadStatuses: [{ 
    type: String, 
    required: true
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'MainAdmin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamps on save
organizationSchema.pre('save', async function() {
  console.log('Pre-save hook called');
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Organization', organizationSchema);
