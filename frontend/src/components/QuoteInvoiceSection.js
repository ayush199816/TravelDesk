import React, { useState } from 'react';
import QuoteConversionButton from './QuoteConversionButton';
import InvoiceCreationForm from './InvoiceCreationForm';
import { Card, Alert } from 'react-bootstrap';

const QuoteInvoiceSection = ({ quote, onQuoteUpdated }) => {
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(null);

  const handleQuoteConverted = (updatedQuote) => {
    if (onQuoteUpdated) {
      onQuoteUpdated(updatedQuote);
    }
  };

  const handleInvoiceCreated = (invoice) => {
    setInvoiceCreated(invoice);
    setShowInvoiceForm(false);
  };

  return (
    <div className="quote-invoice-section">
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>
            Invoice Generation
          </h5>
        </Card.Header>
        <Card.Body>
          {invoiceCreated && (
            <Alert variant="success" className="mb-3">
              <i className="bi bi-check-circle-fill me-2"></i>
              <strong>Invoice Created Successfully!</strong><br />
              Invoice Number: {invoiceCreated.invoiceNumber}<br />
              Total Amount: {invoiceCreated.currency} {invoiceCreated.finalAmount.toLocaleString('en-IN')}<br />
              <small>You can download the invoice from the Invoice Management page.</small>
            </Alert>
          )}

          {!quote.isConverted ? (
            <div>
              <Alert variant="info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Step 1:</strong> Convert this quote to enable invoice generation. Once converted, you can create invoices with flexible payment cycles.
              </Alert>
              
              <QuoteConversionButton 
                quote={quote} 
                onConverted={handleQuoteConverted}
              />
            </div>
          ) : (
            <div>
              <Alert variant="success">
                <i className="bi bi-check-circle me-2"></i>
                <strong>Quote is Converted!</strong> You can now create invoices for this quote.
              </Alert>

              {!showInvoiceForm ? (
                <div className="text-center">
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => setShowInvoiceForm(true)}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Create New Invoice
                  </button>
                  <p className="text-muted mt-2">
                    Configure payment cycles and generate professional invoice PDF
                  </p>
                </div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Create Invoice</h6>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowInvoiceForm(false)}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                  
                  <InvoiceCreationForm 
                    quote={quote}
                    onInvoiceCreated={handleInvoiceCreated}
                  />
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default QuoteInvoiceSection;
