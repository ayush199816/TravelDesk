const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  const Organization = require('./models/Organization');
  const user = await User.findOne({ email: 'test@test.com' }).populate('organization');
  console.log('User found:', !!user);
  if (user) {
    console.log('User:', user);
  }
  const org = await Organization.findOne({ adminUsername: 'test@test.com' });
  console.log('Org found:', !!org);
  if (org) {
    console.log('Org:', org);
  }
  process.exit(0);
}).catch(err => console.error(err));
