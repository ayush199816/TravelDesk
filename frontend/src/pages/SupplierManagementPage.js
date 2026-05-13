import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SupplierManagementPage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [filter, setFilter] = useState({ type: '', status: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'hotel',
    contactPerson: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    gstNumber: '',
    panNumber: '',
    bankDetails: {
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      accountHolderName: ''
    },
    services: []
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);
      
      const response = await axios.get(`/api/suppliers?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuppliers(response.data);
    } catch (error) {
      setError('Error fetching suppliers');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Filter suppliers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchLower) ||
        (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchLower)) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchLower)) ||
        (supplier.phone && supplier.phone.includes(searchTerm)) ||
        (supplier.type && supplier.type.toLowerCase().includes(searchLower)) ||
        (supplier.address?.city && supplier.address.city.toLowerCase().includes(searchLower)) ||
        (supplier.address?.country && supplier.address.country.toLowerCase().includes(searchLower))
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`/api/suppliers/${editingSupplier._id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post('/api/suppliers', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      
      setShowAddForm(false);
      setEditingSupplier(null);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      setError(error.response?.data?.message || 'Error saving supplier');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setShowAddForm(true);
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to deactivate this supplier?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchSuppliers();
    } catch (error) {
      setError(error.response?.data?.message || 'Error deactivating supplier');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'hotel',
      contactPerson: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      },
      gstNumber: '',
      panNumber: '',
      bankDetails: {
        accountNumber: '',
        bankName: '',
        ifscCode: '',
        accountHolderName: ''
      },
      services: []
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: '#28a745',
      inactive: '#6c757d',
      blacklisted: '#dc3545'
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

  const getTypeBadge = (type) => {
    const colors = {
      hotel: '#007bff',
      flight: '#17a2b8',
      transport: '#ffc107',
      sightseeing: '#28a745',
      activity: '#6f42c1',
      other: '#6c757d'
    };
    return (
      <span style={{
        backgroundColor: colors[type] || '#6c757d',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {type.toUpperCase()}
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
        <p style={{ marginTop: '15px' }}>Loading suppliers...</p>
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
            🏢 Supplier Management
          </h2>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setEditingSupplier(null);
            setShowAddForm(true);
          }}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          ➕ Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>🔍 Search</label>
            <input
              type="text"
              placeholder="Search by name, contact, email, phone, type, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            {searchTerm && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Found {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Type</label>
            <select 
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="">All Types</option>
              <option value="hotel">Hotel</option>
              <option value="flight">Flight</option>
              <option value="transport">Transport</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="activity">Activity</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
            <select 
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>
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

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏢</div>
          <h4 style={{ color: '#333', marginBottom: '10px' }}>No Suppliers Found</h4>
          <p style={{ color: '#666' }}>Add your first supplier to get started.</p>
        </div>
      ) : filteredSuppliers.length === 0 && searchTerm ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔍</div>
          <h4 style={{ color: '#333', marginBottom: '10px' }}>No Suppliers Found</h4>
          <p style={{ color: '#666', marginBottom: '20px' }}>No suppliers matching "{searchTerm}"</p>
          <button 
            onClick={() => setSearchTerm('')}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            Clear Search
          </button>
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
                  <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Contact Person</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Phone</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '15px' }}>
                      <strong 
                        onClick={() => navigate(`/supplier/${supplier._id}`)}
                        style={{
                          color: '#007bff',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {supplier.name}
                      </strong>
                      {supplier.gstNumber && (
                        <>
                          <br />
                          <small style={{ color: '#666' }}>GST: {supplier.gstNumber}</small>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '15px' }}>{getTypeBadge(supplier.type)}</td>
                    <td style={{ padding: '15px' }}>{supplier.contactPerson}</td>
                    <td style={{ padding: '15px' }}>{supplier.email}</td>
                    <td style={{ padding: '15px' }}>{supplier.phone}</td>
                    <td style={{ padding: '15px' }}>{getStatusBadge(supplier.status)}</td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => handleEdit(supplier)}
                          style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDelete(supplier._id)}
                          disabled={supplier.status === 'active' && suppliers.filter(s => s.status === 'active').length <= 1}
                          style={{
                            backgroundColor: supplier.status === 'active' && suppliers.filter(s => s.status === 'active').length <= 1 ? '#6c757d' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            cursor: supplier.status === 'active' && suppliers.filter(s => s.status === 'active').length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                          title="Deactivate"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      {showAddForm && (
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
              <h3 style={{ margin: 0 }}>
                {editingSupplier ? '✏️ Edit Supplier' : '➕ Add New Supplier'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSupplier(null);
                  resetForm();
                }}
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

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="hotel">Hotel</option>
                    <option value="flight">Flight</option>
                    <option value="transport">Transport</option>
                    <option value="sightseeing">Sightseeing</option>
                    <option value="activity">Activity</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contact Person *</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>GST Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>PAN Number</label>
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value }))}
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
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
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
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: 'pointer'
                  }}
                >
                  {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagementPage;
