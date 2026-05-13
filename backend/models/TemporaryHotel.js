const mongoose = require('mongoose');

const temporaryHotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    minlength: [1, 'Country cannot be empty']
  },
  starRating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  roomCategories: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    maxOccupancy: {
      type: Number,
      required: true,
      min: 1,
      default: 2
    }
  }],
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
temporaryHotelSchema.index({ organization: 1, city: 1, country: 1 });

module.exports = mongoose.model('TemporaryHotel', temporaryHotelSchema);
