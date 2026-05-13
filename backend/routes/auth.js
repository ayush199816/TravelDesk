const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MainAdmin = require('../models/MainAdmin');
const Organization = require('../models/Organization');
const auth = require('../middleware/auth');

const router = express.Router();

// Get current user info
router.get('/me', auth, async (req, res) => {
  if (req.userType === 'mainAdmin') {
    res.json({ username: req.user.username });
  } else {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organization: req.user.organization
    });
  }
});

// Main admin login
router.post('/main-admin/login', async (req, res) => {
  console.log('main admin login attempt');
  const { username, password } = req.body;
  console.log('username:', username);
  const admin = await MainAdmin.findOne({ username });
  console.log('admin found:', !!admin);
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    console.log('invalid credentials');
    return res.status(400).send('Invalid credentials');
  }
  console.log('login successful');
  const token = jwt.sign({ id: admin._id, type: 'mainAdmin' }, process.env.JWT_SECRET);
  res.send({ token });
});

// User login (for organization users)
router.post('/login', async (req, res) => {
  console.log('user login attempt');
  const { email, password } = req.body;
  console.log('email:', email);
  const user = await User.findOne({ email }).populate('organization');
  console.log('user found:', !!user);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    console.log('invalid credentials');
    return res.status(400).send('Invalid credentials');
  }
  console.log('login successful');
  const token = jwt.sign({ id: user._id, type: 'user' }, process.env.JWT_SECRET);
  res.send({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, organization: user.organization } });
});

// Create organization (main admin only)
router.post('/organizations', auth, async (req, res) => {
  if (req.userType !== 'mainAdmin') return res.status(403).send('Access denied');
  const { name, logo, address, phone, adminUsername, adminPassword } = req.body;
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const org = new Organization({
    name, logo, address, phone, adminUsername, adminPassword: hashedPassword, createdBy: req.user._id
  });
  await org.save();
  // Create org admin user
  const orgAdmin = new User({
    name: adminUsername,
    email: adminUsername,
    password: hashedPassword,
    phone,
    role: 'organization_admin',
    organization: org._id
  });
  await orgAdmin.save();
  res.send(org);
});

// Add user (org admin only)
router.post('/users', auth, async (req, res) => {
  if (req.userType !== 'user' || req.user.role !== 'organization_admin') return res.status(403).send('Access denied');
  const { name, email, password, phone, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name, email, password: hashedPassword, phone, role, organization: req.user.organization._id
  });
  await user.save();
  res.send(user);
});

// Get users (org admin only)
router.get('/users', auth, async (req, res) => {
  if (req.userType !== 'user' || req.user.role !== 'organization_admin') return res.status(403).send('Access denied');
  const users = await User.find({ organization: req.user.organization._id });
  res.send(users);
});

// Get all organizations with users (main admin only)
router.get('/organizations', auth, async (req, res) => {
  if (req.userType !== 'mainAdmin') return res.status(403).send('Access denied');
  const orgs = await Organization.find().populate({
    path: 'createdBy',
    select: 'username'
  });
  const orgsWithUsers = await Promise.all(orgs.map(async (org) => {
    const users = await User.find({ organization: org._id });
    return { ...org.toObject(), users };
  }));
  res.send(orgsWithUsers);
});

// Update user (org admin only)
router.put('/users/:id', auth, async (req, res) => {
  if (req.userType !== 'user' || req.user.role !== 'organization_admin') return res.status(403).send('Access denied');
  const { role, password } = req.body;
  const update = {};
  if (role) update.role = role;
  if (password) update.password = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization._id },
    update,
    { new: true }
  );
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

// Delete user (org admin only)
router.delete('/users/:id', auth, async (req, res) => {
  if (req.userType !== 'user' || req.user.role !== 'organization_admin') return res.status(403).send('Access denied');
  const user = await User.findOneAndDelete(
    { _id: req.params.id, organization: req.user.organization._id }
  );
  if (!user) return res.status(404).send('User not found');
  res.send({ message: 'User deleted' });
});

// Get current user data
router.get('/me', auth, async (req, res) => {
  res.send(req.user);
});

module.exports = router;
