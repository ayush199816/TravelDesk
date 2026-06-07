const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  rate: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  vehicleType: { type: String, required: true }, // e.g., "Sedan", "SUV", "Van", "Bus"
  capacity: { type: Number, required: true }, // number of passengers
  fromLocation: { type: String, required: true },
  toLocation: { type: String, required: true },
  country: { type: String, required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transfer', transferSchema);
