import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

const SalesDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('tasks');
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadStatuses, setLeadStatuses] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    travelToCountry: '',
    dateRange: '',
    searchQuery: '',
    followUpDate: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfTravel: '',
    travelToCountry: '',
    status: 'new',
    requirements: '',
    latestComment: '',
    nextFollowUpDate: '',
    tags: '',
    assignedTo: user?._id || '',
    notes: ''
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const fetchMyLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/leads/my-leads?assignedTo=${user._id}&organization=${user.organization._id}`);
      setLeads(response.data);
      setFilteredLeads(response.data);
    } catch (error) {
      console.error('Error fetching my leads:', error);
    } finally {
      setLoading(false);
    }
  }, [user._id, user.organization._id]);

  const fetchLeadStatuses = useCallback(async () => {
    try {
      const response = await axios.get(`/api/organizations/${user.organization._id}/lead-statuses`);
      setLeadStatuses(response.data);
    } catch (error) {
      console.error('Error fetching lead statuses:', error);
    }
  }, [user.organization._id]);

  // Apply filters to leads
  const applyFilters = useCallback(() => {
    let filtered = [...leads];
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }
    
    // Country filter
    if (filters.travelToCountry) {
      filtered = filtered.filter(lead => 
        lead.travelToCountry && lead.travelToCountry.toLowerCase().includes(filters.travelToCountry.toLowerCase())
      );
    }
    
    // Search query filter (name, email, phone, leadNumber)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        (lead.name && lead.name.toLowerCase().includes(query)) ||
        (lead.email && lead.email.toLowerCase().includes(query)) ||
        (lead.phone && lead.phone.includes(query)) ||
        (lead.leadNumber && lead.leadNumber.toLowerCase().includes(query))
      );
    }
    
    // Follow-up date filter
    if (filters.followUpDate && filters.followUpDate !== '') {
      filtered = filtered.filter(lead => {
        if (lead.nextFollowUpDate) {
          const filterDate = new Date(filters.followUpDate);
          const leadFollowUpDate = new Date(lead.nextFollowUpDate);
          return leadFollowUpDate.toDateString() === filterDate.toDateString();
        }
        return false;
      });
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
      
      filtered = filtered.filter(lead => {
        if (lead.dateOfTravel) {
          const travelDate = new Date(lead.dateOfTravel);
          return travelDate <= filterDate;
        }
        return false;
      });
    }
    
    setFilteredLeads(filtered);
  }, [leads, filters]);

  // Update filtered leads when leads or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const maxLeadNumber = leads.length > 0 
        ? Math.max(...leads.map(lead => parseInt(lead.leadNumber.split('-')[1]) || 0), 0)
        : 0;
      const nextLeadNumber = `LN-${String(maxLeadNumber + 1).padStart(4, '0')}`;
      const leadData = {
        ...formData,
        leadNumber: nextLeadNumber,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        organization: user.organization._id
      };
      if (!user?._id) {
        delete leadData.assignedTo;
      }
      await axios.post('/api/leads', leadData);
      fetchMyLeads();
      setShowAddForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        dateOfTravel: '',
        travelToCountry: '',
        status: 'new',
        requirements: '',
        latestComment: '',
        nextFollowUpDate: '',
        tags: '',
        assignedTo: user?._id || '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Error creating lead: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = async (lead) => {
    try {
      // Fetch the lead with populated edit history
      const response = await axios.get(`/api/leads/${lead._id}`);
      const fullLead = response.data;
      setEditingLead(fullLead);
      setFormData({
        name: fullLead.name,
        email: fullLead.email,
        phone: fullLead.phone,
        dateOfTravel: fullLead.dateOfTravel || '',
        travelToCountry: fullLead.travelToCountry || '',
        status: fullLead.status,
        requirements: fullLead.requirements || '',
        latestComment: fullLead.latestComment || '',
        nextFollowUpDate: fullLead.nextFollowUpDate || '',
        tags: fullLead.tags ? fullLead.tags.join(', ') : '',
        assignedTo: fullLead.assignedTo?._id || user?._id || '',
        notes: fullLead.notes || ''
      });
      setShowEditForm(true);
    } catch (error) {
      console.error('Error fetching lead details:', error);
      // Fallback to using the lead from state if fetch fails
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        dateOfTravel: lead.dateOfTravel || '',
        travelToCountry: lead.travelToCountry || '',
        status: lead.status,
        requirements: lead.requirements || '',
        latestComment: lead.latestComment || '',
        nextFollowUpDate: lead.nextFollowUpDate || '',
        tags: lead.tags ? lead.tags.join(', ') : '',
        assignedTo: lead.assignedTo?._id || user?._id || '',
        notes: lead.notes || ''
      });
      setShowEditForm(true);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const leadData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      };
      await axios.put(`/api/leads/${editingLead._id}`, leadData);
      fetchMyLeads();
      setShowEditForm(false);
      setEditingLead(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        dateOfTravel: '',
        travelToCountry: '',
        status: 'new',
        requirements: '',
        latestComment: '',
        nextFollowUpDate: '',
        tags: '',
        assignedTo: user?._id || '',
        notes: ''
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    if (activeView === 'leads') {
      fetchMyLeads();
      fetchLeadStatuses();
    }
  }, [activeView, fetchMyLeads, fetchLeadStatuses]);



  const styles = {
    container: {
      height: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    },
    nav: {
      backgroundColor: '#fff',
      padding: '15px 20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
    },
    navLinks: {
      display: 'flex',
      gap: '20px',
      alignItems: 'center',
    },
    navLink: {
      color: '#333',
      textDecoration: 'none',
      padding: '5px 10px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: '500',
    },
    activeNavLink: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    welcome: {
      fontSize: '18px',
      color: '#333',
      margin: 0,
    },
    menuButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '5px',
      borderRadius: '50%',
      backgroundColor: '#f0f0f0',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdown: {
      position: 'absolute',
      top: '60px',
      right: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      padding: '15px',
      minWidth: '200px',
      zIndex: 1000,
      display: menuOpen ? 'block' : 'none',
    },
    userInfo: {
      marginBottom: '10px',
      fontSize: '16px',
      color: '#666',
    },
    logoutButton: {
      padding: '8px 16px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      width: '100%',
    },
    mainContent: {
      flex: 1,
      padding: '20px',
      overflow: 'auto',
    },
    card: {
      background: 'white',
      padding: '40px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
      maxWidth: '500px',
    },
    section: {
      textAlign: 'left',
      marginTop: '20px',
    },
    taskList: {
      listStyle: 'none',
      padding: '0',
    },
    taskItem: {
      padding: '10px 0',
      borderBottom: '1px solid #eee',
    },
    updateButton: {
      padding: '6px 12px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    th: {
      backgroundColor: '#4a90d9',
      color: 'white',
      padding: '16px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #e9ecef',
      color: '#495057',
      fontSize: '14px'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalHeader: {
      padding: '24px 32px',
      borderBottom: '1px solid #e9ecef',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px 12px 0 0'
    },
    modalTitle: {
      margin: 0,
      fontSize: '28px',
      fontWeight: '600',
      color: '#343a40'
    },
    modalBody: {
      padding: '32px'
    },
    modalFooter: {
      padding: '20px 32px',
      borderTop: '1px solid #e9ecef',
      backgroundColor: '#f8f9fa',
      borderRadius: '0 0 12px 12px',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    fullWidth: {
      gridColumn: '1 / -1'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#495057'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      transition: 'border-color 0.2s'
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    editHistory: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    },
    historyTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '10px',
      color: '#495057'
    },
    historyItem: {
      marginBottom: '10px',
      padding: '8px',
      backgroundColor: 'white',
      borderRadius: '4px',
      border: '1px solid #e9ecef'
    },
    historyMeta: {
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '4px'
    },
    historyChanges: {
      fontSize: '13px',
      color: '#495057'
    }
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navLinks}>
          <span
            style={activeView === 'tasks' ? { ...styles.navLink, ...styles.activeNavLink } : styles.navLink}
            onClick={() => setActiveView('tasks')}
          >
            Tasks
          </span>
          <span
            style={activeView === 'leads' ? { ...styles.navLink, ...styles.activeNavLink } : styles.navLink}
            onClick={() => setActiveView('leads')}
          >
            My Leads
          </span>
          <span
            style={activeView === 'invoices' ? { ...styles.navLink, ...styles.activeNavLink } : styles.navLink}
            onClick={() => navigate('/invoices')}
          >
            Invoices
          </span>
          <span
            style={activeView === 'suppliers' ? { ...styles.navLink, ...styles.activeNavLink } : styles.navLink}
            onClick={() => navigate('/suppliers')}
          >
            Suppliers
          </span>
          <span
            style={activeView === 'calendar' ? { ...styles.navLink, ...styles.activeNavLink } : styles.navLink}
            onClick={() => navigate('/calendar')}
          >
            Calendar
          </span>
        </div>
        <div style={{fontSize: '16px', fontWeight: '600', color: '#333'}}>{user?.organization?.name || 'Organization'}</div>
        <button style={styles.menuButton} onClick={toggleMenu}>👤</button>
        <div style={styles.dropdown}>
          <div style={styles.userInfo}>
            <p>Hello, {user?.name}</p>
            <p>Role: Sales</p>
          </div>
          <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <div style={styles.mainContent}>
        {activeView === 'tasks' && (
          <div style={styles.card}>
            <div style={styles.section}>
              <h3>Sales Tasks</h3>
              <ul style={styles.taskList}>
                <li style={styles.taskItem}>• Generate leads and prospects</li>
                <li style={styles.taskItem}>• Contact potential clients</li>
                <li style={styles.taskItem}>• Close deals and sales</li>
                <li style={styles.taskItem}>• Follow up with existing customers</li>
              </ul>
            </div>
          </div>
        )}
        {activeView === 'leads' && (
          <div style={{width: '100%'}}>
            {loading ? (
              <p style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>Loading leads...</p>
            ) : (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                  <h3 style={{margin: 0, fontSize: '24px', fontWeight: '600', color: '#343a40'}}>My Leads</h3>
                  <button style={{
                    padding: '12px 24px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }} onClick={() => setShowAddForm(true)}>
                    + Add New Lead
                  </button>
                </div>

                {/* Filters Section */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>🔍 Filter Leads</h4>
                    <button
                      onClick={() => setFilters({ status: '', travelToCountry: '', dateRange: '', searchQuery: '', followUpDate: '' })}
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
                        placeholder="Name, Email, Phone, Lead #"
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
                        {leadStatuses.map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Country</label>
                      <input
                        type="text"
                        placeholder="Destination country"
                        value={filters.travelToCountry}
                        onChange={(e) => setFilters(prev => ({ ...prev, travelToCountry: e.target.value }))}
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
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Travel Date</label>
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
                        <option value="week">Next 7 Days</option>
                        <option value="month">Next 30 Days</option>
                        <option value="quarter">Next 90 Days</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Follow Up Date</label>
                      <input
                        type="date"
                        value={filters.followUpDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, followUpDate: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
                    Showing {filteredLeads.length} of {leads.length} leads
                  </div>
                </div>

                {filteredLeads.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6'}}>
                    <p style={{margin: 0, color: '#6c757d', fontSize: '16px'}}>
                      {leads.length === 0 ? 'No leads assigned to you. Click "Add New Lead" to create your first lead.' : 'No leads match your filters. Try adjusting your filter criteria.'}
                    </p>
                  </div>
                ) : (
                  <div style={{overflowX: 'auto'}}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Lead Number</th>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Email</th>
                          <th style={styles.th}>Phone</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Requirements</th>
                          <th style={styles.th}>Country Travelling To</th>
                          <th style={styles.th}>Follow Up Date</th>
                          <th style={styles.th}>Travel Date</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map(lead => (
                          <tr key={lead._id}>
                            <td style={styles.td}>
                <button 
                  onClick={() => navigate(`/lead/${lead.leadNumber}`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    font: 'inherit'
                  }}
                >
                  {lead.leadNumber}
                </button>
              </td>
                            <td style={styles.td}>{lead.name}</td>
                            <td style={styles.td}>{lead.email}</td>
                            <td style={styles.td}>{lead.phone}</td>
                            <td style={styles.td}>{lead.status}</td>
                            <td style={styles.td}>{lead.requirements || '-'}</td>
                            <td style={styles.td}>
                              {lead.travelToCountry ? (
                                <span style={{
                                  backgroundColor: '#e3f2fd',
                                  color: '#1976d2',
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  {lead.travelToCountry}
                                </span>
                              ) : (
                                <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Not specified</span>
                              )}
                            </td>
                            <td style={styles.td}>{lead.nextFollowUpDate || '-'}</td>
                            <td style={styles.td}>{lead.dateOfTravel || '-'}</td>
                            <td style={styles.td}>
                              <button onClick={() => handleEdit(lead)} style={styles.editButton}>Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {showAddForm && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Add New Lead</h3>
              </div>
              <form onSubmit={handleFormSubmit} style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date of Travel</label>
                    <input
                      type="date"
                      name="dateOfTravel"
                      value={formData.dateOfTravel}
                      onChange={handleFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Travel to Country</label>
                    <input
                      type="text"
                      name="travelToCountry"
                      value={formData.travelToCountry}
                      onChange={handleFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      style={styles.select}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Requirements</label>
                    <textarea
                      name="requirements"
                      value={formData.requirements}
                      onChange={handleFormChange}
                      style={styles.textarea}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Latest Comment</label>
                    <textarea
                      name="latestComment"
                      value={formData.latestComment}
                      onChange={handleFormChange}
                      style={styles.textarea}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Next Follow Up Date</label>
                    <input
                      type="date"
                      name="nextFollowUpDate"
                      value={formData.nextFollowUpDate}
                      onChange={handleFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Tags (comma-separated)</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleFormChange}
                      style={styles.input}
                      placeholder="e.g., family, budget, luxury"
                    />
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                      style={styles.textarea}
                    />
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button type="button" style={{padding: '12px 28px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}} onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={{padding: '12px 28px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}>
                    Add Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showEditForm && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Edit Lead</h3>
              </div>
              <form onSubmit={handleUpdate} style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date of Travel</label>
                    <input
                      type="date"
                      name="dateOfTravel"
                      value={formData.dateOfTravel}
                      onChange={handleFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Travel to Country</label>
                    <input
                      type="text"
                      name="travelToCountry"
                      value={formData.travelToCountry}
                      onChange={handleFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      style={styles.select}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Requirements</label>
                    <textarea
                      name="requirements"
                      value={formData.requirements}
                      onChange={handleFormChange}
                      style={styles.textarea}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Latest Comment</label>
                    <textarea
                      name="latestComment"
                      value={formData.latestComment}
                      onChange={handleFormChange}
                      style={styles.textarea}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Next Follow Up Date</label>
                    <input
                      type="date"
                      name="nextFollowUpDate"
                      value={formData.nextFollowUpDate}
                      onChange={handleFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Tags (comma-separated)</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleFormChange}
                      style={styles.input}
                      placeholder="e.g., family, budget, luxury"
                    />
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                      style={styles.textarea}
                    />
                  </div>
                </div>
                {editingLead?.editHistory && editingLead.editHistory.length > 0 && (
                  <div style={styles.editHistory}>
                    <h4 style={styles.historyTitle}>Edit History</h4>
                    {editingLead.editHistory.slice().reverse().map((history, index) => (
                      <div key={index} style={styles.historyItem}>
                        <div style={styles.historyMeta}>
                          <strong>Lead:</strong> {editingLead.leadNumber} • 
                          {history.editedBy ? `${history.editedBy.name} (${history.editedBy.email})` : 'Unknown user'} • 
                          {new Date(history.editedAt).toLocaleString()}
                        </div>
                        <div style={styles.historyChanges}>
                          <strong>Changed:</strong> {history.changes}
                          {history.previousValues && Object.keys(history.previousValues).length > 0 && (
                            <div style={{marginTop: '5px', fontSize: '12px', color: '#6c757d'}}>
                              <strong>Previous values:</strong>
                              {Object.entries(history.previousValues).map(([key, value]) => (
                                <div key={key} style={{marginLeft: '10px'}}>
                                  {key}: {value === null || value === undefined ? 'N/A' : 
                                          Array.isArray(value) ? value.join(', ') : 
                                          value instanceof Date ? value.toLocaleDateString() : 
                                          String(value)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={styles.modalFooter}>
                  <button type="button" style={{padding: '12px 28px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}} onClick={() => setShowEditForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={{padding: '12px 28px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}>
                    Update Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDashboard;
