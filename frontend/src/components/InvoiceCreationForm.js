import React, { useState } from 'react';
import api from '../api/axios';
import { Button, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';

const InvoiceCreationForm = ({ quote, onInvoiceCreated }) => {
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
    const taxAmount = quote.taxAmount || 0;
    
    // Calculate TCS if not present in quote
    let tcsAmount = quote.tcsAmount || 0;
    if (quote.tcsEnabled && !tcsAmount) {
      const markupSubtotal = packageAmount + taxAmount;
      tcsAmount = markupSubtotal * 0.02; // 2% TCS
    }
    
    // Calculate commission if not present in quote
    let commissionAmount = quote.leadProviderCommissionAmount || 0;
    if (quote.leadProviderCommission && !commissionAmount) {
      const commissionBase = (quote.sightseeingTotal || 0) + (quote.transferTotal || 0) + (quote.hotelTotal || 0);
      commissionAmount = commissionBase * (quote.leadProviderCommission / 100);
    }
    
    // Use the quote's total if available, otherwise calculate
    const calculatedTotal = packageAmount + taxAmount + tcsAmount + commissionAmount;
    const totalAmount = quote.total || calculatedTotal;
    
    const remainingAmount = totalAmount - formData.firstCycleAmount;
    const cycleAmount = Math.round(remainingAmount / (formData.totalCycles - 1));
    
    return {
      packageAmount,
      taxAmount,
      tcsAmount,
      commissionAmount,
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
    <div className="invoice-creation-form">
      <h4 className="mb-4">
        <i className="bi bi-file-earmark-text me-2"></i>
        Create Invoice from Quote
      </h4>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Payment Cycles</Form.Label>
              <Form.Select 
                name="totalCycles" 
                value={formData.totalCycles} 
                onChange={handleChange}
                required
              >
                <option value={2}>2 Installments</option>
                <option value={3}>3 Installments</option>
                <option value={4}>4 Installments</option>
                <option value={5}>5 Installments</option>
                <option value={6}>6 Installments</option>
                <option value={7}>7 Installments</option>
              </Form.Select>
              <Form.Text>Number of payment installments</Form.Text>
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group>
              <Form.Label>First Payment Amount</Form.Label>
              <Form.Control
                type="number"
                name="firstCycleAmount"
                value={formData.firstCycleAmount}
                onChange={handleChange}
                min="1"
                max={calculations.totalAmount}
                required
              />
              <Form.Text>Amount for first installment</Form.Text>
            </Form.Group>
          </Col>
        </Row>

        {/* Payment Calculation Preview */}
        <div className="payment-preview bg-light p-3 rounded mb-3">
          <h6 className="mb-3">Payment Calculation Preview</h6>
          <Row>
            <Col md={3}>
              <small className="text-muted">Package Amount</small>
              <div className="fw-bold">₹{calculations.packageAmount.toLocaleString('en-IN')}</div>
            </Col>
            <Col md={3}>
              <small className="text-muted">Tax Amount</small>
              <div className="fw-bold">₹{calculations.taxAmount.toLocaleString('en-IN')}</div>
            </Col>
            <Col md={3}>
              <small className="text-muted">TCS (2%)</small>
              <div className="fw-bold">₹{calculations.tcsAmount.toLocaleString('en-IN')}</div>
            </Col>
            <Col md={3}>
              <small className="text-muted">Lead Provider Commission</small>
              <div className="fw-bold">₹{calculations.commissionAmount.toLocaleString('en-IN')}</div>
            </Col>
          </Row>
          <Row className="mt-2">
            <Col md={6}>
              <small className="text-muted">Total Amount</small>
              <div className="fw-bold text-primary fs-5">₹{calculations.totalAmount.toLocaleString('en-IN')}</div>
            </Col>
            <Col md={6}>
              <small className="text-muted">Remaining Cycles</small>
              <div className="fw-bold text-success">₹{calculations.cycleAmount.toLocaleString('en-IN')} each</div>
            </Col>
          </Row>
        </div>

        {/* Payment Schedule with Dates */}
        <div className="payment-schedule-preview bg-light p-3 rounded mb-3">
          <h6 className="mb-3">Payment Schedule & Due Dates</h6>
          {Array.from({ length: formData.totalCycles }, (_, i) => (
            <Row key={i} className="align-items-center py-2 border-bottom">
              <Col md={4}>
                <span>
                  <strong>Cycle {i + 1}</strong>
                  {i === 0 && <span className="badge bg-warning ms-2">First Payment</span>}
                </span>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-0">
                  <Form.Label className="small text-muted">Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.paymentDates[i] || ''}
                    onChange={(e) => handlePaymentDateChange(i, e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <div className="text-end">
                  <small className="text-muted">Amount</small>
                  <div className="fw-bold">
                    ₹{(i === 0 ? formData.firstCycleAmount : calculations.cycleAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              </Col>
            </Row>
          ))}
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Notes (Optional)</Form.Label>
          <Form.Control
            as="textarea"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Add any special notes for this invoice..."
          />
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label>Terms & Conditions</Form.Label>
          <Form.Control
            as="textarea"
            name="terms"
            value={formData.terms}
            onChange={handleChange}
            rows={3}
            required
          />
        </Form.Group>

        <Button 
          variant="primary" 
          type="submit" 
          disabled={loading}
          size="lg"
          className="w-100"
        >
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
              <span className="ms-2">Creating Invoice...</span>
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-plus me-2"></i>
              Create Invoice
            </>
          )}
        </Button>
      </Form>
    </div>
  );
};

export default InvoiceCreationForm;
