const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Lead = require('../models/Lead');

/**
 * One-time script to initialize leadCounter for existing organizations.
 * Run this once to set each org's counter to the current max lead number.
 */
async function initializeLeadCounters() {
  try {
    // Connect to DB (adjust URI as needed)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');

    const organizations = await Organization.find({});
    for (const org of organizations) {
      // Find highest numeric part of leadNumber for this org
      const leads = await Lead.find({ organization: org._id }).sort({ leadNumber: -1 }).limit(1);
      let maxCounter = 0;
      if (leads.length > 0 && leads[0].leadNumber) {
        const match = leads[0].leadNumber.match(/LN-(\d{4})/);
        if (match) {
          maxCounter = parseInt(match[1], 10);
        }
      }
      // Update organization's leadCounter to current max
      await Organization.findByIdAndUpdate(org._id, { leadCounter: maxCounter });
      console.log(`Updated ${org.name}: leadCounter set to ${maxCounter}`);
    }
    console.log('Lead counters initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing lead counters:', err);
    process.exit(1);
  }
}

initializeLeadCounters();
