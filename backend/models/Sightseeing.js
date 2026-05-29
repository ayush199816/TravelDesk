const mongoose = require('mongoose');

const sightseeingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  whatToBring: [{ type: String }], // Array of items to bring
  whatIsIncluded: [{ type: String }], // Array of included items
  whatIsExcluded: [{ type: String }], // Array of excluded items
  rate: { type: Number, required: true },
  childRate: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  duration: { type: String }, // e.g., "2 hours", "Half day", "Full day"
  location: { type: String, required: true },
  country: { type: String, required: true },
  images: [{ type: String }], // URLs to sightseeing images
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Sightseeing', sightseeingSchema);
