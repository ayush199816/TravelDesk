const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');
const Organization = require('../models/Organization');
const User = require('../models/User');
const puppeteer = require('puppeteer');
const { generateInvoiceHTML } = require('../services/invoiceGenerator');

// Get all invoices for organization
router.get('/', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ organization: req.user.organization })
      .populate('quote', 'country')
      .populate('lead', 'name email phone leadNumber')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Error fetching invoices' });
  }
});

// Get single invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    })
      .populate('quote', 'country adultPax childPax travelStartDate travelEndDate subtotal markupAmount taxAmount total')
      .populate('lead', 'name email phone address leadNumber')
      .populate('createdBy', 'name email')
      .populate('paymentCycles.verifiedBy', 'name email');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Error fetching invoice' });
  }
});

// Create invoice from quote
router.post('/', auth, async (req, res) => {
  try {
    const { quoteId, totalCycles, firstCycleAmount, notes, terms, paymentDates } = req.body;
    
    // Validate quote exists and is converted
    const quote = await Quote.findOne({ 
      _id: quoteId,
      organization: req.user.organization 
    });
    
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    if (!quote.isConverted) {
      return res.status(400).json({ message: 'Quote must be converted before creating invoice' });
    }
    
    // Check if invoice already exists for this quote
    const existingInvoice = await Invoice.findOne({ quote: quoteId });
    if (existingInvoice) {
      return res.status(400).json({ message: 'Invoice already exists for this quote' });
    }
    
    // Get lead information
    const lead = await Lead.findById(quote.lead);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    // Get organization details
    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(400).json({ message: 'Organization not found' });
    }
    
    // Calculate amounts
    const packageAmount = (quote.subtotal || 0) + (quote.markupAmount || 0);
    // Use actual tax and TCS amounts from quote
    const taxAmount = quote.taxAmount || 0;
    const tcsAmount = quote.tcsAmount || 0;
    const finalAmount = packageAmount + taxAmount + tcsAmount;
    const remainingAmount = finalAmount - firstCycleAmount;
    const cycleAmount = Math.round(remainingAmount / (totalCycles - 1));
    
    // Generate invoice number manually if pre-save hook doesn't work
    const count = await Invoice.countDocuments({ organization: req.user.organization });
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    
    // Create invoice
    const invoice = new Invoice({
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`, // Ensure invoice number is set
      quote: quoteId,
      lead: quote.lead,
      organization: req.user.organization,
      guestName: lead.name || 'Guest',
      packageCountry: quote.country || 'Unknown',
      packageAmount: packageAmount || 0,
      markupAmount: quote.markupAmount || 0,
      taxAmount: taxAmount || 0,
      tcsAmount: tcsAmount || 0,
      finalAmount: finalAmount || 0,
      currency: quote.currency || 'INR',
      totalCycles: totalCycles || 1,
      firstCycleAmount: firstCycleAmount || 0,
      remainingAmount: remainingAmount || 0,
      cycleAmount: cycleAmount || 0,
      notes: notes || '',
      terms: terms || 'Payment is due within 30 days of invoice date. Late payments may incur additional charges.',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      companyName: organization.name || 'Company Name',
      companyAddress: organization.address || 'Company Address',
      companyPhone: organization.phone || '0000000000',
      companyGST: organization.gstNumber || 'N/A', // Provide default value
      companyEmail: organization.adminUsername || 'contact@company.com', // Use adminUsername as fallback
      createdBy: req.user._id
    });
    
    // Calculate payment cycles with custom dates or default
    if (paymentDates && Array.isArray(paymentDates) && paymentDates.length === totalCycles) {
      // Use custom payment dates provided by user
      const cycles = [];
      for (let i = 0; i < totalCycles; i++) {
        const amount = i === 0 ? firstCycleAmount : cycleAmount;
        cycles.push({
          cycleNumber: i + 1,
          amount: amount,
          dueDate: new Date(paymentDates[i]),
          status: 'pending',
          utrNumber: '',
          utrVerified: false
        });
      }
      invoice.paymentCycles = cycles;
    } else {
      // Use default calculation
      invoice.calculatePaymentCycles();
    }
    
    await invoice.save();
    
    // Populate and return
    await invoice.populate('quote', 'quoteNumber country');
    await invoice.populate('lead', 'name email phone leadNumber');
    await invoice.populate('createdBy', 'name email');
    
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Error creating invoice' });
  }
});

// Update invoice
router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    const { notes, terms } = req.body;
    
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    
    await invoice.save();
    
    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Error updating invoice' });
  }
});

// Mark payment cycle as paid
router.post('/:id/pay-cycle', auth, async (req, res) => {
  try {
    const { cycleNumber, utrNumber } = req.body;
    
    // Convert cycleNumber to integer
    const cycleNum = parseInt(cycleNumber);
    
    console.log('Payment cycle request:', { cycleNumber, cycleNum, utrNumber });
    
    const invoice = await Invoice.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    console.log('Invoice payment cycles:', invoice.paymentCycles.map(c => ({ cycleNumber: c.cycleNumber, status: c.status })));
    
    const success = invoice.markCycleAsPaid(cycleNum, utrNumber, req.user._id);
    
    if (!success) {
      return res.status(400).json({ message: 'Invalid cycle number' });
    }
    
    await invoice.save();
    
    // Populate and return
    await invoice.populate('quote', 'quoteNumber country');
    await invoice.populate('lead', 'name email phone');
    await invoice.populate('createdBy', 'name email');
    await invoice.populate('paymentCycles.verifiedBy', 'name email');
    
    res.json({
      message: 'Payment cycle marked as paid',
      invoice
    });
  } catch (error) {
    console.error('Error marking payment cycle:', error);
    res.status(500).json({ message: 'Error marking payment cycle' });
  }
});

// Update UTR verification status
router.put('/:id/verify-utr', auth, async (req, res) => {
  try {
    const { cycleNumber, utrVerified } = req.body;
    
    // Convert cycleNumber to integer
    const cycleNum = parseInt(cycleNumber);
    
    console.log('UTR verification request:', { cycleNumber, cycleNum, utrVerified });
    
    const invoice = await Invoice.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    const cycle = invoice.paymentCycles.find(c => c.cycleNumber === cycleNum);
    if (!cycle) {
      return res.status(400).json({ message: 'Invalid cycle number' });
    }
    
    cycle.utrVerified = utrVerified;
    cycle.verifiedBy = req.user._id;
    cycle.verifiedAt = new Date();
    
    if (utrVerified) {
      cycle.status = 'paid';
      cycle.paidDate = new Date();
    } else {
      cycle.status = 'pending';
      cycle.paidDate = null;
    }
    
    invoice.updatePaymentStatus();
    await invoice.save();
    
    await invoice.populate('paymentCycles.verifiedBy', 'name email');
    
    res.json({
      message: `UTR verification ${utrVerified ? 'confirmed' : 'revoked'}`,
      invoice
    });
  } catch (error) {
    console.error('Error updating UTR verification:', error);
    res.status(500).json({ message: 'Error updating UTR verification' });
  }
});

// Delete invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // Allow deletion of any invoice (removed draft-only restriction)
    await Invoice.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Error deleting invoice' });
  }
});

// Get invoice statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      { $match: { organization: req.user.organization } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);
    
    const totalInvoices = await Invoice.countDocuments({ organization: req.user.organization });
    const unpaidAmount = await Invoice.aggregate([
      { $match: { organization: req.user.organization, status: { $in: ['sent', 'partially_paid', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);
    
    res.json({
      totalInvoices,
      unpaidAmount: unpaidAmount[0]?.total || 0,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ message: 'Error fetching invoice stats' });
  }
});

// Generate and download invoice PDF
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id,
      organization: req.user.organization 
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // Generate HTML
    const html = await generateInvoiceHTML(req.params.id);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set content and wait for network idle
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

// Get invoices by lead ID
router.get('/lead/:leadId', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ 
      lead: req.params.leadId,
      organization: req.user.organization 
    })
      .populate('quote', 'quoteNumber country travelStartDate travelEndDate')
      .populate('lead', 'name email phone leadNumber')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices for lead:', error);
    res.status(500).json({ message: 'Error fetching invoices for lead' });
  }
});

module.exports = router;
