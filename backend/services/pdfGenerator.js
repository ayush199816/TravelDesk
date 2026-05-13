const puppeteer = require('puppeteer');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');
const Organization = require('../models/Organization');
const PDFTemplate = require('../models/PDFTemplate');
const QuoteTemplate = require('../models/QuoteTemplate');

class PDFGenerator {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generateQuotePDF(quote, lead, organization) {
    try {
      await this.initBrowser();
      const page = await this.browser.newPage();
      
      // Set page timeouts for better handling of large content
      page.setDefaultTimeout(60000); // 60 seconds
      page.setDefaultNavigationTimeout(60000); // 60 seconds
      
      // Allow images to load for PDF generation
      await page.setBypassCSP(true); // Bypass Content Security Policy
      await page.setViewport({ width: 1200, height: 800 });
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Simplified template finding - use default template to avoid errors
      let quoteTemplate = null;
      
      try {
        // Try to find a template for this organization and country
        quoteTemplate = await QuoteTemplate.findOne({
          organization: organization._id,
          country: quote.country || 'Default',
          isActive: true
        }).sort({ createdAt: -1 });
      } catch (templateError) {
        console.log('Template lookup failed, using default:', templateError.message);
      }
      
      // If no template found, create a simple default template object
      if (!quoteTemplate) {
        quoteTemplate = {
          name: 'Default Template',
          colors: {
            primary: '#007bff',
            secondary: '#6c757d',
            accent: '#28a745',
            background: '#ffffff',
            text: '#333333'
          },
          fonts: {
            heading: 'Arial, sans-serif',
            body: 'Arial, sans-serif'
          },
          fontSizes: {
            heading: 24,
            subheading: 18,
            body: 14,
            small: 12
          },
          country: quote.country || 'Default'
        };
        console.log('Using built-in default template');
      } else {
        console.log(`Using template: ${quoteTemplate.name} for country: ${quote.country}`);
      }

      // Get the PDF template for this country (with error handling)
      let template = null;
      try {
        template = await PDFTemplate.findOne({
          organization: organization._id,
          country: quote.country,
          isActive: true
        });
      } catch (templateError) {
        console.log('PDF template lookup failed:', templateError.message);
      }

      // Use basic quote data if population fails
      let populatedQuote = quote;
      try {
        populatedQuote = await this.populateQuoteData(quote);
      } catch (populateError) {
        console.log('Quote population failed, using basic data:', populateError.message);
      }
      
      // Generate HTML content
      const htmlContent = this.generateQuoteHTML(populatedQuote, lead, organization, template, quoteTemplate);
      
      // Log content size and background images for debugging
      console.log('HTML content length:', htmlContent.length);
      console.log('Template background images:', {
        front: template?.frontPageBackground,
        middle: template?.middlePageBackground,
        last: template?.lastPageBackground
      });
      
      // If content is very large, add a small delay
      if (htmlContent.length > 500000) {
        console.log('Large content detected, adding delay...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Set content with better error handling
      try {
        await page.setContent(htmlContent, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        console.log('✅ Content set successfully');
      } catch (setContentError) {
        console.log('❌ setContent failed:', setContentError.message);
        try {
          await page.setContent(htmlContent, { 
            waitUntil: 'load',
            timeout: 30000
          });
          console.log('✅ Content set with load event');
        } catch (loadError) {
          console.log('❌ Both setContent attempts failed, trying minimal content...');
          // Try with minimal content as last resort
          const minimalHTML = `
            <html>
              <body>
                <h1>Quote #${quote.quoteNumber || 'N/A'}</h1>
                <p>Lead: ${lead?.name || 'N/A'}</p>
                <p>Country: ${quote.country || 'N/A'}</p>
                <p>Amount: ${quote.totalAmount || 'N/A'} ${quote.currency || 'USD'}</p>
              </body>
            </html>
          `;
          await page.setContent(minimalHTML, { timeout: 10000 });
          console.log('✅ Minimal content set');
        }
      }
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate PDF options
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      };

      // Generate PDF with error handling
      let pdfBuffer;
      try {
        pdfBuffer = await page.pdf(pdfOptions);
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length);
      } catch (pdfError) {
        console.error('❌ PDF generation failed:', pdfError.message);
        throw new Error('Failed to generate PDF: ' + pdfError.message);
      } finally {
        // Always close the page
        try {
          await page.close();
          console.log('✅ Page closed successfully');
        } catch (closeError) {
          console.log('⚠️ Error closing page:', closeError.message);
        }
      }
      
      return pdfBuffer;
    } catch (error) {
      console.error('❌ Error in PDF generation process:', error.message);
      throw error;
    }
  }

  async populateQuoteData(quote) {
    try {
      // Create a deep copy of the quote to avoid modifying the original
      const populatedQuote = JSON.parse(JSON.stringify(quote));
      
      // Populate sightseeing data for each day
      if (populatedQuote.days && populatedQuote.days.length > 0) {
        for (let day of populatedQuote.days) {
          if (day.sightseeings && day.sightseeings.length > 0) {
            for (let sightseeingItem of day.sightseeings) {
              if (sightseeingItem.sightseeing && typeof sightseeingItem.sightseeing === 'string') {
                // Fetch sightseeing details from database
                const sightseeingDetails = await Sightseeing.findById(sightseeingItem.sightseeing);
                if (sightseeingDetails) {
                  sightseeingItem.sightseeing = sightseeingDetails.toObject();
                  console.log(`Populated sightseeing: ${sightseeingDetails.name}`, {
                    imagesCount: sightseeingDetails.images ? sightseeingDetails.images.length : 0,
                    firstImage: sightseeingDetails.images && sightseeingDetails.images.length > 0 ? sightseeingDetails.images[0] : 'none'
                  });
                }
              }
            }
          }
        }
      }
      
      return populatedQuote;
    } catch (error) {
      console.error('Error populating quote data:', error);
      return quote; // Return original quote if population fails
    }
  }

