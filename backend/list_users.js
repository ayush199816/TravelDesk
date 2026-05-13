const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  const users = await User.find({ organization: '69f8acf6d31c63ada0fac138' });
  console.log('Users in Test org:');
  users.forEach(u => console.log(`${u.name} - ${u.email} - ${u.role}`));
  process.exit(0);
}).catch(err => console.error(err));
