const mongoose = require('mongoose');
const PredefinedTemplate = require('./models/PredefinedTemplate');

async function checkPredefinedTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://ayush199816_db_user:qM9zcjpCbIUcjTX0@cluster0.ksbksd1.mongodb.net/traveldesk');
    console.log('Connected to MongoDB');
    
    // Check total templates
    const totalTemplates = await PredefinedTemplate.countDocuments({});
    console.log('Total templates in database:', totalTemplates);
    
    // Check active templates
    const activeTemplates = await PredefinedTemplate.find({ isActive: true });
    console.log('Active templates found:', activeTemplates.length);
    
    if (activeTemplates.length > 0) {
      console.log('Template details:');
      activeTemplates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.displayName} (${template.name}) - ${template.category} - isActive: ${template.isActive}`);
      });
    } else {
      console.log('No active templates found!');
      
      // Check all templates regardless of status
      const allTemplates = await PredefinedTemplate.find({});
      console.log('All templates (including inactive):', allTemplates.length);
      
      if (allTemplates.length > 0) {
        console.log('All template details:');
        allTemplates.forEach((template, index) => {
          console.log(`${index + 1}. ${template.displayName} (${template.name}) - isActive: ${template.isActive}`);
        });
      }
    }
    
    // Test the exact query from the route
    console.log('\nTesting route query...');
    const routeTemplates = await PredefinedTemplate.find({ isActive: true })
      .sort({ category: 1, name: 1 });
    console.log('Route query result:', routeTemplates.length);
    console.log('Route template names:', routeTemplates.map(t => t.name));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkPredefinedTemplates();
