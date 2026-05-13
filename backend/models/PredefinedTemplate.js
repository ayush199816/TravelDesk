const mongoose = require('mongoose');

const predefinedTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['modern', 'elegant', 'minimal', 'corporate', 'creative'],
    required: true
  },
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
  previewImage: {
    type: String,
    default: ''
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

// Compound index
predefinedTemplateSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('PredefinedTemplate', predefinedTemplateSchema);
