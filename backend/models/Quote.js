const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, unique: true, required: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Travel details
  travelStartDate: { type: Date, required: true },
  travelEndDate: { type: Date, required: true },
  country: { type: String, required: true },
  
  // Passenger details
  adultPax: { type: Number, required: true, default: 1 },
  childPax: { type: Number, required: true, default: 0 },
  
  // Day-wise itinerary
  days: [{
    dayNumber: { type: Number, required: true },
    date: { type: Date, required: true },
    sightseeings: [{
      sightseeing: { type: mongoose.Schema.Types.ObjectId, ref: 'Sightseeing', required: true },
      rate: { type: Number, required: true },
      currency: { type: String, required: true },
      adultRate: { type: Number, required: true },
      childRate: { type: Number, default: 0 },
      adultCount: { type: Number, default: 1 },
      childCount: { type: Number, default: 0 },
      includeChild: { type: Boolean, default: true }
    }],
    transfers: [{
      transfer: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer', required: true },
      rate: { type: Number, required: true },
      currency: { type: String, required: true },
      name: { type: String },
      fromLocation: { type: String },
      toLocation: { type: String },
      vehicleType: { type: String },
      capacity: { type: Number }
    }],
    hotels: [{
      hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
      rooms: [{
        roomCategory: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        adultRate: { type: Number, required: true },
        childRate: { type: Number, default: 0 },
        currency: { type: String, required: true },
        numberOfRooms: { type: Number, required: true },
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true }
      }]
    }]
  }],
  
  // Separate hotels array (for temporary hotels)
  hotels: [{
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
    name: { type: String, required: true },
    city: { type: String, required: true },
    starRating: { type: Number },
    isTemporary: { type: Boolean, default: false },
    images: [{ type: String }], // URLs to hotel images
    rooms: [{
      roomCategory: { type: mongoose.Schema.Types.ObjectId },
      roomName: { type: String, required: true },
      adultRate: { type: Number, required: true },
      childRate: { type: Number, default: 0 },
      currency: { type: String, required: true },
      numberOfRooms: { type: Number, required: true },
      checkIn: { type: Date, required: true },
      checkOut: { type: Date, required: true },
      nights: { type: Number, required: true }
    }]
  }],
  
  // Flights array
  flights: [{
    airline: { type: String, required: true },
    flightNumber: { type: String, required: true },
    pnr: { type: String },
    departureCity: { type: String, required: true },
    departureDate: { type: Date, required: true },
    departureTime: { type: String, required: true },
    departureAirport: { type: String }, // Airport code (e.g., BOM, JFK)
    arrivalCity: { type: String, required: true },
    arrivalDate: { type: Date, required: true },
    arrivalTime: { type: String, required: true },
    arrivalAirport: { type: String }, // Airport code (e.g., LHR, DXB)
    baggage: { type: String, default: '20 kg' }, // Baggage allowance
    price: { type: Number, required: true }
  }],
  
  // Pricing
  subtotal: { type: Number, required: true },
  markupType: { type: String, enum: ['percentage', 'amount'], default: 'percentage' },
  markupValue: { type: Number, default: 0 },
  markupAmount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 }, // Tax percentage
  taxCalculationType: { type: String, enum: ['markup', 'total'], default: 'markup' }, // Tax calculation base
  taxAmount: { type: Number, default: 0 },
  tcsEnabled: { type: Boolean, default: false }, // TCS 2.5% enabled
  tcsAmount: { type: Number, default: 0 }, // TCS amount
  total: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  
  // Status
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
  
  // Conversion Status
  isConverted: { type: Boolean, default: false },
  convertedAt: { type: Date },
  convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Notes
  notes: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Generate quote number before saving - temporarily disabled to fix conversion issue
// quoteSchema.pre('save', async function(next) {
//   if (this.isNew && !this.quoteNumber) {
//     try {
//       // Handle organization field - it might be an ObjectId or string
//       const orgId = this.organization && typeof this.organization === 'object' 
//         ? this.organization._id || this.organization.toString() 
//         : this.organization;
//       
//       console.log('🔄 QUOTE PRE-SAVE DEBUG:', {
//         isNew: this.isNew,
//         hasQuoteNumber: !!this.quoteNumber,
//         organization: this.organization,
//         orgId: orgId
//       });
//       
//       const count = await this.constructor.countDocuments({ organization: orgId });
//       const year = new Date().getFullYear();
//       const month = String(new Date().getMonth() + 1).padStart(2, '0');
//       this.quoteNumber = `Q-${year}${month}-${String(count + 1).padStart(4, '0')}`;
//       
//       console.log('🔄 GENERATED QUOTE NUMBER:', this.quoteNumber);
//     } catch (error) {
//       console.error('🔄 QUOTE PRE-SAVE ERROR:', error);
//       return next(error);
//     }
//   }
//   next();
// });

// Calculate total before saving - temporarily disabled to fix next() error
// quoteSchema.pre('save', function(next) {
//   try {
//     let sightseeingTotal = 0;
//     let transferTotal = 0;
//     let hotelTotal = 0;
//     
//     if (this.days && this.days.length > 0) {
//       this.days.forEach(day => {
//         // Calculate sightseeing total for this day
//         if (day.sightseeings && day.sightseeings.length > 0) {
//           day.sightseeings.forEach(item => {
//             const dayTotal = (item.adultRate * this.adultPax) + (item.childRate * this.childPax);
//             sightseeingTotal += dayTotal;
//           });
//         }
//         
//         // Calculate transfer total for this day (no passenger multiplication)
//         if (day.transfers && day.transfers.length > 0) {
//           day.transfers.forEach(item => {
//             transferTotal += item.rate;
//           });
//         }
//         
//         // Calculate hotel total for this day
//         if (day.hotels && day.hotels.length > 0) {
//           day.hotels.forEach(hotelItem => {
//             if (hotelItem.rooms && hotelItem.rooms.length > 0) {
//               hotelItem.rooms.forEach(room => {
//                 const nights = Math.ceil((room.checkOut - room.checkIn) / (1000 * 60 * 60 * 24));
//                 const roomTotal = room.adultRate * room.numberOfRooms * nights;
//                 hotelTotal += roomTotal;
//               });
//             }
//           });
//         }
//       });
//     }
//     
//     // Calculate separate hotels total
//     if (this.hotels && this.hotels.length > 0) {
//       this.hotels.forEach(hotelItem => {
//         if (hotelItem.rooms && hotelItem.rooms.length > 0) {
//           hotelItem.rooms.forEach(room => {
//             const roomTotal = room.adultRate * room.numberOfRooms * room.nights;
//             hotelTotal += roomTotal;
//           });
//         }
//       });
//     }
//     
//     this.subtotal = sightseeingTotal + transferTotal + hotelTotal;
//     
//     // Calculate markup
//     if (this.markupType === 'percentage') {
//       this.markupAmount = this.subtotal * (this.markupValue / 100);
//     } else {
//       this.markupAmount = this.markupValue || 0;
//     }
//     
//     const afterMarkup = this.subtotal + this.markupAmount;
//     this.taxAmount = afterMarkup * (this.taxRate / 100);
//     this.total = afterMarkup + this.taxAmount;
//     
//     this.updatedAt = Date.now();
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = mongoose.model('Quote', quoteSchema);
