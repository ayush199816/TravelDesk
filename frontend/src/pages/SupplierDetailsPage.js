import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const SupplierDetailsPage = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchSupplierDetails = useCallback(async () => {
    try {
      const response = await api.get(`/suppliers/${supplierId}/details`);
      setSupplier(response.data);
    } catch (err) {
      setError('Error fetching supplier details');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchSupplierDetails();
  }, [supplierId, fetchSupplierDetails]);

  const markPaymentAsPaid = async (paymentId) => {
    try {
      await api.patch(`/supplier-assignments/${paymentId}/mark-paid`, {
        paymentReference: 'Manual Payment',
        notes: 'Marked as paid from supplier details page'
      });

      // Refresh supplier details to show updated payment status
      fetchSupplierDetails();
      alert('Payment marked as paid successfully!');
    } catch (err) {
      alert('Error marking payment as paid: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading supplier details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: 'red' }}>{error}</div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Supplier not found</div>
      </div>
    );
  }

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    },
    header: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    tabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      borderBottom: '2px solid #dee2e6'
    },
    tab: {
      padding: '10px 20px',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: '2px solid transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    activeTab: {
      borderBottom: '2px solid #007bff',
      color: '#007bff'
    },
    tabContent: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#495057'
    },
    statLabel: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '5px'
    },
    activityCard: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '10px',
      border: '1px solid #dee2e6'
    },
    paymentCard: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '10px',
      border: '1px solid #dee2e6'
    },
    paidPayment: {
      borderLeft: '4px solid #28a745'
    },
    pendingPayment: {
      borderLeft: '4px solid #ffc107'
    },
    overduePayment: {
      borderLeft: '4px solid #dc3545'
    }
  };

  const renderOverview = () => (
    <div>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{supplier.stats?.totalActivities || 0}</div>
          <div style={styles.statLabel}>Total Activities</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{supplier.stats?.pendingPayments || 0}</div>
          <div style={styles.statLabel}>Pending Payments</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{supplier.stats?.paidPayments || 0}</div>
          <div style={styles.statLabel}>Paid Payments</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>₹{(supplier.stats?.totalAmount || 0).toLocaleString('en-IN')}</div>
          <div style={styles.statLabel}>Total Amount</div>
        </div>
      </div>

      <div style={styles.tabContent}>
        <h4 style={{ marginBottom: '15px' }}>Recent Activities</h4>
        {supplier.recentActivities && supplier.recentActivities.length > 0 ? (
          supplier.recentActivities.slice(0, 5).map((activity, index) => (
            <div key={index} style={styles.activityCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{activity.name}</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {activity.type} • {activity.quoteNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(activity.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>₹{activity.amount?.toLocaleString('en-IN')}</div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: activity.paymentStatus === 'paid' ? '#28a745' : '#ffc107' 
                  }}>
                    {activity.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: '#666' }}>No recent activities</p>
        )}
      </div>
    </div>
  );

  const renderActivities = () => (
    <div style={styles.tabContent}>
      <h4 style={{ marginBottom: '15px' }}>Assigned Activities</h4>
      {supplier.activities && supplier.activities.length > 0 ? (
        supplier.activities.map((activity, index) => (
          <div key={index} style={styles.activityCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{activity.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Type: {activity.type} • Quote: {activity.quoteNumber}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Date: {new Date(activity.date).toLocaleDateString()}
                </div>
                {activity.details && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {activity.details}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold' }}>₹{activity.amount?.toLocaleString('en-IN')}</div>
                <div style={{ 
                  fontSize: '12px', 
                  color: activity.paymentStatus === 'paid' ? '#28a745' : '#ffc107' 
                }}>
                  {activity.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p style={{ textAlign: 'center', color: '#666' }}>No activities assigned</p>
      )}
    </div>
  );

  const renderPayments = () => {
    const payments = supplier.payments || [];
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const paidPayments = payments.filter(p => p.status === 'paid');

    return (
      <div style={styles.tabContent}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '15px' }}>Payment Summary</h4>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{pendingPayments.length}</div>
              <div style={styles.statLabel}>Pending Payments</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{paidPayments.length}</div>
              <div style={styles.statLabel}>Paid Payments</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                ₹{pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN')}
              </div>
              <div style={styles.statLabel}>Pending Amount</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                ₹{paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN')}
              </div>
              <div style={styles.statLabel}>Paid Amount</div>
            </div>
          </div>
        </div>

        <h4 style={{ marginBottom: '15px' }}>Payment History</h4>
        {payments.length > 0 ? (
          payments.map((payment, index) => {
            let cardStyle = styles.paymentCard;
            if (payment.status === 'paid') {
              cardStyle = { ...styles.paymentCard, ...styles.paidPayment };
            } else if (payment.status === 'pending') {
              cardStyle = { ...styles.paymentCard, ...styles.pendingPayment };
            }

            return (
              <div key={index} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{payment.activityName}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Type: {payment.activityType} • Quote: {payment.quoteNumber}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Due Date: {new Date(payment.dueDate).toLocaleDateString()}
                    </div>
                    {payment.paidDate && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Paid Date: {new Date(payment.paidDate).toLocaleDateString()}
                      </div>
                    )}
                    {payment.utrNumber && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        UTR: {payment.utrNumber}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold' }}>₹{payment.amount?.toLocaleString('en-IN')}</div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: payment.status === 'paid' ? '#28a745' : 
                             payment.status === 'pending' ? '#ffc107' : '#dc3545'
                    }}>
                      {payment.status === 'paid' ? '✅ Paid' : 
                       payment.status === 'pending' ? '⏳ Pending' : '❌ Overdue'}
                    </div>
                    {payment.status === 'pending' && (
                      <button
                        onClick={() => markPaymentAsPaid(payment.paymentId)}
                        style={{
                          marginTop: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p style={{ textAlign: 'center', color: '#666' }}>No payments found</p>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '15px'
            }}
          >
            ← Back
          </button>
          
          <h2 style={{ margin: 0, color: '#333' }}>{supplier.name}</h2>
          <div style={{ color: '#666', marginTop: '5px' }}>
            {supplier.type} • {supplier.contact} • {supplier.email}
          </div>
          {supplier.services && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ 
                backgroundColor: '#e9ecef', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                fontSize: '12px',
                marginRight: '5px'
              }}>
                {supplier.services.join(' • ')}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'activities' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('activities')}
          >
            Activities ({supplier.activities?.length || 0})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'payments' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('payments')}
          >
            Payments ({supplier.payments?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'activities' && renderActivities()}
        {activeTab === 'payments' && renderPayments()}
      </div>
    </div>
  );
};

export default SupplierDetailsPage;
