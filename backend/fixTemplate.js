const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    const PDFTemplate = require('./models/PDFTemplate');
    const PredefinedTemplate = require('./models/PredefinedTemplate');
    
    // Get the modern blue predefined template
    PredefinedTemplate.findOne({ name: 'modern_blue' })
      .then(predefinedTemplate => {
        if (!predefinedTemplate) {
          console.log('Modern Blue predefined template not found');
          process.exit(1);
        }
        
        // Update your Thailand template with proper styles
        return PDFTemplate.updateOne(
          { 
            _id: '69fca34af3d5c5a1ce96462c',
            organization: '69f8b2ddd31c63ada0fac13d'
          },
          { 
            $set: { 
              styles: predefinedTemplate.styles
            }
          }
        );
      })
      .then(result => {
        console.log('Template updated successfully:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('Error updating template:', error);
        process.exit(1);
      });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  });
