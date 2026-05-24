// Set Puppeteer cache directory for Render
if (process.env.RENDER) {
  process.env.PUPPETEER_CACHE_DIR = '/opt/render/project/chrome';
}

const puppeteer = require('puppeteer');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');
const Organization = require('../models/Organization');
const PDFTemplate = require('../models/PDFTemplate');
const QuoteTemplate = require('../models/QuoteTemplate');
const Sightseeing = require('../models/Sightseeing');
const Transfer = require('../models/Transfer');

class PDFGenerator {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      // Close existing browser if it exists but is disconnected
      if (this.browser && !this.browser.isConnected()) {
        try {
          await this.browser.close();
        } catch (err) {
          // Error closing disconnected browser
        }
        this.browser = null;
      }
      
      const puppeteerOptions = {
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        timeout: 60000 // 60 seconds timeout
      };
      
      // For Render environment, detect available browsers
      if (process.env.RENDER) {
        const fs = require('fs');
        const possiblePaths = [
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/snap/bin/chromium',
          '/usr/local/bin/chromium',
          '/usr/local/bin/google-chrome'
        ];
        
        let browserFound = false;
        for (const path of possiblePaths) {
          try {
            if (fs.existsSync(path)) {
              puppeteerOptions.executablePath = path;
              console.log('✅ Found browser at:', path);
              browserFound = true;
              break;
            }
          } catch (err) {
            // Continue trying next path
          }
        }
        
        if (!browserFound) {
          console.log('❌ No system browser found, trying Puppeteer default...');
          // Use the exact path where Chrome was installed during build
          const chromePath = '/opt/render/project/chrome/chrome/linux-148.0.7778.97/chrome-linux64/chrome';
          const fs = require('fs');
          
          if (fs.existsSync(chromePath)) {
            puppeteerOptions.executablePath = chromePath;
            console.log('✅ Found Puppeteer Chrome at:', chromePath);
          } else {
            console.log('❌ Puppeteer Chrome not found at:', chromePath);
            // Try to find the latest Chrome version
            const cacheDir = '/opt/render/project/chrome/chrome';
            try {
              const versions = fs.readdirSync(cacheDir);
              if (versions.length > 0) {
                const latestVersion = versions.sort().pop(); // Get the latest version
                const latestChromePath = `${cacheDir}/${latestVersion}/chrome-linux64/chrome`;
                if (fs.existsSync(latestChromePath)) {
                  puppeteerOptions.executablePath = latestChromePath;
                  console.log('✅ Found latest Puppeteer Chrome at:', latestChromePath);
                }
              }
            } catch (err) {
              console.log('❌ Error finding Chrome versions:', err.message);
            }
          }
        }
      }
      
