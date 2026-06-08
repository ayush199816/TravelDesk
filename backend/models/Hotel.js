const mongoose = require('mongoose');

const roomCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  maxOccupancy: { type: Number, required: true, min: 1 },
  basePrice: { type: Number, required: true, min: 0 },
  childPrice: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'INR' },
  amenities: [{ type: String }],
  totalRooms: { type: Number, required: true, min: 1 },
  availableRooms: { type: Number, default: 0, min: 0 }
});

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  phoneNumber: { type: String },
  email: { type: String },
  website: { type: String },
  starRating: { type: Number, min: 1, max: 5, default: 3 },
  checkInTime: { type: String, default: '14:00' },
  checkOutTime: { type: String, default: '11:00' },
  amenities: [{ type: String }],
  roomCategories: [roomCategorySchema],
  images: [{ type: String }], // URLs to hotel images
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isTemporary: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamps on save - TEMPORARILY DISABLED due to middleware issue
// hotelSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

module.exports = mongoose.model('Hotel', hotelSchema);
