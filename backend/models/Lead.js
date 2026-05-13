const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfTravel: { type: Date },
  travelToCountry: { type: String },
  status: { type: String, required: true, default: 'new' },
  requirements: { type: String },
  latestComment: { type: String },
  nextFollowUpDate: { type: Date },
  tags: [{ type: String }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  notes: { type: String },
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    changes: { type: String }, // Description of what was changed
    previousValues: { type: mongoose.Schema.Types.Mixed }, // Store previous values
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lead', leadSchema);
