import React, { useState } from 'react';
import QuoteConversionButtonSimple from './QuoteConversionButtonSimple';
import InvoiceCreationFormSimple from './InvoiceCreationFormSimple';

const QuoteInvoiceSectionSimple = ({ quote, onQuoteUpdated }) => {
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
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '15px 20px',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          📄 Invoice Generation
        </div>
        
        <div style={{ padding: '20px' }}>
          {invoiceCreated && (
            <div style={{
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', marginRight: '10px' }}>✅</span>
                <div>
                  <strong style={{ color: '#155724' }}>Invoice Created Successfully!</strong><br />
                  <span style={{ color: '#155724' }}>
                    Invoice Number: {invoiceCreated.invoiceNumber}<br />
                    Total Amount: {invoiceCreated.currency} {invoiceCreated.finalAmount.toLocaleString('en-IN')}<br />
                    <small>You can download the invoice from the Invoice Management page.</small>
                  </span>
                </div>
              </div>
            </div>
          )}

          {!quote.isConverted ? (
            <div>
              <div style={{
                backgroundColor: '#d1ecf1',
                border: '1px solid #bee5eb',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', marginRight: '10px' }}>ℹ️</span>
                  <div>
                    <strong style={{ color: '#0c5460' }}>Step 1:</strong> Convert this quote to enable invoice generation. Once converted, you can create invoices with flexible payment cycles.
                  </div>
                </div>
              </div>
              
              <QuoteConversionButtonSimple 
                quote={quote} 
                onConverted={handleQuoteConverted}
              />
            </div>
          ) : (
            <div>
              <div style={{
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', marginRight: '10px' }}>✅</span>
                  <div>
                    <strong style={{ color: '#155724' }}>Quote is Converted!</strong> You can now create invoices for this quote.
                  </div>
                </div>
              </div>

              {!showInvoiceForm ? (
                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => setShowInvoiceForm(true)}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '15px 30px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      marginBottom: '10px'
                    }}
                  >
                    ➕ Create New Invoice
                  </button>
                  <p style={{ color: '#666', margin: 0 }}>
                    Configure payment cycles and generate professional invoice PDF
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '15px'
                  }}>
                    <h6 style={{ margin: 0 }}>Create Invoice</h6>
                    <button 
                      onClick={() => setShowInvoiceForm(false)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#666'
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <InvoiceCreationFormSimple 
                    quote={quote}
                    onInvoiceCreated={handleInvoiceCreated}
                    onCancel={() => setShowInvoiceForm(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteInvoiceSectionSimple;
