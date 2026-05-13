const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    const MainAdmin = require('./models/MainAdmin');
    const adminExists = await MainAdmin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashed = await bcrypt.hash('password', 10);
      await new MainAdmin({ username: 'admin', password: hashed }).save();
      console.log('Main admin seeded');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/sightseeings', require('./routes/sightseeings'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/temporary-hotels', require('./routes/temporaryHotels'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/pdf-templates', require('./routes/pdfTemplates'));
app.use('/api/pdf-generator', require('./routes/pdfGenerator'));
app.use('/api/predefined-templates', require('./routes/predefinedTemplates'));
app.use('/api/quote-templates', require('./routes/quoteTemplates'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/supplier-assignments', require('./routes/supplierAssignments'));
app.use('/api/suppliers', require('./routes/supplierDetails'));

app.get('/', (req, res) => {
  res.send('NaviDesk Backend is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
