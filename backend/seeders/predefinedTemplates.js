const mongoose = require('mongoose');
const PredefinedTemplate = require('../models/PredefinedTemplate');

const predefinedTemplates = [
  {
    name: 'modern_blue',
    displayName: 'Modern Blue',
    description: 'Clean, professional template with blue accents',
    category: 'modern',
    styles: {
      heading: {
        font: 'Arial-Bold',
        size: 28,
        color: '#2c3e50',
        backgroundColor: 'transparent'
      },
      subheading: {
        font: 'Arial',
        size: 20,
        color: '#34495e',
        backgroundColor: 'transparent'
      },
      table: {
        font: 'Arial',
        size: 12,
        color: '#2c3e50',
        backgroundColor: '#f8f9fa',
        headerBackgroundColor: '#3498db',
        borderColor: '#dee2e6'
      },
      text: {
        font: 'Arial',
        size: 14,
        color: '#2c3e50',
        backgroundColor: 'transparent'
      }
    }
  },
  {
    name: 'elegant_gold',
    displayName: 'Elegant Gold',
    description: 'Luxurious template with gold and brown tones',
    category: 'elegant',
    styles: {
      heading: {
        font: 'Times-Bold',
        size: 32,
        color: '#8b4513',
        backgroundColor: 'transparent'
      },
      subheading: {
        font: 'Times',
        size: 22,
        color: '#654321',
        backgroundColor: 'transparent'
      },
      table: {
        font: 'Times',
        size: 12,
        color: '#8b4513',
        backgroundColor: '#fff8dc',
        headerBackgroundColor: '#daa520',
        borderColor: '#d2b48c'
      },
      text: {
        font: 'Times',
        size: 14,
        color: '#654321',
        backgroundColor: 'transparent'
      }
    }
  },
  {
    name: 'minimal_gray',
    displayName: 'Minimal Gray',
    description: 'Simple, clean template with minimal design',
    category: 'minimal',
    styles: {
      heading: {
        font: 'Helvetica-Bold',
        size: 24,
        color: '#333333',
        backgroundColor: 'transparent'
      },
      subheading: {
        font: 'Helvetica',
        size: 18,
        color: '#666666',
        backgroundColor: 'transparent'
      },
      table: {
        font: 'Helvetica',
        size: 11,
        color: '#333333',
        backgroundColor: '#ffffff',
        headerBackgroundColor: '#f5f5f5',
        borderColor: '#e0e0e0'
      },
      text: {
        font: 'Helvetica',
        size: 13,
        color: '#666666',
        backgroundColor: 'transparent'
      }
    }
  },
  {
    name: 'corporate_navy',
    displayName: 'Corporate Navy',
    description: 'Professional template for corporate travel',
    category: 'corporate',
    styles: {
      heading: {
        font: 'Arial-Bold',
        size: 26,
        color: '#1a365d',
        backgroundColor: 'transparent'
      },
      subheading: {
        font: 'Arial',
        size: 18,
        color: '#2d3748',
        backgroundColor: 'transparent'
      },
      table: {
        font: 'Arial',
        size: 12,
        color: '#1a365d',
        backgroundColor: '#f7fafc',
        headerBackgroundColor: '#2b6cb0',
        borderColor: '#cbd5e0'
      },
      text: {
        font: 'Arial',
        size: 14,
        color: '#2d3748',
        backgroundColor: 'transparent'
      }
    }
  },
  {
    name: 'creative_vibrant',
    displayName: 'Creative Vibrant',
    description: 'Colorful template for creative agencies',
    category: 'creative',
    styles: {
      heading: {
        font: 'Helvetica-Bold',
        size: 30,
        color: '#d53f8c',
        backgroundColor: 'transparent'
      },
      subheading: {
        font: 'Helvetica',
        size: 20,
        color: '#805ad5',
        backgroundColor: 'transparent'
      },
      table: {
        font: 'Helvetica',
        size: 12,
        color: '#d53f8c',
        backgroundColor: '#fef5e7',
        headerBackgroundColor: '#ed8936',
        borderColor: '#f6ad55'
      },
      text: {
        font: 'Helvetica',
        size: 14,
        color: '#553c9a',
        backgroundColor: 'transparent'
      }
    }
  }
];

async function seedPredefinedTemplates() {
  try {
    console.log('Seeding predefined templates...');
    
    // Clear existing templates
    await PredefinedTemplate.deleteMany({});
    console.log('Cleared existing predefined templates');
    
    // Insert new templates
    await PredefinedTemplate.insertMany(predefinedTemplates);
    console.log(`Inserted ${predefinedTemplates.length} predefined templates`);
    
    console.log('Predefined templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding predefined templates:', error);
  }
}

module.exports = { seedPredefinedTemplates };