  generateQuoteHTML(quote, lead, organization, template, quoteTemplate) {
    console.log('=== HTML GENERATION DEBUG ===');
    console.log('Quote country:', quote.country);
    console.log('QuoteTemplate received:', quoteTemplate ? 'YES' : 'NO');
    if (quoteTemplate) {
      console.log('QuoteTemplate name:', quoteTemplate.name);
      console.log('QuoteTemplate country:', quoteTemplate.country);
      console.log('QuoteTemplate primary color:', quoteTemplate.colors?.primary);
      console.log('QuoteTemplate secondary color:', quoteTemplate.colors?.secondary);
    }
    
    const styles = template?.styles || this.getDefaultStyles();
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote - ${quote._id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Helvetica:wght@400;700&display=swap');
        
        body {
          font-family: '${styles.text.font}', Arial, sans-serif;
          font-size: ${styles.text.size}px;
          color: ${styles.text.color};
          background-color: ${styles.text.backgroundColor};
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        
        .page {
          width: 210mm;
          height: 297mm;
          margin: 0;
          padding: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          box-sizing: border-box;
        }
        
        @media print {
          .page {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100vh;
          }
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
        
        .front-page {
          background-image: url('${template?.frontPageBackground || 'none'}');
        }
        
        .middle-page {
          background-image: url('${template?.middlePageBackground || 'none'}');
        }
        
        .last-page {
          background-image: url('${template?.lastPageBackground || 'none'}');
        }
        
        .content-wrapper {
          position: absolute;
          top: 30px;
          left: 30px;
          right: 30px;
          bottom: 30px;
          background-color: transparent;
          padding: 20px;
          overflow-y: auto;
          color: white;
                  }
        
        .page-break {
          page-break-before: always;
        }
        
        h1 {
          font-family: '${styles.heading.font}', Arial, sans-serif;
          font-size: ${Math.min(styles.heading.size, 28)}px;
          color: white;
          background-color: transparent;
          padding: 10px 0;
          margin: 20px 0 15px 0;
          text-align: center;
                  }
        
        h2 {
          font-family: '${styles.subheading.font}', Arial, sans-serif;
          font-size: ${Math.min(styles.subheading.size, 22)}px;
          color: white;
          background-color: transparent;
          padding: 8px 0;
          margin: 18px 0 12px 0;
          text-align: center;
                  }
        
        p {
          margin: 6px 0;
          line-height: 1.5;
          font-size: ${Math.min(styles.text.size, 16)}px;
          color: white;
                  }
        
        table {
          font-family: '${styles.table.font}', Arial, sans-serif;
          font-size: ${Math.min(styles.table.size, 14)}px;
          color: ${quoteTemplate.table.textColor};
          background-color: ${quoteTemplate.table.backgroundColor};
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
          border-radius: ${quoteTemplate.table.borderRadius}px;
          overflow: hidden;
        }
        
        th, td {
          border: 1px solid ${quoteTemplate.borders.table};
          padding: ${quoteTemplate.table.padding};
          text-align: left;
        }
        
        th {
          background-color: ${quoteTemplate.table.headerBackgroundColor};
          color: ${quoteTemplate.table.headerTextColor};
          font-weight: bold;
          font-size: ${Math.min(styles.table.size, quoteTemplate.table.headerFontSize)}px;
        }
        
        .total-price {
          background-color: ${quoteTemplate.colors.primary}20;
          font-weight: bold;
          font-size: 18px;
          color: ${quoteTemplate.colors.primary};
        }
        
        .total-price td {
          padding: 12px 8px;
          border: 2px solid ${quoteTemplate.colors.primary};
        }
        
        .header-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        
        .company-info {
          text-align: right;
        }
        
        .quote-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        
        .pricing-breakdown {
          margin: 20px 0;
        }
        
        .total-row {
          font-weight: bold;
          font-size: 16px;
          border-top: 2px solid #333;
          padding-top: 10px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .front-page {
          background-image: url('${template?.frontPageBackground || 'none'}');
        }
        
        .middle-page {
          background-image: url('${template?.middlePageBackground || 'none'}');
        }
        
        .last-page {
          background-image: url('${template?.lastPageBackground || 'none'}');
        }
        
        .content-wrapper {
          position: absolute;
          top: 30px;
          left: 30px;
          right: 30px;
          bottom: 30px;
          background-color: transparent;
          padding: 20px;
          overflow-y: auto;
          color: white;
                  }
        
        .page-break {
          page-break-before: always;
        }
        
        h1 {
          font-family: '${styles.heading.font}', Arial, sans-serif;
          font-size: ${Math.min(styles.heading.size, 28)}px;
          color: white;
          background-color: transparent;
          padding: 10px 0;
          margin: 20px 0 15px 0;
          text-align: center;
                  }
        
        h2 {
          font-family: '${styles.subheading.font}', Arial, sans-serif;
          font-size: ${Math.min(styles.subheading.size, 22)}px;
          color: white;
          background-color: transparent;
          padding: 8px 0;
          margin: 18px 0 12px 0;
          text-align: center;
                  }
        
        p {
          margin: 6px 0;
          line-height: 1.5;
          font-size: ${Math.min(styles.text.size, 16)}px;
          color: white;
                  }
        
        table {
          font-family: '${styles.table.font}', Arial, sans-serif;
          font-size: ${Math.min(styles.table.size, 14)}px;
          color: ${quoteTemplate.table.textColor};
          background-color: ${quoteTemplate.table.backgroundColor};
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
          border-radius: ${quoteTemplate.table.borderRadius}px;
          overflow: hidden;
        }
        
        th, td {
          border: 1px solid ${quoteTemplate.borders.table};
          padding: ${quoteTemplate.table.padding};
          text-align: left;
        }
        
        th {
          background-color: ${quoteTemplate.table.headerBackgroundColor};
          color: ${quoteTemplate.table.headerTextColor};
          font-weight: bold;
          font-size: ${Math.min(styles.table.size, quoteTemplate.table.headerFontSize)}px;
        }
        
        .total-price {
          background-color: ${quoteTemplate.colors.primary}20;
          font-weight: bold;
          font-size: 18px;
          color: ${quoteTemplate.colors.primary};
        }
        
        .total-price td {
          padding: 12px 8px;
          border: 2px solid ${quoteTemplate.colors.primary};
        }
      </style>
    </head>
  <body>
    <!-- Front Page - Background Only -->
    <div class="page front-page">
      <!-- No content, only background image -->
    </div>
    
    <!-- Page 2: Quote Letter -->
    <div class="page middle-page page-break">
      <div class="content-wrapper">
        <div style="margin-bottom: 20px;">
          <p style="font-size: 18px; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.header};">Dear <strong style="color: ${quoteTemplate.colors.primary};">${lead.name}</strong>,</p>
          
          <p style="font-size: 16px; color: ${quoteTemplate.colors.text}; line-height: 1.6; font-family: ${quoteTemplate.fonts.body};">
            <strong style="color: ${quoteTemplate.colors.secondary};">${quoteTemplate.messages.greeting}</strong> <strong style="color: ${quoteTemplate.colors.primary};">${organization.name}</strong>,<br/>
            ${quoteTemplate.messages.greetingMessage}
          </p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; border: 2px solid ${quoteTemplate.borders?.package === 'transparent' ? 'transparent' : (quoteTemplate.borders?.package || '#e9ecef')}; border-radius: 8px; background-color: ${quoteTemplate.backgrounds?.package === 'transparent' ? 'transparent' : (quoteTemplate.backgrounds?.package || '#f8f9fa')}; box-shadow: 0 4px 12px ${quoteTemplate.shadows?.package === 'transparent' ? 'transparent' : `${quoteTemplate.shadows?.package || '#000000'}${Math.round((quoteTemplate.shadows?.packageOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`};">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3); font-weight: bold; width: 40%;">DESTINATION</td>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3); text-transform: uppercase;">${quote.country}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3); font-weight: bold;">PAX</td>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3);">${quote.adultPax} Adults${quote.childPax > 0 ? `, ${quote.childPax} Children` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3); font-weight: bold;">START DATE</td>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3);">${new Date(quote.travelStartDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3); font-weight: bold;">TRIP ID</td>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3);">${lead.leadNumber || '1848068'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3); font-weight: bold;">DURATION</td>
              <td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.3);">${Math.ceil((new Date(quote.travelEndDate) - new Date(quote.travelStartDate)) / (1000 * 60 * 60 * 24))} Nights/${Math.ceil((new Date(quote.travelEndDate) - new Date(quote.travelStartDate)) / (1000 * 60 * 60 * 24)) + 1} Days</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">QUOTE PRICE</td>
              <td style="padding: 10px;">
                <div style="margin-bottom: 10px; font-size: 14px;">
                  <strong>Price (${quote.currency}):</strong><br/>
                  ${(() => {
                    // Correct calculation: use total amount (including markup) for per-person pricing
                    const totalAmount = (quote.total || 0) - (quote.flightTotal || 0); // Exclude flights, include markup
                    const totalPassengers = quote.adultPax + (quote.childPax * 0.7); // Child counts as 0.7 adult
                    const adultPrice = totalPassengers > 0 ? Math.round(totalAmount / totalPassengers) : 0;
                    const childPrice = Math.round(adultPrice * 0.7);
                    
                    console.log('Debug - Corrected calculation:', {
                      total: quote.total,
                      flightTotal: quote.flightTotal,
                      totalAmount: totalAmount,
                      markupAmount: quote.markupAmount,
                      adultPax: quote.adultPax,
                      childPax: quote.childPax,
                      totalPassengers: totalPassengers,
                      adultPrice: adultPrice,
                      childPrice: childPrice,
                      checkTotal: (adultPrice * quote.adultPax) + (childPrice * quote.childPax) + (quote.flightTotal || 0)
                    });
                    
                    // Fallback: if childPax is 0 or undefined, use only adults
                    const finalAdultPrice = (quote.childPax > 0 && totalPassengers > quote.adultPax) ? adultPrice : Math.round(totalAmount / quote.adultPax);
                    const finalChildPrice = Math.round(finalAdultPrice * 0.7);
                    
                    return quote.adultPax > 0 && finalAdultPrice > 0 ? `
                      * ${finalAdultPrice.toLocaleString('en-IN')} / Person (Package) x ${quote.adultPax} Pax<br/>
                    ` : '';
                  })()}
                  ${(() => {
                    // Use same calculation as above
                    const totalAmount = (quote.total || 0) - (quote.flightTotal || 0);
                    const totalPassengers = quote.adultPax + (quote.childPax * 0.7);
                    const adultPrice = totalPassengers > 0 ? Math.round(totalAmount / totalPassengers) : 0;
                    const childPrice = Math.round(adultPrice * 0.7);
                    
                    // Fallback: if childPax is 0 or undefined, use only adults
                    const finalAdultPrice = (quote.childPax > 0 && totalPassengers > quote.adultPax) ? adultPrice : Math.round(totalAmount / quote.adultPax);
                    const finalChildPrice = Math.round(finalAdultPrice * 0.7);
                    
                    return quote.childPax > 0 && finalChildPrice > 0 ? `
                      * ${finalChildPrice.toLocaleString('en-IN')} / Child (Package) x ${quote.childPax} Child<br/>
                    ` : '';
                  })()}
                </div>
                <div style="font-size: 18px; color: ${quoteTemplate.colors.primary}; font-weight: bold; margin-top: 10px;">
                  <strong>Total: ${quote.currency} ${quote.total?.toLocaleString('en-IN') || '0'}/- (inc. Tax ${quote.markupType === 'percentage' ? quote.markupValue + '%' : '2.5'}%)</strong>
                </div>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="font-style: italic;">We look forward to serving you and making your trip memorable!</p>
          <p style="margin-top: 20px;"><strong>Best Regards,</strong><br/>
          ${organization.name}<br/>
          ${organization.phone || ''}<br/>
          ${organization.email || ''}</p>
        </div>
      </div>
    </div>
    
