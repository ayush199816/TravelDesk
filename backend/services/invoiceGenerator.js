const Invoice = require('../models/Invoice');

const generateInvoiceHTML = async (invoiceId) => {
  try {
    // Get invoice with all populated data
    const invoice = await Invoice.findById(invoiceId)
      .populate('quote', 'quoteNumber country adultPax childPax travelStartDate travelEndDate taxRate sightseeingTotal transferTotal hotelTotal flightTotal subtotal')
      .populate('lead', 'name email phone address leadNumber')
      .populate('createdBy', 'name email')
      .populate('paymentCycles.verifiedBy', 'name email');
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    const { quote, lead } = invoice;
    
    // Calculate totals
    const paidAmount = invoice.paymentCycles
      .filter(cycle => cycle.status === 'paid')
      .reduce((sum, cycle) => sum + cycle.amount, 0);
    
    const remainingAmount = invoice.finalAmount - paidAmount;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 0;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          border-bottom: 2px solid #007bff;
          padding-bottom: 20px;
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-info h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          color: #007bff;
        }
        
        .company-info p {
          margin: 5px 0;
        }
        
        .invoice-details {
          text-align: right;
          min-width: 200px;
        }
        
        .invoice-details h2 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #007bff;
        }
        
        .invoice-details p {
          margin: 5px 0;
        }
        
        .billing-section {
          display: flex;
          margin-bottom: 30px;
          gap: 40px;
        }
        
        .billing-info, .package-info {
          flex: 1;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          color: #007bff;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .billing-info p, .package-info p {
          margin: 8px 0;
        }
        
        .financial-summary {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .financial-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 5px 0;
        }
        
        .financial-row.total {
          font-weight: bold;
          font-size: 16px;
          border-top: 2px solid #007bff;
          padding-top: 10px;
          margin-top: 15px;
        }
        
        .payment-schedule {
          margin-bottom: 30px;
        }
        
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        
        .payment-table th,
        .payment-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .payment-table th {
          background-color: #007bff;
          color: white;
          font-weight: bold;
        }
        
        .payment-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        
        .status-pending {
          color: #ffc107;
          font-weight: bold;
        }
        
        .status-paid {
          color: #28a745;
          font-weight: bold;
        }
        
        .status-overdue {
          color: #dc3545;
          font-weight: bold;
        }
        
        .utr-section {
          font-size: 11px;
          color: #666;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 11px;
          color: #666;
        }
        
        .terms {
          margin-top: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        
        .terms h4 {
          margin: 0 0 10px 0;
          color: #007bff;
        }
        
        .terms p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${invoice.companyName}</h1>
          <p><strong>Address:</strong> ${invoice.companyAddress}</p>
          <p><strong>Phone:</strong> ${invoice.companyPhone}</p>
          <p><strong>Email:</strong> ${invoice.companyEmail}</p>
          <p><strong>GST:</strong> ${invoice.companyGST}</p>
        </div>
        
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
      
      <div class="billing-section">
        <div class="billing-info">
          <div class="section-title">BILL TO</div>
          <p><strong>Guest Name:</strong> ${invoice.guestName}</p>
          <p><strong>Email:</strong> ${lead.email}</p>
          <p><strong>Phone:</strong> ${lead.phone}</p>
          ${lead.address ? `<p><strong>Address:</strong> ${lead.address}</p>` : ''}
        </div>
        
        <div class="package-info">
          <div class="section-title">PACKAGE DETAILS</div>
          <p><strong>Quote Number:</strong> ${quote.quoteNumber || 'N/A'}</p>
          <p><strong>Lead Number:</strong> ${lead.leadNumber}</p>
          <p><strong>Destination:</strong> ${invoice.packageCountry}</p>
          <p><strong>Travel Dates:</strong> ${new Date(quote.travelStartDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(quote.travelEndDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          <p><strong>Passengers:</strong> ${quote.adultPax} Adults${quote.childPax > 0 ? `, ${quote.childPax} Children` : ''}</p>
        </div>
      </div>
      
      <div class="financial-summary">
        <!-- Package Cost (includes sightseeing + transfers + hotels + flights) -->
        <div class="financial-row">
          <span>Package Cost:</span>
          <span>${invoice.currency} ${(quote.subtotal || 0).toLocaleString('en-IN')}</span>
        </div>
        ${invoice.markupAmount > 0 ? `
        <div class="financial-row">
          <span>Service Charge:</span>
          <span>${invoice.currency} ${invoice.markupAmount.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        ${invoice.taxAmount > 0 ? `
        <div class="financial-row">
          <span>Tax (${quote.taxRate || 0}%):</span>
          <span>${invoice.currency} ${invoice.taxAmount.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        ${invoice.tcsAmount > 0 ? `
        <div class="financial-row">
          <span>TCS (2.5%):</span>
          <span>${invoice.currency} ${invoice.tcsAmount.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        <div class="financial-row total">
          <span>Total Amount:</span>
          <span>${invoice.currency} ${invoice.finalAmount.toLocaleString('en-IN')}</span>
        </div>
        <div class="financial-row">
          <span>Paid Amount:</span>
          <span>${invoice.currency} ${paidAmount.toLocaleString('en-IN')}</span>
        </div>
        <div class="financial-row">
          <span>Remaining Amount:</span>
          <span>${invoice.currency} ${remainingAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <div class="payment-schedule">
        <div class="section-title">PAYMENT SCHEDULE</div>
        <table class="payment-table">
          <thead>
            <tr>
              <th>Cycle</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>UTR Number</th>
              <th>Verified By</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.paymentCycles.map(cycle => {
              const statusClass = cycle.status === 'paid' ? 'status-paid' : 
                                 cycle.status === 'overdue' ? 'status-overdue' : 'status-pending';
              const dueDate = new Date(cycle.dueDate);
              const isOverdue = cycle.status === 'pending' && dueDate < new Date();
              const displayStatus = isOverdue ? 'OVERDUE' : cycle.status.toUpperCase();
              
              return `
                <tr>
                  <td>Cycle ${cycle.cycleNumber}</td>
                  <td>${invoice.currency} ${cycle.amount.toLocaleString('en-IN')}</td>
                  <td>${dueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td><span class="status-${cycle.status}">${displayStatus}</span></td>
                  <td>
                    <div class="utr-section">
                      ${cycle.utrNumber || '-'}
                      ${cycle.utrVerified ? '✓' : ''}
                    </div>
                  </td>
                  <td>${cycle.verifiedBy ? cycle.verifiedBy.name : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      ${invoice.notes ? `
      <div class="notes">
        <div class="section-title">NOTES</div>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}
      
      <div class="terms">
        <h4>TERMS & CONDITIONS</h4>
        <p>${invoice.terms}</p>
        <p><strong>Payment Information:</strong></p>
        <p>• Please ensure UTR number is provided for each payment cycle</p>
        <p>• Payments will be verified by our accounts team</p>
        <p>• Late payments may incur additional charges</p>
      </div>
      
      <div class="footer">
        <p>This is a computer-generated invoice and does not require a signature.</p>
        <p>For any queries, please contact: ${invoice.companyEmail} | ${invoice.companyPhone}</p>
        <p>Page 1 of 1</p>
      </div>
    </body>
    </html>
    `;
  } catch (error) {
    console.error('Error generating invoice HTML:', error);
    throw error;
  }
};

module.exports = { generateInvoiceHTML };
