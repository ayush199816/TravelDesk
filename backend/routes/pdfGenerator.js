const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PDFGenerator = require('../services/pdfGenerator');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');

const pdfGenerator = new PDFGenerator();

// Generate PDF for a quote
router.get('/quote/:quoteId', auth, async (req, res) => {
  try {
    const { quoteId } = req.params;
    
    // Get quote with populated data
    const quote = await Quote.findById(quoteId)
      .populate('lead', 'name email phone leadNumber')
      .populate('createdBy', 'name email')
      .populate('days.sightseeings.sightseeing', 'name location duration images description')
      .populate('days.transfers.transfer', 'name fromLocation toLocation vehicleType')
      .populate('hotels.hotel', 'name city starRating images');
    
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    // Get lead details
    const lead = await Lead.findById(quote.lead);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    // Get organization details (assuming user has organization info)
    const organization = req.user.organization;
    
    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateQuotePDF(quote, lead, organization);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quote-${lead.leadNumber}-1.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF: ' + error.message });
  }
});

// Generate PDF for multiple quotes (batch)
router.post('/batch', auth, async (req, res) => {
  try {
    const { quoteIds } = req.body;
    
    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      return res.status(400).json({ message: 'Quote IDs are required' });
    }
    
    const pdfs = [];
    
    for (const quoteId of quoteIds) {
      try {
        // Get quote with populated data
        const quote = await Quote.findById(quoteId)
          .populate('lead', 'name email phone leadNumber')
          .populate('createdBy', 'name email')
          .populate('days.sightseeings.sightseeing', 'name location duration images description')
          .populate('days.transfers.transfer', 'name fromLocation toLocation vehicleType')
          .populate('hotels.hotel', 'name city starRating images');
        
        if (!quote) {
          console.warn(`Quote ${quoteId} not found, skipping...`);
          continue;
        }
        
        // Get lead details
        const lead = await Lead.findById(quote.lead);
        if (!lead) {
          console.warn(`Lead for quote ${quoteId} not found, skipping...`);
          continue;
        }
        
        // Get organization details
        const organization = req.user.organization;
        
        // Generate PDF
        const pdfBuffer = await pdfGenerator.generateQuotePDF(quote, lead, organization);
        
        pdfs.push({
          quoteId,
          fileName: `Quote-${lead.leadNumber}-1.pdf`,
          buffer: pdfBuffer
        });
        
      } catch (error) {
        console.error(`Error generating PDF for quote ${quoteId}:`, error);
      }
    }
    
    if (pdfs.length === 0) {
      return res.status(400).json({ message: 'No PDFs were generated successfully' });
    }
    
    // If only one PDF, send it directly
    if (pdfs.length === 1) {
      const pdf = pdfs[0];
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
      res.setHeader('Content-Length', pdf.buffer.length);
      return res.send(pdf.buffer);
    }
    
    // If multiple PDFs, create a zip file (you'll need to install archiver)
    // For now, return the first PDF as a fallback
    const pdf = pdfs[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
    res.setHeader('Content-Length', pdf.buffer.length);
    res.send(pdf.buffer);
    
  } catch (error) {
    console.error('Error generating batch PDFs:', error);
    res.status(500).json({ message: 'Error generating batch PDFs: ' + error.message });
  }
});

// Preview PDF template (HTML preview)
router.get('/preview/:country', auth, async (req, res) => {
  try {
    const { country } = req.params;
    const organization = req.user.organization;
    
    console.log('Preview request for country:', country, 'by organization:', organization._id);
    
    // Get the PDF template for this country and organization
    const PDFTemplate = require('../models/PDFTemplate');
    let template = await PDFTemplate.findOne({
      organization: organization._id,
      country: country,
      isActive: true
    });
    
    // If no custom template, use a predefined template (default to modern)
    if (!template) {
      const PredefinedTemplate = require('../models/PredefinedTemplate');
      const predefinedTemplate = await PredefinedTemplate.findOne({
        name: 'modern_blue',
        isActive: true
      });
      
      if (predefinedTemplate) {
        template = {
          styles: predefinedTemplate.styles,
          frontPageBackground: null,
          middlePageBackground: null,
          lastPageBackground: null
        };
      }
    }
    
    // Create sample quote data for preview
    const sampleQuote = {
      _id: 'preview',
      country: country,
      travelStartDate: new Date(),
      travelEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      adultPax: 2,
      childPax: 1,
      currency: 'USD',
      sightseeingTotal: 1000,
      transferTotal: 500,
      hotelTotal: 800,
      flightTotal: 2000,
      subtotal: 4300,
      markupAmount: 200,
      taxAmount: 90,
      total: 4590,
      markupType: 'amount',
      taxRate: 2,
      days: [
        {
          dayNumber: 1,
          date: new Date(),
          sightseeings: [
            {
              sightseeing: { name: 'City Tour', location: 'Sample City', duration: '4 hours' },
              adultRate: 500,
              adultCount: 2,
              childCount: 1
            }
          ],
          transfers: [
            {
              transfer: { name: 'Airport Transfer', fromLocation: 'Airport', toLocation: 'Hotel', vehicleType: 'Sedan' },
              rate: 250
            }
          ]
        }
      ],
      hotels: [
        {
          name: 'Sample Hotel',
          city: 'Sample City',
          rooms: [
            {
              roomName: 'Deluxe Room',
              numberOfRooms: 1,
              nights: 1,
              adultRate: 800
            }
          ]
        }
      ],
      flights: [
        {
          airline: 'Sample Airlines',
          flightNumber: 'SA123',
          departureCity: 'Departure City',
          arrivalCity: 'Arrival City',
          departureDate: new Date(),
          departureTime: '10:00',
          arrivalDate: new Date(),
          arrivalTime: '14:00',
          pnr: 'ABC123'
        }
      ]
    };
    
    const sampleLead = {
      name: 'Sample Client',
      email: 'client@example.com',
      phone: '+1234567890',
      leadNumber: 'LN0001'
    };
    
    console.log('Template found:', template ? 'Yes' : 'No');
    if (template) {
      console.log('Template country:', template.country);
      console.log('Template styles:', template.styles);
    }
    
    // Get HTML content
    const htmlContent = pdfGenerator.generateQuoteHTML(sampleQuote, sampleLead, organization, template);
    
    console.log('HTML content length:', htmlContent.length);
    console.log('HTML content preview:', htmlContent.substring(0, 200));
    console.log('Page structure check:');
    console.log('- Front page found:', htmlContent.includes('front-page'));
    console.log('- Middle page found:', htmlContent.includes('middle-page'));
    console.log('- Last page found:', htmlContent.includes('last-page'));
    console.log('- Content wrapper found:', htmlContent.includes('content-wrapper'));
    console.log('Background images check:');
    console.log('- Front background:', template?.frontPageBackground ? 'Set' : 'Not set');
    console.log('- Middle background:', template?.middlePageBackground ? 'Set' : 'Not set');
    console.log('- Last background:', template?.lastPageBackground ? 'Set' : 'Not set');
    
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ message: 'Error generating preview: ' + error.message });
  }
});

module.exports = router;
