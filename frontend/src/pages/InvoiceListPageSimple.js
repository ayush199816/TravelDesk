import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const InvoiceListPageSimple = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cycleNumber: '',
    utrNumber: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    searchQuery: '',
    dateRange: '',
    paymentStatus: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('/api/invoices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvoices(response.data);
      setFilteredInvoices(response.data);
    } catch (error) {
      setError('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to invoices
  const applyFilters = useCallback(() => {
    let filtered = [...invoices];
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(invoice => invoice.status === filters.status);
    }
    
    // Payment status filter
    if (filters.paymentStatus) {
      filtered = filtered.filter(invoice => {
        const paidCycles = invoice.paymentCycles.filter(cycle => cycle.status === 'paid').length;
        const totalCycles = invoice.paymentCycles.length;
        
        if (filters.paymentStatus === 'paid') {
          return paidCycles === totalCycles;
        } else if (filters.paymentStatus === 'partial') {
          return paidCycles > 0 && paidCycles < totalCycles;
        } else if (filters.paymentStatus === 'unpaid') {
          return paidCycles === 0;
        }
        return true;
      });
    }
    
    // Search query filter (invoice number, guest name, lead number)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => 
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(query)) ||
        (invoice.guestName && invoice.guestName.toLowerCase().includes(query)) ||
        (invoice.lead?.leadNumber && invoice.lead.leadNumber.toLowerCase().includes(query))
      );
    }
    
    // Date range filter
    if (filters.dateRange) {
      const today = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setDate(today.getDate());
          break;
        case 'week':
          filterDate.setDate(today.getDate() + 7);
          break;
        case 'month':
          filterDate.setMonth(today.getMonth() + 1);
          break;
        case 'quarter':
          filterDate.setMonth(today.getMonth() + 3);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(invoice => {
        if (invoice.createdAt) {
          const invoiceDate = new Date(invoice.createdAt);
          return invoiceDate <= filterDate;
        }
        return false;
      });
    }
    
    setFilteredInvoices(filtered);
  }, [invoices, filters]);

  // Update filtered invoices when invoices or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await axios.get(`/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Error downloading PDF');
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
      await axios.post(`/api/invoices/${selectedInvoice._id}/pay-cycle`, {
        cycleNumber: parseInt(paymentForm.cycleNumber),
        utrNumber: paymentForm.utrNumber
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Verify UTR (automatically for demo)
      await axios.put(`/api/invoices/${selectedInvoice._id}/verify-utr`, {
        cycleNumber: parseInt(paymentForm.cycleNumber),
        utrVerified: true
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
    const colors = {
      draft: '#6c757d',
      sent: '#007bff',
      partially_paid: '#ffc107',
      fully_paid: '#28a745',
      overdue: '#dc3545',
      cancelled: '#343a40'
    };
    return (
      <span style={{
        backgroundColor: colors[status] || '#6c757d',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <p style={{ marginTop: '15px' }}>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => navigate(-1)}
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
          <h2 style={{ margin: 0, color: '#333' }}>
            📄 Invoice Management
          </h2>
        </div>
        <button 
          onClick={fetchInvoices}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
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

      {invoices.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '60px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>📄</div>
          <h4 style={{ color: '#333', marginBottom: '10px' }}>No Invoices Found</h4>
          <p style={{ color: '#666' }}>Create your first invoice from a converted quote.</p>
        </div>
      ) : (
        <>
          {/* Filters Section */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>🔍 Filter Invoices</h4>
              <button
                onClick={() => setFilters({ status: '', searchQuery: '', dateRange: '', paymentStatus: '' })}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Search</label>
                <input
                  type="text"
                  placeholder="Invoice #, Guest Name, Lead #"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Payment Status</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  <option value="">All Payment Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="paid">Fully Paid</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Created Date</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  <option value="">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last 90 Days</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3>No invoices match your filters</h3>
              <p>Try adjusting your filter criteria to see more results.</p>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Invoice #</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Guest Name</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Package</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Total Amount</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Progress</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                  const paidCycles = invoice.paymentCycles?.filter(c => c.status === 'paid').length || 0;
                  const totalCycles = invoice.paymentCycles?.length || 0;
                  const progressPercentage = totalCycles > 0 ? (paidCycles / totalCycles) * 100 : 0;

                  return (
                    <tr key={invoice._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '15px' }}>
                        <strong>{invoice.invoiceNumber}</strong>
                        <br />
                        <small style={{ color: '#666' }}>
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </small>
                      </td>
                      <td style={{ padding: '15px' }}>{invoice.guestName}</td>
                      <td style={{ padding: '15px' }}>
                        {invoice.packageCountry}
                        <br />
                        <small style={{ color: '#666' }}>
                          Lead: {invoice.lead?.leadNumber}
                        </small>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <strong>{invoice.currency} {invoice.finalAmount.toLocaleString('en-IN')}</strong>
                      </td>
                      <td style={{ padding: '15px' }}>{getStatusBadge(invoice.status)}</td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            flex: 1,
                            height: '8px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '4px',
                            marginRight: '10px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${progressPercentage}%`,
                              height: '100%',
                              backgroundColor: progressPercentage === 100 ? '#28a745' : '#007bff'
                            }} />
                          </div>
                          <small style={{ color: '#666' }}>
                            {paidCycles}/{totalCycles}
                          </small>
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            onClick={() => handleDownloadPDF(invoice._id, invoice.invoiceNumber)}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Download PDF"
                          >
                            📥
                          </button>
                          <button 
                            onClick={() => openPaymentModal(invoice)}
                            disabled={invoice.status === 'fully_paid'}
                            style={{
                              backgroundColor: invoice.status === 'fully_paid' ? '#6c757d' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              cursor: invoice.status === 'fully_paid' ? 'not-allowed' : 'pointer',
                              fontSize: '12px'
                            }}
                            title="Record Payment"
                          >
                            💳
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ← Back
                </button>
                <h3 style={{ margin: 0 }}>
                  💳 Record Payment - {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <h6 style={{ marginBottom: '10px' }}>Invoice Details</h6>
                <p><strong>Total Amount:</strong> {selectedInvoice.currency} {selectedInvoice.finalAmount.toLocaleString('en-IN')}</p>
                <p><strong>Guest:</strong> {selectedInvoice.guestName}</p>
              </div>
              <div style={{ flex: 1 }}>
                <h6 style={{ marginBottom: '10px' }}>Payment Schedule</h6>
                {selectedInvoice.paymentCycles?.map((cycle) => (
                  <div key={cycle.cycleNumber} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '5px 0'
                  }}>
                    <span>Cycle {cycle.cycleNumber}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '10px' }}>
                        {selectedInvoice.currency} {cycle.amount.toLocaleString('en-IN')}
                      </span>
                      {getStatusBadge(cycle.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(); }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Select Payment Cycle
                  </label>
                  <select
                    value={paymentForm.cycleNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, cycleNumber: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Choose cycle...</option>
                    {selectedInvoice.paymentCycles
                      ?.filter(cycle => cycle.status === 'pending')
                      .map((cycle) => (
                        <option key={cycle.cycleNumber} value={cycle.cycleNumber}>
                          Cycle {cycle.cycleNumber} - {selectedInvoice.currency} {cycle.amount.toLocaleString('en-IN')}
                        </option>
                      ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    UTR Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.utrNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, utrNumber: e.target.value }))}
                    placeholder="Enter UTR number"
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={paymentLoading}
                  style={{
                    backgroundColor: paymentLoading ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: paymentLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {paymentLoading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceListPageSimple;
