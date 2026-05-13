const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  const user = await User.findOne({ email: 'admin_deshvidesh@navidesk.com' });
  if (user) {
    console.log('User found:', user.name, user.email, user.role);
  } else {
    console.log('User not found');
  }
  process.exit(0);
}).catch(err => console.error(err));
