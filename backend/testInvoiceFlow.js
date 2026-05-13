const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TOKEN = 'your_jwt_token_here'; // Replace with actual token

// Test data
const testQuoteId = 'your_quote_id_here'; // Replace with actual quote ID

async function testInvoiceFlow() {
  try {
    console.log('🚀 Starting Invoice Generation Test...\n');

    // Step 1: Get available quotes
    console.log('📋 Step 1: Getting available quotes...');
    const quotesResponse = await axios.get(`${BASE_URL}/api/quotes`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    const quotes = quotesResponse.data;
    console.log(`Found ${quotes.length} quotes`);
    
    if (quotes.length === 0) {
      console.log('❌ No quotes found. Please create a quote first.');
      return;
    }
    
    // Use the first quote for testing
    const testQuote = quotes[0];
    console.log(`Using quote: ${testQuote._id} - Status: ${testQuote.status}`);
    
    // Step 2: Mark quote as converted (if not already converted)
    if (!testQuote.isConverted) {
      console.log('\n🔄 Step 2: Marking quote as converted...');
      const convertResponse = await axios.post(`${BASE_URL}/api/quotes/${testQuote._id}/convert`, {}, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      console.log('✅ Quote marked as converted:', convertResponse.data.message);
    } else {
      console.log('\n✅ Quote is already converted');
    }
    
    // Step 3: Create invoice
    console.log('\n💰 Step 3: Creating invoice...');
    const invoiceData = {
      quoteId: testQuote._id,
      totalCycles: 4,
      firstCycleAmount: 20000,
      notes: 'Test invoice generation',
      terms: 'Payment due within 30 days. Late payments may incur additional charges.'
    };
    
    const invoiceResponse = await axios.post(`${BASE_URL}/api/invoices`, invoiceData, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    const invoice = invoiceResponse.data;
    console.log('✅ Invoice created successfully!');
    console.log(`Invoice Number: ${invoice.invoiceNumber}`);
    console.log(`Total Amount: ${invoice.currency} ${invoice.finalAmount.toLocaleString('en-IN')}`);
    console.log(`Payment Cycles: ${invoice.totalCycles}`);
    console.log(`First Cycle: ${invoice.currency} ${invoice.firstCycleAmount.toLocaleString('en-IN')}`);
    console.log(`Remaining Cycles: ${invoice.currency} ${invoice.cycleAmount.toLocaleString('en-IN')} each`);
    
    // Step 4: Get invoice details
    console.log('\n📊 Step 4: Getting invoice details...');
    const invoiceDetails = await axios.get(`${BASE_URL}/api/invoices/${invoice._id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    const detailedInvoice = invoiceDetails.data;
    console.log('Payment Schedule:');
    detailedInvoice.paymentCycles.forEach(cycle => {
      console.log(`  Cycle ${cycle.cycleNumber}: ${invoice.currency} ${cycle.amount.toLocaleString('en-IN')} - Due: ${new Date(cycle.dueDate).toLocaleDateString()} - Status: ${cycle.status}`);
    });
    
    // Step 5: Generate PDF (optional)
    console.log('\n📄 Step 5: PDF Generation URL:');
    console.log(`GET ${BASE_URL}/api/invoices/${invoice._id}/pdf`);
    console.log('You can access this URL in your browser to download the PDF');
    
    console.log('\n🎉 Invoice generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

// Instructions
console.log('📖 Instructions:');
console.log('1. Replace TOKEN with your actual JWT token');
console.log('2. Replace testQuoteId with actual quote ID or let script auto-detect');
console.log('3. Run: node testInvoiceFlow.js');
console.log('4. Follow the steps to test invoice generation\n');

// Uncomment the line below to run the test
// testInvoiceFlow();

module.exports = { testInvoiceFlow };
