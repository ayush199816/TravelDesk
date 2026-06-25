const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  type: { type: String, enum: ['followup', 'trip_reminder'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String, enum: ['Lead', 'Quote'] },
  isRead: { type: Boolean, default: false },
  isEmailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date },
  scheduledAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, relatedId: 1, user: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
