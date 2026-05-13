const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MainAdmin = require('../models/MainAdmin');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Access denied');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'mainAdmin') {
      req.user = await MainAdmin.findById(decoded.id);
      req.userType = 'mainAdmin';
    } else if (decoded.type === 'user') {
      req.user = await User.findById(decoded.id).populate('organization');
      req.userType = 'user';
    }
    if (!req.user) return res.status(401).send('Invalid token');
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
};

module.exports = auth;
