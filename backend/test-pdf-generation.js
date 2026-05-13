const puppeteer = require('puppeteer');

async function testPuppeteer() {
  let browser;
  try {
    console.log('Testing Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Puppeteer launched successfully');
    
    const page = await browser.newPage();
    console.log('✅ New page created');
    
    await page.setContent('<html><body><h1>Test PDF</h1><p>This is a test PDF generation.</p></body></html>');
    console.log('✅ Content set');
    
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
    console.log('✅ PDF generated, size:', pdfBuffer.length);
    
    await browser.close();
    console.log('✅ Browser closed');
    
    return pdfBuffer;
  } catch (error) {
    console.error('❌ Puppeteer error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

testPuppeteer()
  .then(() => console.log('🎉 Puppeteer test completed successfully'))
  .catch(err => console.error('💥 Puppeteer test failed:', err.message));
