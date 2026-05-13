const mongoose = require('mongoose');
const PredefinedTemplate = require('./models/PredefinedTemplate');

async function fixCollectionName() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://ayush199816_db_user:qM9zcjpCbIUcjTX0@cluster0.ksbksd1.mongodb.net/traveldesk');
    console.log('Connected to MongoDB');
    
    // Get the database connection
    const db = mongoose.connection.db;
    
    // Check if the old collection exists
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    const oldCollectionName = 'predeinedtemplate';
    const newCollectionName = 'predefinedtemplates';
    
    // Check if old collection exists
    const oldCollectionExists = collections.some(c => c.name === oldCollectionName);
    console.log('Old collection exists:', oldCollectionExists);
    
    if (oldCollectionExists) {
      // Get data from old collection
      const oldData = await db.collection(oldCollectionName).find({}).toArray();
      console.log('Found documents in old collection:', oldData.length);
      
      if (oldData.length > 0) {
        // Insert into correct collection using the model
        console.log('Moving data to correct collection...');
        
        // Clear existing data in correct collection
        await PredefinedTemplate.deleteMany({});
        console.log('Cleared existing data from correct collection');
        
        // Insert data with proper schema
        for (const doc of oldData) {
          const template = new PredefinedTemplate({
            name: doc.name,
            displayName: doc.displayName,
            description: doc.description,
            category: doc.category,
            styles: doc.styles,
            previewImage: doc.previewImage || '',
            isActive: doc.isActive !== undefined ? doc.isActive : true
          });
          await template.save();
        }
        
        console.log('Successfully moved', oldData.length, 'templates to correct collection');
        
        // Verify the data
        const newCount = await PredefinedTemplate.countDocuments({});
        console.log('New collection count:', newCount);
        
        // Optionally, you can drop the old collection
        console.log('You can now manually drop the old collection if needed:');
        console.log(`db.predeinedtemplate.drop()`);
      }
    } else {
      console.log('Old collection not found. Checking if data exists in correct collection...');
      const count = await PredefinedTemplate.countDocuments({});
      console.log('Documents in correct collection:', count);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixCollectionName();
