import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api/axios';
import NotificationBell from '../components/NotificationBell';
import './SalesDashboard.css';

const SalesDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('analytics');
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  
  // Analytics filters
  const [analyticsFilters, setAnalyticsFilters] = useState({
    month: new Date().toISOString().slice(0, 7),
    startDate: '',
    endDate: ''
  });
  
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

  const toggleSidebar = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const closeSidebar = () => {
    setMenuOpen(false);
  };

  const fetchMyLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/leads/my-leads?assignedTo=${user._id}&organization=${user.organization._id}`);
      setLeads(response.data);
      setFilteredLeads(response.data);
    } catch (error) {
      // Error fetching my leads
    } finally {
      setLoading(false);
    }
  }, [user._id, user.organization._id]);

  const fetchLeadStatuses = useCallback(async () => {
    try {
      const response = await api.get(`/organizations/${user.organization._id}/lead-statuses`);
      setLeadStatuses(response.data);
    } catch (error) {
      // Error fetching lead statuses
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
      await api.post('/leads', leadData);
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
      alert('Error creating lead: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = async (lead) => {
    try {
      // Fetch the lead with populated edit history
      const response = await api.get(`/leads/${lead._id}`);
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
    setUpdatingLead(true);
    setUpdateMessage('Updating lead...');
    
    try {
      const leadData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      };
      await api.put(`/leads/${editingLead._id}`, leadData);
      fetchMyLeads();
      
      setUpdateMessage('Lead updated successfully!');
      
      setTimeout(() => {
        setShowEditForm(false);
        setEditingLead(null);
        setUpdateMessage('');
      }, 2000);
      
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
      setUpdateMessage('Error updating lead: ' + (error.response?.data?.message || error.message));
      setTimeout(() => {
        setUpdateMessage('');
      }, 3000);
    } finally {
      setUpdatingLead(false);
    }
  };

  useEffect(() => {
    if (activeView === 'leads' || activeView === 'analytics') {
      fetchMyLeads();
      if (activeView === 'leads') {
        fetchLeadStatuses();
      }
    }
  }, [activeView, fetchMyLeads, fetchLeadStatuses]);

  // Calculate sales analytics metrics
  const analytics = useMemo(() => {
    let userLeads = leads.filter(lead => lead.assignedTo === user?._id);
    
    // Apply date filters
    if (analyticsFilters.startDate || analyticsFilters.endDate) {
      userLeads = userLeads.filter(lead => {
        const leadDate = lead.dateOfTravel ? new Date(lead.dateOfTravel) : null;
        if (!leadDate) return false;
        
        const startDate = analyticsFilters.startDate ? new Date(analyticsFilters.startDate) : null;
        const endDate = analyticsFilters.endDate ? new Date(analyticsFilters.endDate) : null;
        
        if (startDate && leadDate < startDate) return false;
        if (endDate && leadDate > endDate) return false;
        
        return true;
      });
    } else if (analyticsFilters.month) {
      // Filter by month
      const selectedMonth = new Date(analyticsFilters.month);
      userLeads = userLeads.filter(lead => {
        const leadDate = lead.dateOfTravel ? new Date(lead.dateOfTravel) : null;
        if (!leadDate) return false;
        
        return leadDate.getMonth() === selectedMonth.getMonth() &&
               leadDate.getFullYear() === selectedMonth.getFullYear();
      });
    }
    
    let ongoingLeads = 0;
    let convertedLeads = 0;
    let totalSalesAmount = 0;
    let todayFollowups = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    userLeads.forEach(lead => {
      // Count ongoing leads (not converted)
      if (lead.status !== 'converted' && lead.status !== 'lost') {
        ongoingLeads++;
      }
      
      // Count converted leads
      if (lead.status === 'converted') {
        convertedLeads++;
        // Add sales amount if available
        if (lead.totalAmount) {
          totalSalesAmount += parseFloat(lead.totalAmount);
        }
      }
      
      // Count leads with today's follow-up date
      if (lead.nextFollowUpDate) {
        const followUpDate = new Date(lead.nextFollowUpDate);
        followUpDate.setHours(0, 0, 0, 0);
        if (followUpDate.getTime() === today.getTime()) {
          todayFollowups++;
        }
      }
    });
    
    return {
      ongoingLeads,
      convertedLeads,
      totalSalesAmount,
      totalLeads: userLeads.length,
      conversionRate: userLeads.length > 0 ? ((convertedLeads / userLeads.length) * 100).toFixed(1) : 0,
      todayFollowups
    };
  }, [leads, user?._id, analyticsFilters]);



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
      display: userMenuOpen ? 'block' : 'none',
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
    <div className="sales-dashboard">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="logo-icon">DS</div>
            <span className="logo-text">DMCstation</span>
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            <button
              className={`nav-item ${activeView === 'analytics' ? 'nav-active' : ''}`}
              onClick={() => { setActiveView('analytics'); closeSidebar(); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              <span>Analytics</span>
            </button>
            <button
              className={`nav-item ${activeView === 'tasks' ? 'nav-active' : ''}`}
              onClick={() => { setActiveView('tasks'); closeSidebar(); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <span>Tasks</span>
            </button>
            <button
              className={`nav-item ${activeView === 'leads' ? 'nav-active' : ''}`}
              onClick={() => { setActiveView('leads'); closeSidebar(); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>My Leads</span>
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Management</div>
            <button
              className={`nav-item ${activeView === 'invoices' ? 'nav-active' : ''}`}
              onClick={() => { navigate('/invoices'); closeSidebar(); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <span>Invoices</span>
            </button>
            <button
              className={`nav-item ${activeView === 'calendar' ? 'nav-active' : ''}`}
              onClick={() => { navigate('/calendar'); closeSidebar(); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <span>Calendar</span>
            </button>
          </div>
        </nav>

        {/* Logout Button */}
        <div style={{ padding: '0 16px 24px' }}>
          <button
            onClick={handleLogout}
            className="logout-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-toggle" onClick={toggleSidebar}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </button>
            <div className="page-title">
              <h1>Sales Dashboard</h1>
              <p>Welcome back, {user?.name}</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell />
            <div className="org-info">
              <span className="org-name">{user?.organization?.name || 'Organization'}</span>
            </div>
            <div className="user-dropdown">
              <button className="user-menu-btn" onClick={toggleUserMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </button>
              <div className={`user-dropdown-menu ${userMenuOpen ? 'dropdown-open' : ''}`}>
                <div className="user-dropdown-item">{user?.name}</div>
                <div className="user-dropdown-item">Role: Sales</div>
                <div className="user-dropdown-item" onClick={handleLogout}>Logout</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
        
        {/* Update Message Notification */}
        {updateMessage && (
          <div className={`update-notification ${updatingLead ? 'updating' : ''}`}>
            <div className="notification-content">
              {updatingLead && (
                <div className="notification-spinner"></div>
              )}
              <span className="notification-text">{updateMessage}</span>
              <button className="notification-close" onClick={() => setUpdateMessage('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="analytics-overview">
            {/* Page Header */}
            <div className="analytics-header">
              <div className="header-content">
                <h1 className="analytics-title">Sales Analytics</h1>
                <p className="analytics-subtitle">Track your sales performance and metrics</p>
              </div>
            </div>

            {/* Analytics Filters */}
            <div className="analytics-filters">
              <div className="filter-group">
                <label className="filter-label">Month</label>
                <input
                  type="month"
                  value={analyticsFilters.month}
                  onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, month: e.target.value }))}
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Start Date</label>
                <input
                  type="date"
                  value={analyticsFilters.startDate}
                  onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label className="filter-label">End Date</label>
                <input
                  type="date"
                  value={analyticsFilters.endDate}
                  onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="filter-input"
                />
              </div>
              
              <div className="filter-actions">
                <button
                  onClick={() => setAnalyticsFilters({
                    month: new Date().toISOString().slice(0, 7),
                    startDate: '',
                    endDate: ''
                  })}
                  className="download-btn secondary"
                >
                  Reset Filters
                </button>
              </div>
            </div>
            
            {/* Metrics Cards */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon ongoing">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{analytics.ongoingLeads}</div>
                  <div className="metric-label">Ongoing Leads</div>
                  <div className="metric-description">Active leads in pipeline</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon converted">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{analytics.convertedLeads}</div>
                  <div className="metric-label">Converted Leads</div>
                  <div className="metric-description">Successfully closed deals</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon revenue">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.81.45 1.61 1.67 1.61 1.16 0 1.6-.64 1.6-1.46 0-.84-.68-1.22-1.88-1.58-1.85-.54-3.21-1.36-3.21-3.23 0-1.61 1.21-2.75 2.95-3.08V4.9h2.67v2.06c1.42.35 2.59 1.42 2.7 2.95h-1.96c-.05-.6-.38-1.55-1.75-1.55-1.03 0-1.52.52-1.52 1.3 0 .73.56 1.09 1.88 1.51 1.87.55 3.21 1.34 3.21 3.37 0 1.78-1.32 2.86-3.08 3.2z"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value">₹{analytics.totalSalesAmount.toLocaleString('en-IN')}</div>
                  <div className="metric-label">Total Sales Amount</div>
                  <div className="metric-description">Revenue from conversions</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon team">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{analytics.conversionRate}%</div>
                  <div className="metric-label">Conversion Rate</div>
                  <div className="metric-description">Lead to sales conversion</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon ongoing">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V8h14v12H19zM7 10h5v5H7z"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{analytics.todayFollowups}</div>
                  <div className="metric-label">Today's Follow-ups</div>
                  <div className="metric-description">Leads requiring follow-up today</div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="performance-section">
              <div className="performance-header">
                <h3 className="performance-title">Performance Summary</h3>
                <div className="performance-description">Your sales performance overview</div>
              </div>
              <div className="performance-summary">
                <div className="summary-item">
                  <div className="summary-label">Total Leads</div>
                  <div className="summary-value">{analytics.totalLeads}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Conversion Rate</div>
                  <div className="summary-value">{analytics.conversionRate}%</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Average Deal Value</div>
                  <div className="summary-value">
                    ₹{analytics.convertedLeads > 0 
                      ? (analytics.totalSalesAmount / analytics.convertedLeads).toLocaleString('en-IN')
                      : '0'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
    </div>
  );
};

export default SalesDashboard;
