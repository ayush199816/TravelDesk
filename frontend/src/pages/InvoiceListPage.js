import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Table, 
  Button, 
  Alert, 
  Spinner, 
  Badge, 
  Modal, 
  Row, 
  Col,
  Card,
  Form
} from 'react-bootstrap';
import { downloadInvoicePDF } from '../utils/invoiceUtils';
import './InvoiceListPage.css';

const InvoiceListPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cycleNumber: '',
    utrNumber: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices', {
      });
      setInvoices(response.data);
    } catch (error) {
      setError('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      await downloadInvoicePDF(invoiceId, invoiceNumber);
    } catch (error) {
      setError('Error downloading PDF');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this quote? This action cannot be undone and will also delete the associated invoice.')) {
      try {
        // Get the invoice to find the associated quote
        const invoice = invoices.find(inv => inv._id === invoiceId);
        if (invoice && invoice.quote) {
          // Delete the associated quote
          await api.delete(`/quotes/${invoice.quote._id}`);
          // Remove invoice from local state
          setInvoices(invoices.filter(inv => inv._id !== invoiceId));
          // Show success message
          alert('Quote and associated invoice deleted successfully!');
        } else {
          setError('No associated quote found for this invoice');
        }
      } catch (error) {
        setError('Error deleting quote: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentForm.cycleNumber || !paymentForm.utrNumber) {
      setError('Please fill in all payment details');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      // Mark payment cycle as paid
      await api.post(`/invoices/${selectedInvoice._id}/pay-cycle`, paymentForm, {
      });

      // Verify UTR (automatically for demo)
      await api.put(`/invoices/${selectedInvoice._id}/verify-utr`, {
        cycleNumber: parseInt(paymentForm.cycleNumber),
        utrVerified: true
      }, {
      });

      setShowPaymentModal(false);
      setPaymentForm({ cycleNumber: '', utrNumber: '' });
      fetchInvoices(); // Refresh list
    } catch (error) {
      setError(error.response?.data?.message || 'Error processing payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      sent: 'primary',
      partially_paid: 'warning',
      fully_paid: 'success',
      overdue: 'danger',
      cancelled: 'dark'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const getCycleStatusBadge = (cycle) => {
    const isOverdue = cycle.status === 'pending' && new Date(cycle.dueDate) < new Date();
    const status = isOverdue ? 'overdue' : cycle.status;
    const variants = {
      pending: 'warning',
      paid: 'success',
      overdue: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="invoice-list-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-file-earmark-text me-2"></i>
          Invoice Management
        </h2>
        <Button variant="primary" onClick={fetchInvoices}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {invoices.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-file-earmark-text display-1 text-muted"></i>
            <h4 className="mt-3">No Invoices Found</h4>
            <p className="text-muted">Create your first invoice from a converted quote.</p>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Guest Name</th>
                  <th>Package</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Next Payment Date</th>
                  <th>Payment Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const paidCycles = invoice.paymentCycles?.filter(c => c.status === 'paid').length || 0;
                  const totalCycles = invoice.paymentCycles?.length || 0;
                  const progressPercentage = totalCycles > 0 ? (paidCycles / totalCycles) * 100 : 0;
                  
                  // Find next payment date
                  const nextPendingCycle = invoice.paymentCycles
                    ?.filter(c => c.status === 'pending')
                    ?.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
                  const nextPaymentDate = nextPendingCycle?.dueDate;
                  
                  
                  return (
                    <tr key={invoice._id}>
                      <td>
                        <strong>{invoice.invoiceNumber}</strong>
                        <br />
                        <small className="text-muted">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </small>
                      </td>
                      <td>{invoice.guestName}</td>
                      <td>
                        {invoice.packageCountry}
                        <br />
                        <small className="text-muted">
                          {invoice.quote?.quoteNumber}
                        </small>
                      </td>
                      <td>
                        <strong>{invoice.currency} {invoice.finalAmount.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>{getStatusBadge(invoice.status)}</td>
                      <td>
                        {nextPaymentDate ? (
                          <div>
                            <strong className="text-warning">{new Date(nextPaymentDate).toLocaleDateString()}</strong>
                            <br />
                            <small className="text-muted">
                              Cycle {nextPendingCycle?.cycleNumber} • {nextPendingCycle?.amount?.toLocaleString('en-IN') || '0'}
                            </small>
                          </div>
                        ) : (
                          <span className="text-success">Fully Paid</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ 
                                width: `${progressPercentage}%`,
                                backgroundColor: progressPercentage === 100 ? '#28a745' : '#007bff'
                              }}
                            />
                          </div>
                          <small className="text-muted">
                            {paidCycles}/{totalCycles}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <Button 
                            size="sm" 
                            variant="outline-primary"
                            onClick={() => handleDownloadPDF(invoice._id, invoice.invoiceNumber)}
                          >
                            <i className="bi bi-download"></i>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-success"
                            onClick={() => openPaymentModal(invoice)}
                            disabled={invoice.status === 'fully_paid' ? 'true' : undefined}
                          >
                            <i className="bi bi-credit-card"></i>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => handleDeleteInvoice(invoice._id)}
                            title="Delete Quote"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-credit-card me-2"></i>
            Record Payment - {selectedInvoice?.invoiceNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInvoice && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Invoice Details</h6>
                  <p><strong>Total Amount:</strong> {selectedInvoice.currency} {selectedInvoice.finalAmount.toLocaleString('en-IN')}</p>
                  <p><strong>Guest:</strong> {selectedInvoice.guestName}</p>
                </Col>
                <Col md={6}>
                  <h6>Payment Schedule</h6>
                  {selectedInvoice.paymentCycles?.map((cycle) => (
                    <div key={cycle.cycleNumber} className="d-flex justify-content-between align-items-center py-1">
                      <span>Cycle {cycle.cycleNumber}</span>
                      <div className="d-flex align-items-center">
                        <span className="me-2">{selectedInvoice.currency} {cycle.amount.toLocaleString('en-IN')}</span>
                        {getCycleStatusBadge(cycle)}
                      </div>
                    </div>
                  ))}
                </Col>
              </Row>

              <Form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(); }}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Select Payment Cycle</Form.Label>
                      <Form.Select
                        value={paymentForm.cycleNumber}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, cycleNumber: e.target.value }))}
                        required
                      >
                        <option value="">Choose cycle...</option>
                        {selectedInvoice.paymentCycles
                          ?.filter(cycle => cycle.status === 'pending')
                          .map((cycle) => (
                            <option key={cycle.cycleNumber} value={cycle.cycleNumber}>
                              Cycle {cycle.cycleNumber} - {selectedInvoice.currency} {cycle.amount.toLocaleString('en-IN')}
                            </option>
                          ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>UTR Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={paymentForm.utrNumber}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, utrNumber: e.target.value }))}
                        placeholder="Enter UTR number"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={paymentLoading}>
                    {paymentLoading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Processing...</span>
                      </>
                    ) : (
                      'Record Payment'
                    )}
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default InvoiceListPage;
