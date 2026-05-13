// Simple PDF generator without Puppeteer for compatibility
class SimplePDFGenerator {
  generateQuotePDF(quote, lead, organization) {
    // Create a simple HTML to PDF conversion using basic Node.js
    // This is a fallback when Puppeteer fails
    
    const htmlContent = this.generateSimpleHTML(quote, lead, organization);
    
    // For now, return a simple text-based PDF buffer
    // In production, you might want to use a different PDF library
    const pdfContent = Buffer.from(`
Quote Details
==============
Quote Number: ${quote.quoteNumber || 'N/A'}
Lead Name: ${lead?.name || 'N/A'}
Lead Number: ${lead?.leadNumber || 'N/A'}
Email: ${lead?.email || 'N/A'}
Phone: ${lead?.phone || 'N/A'}

Travel Details:
Country: ${quote.country || 'N/A'}
Start Date: ${quote.travelStartDate || 'N/A'}
End Date: ${quote.travelEndDate || 'N/A'}

Hotels:
${quote.hotels?.map(hotel => `- ${hotel.hotel?.name || 'Unknown'} (${hotel.hotel?.city || 'Unknown'})`).join('\n') || 'No hotels'}

Total Amount: ${quote.totalAmount || 'N/A'} ${quote.currency || 'USD'}

Generated on: ${new Date().toLocaleDateString()}
    `, 'utf8');
    
    return pdfContent;
  }
  
  generateSimpleHTML(quote, lead, organization) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quote ${quote.quoteNumber || 'N/A'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Travel Quote</h1>
        <h2>Quote #${quote.quoteNumber || 'N/A'}</h2>
    </div>
    
    <div class="section">
        <p><span class="label">Lead Name:</span> ${lead?.name || 'N/A'}</p>
        <p><span class="label">Lead Number:</span> ${lead?.leadNumber || 'N/A'}</p>
        <p><span class="label">Email:</span> ${lead?.email || 'N/A'}</p>
        <p><span class="label">Phone:</span> ${lead?.phone || 'N/A'}</p>
    </div>
    
    <div class="section">
        <h3>Travel Details</h3>
        <p><span class="label">Country:</span> ${quote.country || 'N/A'}</p>
        <p><span class="label">Start Date:</span> ${quote.travelStartDate || 'N/A'}</p>
        <p><span class="label">End Date:</span> ${quote.travelEndDate || 'N/A'}</p>
    </div>
    
    <div class="section">
        <h3>Hotels</h3>
        <table>
            <thead>
                <tr>
                    <th>Hotel Name</th>
                    <th>City</th>
                    <th>Rating</th>
                </tr>
            </thead>
            <tbody>
                ${quote.hotels?.map(hotel => `
                    <tr>
                        <td>${hotel.hotel?.name || 'Unknown'}</td>
                        <td>${hotel.hotel?.city || 'Unknown'}</td>
                        <td>${hotel.hotel?.starRating || 'N/A'} ⭐</td>
                    </tr>
                `).join('') || '<tr><td colspan="3">No hotels</td></tr>'}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <h3>Total Amount</h3>
        <p><span class="label">Amount:</span> ${quote.totalAmount || 'N/A'} ${quote.currency || 'USD'}</p>
    </div>
    
    <div class="footer">
        <p><em>Generated on ${new Date().toLocaleDateString()}</em></p>
    </div>
</body>
</html>
    `;
  }
}

module.exports = SimplePDFGenerator;
