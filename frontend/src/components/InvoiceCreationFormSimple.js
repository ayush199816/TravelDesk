import React, { useState } from 'react';
import api from '../api/axios';

const InvoiceCreationFormSimple = ({ quote, onInvoiceCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    quoteId: quote._id,
    totalCycles: 4,
    firstCycleAmount: Math.round((quote.total * 0.3)), // Default 30% as first payment
    notes: '',
    terms: 'Payment is due within 30 days of invoice date. Late payments may incur additional charges.',
    paymentDates: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate remaining cycle amount
  const calculateRemainingAmount = () => {
    const packageAmount = (quote.subtotal || 0) + (quote.markupAmount || 0);
    const taxAmount = Math.round(packageAmount * 0.025);
    const totalAmount = packageAmount + taxAmount;
    const remainingAmount = totalAmount - formData.firstCycleAmount;
    const cycleAmount = Math.round(remainingAmount / (formData.totalCycles - 1));
    
    return {
      packageAmount,
      taxAmount,
      totalAmount,
      remainingAmount,
      cycleAmount
    };
  };

  const calculations = calculateRemainingAmount();

  // Initialize payment dates when total cycles changes
  const initializePaymentDates = (cycles) => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < cycles; i++) {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (i * 30)); // 30 days apart by default
      dates.push(dueDate.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    }
    
    return dates;
  };

  // Update payment dates when total cycles changes
  React.useEffect(() => {
    const dates = initializePaymentDates(formData.totalCycles);
    setFormData(prev => ({
      ...prev,
      paymentDates: dates
    }));
  }, [formData.totalCycles]);

  // Handle payment date changes
  const handlePaymentDateChange = (index, date) => {
    const newDates = [...formData.paymentDates];
    newDates[index] = date;
    setFormData(prev => ({
      ...prev,
      paymentDates: newDates
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/invoices', formData);

      setSuccess('Invoice created successfully!');
      if (onInvoiceCreated) {
        onInvoiceCreated(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalCycles' || name === 'firstCycleAmount' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        {onCancel && (
          <button 
            onClick={onCancel}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ← Back
          </button>
        )}
        <h4 style={{ margin: 0 }}>
          📄 Create Invoice from Quote
        </h4>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#155724'
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Payment Cycles
            </label>
            <select 
              name="totalCycles" 
              value={formData.totalCycles} 
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value={2}>2 Installments</option>
              <option value={3}>3 Installments</option>
              <option value={4}>4 Installments</option>
              <option value={5}>5 Installments</option>
              <option value={6}>6 Installments</option>
              <option value={7}>7 Installments</option>
            </select>
            <small style={{ color: '#666', fontSize: '12px' }}>Number of payment installments</small>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              First Payment Amount
            </label>
            <input
              type="number"
              name="firstCycleAmount"
              value={formData.firstCycleAmount}
              onChange={handleChange}
              min="1"
              max={calculations.totalAmount}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>Amount for first installment</small>
          </div>
        </div>

        {/* Payment Calculation Preview */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h6 style={{ marginBottom: '15px' }}>Payment Calculation Preview</h6>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <small style={{ color: '#666' }}>Package Amount</small>
              <div style={{ fontWeight: 'bold' }}>₹{calculations.packageAmount.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <small style={{ color: '#666' }}>Tax (2.5%)</small>
              <div style={{ fontWeight: 'bold' }}>₹{calculations.taxAmount.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <small style={{ color: '#666' }}>Total Amount</small>
              <div style={{ fontWeight: 'bold', color: '#007bff' }}>₹{calculations.totalAmount.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <small style={{ color: '#666' }}>Remaining Cycles</small>
              <div style={{ fontWeight: 'bold' }}>₹{calculations.cycleAmount.toLocaleString('en-IN')} each</div>
            </div>
          </div>
        </div>

        {/* Payment Schedule with Dates */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h6 style={{ marginBottom: '15px' }}>Payment Schedule & Due Dates</h6>
          {Array.from({ length: formData.totalCycles }, (_, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid #dee2e6'
            }}>
              <div style={{ flex: 1 }}>
                <strong>Cycle {i + 1}</strong>
                {i === 0 && (
                  <span style={{
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    marginLeft: '8px',
                    fontWeight: 'bold'
                  }}>
                    FIRST PAYMENT
                  </span>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Due Date</div>
                <input
                  type="date"
                  value={formData.paymentDates[i] || ''}
                  onChange={(e) => handlePaymentDateChange(i, e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
              <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Amount</div>
                ₹{(i === 0 ? formData.firstCycleAmount : calculations.cycleAmount).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Add any special notes for this invoice..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Terms & Conditions
          </label>
          <textarea
            name="terms"
            value={formData.terms}
            onChange={handleChange}
            rows={3}
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '15px 30px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '10px'
              }}></div>
              Creating Invoice...
            </>
          ) : (
            <>
              <span style={{ marginRight: '8px' }}>📄</span>
              Create Invoice
            </>
          )}
        </button>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </form>
    </div>
  );
};

export default InvoiceCreationFormSimple;
