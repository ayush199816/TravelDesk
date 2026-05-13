const mongoose = require('mongoose');
const Quote = require('./models/Quote');
const Lead = require('./models/Lead');
const PDFGenerator = require('./services/pdfGenerator');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://ayushgarg532:ayush532@cluster0.6hguj.mongodb.net/test?retryWrites=true&w=majority')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function testQuotePDF() {
  try {
    console.log('Testing PDF generation for quote ID: 6a047b95570fba768af51fa0');
    
    // Get the quote
    const quote = await Quote.findById('6a047b95570fba768af51fa0')
      .populate('lead', 'name email phone leadNumber')
      .populate('createdBy', 'name email')
      .populate('days.sightseeings.sightseeing', 'name location duration images description')
      .populate('days.transfers.transfer', 'name fromLocation toLocation vehicleType')
      .populate('hotels.hotel', 'name city starRating images');
    
    if (!quote) {
      console.error('❌ Quote not found');
      return;
    }
    
    console.log('✅ Quote found:', quote.quoteNumber);
    console.log('Quote data:', {
      quoteNumber: quote.quoteNumber,
      country: quote.country,
      hotelsCount: quote.hotels?.length || 0,
      daysCount: quote.days?.length || 0
    });
    
    // Get lead
    const lead = await Lead.findById(quote.lead);
    if (!lead) {
      console.error('❌ Lead not found');
      return;
    }
    
    console.log('✅ Lead found:', lead.leadNumber);
    
    // Mock organization for testing
    const organization = {
      _id: '6a045afe766bca5869265595',
      name: 'Test Organization',
      currency: 'USD'
    };
    
    // Generate PDF
    const pdfGenerator = new PDFGenerator();
    console.log('🔄 Generating PDF...');
    
    const pdfBuffer = await pdfGenerator.generateQuotePDF(quote, lead, organization);
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testQuotePDF();
