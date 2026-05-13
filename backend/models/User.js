const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, required: true, enum: ['organization_admin', 'manager', 'operations', 'sales', 'accounts'] },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
});

module.exports = mongoose.model('User', userSchema);
