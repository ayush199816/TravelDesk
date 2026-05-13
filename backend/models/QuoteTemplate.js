const mongoose = require('mongoose');

const quoteTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Default Quote Template'
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'Default'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // Color Scheme
  colors: {
    primary: {
      type: String,
      default: '#667eea'
    },
    secondary: {
      type: String,
      default: '#764ba2'
    },
    accent: {
      type: String,
      default: '#28a745'
    },
    background: {
      type: String,
      default: '#f8f9fa'
    },
    text: {
      type: String,
      default: '#333333'
    },
    muted: {
      type: String,
      default: '#666666'
    }
  },
  
  // Typography
  fonts: {
    header: {
      type: String,
      default: 'Arial, sans-serif'
    },
    subheader: {
      type: String,
      default: 'Arial, sans-serif'
    },
    body: {
      type: String,
      default: 'Arial, sans-serif'
    },
    activity: {
      type: String,
      default: 'Arial, sans-serif'
    }
  },
  
  // Font Sizes
  fontSizes: {
    header: {
      type: Number,
      default: 28
    },
    subheader: {
      type: Number,
      default: 22
    },
    body: {
      type: Number,
      default: 16
    },
    activity: {
      type: Number,
      default: 16
    },
    description: {
      type: Number,
      default: 12
    },
    details: {
      type: Number,
      default: 10
    }
  },
  
  // Background Colors
  backgrounds: {
    welcome: {
      type: String,
      default: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
    },
    payment: {
      type: String,
      default: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
    },
    activity: {
      type: String,
      default: '#ffffff'
    },
    nextSteps: {
      type: String,
      default: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
    },
    package: {
      type: String,
      default: '#f8f9fa'
    }
  },

  // Shadow Colors and Opacity
  shadows: {
    activity: {
      type: String,
      default: '#000000'
    },
    activityOpacity: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 1
    },
    payment: {
      type: String,
      default: '#000000'
    },
    paymentOpacity: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1
    },
    nextSteps: {
      type: String,
      default: '#000000'
    },
    nextStepsOpacity: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 1
    },
    package: {
      type: String,
      default: '#000000'
    },
    packageOpacity: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1
    }
  },
  
  // Border Colors
  borders: {
    activity: {
      type: String,
      default: '#e9ecef'
    },
    payment: {
      type: String,
      default: 'rgba(102, 126, 234, 0.3)'
    },
    nextSteps: {
      type: String,
      default: 'rgba(102, 126, 234, 0.2)'
    },
    package: {
      type: String,
      default: '#e9ecef'
    },
    table: {
      type: String,
      default: 'rgba(255, 255, 255, 0.3)'
    },
    tableHeader: {
      type: String,
      default: 'rgba(0, 0, 0, 0.9)'
    }
  },
  
  // Table Styling
  table: {
    backgroundColor: {
      type: String,
      default: 'rgba(0, 0, 0, 0.7)'
    },
    headerBackgroundColor: {
      type: String,
      default: 'rgba(0, 0, 0, 0.9)'
    },
    textColor: {
      type: String,
      default: 'white'
    },
    headerTextColor: {
      type: String,
      default: 'white'
    },
    borderRadius: {
      type: Number,
      default: 0
    },
    fontSize: {
      type: Number,
      default: 14
    },
    headerFontSize: {
      type: Number,
      default: 15
    },
    padding: {
      type: String,
      default: '10px 8px'
    }
  },
  
  // Hotel section styling
  hotel: {
    showBox: {
      type: Boolean,
      default: true
    },
    backgroundColor: {
      type: String,
      default: '#f8f9fa'
    },
    borderColor: {
      type: String,
      default: '#e9ecef'
    },
    borderWidth: {
      type: Number,
      default: 1
    },
    borderRadius: {
      type: Number,
      default: 8
    },
    titleFont: {
      type: String,
      default: 'Arial, sans-serif'
    },
    titleFontSize: {
      type: Number,
      default: 18
    },
    titleColor: {
      type: String,
      default: '#333333'
    },
    bodyFont: {
      type: String,
      default: 'Arial, sans-serif'
    },
    bodyFontSize: {
      type: Number,
      default: 14
    },
    bodyColor: {
      type: String,
      default: '#666666'
    },
    imageHeight: {
      type: Number,
      default: 120
    },
    imageWidth: {
      type: Number,
      default: 120
    },
    imageBorderRadius: {
      type: Number,
      default: 8
    },
    // Night box settings
    nightBox: {
      showNightBox: {
        type: Boolean,
        default: true
      },
      backgroundColor: {
        type: String,
        default: '#ffffff'
      },
      borderColor: {
        type: String,
        default: '#dee2e6'
      },
      borderWidth: {
        type: Number,
        default: 1
      },
      borderRadius: {
        type: Number,
        default: 6
      },
      titleFont: {
        type: String,
        default: 'Arial, sans-serif'
      },
      titleFontSize: {
        type: Number,
        default: 14
      },
      titleColor: {
        type: String,
        default: '#495057'
      },
      bodyFont: {
        type: String,
        default: 'Arial, sans-serif'
      },
      bodyFontSize: {
        type: Number,
        default: 12
      },
      bodyColor: {
        type: String,
        default: '#6c757d'
      },
      highlightColor: {
        type: String,
        default: '#007bff'
      }
    }
  },
  
  // Messages
  messages: {
    welcome: {
      type: String,
      default: 'Your Dream Vacation Awaits!'
    },
    welcomeSubtext: {
      type: String,
      default: "We've crafted the perfect itinerary for your unforgettable journey to"
    },
    greeting: {
      type: String,
      default: 'Greetings from'
    },
    greetingMessage: {
      type: String,
      default: 'Our sales team has put up this Quote regarding your upcoming trip. Please go through it and let\'s know if you would like any changes in any of the provided services. Contact details are provided at the end.'
    },
    nextStepsTitle: {
      type: String,
      default: 'Next Steps'
    },
    nextSteps: {
      type: [String],
      default: [
        'Review Your Itinerary: Please carefully review all the details of your travel package including dates, hotels, activities, and inclusions to ensure everything meets your expectations.',
        'Confirm Your Booking: Once you are satisfied with the itinerary, proceed with the payment to confirm your booking. Our team will assist you with the payment process.',
        'Receive Travel Documents: After successful payment, you will receive all necessary travel documents including booking vouchers, flight tickets, hotel confirmations, and detailed itinerary.',
        'Enjoy Your Journey: Pack your bags and get ready for an unforgettable experience! Our support team is available 24/7 during your trip for any assistance.'
      ]
    }
  },
  
  // Layout Settings
  layout: {
    activitiesPerPage: {
      type: Number,
      default: 2
    },
    showImages: {
      type: Boolean,
      default: true
    },
    imageHeight: {
      type: Number,
      default: 200
    },
    dayHeaderSize: {
      type: Number,
      default: 60
    }
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
quoteTemplateSchema.index({ organization: 1, isActive: 1 });
quoteTemplateSchema.index({ organization: 1, isDefault: 1 });
quoteTemplateSchema.index({ organization: 1, country: 1, isActive: 1 });
quoteTemplateSchema.index({ organization: 1, country: 1, isDefault: 1 });

module.exports = mongoose.model('QuoteTemplate', quoteTemplateSchema);
