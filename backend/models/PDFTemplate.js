const mongoose = require('mongoose');

const pdfTemplateSchema = new mongoose.Schema({
  organization: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  country: { 
    type: String, 
    required: true 
  },
  
  // Background images for different page types
  frontPageBackground: { 
    type: String, 
    default: null 
  },
  middlePageBackground: { 
    type: String, 
    default: null 
  },
  lastPageBackground: { 
    type: String, 
    default: null 
  },
  
  // Typography styles
  styles: {
    heading: {
      font: { 
        type: String, 
        default: 'Helvetica-Bold' 
      },
      size: { 
        type: Number, 
        default: 24 
      },
      color: { 
        type: String, 
        default: '#000000' 
      },
      backgroundColor: { 
        type: String, 
        default: 'transparent' 
      }
    },
    subheading: {
      font: { 
        type: String, 
        default: 'Helvetica' 
      },
      size: { 
        type: Number, 
        default: 18 
      },
      color: { 
        type: String, 
        default: '#333333' 
      },
      backgroundColor: { 
        type: String, 
        default: 'transparent' 
      }
    },
    table: {
      font: { 
        type: String, 
        default: 'Helvetica' 
      },
      size: { 
        type: Number, 
        default: 12 
      },
      color: { 
        type: String, 
        default: '#000000' 
      },
      backgroundColor: { 
        type: String, 
        default: '#f8f9fa' 
      },
      headerBackgroundColor: {
        type: String,
        default: '#dee2e6'
      },
      borderColor: {
        type: String,
        default: '#dee2e6'
      }
    },
    text: {
      font: { 
        type: String, 
        default: 'Helvetica' 
      },
      size: { 
        type: Number, 
        default: 14 
      },
      color: { 
        type: String, 
        default: '#333333' 
      },
      backgroundColor: { 
        type: String, 
        default: 'transparent' 
      }
    }
  },
  
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamps on save
pdfTemplateSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Compound index to ensure unique template per organization and country
pdfTemplateSchema.index({ organization: 1, country: 1 }, { unique: true });

module.exports = mongoose.model('PDFTemplate', pdfTemplateSchema);