      console.log('🚀 Launching Puppeteer with options:', puppeteerOptions);
      this.browser = await puppeteer.launch(puppeteerOptions);
      console.log('✅ Puppeteer browser launched successfully');
    }
  }

  async closeBrowser() {
    if (this.browser) {
      try {
        // Check if browser is still connected before closing
        if (this.browser.isConnected()) {
          await this.browser.close();
          console.log('✅ Browser closed successfully');
        } else {
          console.log('⚠️ Browser already disconnected');
        }
      } catch (error) {
        console.log('⚠️ Error closing browser:', error.message);
      } finally {
        this.browser = null;
      }
    }
  }

  async generateQuotePDF(quote, lead, organization) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let page = null;
      let browserRestarted = false;
      
      try {
        console.log(`🔄 PDF generation attempt ${attempt}/${maxRetries}`);
        
        // Ensure browser is connected
        await this.initBrowser();
        
        // Check if browser is still connected
        if (!this.browser || !this.browser.isConnected()) {
          console.log('Browser disconnected, restarting...');
          await this.closeBrowser();
          await this.initBrowser();
          browserRestarted = true;
        }
        
        page = await this.browser.newPage();
      
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
        if (page) {
          try {
            await page.close();
            console.log('✅ Page closed successfully');
          } catch (closeError) {
            console.log('⚠️ Error closing page:', closeError.message);
          }
        }
        
        // If browser was restarted due to connection issues, close it to prevent memory leaks
        if (browserRestarted) {
          try {
            await this.closeBrowser();
            console.log('✅ Browser closed after restart');
          } catch (closeError) {
            console.log('⚠️ Error closing browser after restart:', closeError.message);
          }
        }
      }
      
      return pdfBuffer; // Success - exit retry loop
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        // Clean up resources on failure
        if (page) {
          try {
            await page.close();
          } catch (closeError) {
            console.log('⚠️ Error closing page after failure:', closeError.message);
          }
        }
        
        if (browserRestarted) {
          try {
            await this.closeBrowser();
          } catch (closeError) {
            console.log('⚠️ Error closing browser after failure:', closeError.message);
          }
        }
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          console.error('❌ All retry attempts failed');
          throw new Error(`PDF generation failed after ${maxRetries} attempts: ${lastError.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
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
          
          // Populate transfer data for each day
          if (day.transfers && day.transfers.length > 0) {
            for (let transferItem of day.transfers) {
              if (transferItem.transfer && typeof transferItem.transfer === 'string') {
                // Fetch transfer details from database
                const transferDetails = await Transfer.findById(transferItem.transfer);
                if (transferDetails) {
                  transferItem.transfer = transferDetails.toObject();
                  console.log(`Populated transfer: ${transferDetails.name}`);
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
          color: ${quoteTemplate.table?.textColor || '#333333'};
          background-color: ${quoteTemplate.table?.backgroundColor || '#ffffff'};
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
          border-radius: ${quoteTemplate.table?.borderRadius || 8}px;
          overflow: hidden;
        }
        
        th, td {
          border: 1px solid ${quoteTemplate.borders?.table || '#dee2e6'};
          padding: ${quoteTemplate.table?.padding || '8px'};
          text-align: left;
        }
        
        th {
          background-color: ${quoteTemplate.table?.headerBackgroundColor || '#f8f9fa'};
          color: ${quoteTemplate.table?.headerTextColor || '#333333'};
          font-weight: bold;
          font-size: ${Math.min(styles.table.size, quoteTemplate.table?.headerFontSize || 14)}px;
        }
        
        .total-price {
          background-color: transparent;
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
          color: ${quoteTemplate.table?.textColor || '#333333'};
          background-color: ${quoteTemplate.table?.backgroundColor || '#ffffff'};
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
          border-radius: ${quoteTemplate.table?.borderRadius || 8}px;
          overflow: hidden;
        }
        
        th, td {
          border: 1px solid ${quoteTemplate.borders?.table || '#dee2e6'};
          padding: ${quoteTemplate.table?.padding || '8px'};
          text-align: left;
        }
        
        th {
          background-color: ${quoteTemplate.table?.headerBackgroundColor || '#f8f9fa'};
          color: ${quoteTemplate.table?.headerTextColor || '#333333'};
          font-weight: bold;
          font-size: ${Math.min(styles.table.size, quoteTemplate.table?.headerFontSize || 14)}px;
        }
        
        .total-price {
          background-color: transparent;
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
          <table style="width: 100%; border-collapse: collapse; background-color: ${quoteTemplate.backgrounds?.package === 'transparent' ? 'transparent' : (quoteTemplate.backgrounds?.package || '#ffffff')};">
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
                    // Simplified calculation: package cost divided by total passengers
                    const packageCost = (quote.total || 0) - (quote.flightTotal || 0);
                    const totalPassengers = quote.adultPax + quote.childPax;
                    const perPersonPrice = totalPassengers > 0 ? Math.round(packageCost / totalPassengers) : 0;
                    
                    return quote.adultPax > 0 && perPersonPrice > 0 ? `
                      * ${perPersonPrice.toLocaleString('en-IN')} / Person (Package) x ${quote.adultPax} Adults<br/>
                    ` : '';
                  })()}
                  ${(() => {
                    const packageCost = (quote.total || 0) - (quote.flightTotal || 0);
                    const totalPassengers = quote.adultPax + quote.childPax;
                    const perPersonPrice = totalPassengers > 0 ? Math.round(packageCost / totalPassengers) : 0;
                    
                    return quote.childPax > 0 && perPersonPrice > 0 ? `
                      * ${perPersonPrice.toLocaleString('en-IN')} / Child (Package) x ${quote.childPax} Children<br/>
                    ` : '';
                  })()}
                </div>
                <div style="font-size: 18px; color: ${quoteTemplate.colors.primary}; font-weight: bold; margin-top: 10px;">
                  <strong>Total: ${quote.currency} ${quote.total?.toLocaleString('en-IN') || '0'}/- (inc. Tax ${quote.currency} ${(quote.taxAmount || 0).toLocaleString('en-IN')})</strong>
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
    ${quote.hotels && quote.hotels.length > 0 ? (() => {
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
      
      // Group hotels into pages of 4
      const hotelsPerPage = 3;
      const hotelPages = [];
      for (let i = 0; i < hotelStays.length; i += hotelsPerPage) {
        hotelPages.push(hotelStays.slice(i, i + hotelsPerPage));
      }
      
      // Generate pages
      return hotelPages.map((pageHotels, pageIndex) => {
        const isLastPage = pageIndex === hotelPages.length - 1;
        
        // Calculate starting night number for this page
        let startNightNumber = 1;
        for (let i = 0; i < pageIndex * hotelsPerPage; i++) {
          if (hotelStays[i]) {
            startNightNumber += hotelStays[i].nights;
          }
        }
        
        return `
          <div class="page middle-page ${!isLastPage ? 'page-break' : ''}">
            <div class="content-wrapper">
              <h1 style="color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.header}; font-size: ${quoteTemplate.fontSizes.header}px;">Accommodation Details</h1>
              ${pageHotels.map((stay, index) => {
              // Calculate starting night for this hotel
              const hotelStartNight = startNightNumber;
              startNightNumber += stay.nights;
              
              // Generate night boxes using template nightBox settings
              const nightBoxes = [];
              const showNightBox = quoteTemplate.hotel?.nightBox?.showNightBox !== false;
              
              if (showNightBox) {
                for (let i = 0; i < stay.nights; i++) {
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
                      ${hotelStartNight + i}N
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
                        <div style="color: #ffd700; margin-bottom: 15px; font-size: 24px;">
                          ${'★'.repeat(stay.starRating)}${'☆'.repeat(5 - stay.starRating)}
                        </div>
                      ` : ''}
                      <div style="font-size: ${quoteTemplate.hotel?.bodyFontSize || 14}px; color: ${quoteTemplate.hotel?.bodyColor || '#666666'}; font-family: ${quoteTemplate.hotel?.bodyFont || 'Arial, sans-serif'};">
                        ${stay.numberOfRooms} × ${stay.roomName}
                      </div>
                    </div>
                    
                    ${stay.hotelImage ? `
                      <div style="margin-left: 15px; flex-shrink: 0; height: 100%; display: flex; align-items: center; margin-top: 10px;">
                        <img src="${stay.hotelImage}" alt="${stay.hotelName}" style="width: 320px; height: 160px; border-radius: ${quoteTemplate.hotel?.imageBorderRadius || 8}px; object-fit: cover; border: 1px solid ${quoteTemplate.hotel?.borderColor || 'rgba(255, 255, 255, 0.3)'};" />
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
            </div>
          </div>
        `;
      }).join('');
    })() : ''}
    
    <!-- Flight Details -->
    ${quote.flights && quote.flights.length > 0 ? `
      <div class="page middle-page page-break">
        <div class="content-wrapper">
          <h1 style="color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.header}; font-size: ${quoteTemplate.fontSizes.header}px;">FLIGHTS DETAILS</h1>
          
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${quote.flights.map((flight, index) => `
              <!-- ${index === 0 ? 'Onward' : 'Return'} Flight Card -->
              <div style="
                background-color: white;
                border-radius: 12px;
                border: 1px solid #e0e0e0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
                font-family: ${quoteTemplate.fonts.body};
              ">
                <!-- Flight Header -->
                <div style="
                  background-color: ${quoteTemplate.colors.primary};
                  color: white;
                  padding: 12px 20px;
                  font-size: 16px;
                  font-weight: bold;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                ">
                  <span>${index === 0 ? 'ONWARD' : 'RETURN'}</span>
                  <span style="font-size: 14px; opacity: 0.9;">
                    ${flight.airline} ${flight.flightNumber}
                  </span>
                </div>
                
                <!-- Flight Content -->
                <div style="padding: 20px;">
                  <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 30px; align-items: center;">
                    <!-- Departure -->
                    <div>
                      <div style="font-size: 24px; font-weight: bold; color: ${quoteTemplate.colors.text}; margin-bottom: 8px;">
                        ${flight.departureTime}
                      </div>
                      <div style="font-size: 14px; color: ${quoteTemplate.colors.text}; margin-bottom: 4px;">
                        ${new Date(flight.departureDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div style="font-size: 16px; font-weight: 600; color: ${quoteTemplate.colors.text}; margin-bottom: 4px;">
                        ${flight.departureCity} (${flight.departureAirport || 'BOM'})
                      </div>
                      <div style="font-size: 12px; color: ${quoteTemplate.colors.muted};">
                        ${flight.departureAirportName || ''}
                        ${flight.departureTerminal ? `Terminal: ${flight.departureTerminal}` : ''}
                      </div>
                    </div>
                    
                    <!-- Duration & Baggage -->
                    <div style="text-align: center;">
                      <div style="
                        width: 60px;
                        height: 2px;
                        background-color: ${quoteTemplate.colors.primary};
                        margin: 0 auto 10px;
                        position: relative;
                      ">
                        <div style="
                          position: absolute;
                          top: -4px;
                          left: 50%;
                          transform: translateX(-50%);
                          width: 0;
                          height: 0;
                          border-left: 6px solid transparent;
                          border-right: 6px solid transparent;
                          border-top: 8px solid ${quoteTemplate.colors.primary};
                        "></div>
                      </div>
                      <div style="font-size: 14px; font-weight: 600; color: ${quoteTemplate.colors.text}; margin-bottom: 4px;">
                        ${(() => {
                          // Calculate duration from departure to arrival
                          const departure = new Date(flight.departureDate);
                          const arrival = new Date(flight.arrivalDate);
                          
                          // Extract times
                          const [depHour, depMin] = flight.departureTime.split(':').map(Number);
                          const [arrHour, arrMin] = flight.arrivalTime.split(':').map(Number);
                          
                          departure.setHours(depHour, depMin, 0, 0);
                          arrival.setHours(arrHour, arrMin, 0, 0);
                          
                          // If arrival is earlier than departure, it's next day
                          if (arrival < departure) {
                            arrival.setDate(arrival.getDate() + 1);
                          }
                          
                          const diffMs = arrival - departure;
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          
                          return `${diffHours} H ${diffMinutes} M`;
                        })()}
                      </div>
                      <div style="font-size: 12px; color: ${quoteTemplate.colors.muted};">
                        ${flight.baggage || '20 kg'}
                      </div>
                    </div>
                    
                    <!-- Arrival -->
                    <div style="text-align: right;">
                      <div style="font-size: 24px; font-weight: bold; color: ${quoteTemplate.colors.text}; margin-bottom: 8px;">
                        ${flight.arrivalTime}
                      </div>
                      <div style="font-size: 14px; color: ${quoteTemplate.colors.text}; margin-bottom: 4px;">
                        ${new Date(flight.arrivalDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div style="font-size: 16px; font-weight: 600; color: ${quoteTemplate.colors.text}; margin-bottom: 4px;">
                        ${flight.arrivalCity} (${flight.arrivalAirport || 'BKK'})
                      </div>
                      <div style="font-size: 12px; color: ${quoteTemplate.colors.muted};">
                        ${flight.arrivalAirportName || ''}
                        ${flight.arrivalTerminal ? `Terminal: ${flight.arrivalTerminal}` : ''}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Footer Info -->
                  <div style="
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  ">
                    <div style="font-size: 12px; color: ${quoteTemplate.colors.muted};">
                      Operated By: ${flight.operatedBy || flight.airline}
                    </div>
                    <div style="font-size: 12px; color: ${quoteTemplate.colors.muted};">
                      ${flight.pnr ? `PNR: ${flight.pnr}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${quote.flights.length > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background-color: ${quoteTemplate.colors.primary}15; border-radius: 8px; border-left: 4px solid ${quoteTemplate.colors.primary};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 16px; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body};">
                  <strong>Total Flight Cost:</strong> ${quote.flights.length} flight${quote.flights.length > 1 ? 's' : ''}
                </div>
                <div style="font-size: 18px; font-weight: bold; color: ${quoteTemplate.colors.primary}; font-family: ${quoteTemplate.fonts.header};">
                  ${quote.currency || 'USD'} ${quote.flights.reduce((sum, flight) => sum + flight.price, 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}
    
    <!-- Day-wise Summary Table -->
    ${quote.days && quote.days.length > 0 ? `
    <div class="page middle-page page-break">
      <div class="content-wrapper">
        <div style="margin-bottom: 30px;">
          <h2 style="color: ${quoteTemplate.colors.text}; font-size: 24px; font-family: ${quoteTemplate.fonts.header}; margin-bottom: 20px; text-align: center;">Day-wise Summary</h2>
          
          <div style="background-color: transparent; border-radius: 8px; border: 1px solid ${quoteTemplate.borders.activity}; overflow: hidden; box-shadow: 0 2px 6px ${quoteTemplate.shadows?.activity === 'transparent' ? 'transparent' : `${quoteTemplate.shadows?.activity || '#000000'}${Math.round((quoteTemplate.shadows?.activityOpacity || 0.05) * 255).toString(16).padStart(2, '0')}`};">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: ${quoteTemplate.table?.headerBackgroundColor || '#f8f9fa'};">
                  <th style="padding: 12px; text-align: center; color: ${quoteTemplate.table?.headerTextColor === 'transparent' || !quoteTemplate.table?.headerTextColor ? '#ffffff' : quoteTemplate.table?.headerTextColor}; font-weight: bold; font-family: ${quoteTemplate.fonts.header}; width: 15%;">Day</th>
                  <th style="padding: 12px; text-align: left; color: ${quoteTemplate.table?.headerTextColor === 'transparent' || !quoteTemplate.table?.headerTextColor ? '#ffffff' : quoteTemplate.table?.headerTextColor}; font-weight: bold; font-family: ${quoteTemplate.fonts.header}; width: 65%;">Activities & Transfers</th>
                  <th style="padding: 12px; text-align: center; color: ${quoteTemplate.table?.headerTextColor === 'transparent' || !quoteTemplate.table?.headerTextColor ? '#ffffff' : quoteTemplate.table?.headerTextColor}; font-weight: bold; font-family: ${quoteTemplate.fonts.header}; width: 20%;">Pax</th>
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
                  
                  // Format passenger count only
                  const formatPaxOnly = () => {
                    const adultPax = quote.adultPax || 0;
                    const childPax = quote.childPax || 0;
                    const hasChildActivity = activities.some(item => item.childPrice > 0 || item.includeChild === true);
                    const hasTransfers = transfers && transfers.length > 0;
                    
                    let paxText = '';
                    if (adultPax > 0) {
                      paxText = `${adultPax}A`;
                    }
                    // Show children if there are child activities OR if there are transfers
                    if (childPax > 0 && (hasChildActivity || hasTransfers)) {
                      paxText += paxText ? `+${childPax}C` : `${childPax}C`;
                    }
                    
                    return paxText || '1A';
                  };
                  
                  return `
                    <tr style="border-bottom: 1px solid ${quoteTemplate.borders.activity};">
                      <td style="padding: 12px; text-align: center; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body}; vertical-align: top;">
                        <div style="font-size: 16px; font-weight: bold; color: ${quoteTemplate.colors.primary};">Day ${day.dayNumber}</div>
                        <div style="font-size: 11px; color: ${quoteTemplate.colors.muted}; margin-top: 2px;">${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </td>
                      <td style="padding: 12px; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body}; vertical-align: top;">
                        ${itemsText}
                      </td>
                      <td style="padding: 12px; text-align: center; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.body}; vertical-align: top;">
                        <span style="background-color: ${quoteTemplate.colors.primary}20; color: ${quoteTemplate.colors.primary}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                          ${formatPaxOnly()}
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
    
    <!-- Day-wise Itinerary - Smart pagination based on content height -->
    ${quote.days && quote.days.length > 0 ? (() => {
      let allPages = [];
      let currentPageContent = [];
      let currentPageHeight = 0;
      const maxPageHeight = 1000; // Approximate max content height per page in px
      let globalActivityIndex = 1;
      
      const addToPage = (content, height) => {
        if (currentPageHeight + height > maxPageHeight && currentPageContent.length > 0) {
          // Create new page
          allPages.push(currentPageContent.join(''));
          currentPageContent = [content];
          currentPageHeight = height;
        } else {
          currentPageContent.push(content);
          currentPageHeight += height;
        }
      };
      
      quote.days.forEach((day, dayIndex) => {
        let dailyActivityIndex = 1;
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
        
        // Combine and sort activities by order
        const activities = [...(day.sightseeings || []), ...(day.transfers || [])];
        activities.sort((a, b) => (a.order || 0) - (b.order || 0));
        const hasImages = dayImages.length > 0;
        
        // Add day header
        const dayHeader = `
          ${dayIndex > 0 ? '<div style="width: 100%; height: 2px; background: linear-gradient(90deg, ' + quoteTemplate.colors.primary + ' 0%, ' + quoteTemplate.colors.secondary + ' 100%); margin: 30px 0 20px 0; opacity: 0.5;"></div>' : ''}
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
              <div style="font-size: 16px; line-height: 1.6; color: #333; font-weight: bold;">
                ${(() => {
                  const dayActivities = [];
                  
                  // Combine sightseeings and transfers with their order
                  const allActivities = [];
                  
                  (day.sightseeings || []).forEach((s, idx) => {
                    const sightseeing = s.sightseeing && typeof s.sightseeing === 'object' 
                      ? s.sightseeing 
                      : { name: s.name || `Activity ${idx + 1}` };
                    allActivities.push({
                      name: sightseeing.name,
                      order: s.order || 0,
                      type: 'sightseeing'
                    });
                  });
                  
                  (day.transfers || []).forEach((t, idx) => {
                    const transferName = t.transfer?.name || t.name || 'Transfer';
                    allActivities.push({
                      name: transferName,
                      order: t.order || 0,
                      type: 'transfer'
                    });
                  });
                  
                  // Sort by order field
                  allActivities.sort((a, b) => a.order - b.order);
                  
                  // Extract names in sorted order
                  allActivities.forEach(activity => {
                    dayActivities.push(activity.name);
                  });
                  
                  return dayActivities.length > 0 ? dayActivities.join(' + ') : 'Free day for leisure and exploration';
                })()}
              </div>
            </div>
          </div>
        `;
        
        addToPage(dayHeader, 120);
        
        if (activities.length === 0) {
          const freeDayContent = `
            <div style="text-align: center; padding: 40px; color: #666; margin-bottom: 20px;">
              <div style="font-size: 48px; margin-bottom: 15px; font-weight: bold; color: #4CAF50;">☼</div>
              <div style="font-size: 24px; font-weight: bold; color: #333;">Free Day</div>
              <div style="font-size: 16px; margin-top: 8px; color: #666;">Relax and explore at your own pace</div>
            </div>
          `;
          addToPage(freeDayContent, 150);
        } else {
          if (hasImages) {
            const imageContent = `
              <div style="margin-bottom: 20px; width: 100%; height: 180px; overflow: hidden; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);">
                <img src="${dayImages[0]}" alt="Day ${day.dayNumber} Activities" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            `;
            addToPage(imageContent, 200);
          }
          
          activities.forEach((item) => {
            const isTransfer = item.transfer || item.fromLocation || item.toLocation;
            
            let activityData;
            if (isTransfer) {
              const transferName = item.transfer?.name || item.name || 'Transfer';
              const fromLocation = item.fromLocation || item.transfer?.fromLocation || 'Pickup Point';
              const toLocation = item.toLocation || item.transfer?.toLocation || 'Drop Point';
              activityData = {
                name: transferName,
                description: item.transfer?.description || item.description || 'Comfortable transfer between locations',
                duration: item.transfer?.duration || item.duration || 'Flexible timing',
                location: `${fromLocation} to ${toLocation}`,
                images: item.transfer?.images || item.images || []
              };
            } else {
              activityData = item.sightseeing && typeof item.sightseeing === 'object' 
                ? item.sightseeing 
                : { 
                  name: item.name || `Activity ${globalActivityIndex}`,
                  description: item.sightseeingDescription || item.description || 'Enjoy this amazing activity.',
                  duration: item.sightseeingDuration || item.duration || 'Flexible timing',
                  location: item.sightseeingLocation || item.location || 'To be confirmed',
                  images: item.images || []
                };
            }
            
            const formatPassengerCount = (item) => {
              const adultPax = quote.adultPax || 0;
              const childPax = quote.childPax || 0;
              const isTransfer = item.transfer || item.fromLocation || item.toLocation;
              const hasChildActivity = item.childPrice > 0 || item.includeChild === true;
              
              if (adultPax > 0 && childPax > 0 && (isTransfer || hasChildActivity)) {
                return `${adultPax}A+${childPax}C`;
              } else if (adultPax > 0 && childPax > 0 && isTransfer) {
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
                      <h3 style="margin: 0 0 6px 0; font-size: ${quoteTemplate.fontSizes.activity}px; color: ${quoteTemplate.colors.text}; font-weight: bold; font-family: ${quoteTemplate.fonts.activity};">${activityData.name}</h3>
                      <p style="margin: 0 0 8px 0; font-size: ${quoteTemplate.fontSizes.description}px; line-height: 1.4; color: ${quoteTemplate.colors.muted}; font-family: ${quoteTemplate.fonts.body};">${activityData.description || 'Experience this wonderful activity with professional guidance and create lasting memories.'}</p>
                      <div style="display: flex; gap: 15px; font-size: ${quoteTemplate.fontSizes.details}px; color: ${quoteTemplate.colors.muted}; padding-top: 6px; border-top: 1px solid ${quoteTemplate.borders.activity}; font-family: ${quoteTemplate.fonts.body};">
                        <span style="display: flex; align-items: center;"><strong>Location:</strong> ${activityData.location || 'Location TBD'}</span>
                        <span style="display: flex; align-items: center;"><strong>Duration:</strong> ${activityData.duration || 'Flexible'}</span>
                        ${formatPassengerCount(item) ? `<span style="display: flex; align-items: center; background-color: ${quoteTemplate.colors.primary}20; color: ${quoteTemplate.colors.primary}; padding: 2px 6px; border-radius: 4px; font-weight: bold;"><strong>Pax:</strong> ${formatPassengerCount(item)}</span>` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
            
            addToPage(activityContent, 180);
            
            dailyActivityIndex++;
            globalActivityIndex++;
          });
        }
      });
      
      // Add remaining content to last page
      if (currentPageContent.length > 0) {
        allPages.push(currentPageContent.join(''));
      }
      
      // Generate page divs
      return allPages.map((pageContent, index) => {
        const isLastPage = index === allPages.length - 1;
        return `
          <div class="page middle-page ${!isLastPage ? 'page-break' : ''}">
            <div class="content-wrapper">
              ${index === 0 ? '<h1 style="color: ' + quoteTemplate.colors.text + '; font-family: ' + quoteTemplate.fonts.header + '; font-size: ' + quoteTemplate.fontSizes.header + 'px; margin-bottom: 20px;">Day-wise Itinerary</h1>' : ''}
              ${pageContent}
            </div>
          </div>
        `;
      }).join('');
    })() : ''}
    
    <!-- Payment Details Page -->
    <div class="page middle-page page-break">
      <div class="content-wrapper">
        <h1 style="font-family: ${quoteTemplate.fonts.header}; color: ${quoteTemplate.colors.text};">Payment Details</h1>
        
        <div style="margin: 30px 0; padding: 25px; border: 2px solid ${quoteTemplate.borders.payment}; border-radius: 12px; background: ${quoteTemplate.backgrounds.payment}; box-shadow: 0 4px 12px ${quoteTemplate.shadows?.payment === 'transparent' ? 'transparent' : `${quoteTemplate.shadows?.payment || '#000000'}${Math.round((quoteTemplate.shadows?.paymentOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`};">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 18px; color: ${quoteTemplate.colors.muted}; margin-bottom: 10px; font-family: ${quoteTemplate.fonts.body};">Total Amount</div>
            <div style="font-size: 36px; font-weight: bold; color: ${quoteTemplate.colors.text}; font-family: ${quoteTemplate.fonts.header};">
              ${quote.currency || 'USD'} ${(quote.total || 0).toLocaleString('en-IN')}
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            ${(() => {
              // Calculate flight total from flights array
              const flightTotal = quote.flights ? quote.flights.reduce((sum, flight) => sum + (flight.price || 0), 0) : 0;
              // Calculate package cost: sightseeing + transfers + hotels + markup
              // Use stored values if available, otherwise calculate from quote data
              let sightseeingTotal = quote.sightseeingTotal || 0;
              let transferTotal = quote.transferTotal || 0;
              let hotelTotal = quote.hotelTotal || 0;
              
              // If totals are 0, calculate from quote data (for existing quotes)
              if (sightseeingTotal === 0 && quote.days && quote.days.length > 0) {
                sightseeingTotal = 0;
                transferTotal = 0;
                hotelTotal = 0;
                
                quote.days.forEach(day => {
                  // Calculate sightseeing
                  if (day.sightseeings && day.sightseeings.length > 0) {
                    day.sightseeings.forEach(item => {
                      const adultCount = item.includeAdult !== false ? (item.adultCount || quote.adultPax) : 0;
                      const childCount = item.includeChild !== false ? (item.childCount || quote.childPax) : 0;
                      
                      if (item.adultRate || item.childRate) {
                        sightseeingTotal += (item.adultRate * adultCount) + (item.childRate * childCount);
                      } else if (item.rate) {
                        sightseeingTotal += item.rate;
                      }
                    });
                  }
                  
                  // Calculate transfers
                  if (day.transfers && day.transfers.length > 0) {
                    day.transfers.forEach(item => {
                      if (item.rate) {
                        transferTotal += item.rate;
                      }
                    });
                  }
                });
                
                // Calculate hotels
                if (quote.hotels && quote.hotels.length > 0) {
                  quote.hotels.forEach(hotelItem => {
                    if (hotelItem.rooms && hotelItem.rooms.length > 0) {
                      hotelItem.rooms.forEach(room => {
                        const nights = room.nights || 1;
                        hotelTotal += room.adultRate * room.numberOfRooms * nights;
                      });
                    }
                  });
                }
              }
              
              const packageCost = sightseeingTotal + transferTotal + hotelTotal + (quote.markupAmount || 0) - (quote.discountAmount || 0) + (quote.taxAmount || 0);
              
              // Update quote with calculated flight total for consistency
              quote.flightTotal = flightTotal;
              // Use actual tax and TCS amounts from quote
              const taxAmount = quote.taxAmount || 0;
              const tcsAmount = quote.tcsAmount || 0;
              // Total amount from quote
              const totalAmount = quote.total || 0;
              
              let tableRows = '';
              
              // Add flight cost if exists
              if (flightTotal > 0) {
                tableRows += `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Flight Cost</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${quote.currency || 'USD'} ${flightTotal.toLocaleString('en-IN')}</td>
                  </tr>
                `;
              }
              
              // Add package cost
              tableRows += `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Package Cost</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${quote.currency || 'USD'} ${packageCost.toLocaleString('en-IN')}</td>
                </tr>
              `;
              
              // Add TCS if exists
              if (tcsAmount > 0) {
                tableRows += `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">TCS (2.5%)</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${quote.currency || 'USD'} ${tcsAmount.toLocaleString('en-IN')}</td>
                  </tr>
                `;
              }
              
              // Add total row
              tableRows += `
                <tr style="font-weight: bold; background-color: transparent;">
                  <td style="padding: 15px; font-size: 18px; color: ${quoteTemplate.colors.text};">Total Amount</td>
                  <td style="padding: 15px; text-align: right; font-size: 18px; color: ${quoteTemplate.colors.text};">${quote.currency || 'USD'} ${totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              `;
              
              return tableRows;
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
