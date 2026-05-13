const mongoose = require('mongoose');
const Quote = require('./models/Quote');
const Organization = require('./models/Organization');
require('dotenv').config();

const updateQuoteNumbers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`Found ${organizations.length} organizations`);

    for (const org of organizations) {
      console.log(`\nProcessing organization: ${org.name}`);
      
      // Get all quotes for this organization that don't have quoteNumber
      const quotesWithoutNumber = await Quote.find({ 
        organization: org._id,
        quoteNumber: { $exists: false }
      }).sort({ createdAt: 1 });

      console.log(`Found ${quotesWithoutNumber.length} quotes without quote numbers`);

      for (let i = 0; i < quotesWithoutNumber.length; i++) {
        const quote = quotesWithoutNumber[i];
        const year = new Date(quote.createdAt).getFullYear();
        const month = String(new Date(quote.createdAt).getMonth() + 1).padStart(2, '0');
        
        // Count existing quotes for this organization up to this quote's creation date
        const count = await Quote.countDocuments({ 
          organization: org._id,
          createdAt: { $lte: quote.createdAt }
        });
        
        const quoteNumber = `Q-${year}${month}-${String(count).padStart(4, '0')}`;
        await Quote.updateOne(
          { _id: quote._id },
          { quoteNumber: quoteNumber }
        );
        
        console.log(`Updated quote ${quote._id} with number: ${quoteNumber}`);
      }
    }

    console.log('\n✅ All quote numbers updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating quote numbers:', error);
    process.exit(1);
  }
};

updateQuoteNumbers();