    <!-- Page 3: Accommodation Details -->
    ${quote.hotels && quote.hotels.length > 0 ? `
      <div class="page middle-page page-break">
        <div class="content-wrapper">
          <h1 style="color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.header}; font-size: ${quoteTemplate.fontSizes.header}px;">Accommodation Details</h1>
          ${(() => {
            // Group consecutive nights by hotel
            const hotelStays = [];
            
            quote.hotels.forEach(hotel => {
              const hotelName = hotel.name || hotel.hotel?.name || 'N/A';
              const cityName = hotel.city || hotel.hotel?.city || 'N/A';
              const starRating = hotel.starRating || hotel.hotel?.starRating || 0;
              // Use images from populated hotel reference first, then from quote data
              const hotelImage = (hotel.hotel?.images && hotel.hotel.images.length > 0) 
                ? hotel.hotel.images[0] 
                : (hotel.images && hotel.images.length > 0 
                  ? hotel.images[0] 
                  : '');
              
              const roomsData = hotel.rooms || [];
              roomsData.forEach(room => {
                const checkInDate = room.checkIn ? new Date(room.checkIn).toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                }) : 'N/A';
                
                const nights = room.nights || 1;
                
                hotelStays.push({
                  hotelName,
                  cityName,
                  starRating,
                  hotelImage,
                  numberOfRooms: room.numberOfRooms || 1,
                  roomName: room.roomName || 'Standard Room',
                  checkInDate,
                  nights,
                  checkIn: new Date(room.checkIn)
                });
              });
            });
            
            // Sort stays by check-in date
            hotelStays.sort((a, b) => a.checkIn - b.checkIn);
            
            return hotelStays.map((stay, index) => {
              // Generate night boxes using template nightBox settings
              const nightBoxes = [];
              const showNightBox = quoteTemplate.hotel?.nightBox?.showNightBox !== false;
              
              if (showNightBox) {
                for (let i = 1; i <= stay.nights; i++) {
                  nightBoxes.push(`
                    <div style="
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      width: 35px;
                      height: 35px;
                      background-color: ${quoteTemplate.hotel?.nightBox?.backgroundColor || '#ffffff'};
                      border: ${quoteTemplate.hotel?.nightBox?.borderWidth || 1}px solid ${quoteTemplate.hotel?.nightBox?.borderColor || '#dee2e6'};
                      border-radius: ${quoteTemplate.hotel?.nightBox?.borderRadius || 6}px;
                      margin-right: 8px;
                      margin-bottom: 8px;
                      font-size: ${quoteTemplate.hotel?.nightBox?.titleFontSize || 12}px;
                      font-weight: bold;
                      color: ${quoteTemplate.hotel?.nightBox?.titleColor || '#495057'};
                      font-family: ${quoteTemplate.hotel?.nightBox?.titleFont || 'Arial, sans-serif'};
                    ">
                      ${i}N
                    </div>
                  `);
                }
              }
              
              // Use template hotel box settings
              const showHotelBox = quoteTemplate.hotel?.showBox !== false;
              const hotelBoxStyles = showHotelBox ? `
                padding: 20px;
                border: ${quoteTemplate.hotel?.borderWidth || 1}px solid ${quoteTemplate.hotel?.borderColor || '#e9ecef'};
                border-radius: ${quoteTemplate.hotel?.borderRadius || 8}px;
                background-color: ${quoteTemplate.hotel?.backgroundColor || '#f8f9fa'};
                margin-bottom: 30px;
              ` : `
                margin-bottom: 30px;
              `;
              
              return `
                <div style="${hotelBoxStyles}">
                  <!-- Night boxes at the top -->
                  ${showNightBox && nightBoxes.length > 0 ? `
                    <div style="display: flex; flex-wrap: wrap; margin-bottom: 15px;">
                      ${nightBoxes.join('')}
                    </div>
                  ` : ''}
                  
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                      ${stay.checkInDate !== 'N/A' ? `
                        <div style="font-size: ${quoteTemplate.hotel?.bodyFontSize || 14}px; color: ${quoteTemplate.hotel?.bodyColor || '#666666'}; margin-bottom: 10px; font-family: ${quoteTemplate.hotel?.bodyFont || 'Arial, sans-serif'};">
                          Check-in: ${stay.checkInDate}
                        </div>
                      ` : ''}
                      <div style="font-size: ${quoteTemplate.hotel?.titleFontSize || 18}px; font-weight: bold; color: ${quoteTemplate.hotel?.titleColor || '#333333'}; margin-bottom: 5px; font-family: ${quoteTemplate.hotel?.titleFont || 'Arial, sans-serif'};">
                        ${stay.hotelName}
                      </div>
                      <div style="font-size: ${quoteTemplate.hotel?.bodyFontSize || 14}px; color: ${quoteTemplate.hotel?.bodyColor || '#666666'}; margin-bottom: 8px; font-family: ${quoteTemplate.hotel?.bodyFont || 'Arial, sans-serif'};">
                        ${stay.cityName}
                      </div>
                      ${stay.starRating ? `
                        <div style="color: #ffd700; margin-bottom: 15px;">
                          ${'★'.repeat(stay.starRating)}${'☆'.repeat(5 - stay.starRating)}
                        </div>
                      ` : ''}
                      <div style="font-size: ${quoteTemplate.hotel?.bodyFontSize || 14}px; color: ${quoteTemplate.hotel?.bodyColor || '#666666'}; font-family: ${quoteTemplate.hotel?.bodyFont || 'Arial, sans-serif'};">
                        ${stay.numberOfRooms} × ${stay.roomName}
                      </div>
                    </div>
                    
                    ${stay.hotelImage ? `
                      <div style="margin-left: 15px; flex-shrink: 0;">
                        <img src="${stay.hotelImage}" alt="${stay.hotelName}" style="max-width: ${quoteTemplate.hotel?.imageWidth || 120}px; max-height: ${quoteTemplate.hotel?.imageHeight || 80}px; border-radius: ${quoteTemplate.hotel?.imageBorderRadius || 6}px; object-fit: cover; border: 1px solid ${quoteTemplate.hotel?.borderColor || 'rgba(255, 255, 255, 0.3)'};" />
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('');
          })()}
        </div>
      </div>
    ` : ''}
    
    <!-- Day-wise Summary Table -->
    ${quote.days && quote.days.length > 0 ? `
    <div class="page middle-page page-break">
      <div class="content-wrapper">
        <div style="margin-bottom: 30px;">
          <h2 style="color: ${quoteTemplate.colors.text}; font-size: 24px; font-family: ${quoteTemplate.fonts.header}; margin-bottom: 20px; text-align: center;">Day-wise Summary</h2>
          
          <div style="background-color: ${quoteTemplate.backgrounds.activity}; border-radius: 8px; border: 1px solid ${quoteTemplate.borders.activity}; overflow: hidden; box-shadow: 0 2px 6px ${quoteTemplate.shadows?.activity === 'transparent' ? 'transparent' : `${quoteTemplate.shadows?.activity || '#000000'}${Math.round((quoteTemplate.shadows?.activityOpacity || 0.05) * 255).toString(16).padStart(2, '0')}`};">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: ${quoteTemplate.colors.primary}20;">
                  <th style="padding: 12px; text-align: center; color: ${quoteTemplate.colors.primary}; font-weight: bold; font-family: ${quoteTemplate.fonts.header}; width: 15%;">Day</th>
                  <th style="padding: 12px; text-align: left; color: ${quoteTemplate.colors.primary}; font-weight: bold; font-family: ${quoteTemplate.fonts.header}; width: 50%;">Activities & Transfers</th>
                  <th style="padding: 12px; text-align: center; color: ${quoteTemplate.colors.primary}; font-weight: bold; font-family: ${quoteTemplate.fonts.header}; width: 35%;">Pax & Vehicle</th>
                </tr>
              </thead>
              <tbody>
                ${quote.days.map((day, index) => {
                  const activities = day.sightseeings || [];
                  const transfers = day.transfers || [];
                  
                  // Get activity names
                  const activityNames = activities.map((item, i) => {
                    const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 
                      ? item.sightseeing 
                      : { name: item.name || `Activity ${i + 1}` };
                    return sightseeing.name;
                  });
                  
                  // Get transfer details
                  const transferDetails = transfers.map((transfer, i) => {
                    const fromLocation = transfer.fromLocation || transfer.transfer?.fromLocation || 'Pickup';
                    const toLocation = transfer.toLocation || transfer.transfer?.toLocation || 'Drop-off';
                    const vehicleType = transfer.vehicleType || transfer.transfer?.vehicleType || 'Sedan';
                    return `Transfer: ${fromLocation} → ${toLocation} (${vehicleType})`;
                  });
                  
                  // Combine activities and transfers
                  const allItems = [...activityNames, ...transferDetails];
                  const itemsText = allItems.length > 0 ? allItems.join(' + ') : 'Free day for leisure';
                  
                  // Format passenger count with vehicle
                  const formatPaxAndVehicle = () => {
                    const adultPax = quote.adultPax || 0;
                    const childPax = quote.childPax || 0;
                    const hasChildActivity = activities.some(item => item.childPrice > 0 || item.includeChild === true);
                    
                    let paxText = '';
                    if (adultPax > 0 && childPax > 0 && hasChildActivity) {
                      paxText = `${adultPax}A+${childPax}C`;
                    } else if (adultPax > 0) {
                      paxText = `${adultPax}A`;
                    }
                    
                    // Get vehicle type from first transfer or activity
                    let vehicleType = 'Sedan'; // default
                    if (transfers.length > 0) {
                      vehicleType = transfers[0].vehicleType || transfers[0].transfer?.vehicleType || 'Sedan';
                    } else if (activities.length > 0) {
                      vehicleType = activities[0].vehicleType || 'Sedan';
                    }
                    
                    return paxText ? `${paxText} (${vehicleType})` : vehicleType;
                  };
                  
                  return `
                    <tr style="${index % 2 === 0 ? `background-color: ${quoteTemplate.colors.background};` : ''} border-bottom: 1px solid ${quoteTemplate.borders.activity};">
                      <td style="padding: 12px; text-align: center; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body}; vertical-align: top;">
                        <div style="font-size: 16px; font-weight: bold; color: ${quoteTemplate.colors.primary};">Day ${day.dayNumber}</div>
                        <div style="font-size: 11px; color: ${quoteTemplate.colors.muted}; margin-top: 2px;">${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </td>
                      <td style="padding: 12px; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body}; vertical-align: top;">
                        ${itemsText}
                      </td>
                      <td style="padding: 12px; text-align: center; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body}; vertical-align: top;">
                        <span style="background-color: ${quoteTemplate.colors.primary}20; color: ${quoteTemplate.colors.primary}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                          � ${formatPaxAndVehicle()}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- Day-wise Itinerary - Activities flow across pages -->
    ${quote.days && quote.days.length > 0 ? (() => {
      let allDaysContent = [];
      
      quote.days.forEach((day, dayIndex) => {
        let dailyActivityIndex = 1; // Reset for each day
        // Collect images for this day
        let dayImages = [];
        if (day.sightseeings) {
          day.sightseeings.forEach((item) => {
            const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 
              ? item.sightseeing 
              : { 
                  name: item.name || `Activity`,
                  images: item.images || []
                };
            
            const sightseeingImages = sightseeing.images || [];
            const itemImages = item.images || [];
            const populatedImages = item.sightseeing?.images || [];
            
            dayImages.push(...sightseeingImages, ...itemImages, ...populatedImages);
          });
        }
        dayImages = [...new Set(dayImages)];
        
        const activities = day.sightseeings || [];
        
        // Add day header only once per day (on first page of that day)
        const dayHeader = `
          <!-- Day ${day.dayNumber} Header -->
          <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
            <div style="
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, ${quoteTemplate.colors.primary} 0%, ${quoteTemplate.colors.secondary} 100%);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 15px;
              margin-top: 5px;
              box-shadow: 0 3px 12px rgba(102, 126, 234, 0.25);
            ">
              <div style="color: white; font-size: 14px; font-weight: bold;">Day ${day.dayNumber}</div>
            </div>
            <div style="flex: 1;">
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div style="font-size: 16px; line-height: 1.6; color: #333;">
                ${(() => {
                  const dayActivities = [];
                  
                  // Interleave activities and transfers in sequence
                  let sightseeingIndex = 0;
                  let transferIndex = 0;
                  let totalItems = Math.max(
                    day.sightseeings?.length || 0, 
                    day.transfers?.length || 0
                  );
                  
                  for (let i = 0; i < totalItems; i++) {
                    // Add sightseeing if exists
                    if (day.sightseeings && day.sightseeings[i]) {
                      const sightseeing = day.sightseeings[i].sightseeing && typeof day.sightseeings[i].sightseeing === 'object' 
                        ? day.sightseeings[i].sightseeing 
                        : { name: day.sightseeings[i].name || `Activity ${i + 1}` };
                      dayActivities.push(sightseeing.name);
                    }
                    
                    // Add transfer if exists
                    if (day.transfers && day.transfers[i]) {
                      const transfer = day.transfers[i];
                      const fromLocation = transfer.fromLocation || transfer.transfer?.fromLocation || 'Pickup';
                      const toLocation = transfer.toLocation || transfer.transfer?.toLocation || 'Drop-off';
                      dayActivities.push(`Transfer (${fromLocation} → ${toLocation})`);
                    }
                  }
                  
                  // Add any remaining sightseeings
                  if (day.sightseeings && day.sightseeings.length > totalItems) {
                    for (let i = totalItems; i < day.sightseeings.length; i++) {
                      const sightseeing = day.sightseeings[i].sightseeing && typeof day.sightseeings[i].sightseeing === 'object' 
                        ? day.sightseeings[i].sightseeing 
                        : { name: day.sightseeings[i].name || `Activity ${i + 1}` };
                      dayActivities.push(sightseeing.name);
                    }
                  }
                  
                  // Add any remaining transfers
                  if (day.transfers && day.transfers.length > totalItems) {
                    for (let i = totalItems; i < day.transfers.length; i++) {
                      const transfer = day.transfers[i];
                      const fromLocation = transfer.fromLocation || transfer.transfer?.fromLocation || 'Pickup';
                      const toLocation = transfer.toLocation || transfer.transfer?.toLocation || 'Drop-off';
                      dayActivities.push(`Transfer (${fromLocation} → ${toLocation})`);
                    }
                  }
                  
                  return dayActivities.length > 0 ? dayActivities.join(' + ') : 'Free day for leisure and exploration';
                })()}
              </div>
            </div>
          </div>
        `;
        
        if (activities.length === 0) {
          // Free day - add complete content
          allDaysContent.push(`
            <div class="page middle-page page-break">
              <div class="content-wrapper">
                ${dayHeader}
                <div style="text-align: center; padding: 60px 40px; color: #666;">
                  <div style="font-size: 64px; margin-bottom: 15px;">🌴</div>
                  <div style="font-size: 24px; font-weight: bold; color: #333;">Free Day</div>
                  <div style="font-size: 16px; margin-top: 8px; color: #666;">Relax and explore at your own pace</div>
                </div>
              </div>
            </div>
          `);
        } else {
          // Group activities into pages of 2
          for (let i = 0; i < activities.length; i += 2) {
            const pageActivities = activities.slice(i, i + 2);
            const isFirstPageOfThisDay = i === 0;
            const isLastPageOfThisDay = i + 2 >= activities.length;
            const isVeryLastPage = dayIndex === quote.days.length - 1 && isLastPageOfThisDay;
            
            const pageContent = pageActivities.map((item, pageIndex) => {
              const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 
                ? item.sightseeing 
                : { 
                  name: item.name || `Activity ${globalActivityIndex}`,
                  description: item.sightseeingDescription || item.description || 'Enjoy this amazing activity.',
                  duration: item.sightseeingDuration || item.duration || 'Flexible timing',
                  location: item.sightseeingLocation || item.location || 'To be confirmed',
                  images: item.images || []
                };
              
              // Helper function to format passenger count
              const formatPassengerCount = (item) => {
                const adultPax = quote.adultPax || 0;
                const childPax = quote.childPax || 0;
                const hasChildActivity = item.childPrice > 0 || item.includeChild === true;
                
                if (adultPax > 0 && childPax > 0 && hasChildActivity) {
                  return `${adultPax}A+${childPax}C`;
                } else if (adultPax > 0) {
                  return `${adultPax}A`;
                } else {
                  return '';
                }
              };
              
              const activityContent = `
                <div style="margin-bottom: 20px;">
                  <div style="padding: 15px; background-color: ${quoteTemplate.backgrounds.activity}; border-radius: 8px; border: 1px solid ${quoteTemplate.borders.activity}; box-shadow: 0 2px 6px ${quoteTemplate.shadows?.activity === 'transparent' ? 'transparent' : `${quoteTemplate.shadows?.activity || '#000000'}${Math.round((quoteTemplate.shadows?.activityOpacity || 0.05) * 255).toString(16).padStart(2, '0')}`};">
                    <div style="display: flex; align-items: start;">
                      <div style="
                        width: 32px;
                        height: 32px;
                        background: linear-gradient(135deg, ${quoteTemplate.colors.primary} 0%, ${quoteTemplate.colors.secondary} 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 12px;
                        flex-shrink: 0;
                        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
                      ">
                        <div style="color: white; font-size: 14px; font-weight: bold;">${dailyActivityIndex}</div>
                      </div>
                      <div style="flex: 1;">
                        <h3 style="margin: 0 0 6px 0; font-size: ${quoteTemplate.fontSizes.activity}px; color: ${quoteTemplate.colors.text}; font-weight: bold; font-family: ${quoteTemplate.fonts.activity};">${sightseeing.name}</h3>
                        <p style="margin: 0 0 8px 0; font-size: ${quoteTemplate.fontSizes.description}px; line-height: 1.4; color: ${quoteTemplate.colors.muted}; font-family: ${quoteTemplate.fonts.body};">${sightseeing.description || item.sightseeingDescription || 'Experience this wonderful activity with professional guidance and create lasting memories.'}</p>
                        <div style="display: flex; gap: 15px; font-size: ${quoteTemplate.fontSizes.details}px; color: ${quoteTemplate.colors.muted}; padding-top: 6px; border-top: 1px solid ${quoteTemplate.borders.activity}; font-family: ${quoteTemplate.fonts.body};">
                          <span style="display: flex; align-items: center;">📍 ${sightseeing.location || 'Location TBD'}</span>
                          <span style="display: flex; align-items: center;">⏱️ ${sightseeing.duration || 'Flexible'}</span>
                          ${formatPassengerCount(item) ? `<span style="display: flex; align-items: center; background-color: ${quoteTemplate.colors.primary}20; color: ${quoteTemplate.colors.primary}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">👥 ${formatPassengerCount(item)}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              
              dailyActivityIndex++;
              return activityContent;
            }).join('');
            
            allDaysContent.push(`
              <div class="page middle-page ${!isVeryLastPage ? 'page-break' : ''}">
                <div class="content-wrapper">
                  ${isFirstPageOfThisDay ? dayHeader : ''}
                  ${isFirstPageOfThisDay && dayImages.length > 0 ? `
                    <div style="margin-bottom: 20px; width: 100%; height: 200px; overflow: hidden; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);">
                      <img src="${dayImages[0]}" alt="Day ${day.dayNumber} Activities" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                  ` : ''}
                  ${pageContent}
                </div>
              </div>
            `);
          }
        }
      });
      
      return allDaysContent.join('');
    })() : ''}
    
    <!-- Payment Details Page -->
    <div class="page middle-page page-break">
      <div class="content-wrapper">
        <h1 style="font-family: ${quoteTemplate.fonts.header}; color: ${quoteTemplate.colors.text};">Payment Details</h1>
        
        <div style="margin: 30px 0; padding: 25px; border: 2px solid ${quoteTemplate.borders.payment}; border-radius: 12px; background: ${quoteTemplate.backgrounds.payment}; box-shadow: 0 4px 12px ${quoteTemplate.shadows?.payment === 'transparent' ? 'transparent' : `${quoteTemplate.shadows?.payment || '#000000'}${Math.round((quoteTemplate.shadows?.paymentOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`};">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 18px; color: ${quoteTemplate.colors.muted}; margin-bottom: 10px; font-family: ${quoteTemplate.fonts.body};">Total Amount</div>
            <div style="font-size: 36px; font-weight: bold; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.header};">
              ${(() => {
                // Calculate package cost: subtotal + markupAmount
                const packageCost = (quote.subtotal || 0) + (quote.markupAmount || 0);
                // Calculate tax: 2.5% of package cost
                const taxAmount = Math.round(packageCost * 0.025);
                // Calculate total: package cost + tax
                const totalAmount = packageCost + taxAmount;
                return `${quote.currency || 'USD'} ${totalAmount.toLocaleString('en-IN')}`;
              })()}
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            ${(() => {
              // Calculate package cost: subtotal + markupAmount
              const packageCost = (quote.subtotal || 0) + (quote.markupAmount || 0);
              // Calculate tax: 2.5% of package cost
              const taxAmount = Math.round(packageCost * 0.025);
              // Calculate total: package cost + tax
              const totalAmount = packageCost + taxAmount;
              
              return `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Package Cost</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${quote.currency || 'USD'} ${packageCost.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Tax (2.5%)</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${quote.currency || 'USD'} ${taxAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr style="font-weight: bold; background-color: ${quoteTemplate.colors.primary}20;">
                  <td style="padding: 15px; font-size: 18px; color: ${quoteTemplate.colors.text};">Total Amount</td>
                  <td style="padding: 15px; text-align: right; font-size: 18px; color: ${quoteTemplate.colors.text};">${quote.currency || 'USD'} ${totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              `;
            })()}
          </table>
        </div>
        
        <div style="margin-top: 40px; padding: 20px; background-color: ${quoteTemplate.colors.background}; border-radius: 8px; border-left: 4px solid ${quoteTemplate.colors.primary};">
          <h3 style="margin: 0 0 15px 0; color: ${quoteTemplate.colors.text};">Payment Information</h3>
          <p style="margin: 5px 0; color: ${quoteTemplate.colors.muted};"><strong>Lead ID:</strong> ${lead.leadNumber || 'N/A'}</p>
          <p style="margin: 5px 0; color: ${quoteTemplate.colors.muted};"><strong>Quote Valid Until:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin: 5px 0; color: ${quoteTemplate.colors.muted};"><strong>Contact:</strong> ${organization.email || 'N/A'}</p>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: ${quoteTemplate.backgrounds.nextSteps}; border-radius: 10px; border: 1px solid ${quoteTemplate.borders.nextSteps}; box-shadow: 0 2px 6px ${quoteTemplate.shadows?.nextSteps === 'transparent' ? 'transparent' : `${quoteTemplate.shadows?.nextSteps || '#000000'}${Math.round((quoteTemplate.shadows?.nextStepsOpacity || 0.05) * 255).toString(16).padStart(2, '0')}`};">
          <h3 style="color: ${quoteTemplate.colors.text}; margin-bottom: 15px; text-align: center; font-size: 18px; font-family: ${quoteTemplate.fonts.header};">${quoteTemplate.messages.nextStepsTitle}</h3>
          <div style="line-height: 1.5; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body}; font-size: 14px;">
            ${quoteTemplate.messages.nextSteps.map((step, index) => `
              <p style="margin: 0 0 8px 0;"><strong>${index + 1}. ${step.split(':')[0]}:</strong>${step.includes(':') ? step.split(':')[1] : step}</p>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Final Background Page -->
    <div class="page last-page">
    </div>
    `;
  }

  getDefaultStyles() {
    return {
      heading: {
        font: 'Helvetica-Bold',
        size: 24,
        color: '#000000',
        backgroundColor: 'transparent'
      },
      subheading: {
        font: 'Helvetica',
        size: 18,
        color: '#333333',
        backgroundColor: 'transparent'
      },
      table: {
        font: 'Helvetica',
        size: 12,
        color: '#000000',
        backgroundColor: '#f8f9fa',
        headerBackgroundColor: '#dee2e6',
        borderColor: '#dee2e6'
      },
      text: {
        font: 'Helvetica',
        size: 14,
        color: '#333333',
        backgroundColor: 'transparent'
      }
    };
  }
}

module.exports = PDFGenerator;
