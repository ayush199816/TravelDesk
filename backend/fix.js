const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  await User.updateOne({ email: 'navigatio_admin@navidesk.com@org.com' }, { $set: { email: 'navigatio_admin@navidesk.com' } });
  console.log('Email fixed');
  process.exit(0);
}).catch(err => console.error(err));
