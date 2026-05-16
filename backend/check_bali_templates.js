const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/navidesk')
  .then(async () => {
    console.log('Connected to MongoDB');
    const QuoteTemplate = require('./models/QuoteTemplate');
    
    try {
      // Find all templates
      const allTemplates = await QuoteTemplate.find({});
      console.log('All templates:');
      allTemplates.forEach(t => {
        console.log(`- Name: ${t.name}, Country: ${t.country}, ID: ${t._id}`);
      });
      
      // Find templates with Bali country
      const baliTemplates = await QuoteTemplate.find({ country: 'Bali' });
      console.log('\nTemplates with Bali country:');
      if (baliTemplates.length === 0) {
        console.log('No templates found with country = Bali');
      } else {
        baliTemplates.forEach(t => {
          console.log(`- Name: ${t.name}, Country: ${t.country}, ID: ${t._id}`);
        });
      }
      
      // Check for case variations
      const caseVariations = await QuoteTemplate.find({ 
        country: { $regex: 'bali', $options: 'i' } 
      });
      console.log('\nTemplates with case variations of Bali:');
      if (caseVariations.length === 0) {
        console.log('No templates found with country containing "bali" (case insensitive)');
      } else {
        caseVariations.forEach(t => {
          console.log(`- Name: ${t.name}, Country: ${t.country}, ID: ${t._id}`);
        });
      }
      
      // Get unique countries
      const uniqueCountries = await QuoteTemplate.distinct('country');
      console.log('\nUnique countries in database:');
      uniqueCountries.forEach(country => {
        console.log(`- ${country}`);
      });
      
    } catch (error) {
      console.error('Error querying templates:', error);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
