import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../contexts/AuthContext';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State for dashboard data
  const [leads, setLeads] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [sightseeings, setSightseeings] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSightseeings, setLoadingSightseeings] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    dateRange: '',
    searchQuery: '',
    travelToCountry: '',
    followUpDate: ''
  });
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    requirements: '',
    notes: '',
    dateOfTravel: '',
    nextFollowUpDate: '',
    assignedTo: ''
  });

  // Metrics state
  const [metrics, setMetrics] = useState({
    ongoingLeads: 0,
    convertedLeads: 0,
    totalBookedAmount: 0,
    salesPerformance: []
  });

  // Analytics filters state
  const [analyticsFilters, setAnalyticsFilters] = useState({
    month: new Date().toISOString().slice(0, 7), // Current month YYYY-MM
    salesPerson: 'all'
  });

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/org-login');
  };

  // Download analytics report
  const downloadAnalyticsReport = () => {
    try {
      // Filter leads based on current filters
      let filteredLeads = [...leads];
      
      // Filter by month
      if (analyticsFilters.month !== new Date().toISOString().slice(0, 7)) {
        filteredLeads = filteredLeads.filter(lead => {
          const leadDate = new Date(lead.createdAt || lead.dateCreated);
          return leadDate.toISOString().slice(0, 7) === analyticsFilters.month;
        });
      }
      
      // Filter by sales person
      if (analyticsFilters.salesPerson !== 'all') {
        filteredLeads = filteredLeads.filter(lead => {
          if (typeof lead.assignedTo === 'object') {
            return lead.assignedTo._id === analyticsFilters.salesPerson;
          } else {
            return lead.assignedTo === analyticsFilters.salesPerson;
          }
        });
      }
      
      // Create CSV content
      const csvContent = [
        ['Lead Number', 'Name', 'Email', 'Phone', 'Status', 'Assigned To', 'Requirements', 'Country Travelling To', 'Last Quoted Price', 'Next Follow-up', 'Travel Date'],
        ...filteredLeads.map(lead => [
          lead.leadNumber,
          lead.name,
          lead.email,
          lead.phone,
          lead.status,
          typeof lead.assignedTo === 'object' ? lead.assignedTo.name : lead.assignedTo,
          lead.requirements || '-',
          lead.travelToCountry || '-',
          lead.lastQuotedPrice ? `₹${lead.lastQuotedPrice.toLocaleString('en-IN')}` : 'Not quoted',
          lead.nextFollowUpDate || '-',
          lead.dateOfTravel || '-'
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-report-${analyticsFilters.month}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error downloading report. Please try again.');
    }
  };

  // Download calendar report
  const downloadCalendarReport = () => {
    try {
      // Get current month and year
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // Create calendar data (simplified - just showing leads as calendar events)
      const calendarLeads = leads.filter(lead => {
        const leadDate = new Date(lead.dateOfTravel || lead.createdAt);
        return leadDate.getFullYear() === year && leadDate.getMonth() + 1 === month;
      });
      
      // Create CSV content for calendar
      const csvContent = [
        ['Date', 'Lead Number', 'Name', 'Status', 'Assigned To', 'Travel To', 'Quoted Price'],
        ...calendarLeads.map(lead => [
          lead.dateOfTravel || lead.createdAt,
          lead.leadNumber,
          lead.name,
          lead.status,
          typeof lead.assignedTo === 'object' ? lead.assignedTo.name : lead.assignedTo,
          lead.requirements || '-',
          lead.lastQuotedPrice ? `₹${lead.lastQuotedPrice.toLocaleString('en-IN')}` : 'Not quoted'
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `calendar-report-${year}-${month.toString().padStart(2, '0')}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error downloading calendar report. Please try again.');
    }
  };

  // Fetch quotes for leads and update with last quoted price
  const fetchQuotesAndUpdateLeads = useCallback(async (leadsData) => {
    try {
      // Fetch all quotes for the organization
      const quotesResponse = await api.get(`/quotes?organization=${user.organization._id}`);
      const quotes = quotesResponse.data;
      
      // Create a map of leadId to latest quote price
      const leadLatestQuote = {};
      
      quotes.forEach(quote => {
        const leadRef = quote.lead;
        const leadNumber = quote.leadNumber;
        
        // Try different ways to get the price - prioritize comprehensive totals
        let actualPrice = null;
        
        // Priority 1: grandTotal (most comprehensive)
        if (quote.grandTotal) {
          actualPrice = quote.grandTotal;
        }
        // Priority 2: total (main total field)
        else if (quote.total) {
          actualPrice = quote.total;
        }
        // Priority 3: totalAmount 
        else if (quote.totalAmount) {
          actualPrice = quote.totalAmount;
        }
        // Priority 3: finalPrice
        else if (quote.finalPrice) {
          actualPrice = quote.finalPrice;
        }
        // Priority 4: price
        else if (quote.price) {
          actualPrice = quote.price;
        }
        // Priority 5: amount
        else if (quote.amount) {
          actualPrice = quote.amount;
        }
        // Priority 6: subtotal (least comprehensive - used as fallback)
        else if (quote.subtotal) {
          actualPrice = quote.subtotal;
        }
        // Priority 7: basePrice
        else if (quote.basePrice) {
          actualPrice = quote.basePrice;
        }
        
        // If still no price, use 0
        if (!actualPrice) {
          actualPrice = 0;
        }
        
        // Try both lead ID and lead number for matching
        let matchedLeadId = null;
        
        // Handle when quote.lead is an object
        if (leadRef && typeof leadRef === 'object') {
          matchedLeadId = leadRef._id;
        }
        // Handle when quote.lead is a string ID
        else if (leadRef && typeof leadRef === 'string') {
          matchedLeadId = leadRef;
        }
        // Then try by lead number
        else if (leadNumber) {
          const matchedLead = leadsData.find(lead => lead.leadNumber === leadNumber);
          if (matchedLead) {
            matchedLeadId = matchedLead._id;
          }
        }
        
        if (matchedLeadId) {
          // If this lead doesn't have a quote yet, or this quote is newer/later
          if (!leadLatestQuote[matchedLeadId] || 
              new Date(quote.createdAt) > new Date(leadLatestQuote[matchedLeadId].createdAt)) {
            leadLatestQuote[matchedLeadId] = {
              price: actualPrice,
              createdAt: quote.createdAt
            };
          }
        }
      });
      
      // Update leads with last quoted price
      const updatedLeads = leadsData.map(lead => ({
        ...lead,
        lastQuotedPrice: leadLatestQuote[lead._id]?.price || null
      }));
      
      setLeads(updatedLeads);
    } catch (error) {
      // Set leads without quoted prices if quotes fetch fails
      setLeads(leadsData);
    }
  }, [user.organization._id]);

  // Fetch leads data
  const fetchLeads = useCallback(async () => {
    try {
      const response = await api.get(`/leads?organization=${user.organization._id}`, {
      });
      
      // Fetch quotes and update leads with last quoted price
      await fetchQuotesAndUpdateLeads(response.data || []);
      setLoading(false);
    } catch (error) {
      setLeads([]); // Set empty array on error
      setLoading(false);
    }
  }, [user.organization._id, fetchQuotesAndUpdateLeads]);

  // Fetch sales users and lead statuses
  const fetchSalesUsers = useCallback(async () => {
    try {
      const response = await api.get(`/leads/users/sales?organization=${user.organization._id}`);
      setSalesUsers(response.data || []);

      // Fetch lead statuses - use default statuses if API fails
      try {
        const statusesResponse = await api.get(`/leads/statuses`);
        setLeadStatuses(statusesResponse.data || ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'booking_confirmed', 'lost']);
      } catch (statusError) {
        setLeadStatuses(['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'booking_confirmed', 'lost']);
      }
      setLoading(false);
    } catch (error) {
      setSalesUsers([]); // Set empty array on error
      setLeadStatuses(['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'booking_confirmed', 'lost']);
      setLoading(false);
    }
  }, [user.organization._id]);

  // Fetch sightseeings
  const fetchSightseeings = useCallback(async () => {
    setLoadingSightseeings(true);
    try {
      const response = await api.get(`/sightseeings?organization=${user.organization._id}`);
      setSightseeings(response.data);
    } catch (error) {
      setSightseeings([]);
    } finally {
      setLoadingSightseeings(false);
    }
  }, [user.organization._id]);

  // Fetch transfers
  const fetchTransfers = useCallback(async () => {
    setLoadingTransfers(true);
    try {
      const response = await api.get(`/transfers?organization=${user.organization._id}`);
      setTransfers(response.data);
    } catch (error) {
      setTransfers([]);
    } finally {
      setLoadingTransfers(false);
    }
  }, [user.organization._id]);

  // Fetch hotels
  const fetchHotels = useCallback(async () => {
    try {
      const response = await api.get(`/hotels?organization=${user.organization._id}`);
      setHotels(response.data);
    } catch (error) {
      // Error fetching hotels
    }
  }, [user.organization._id]);

  // Calculate dashboard metrics
  const calculateMetrics = useCallback((leadsData, salesUsersData) => {
    if (!leadsData || !salesUsersData) return;

    // Apply analytics filters
    let filteredLeads = [...leadsData];
    
    // Filter by month
    if (analyticsFilters.month !== new Date().toISOString().slice(0, 7)) {
      filteredLeads = filteredLeads.filter(lead => {
        const leadDate = new Date(lead.createdAt || lead.dateCreated);
        return leadDate.toISOString().slice(0, 7) === analyticsFilters.month;
      });
    }
    
    // Filter by sales person
    if (analyticsFilters.salesPerson !== 'all') {
      filteredLeads = filteredLeads.filter(lead => {
        if (typeof lead.assignedTo === 'object') {
          return lead.assignedTo._id === analyticsFilters.salesPerson;
        } else {
          return lead.assignedTo === analyticsFilters.salesPerson;
        }
      });
    }

    const ongoingLeads = filteredLeads.filter(lead => 
      ['new', 'contacted', 'qualified', 'proposal_sent'].includes(lead.status)
    ).length;

    const convertedLeads = filteredLeads.filter(lead => 
      lead.status === 'converted' || lead.status === 'booking_confirmed'
    ).length;

    const totalBookedAmount = filteredLeads
      .filter(lead => lead.status === 'converted' || lead.status === 'booking_confirmed')
      .reduce((sum, lead) => sum + (lead.lastQuotedPrice || lead.totalAmount || 0), 0);

    // Calculate sales performance
    const salesPerformance = salesUsersData.map(salesUser => {
      
      const userLeads = leadsData.filter(lead => {
        let matchesById = false;
        let matchesByName = false;
        
        if (typeof lead.assignedTo === 'object' && lead.assignedTo !== null) {
          // assignedTo is an object with _id and name
          matchesById = lead.assignedTo._id === salesUser._id;
          matchesByName = lead.assignedTo.name === salesUser.name;
        } else {
          // assignedTo is a string (ID or name)
          matchesById = lead.assignedTo === salesUser._id;
          matchesByName = lead.assignedTo === salesUser.name;
        }
        
        const matches = matchesById || matchesByName;
        
        // Debug logging removed for cleaner console
        
        return matches;
      });
      
      const userConverted = userLeads.filter(lead => 
        lead.status === 'converted' || lead.status === 'booking_confirmed'
      );
      
      const userAmount = userConverted.reduce((sum, lead) => sum + (lead.lastQuotedPrice || lead.totalAmount || 0), 0);

      const performance = {
        id: salesUser._id,
        name: salesUser.name,
        totalLeads: userLeads.length,
        convertedLeads: userConverted.length,
        conversionRate: userLeads.length > 0 ? (userConverted.length / userLeads.length * 100).toFixed(1) : 0,
        totalAmount: userAmount
      };
      
      return performance;
    });

    const newMetrics = {
      ongoingLeads,
      convertedLeads,
      totalBookedAmount,
      salesPerformance
    };

    setMetrics(newMetrics);
  }, [analyticsFilters]);

  // Filter leads based on filters
  const filteredLeads = leads.filter(lead => {
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.assignedTo && lead.assignedTo !== filters.assignedTo) return false;
    if (filters.travelToCountry && !lead.travelToCountry?.toLowerCase().includes(filters.travelToCountry.toLowerCase())) return false;
    if (filters.followUpDate && lead.nextFollowUpDate) {
      const filterDate = new Date(filters.followUpDate);
      const leadFollowUpDate = new Date(lead.nextFollowUpDate);
      // Only show leads that have follow-up on the selected date (ignoring time)
      if (leadFollowUpDate.toDateString() !== filterDate.toDateString()) return false;
    }
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.phone?.toLowerCase().includes(searchLower) ||
        lead.leadNumber?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/leads', {
        ...formData,
        organization: user.organization._id,
        leadNumber: `L-${Date.now()}`
      });
      setLeads(prev => [...prev, response.data]);
      setShowAddForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        requirements: '',
        notes: '',
        dateOfTravel: '',
        nextFollowUpDate: '',
        assignedTo: ''
      });
    } catch (error) {
      // Error creating lead
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus });
      setLeads(prev => prev.map(lead => 
        lead._id === leadId ? { ...lead, status: newStatus } : lead
      ));
    } catch (error) {
      // Error updating lead status
    }
  };

  const handleEditLead = (lead) => {
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      requirements: lead.requirements,
      notes: lead.notes,
      dateOfTravel: lead.dateOfTravel,
      nextFollowUpDate: lead.nextFollowUpDate,
      assignedTo: lead.assignedTo
    });
    setShowAddForm(true);
  };

  const handleDeleteLead = async (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await api.delete(`/leads/${leadId}`);
        setLeads(prev => prev.filter(lead => lead._id !== leadId));
      } catch (error) {
        // Error deleting lead
      }
    }
  };

  // Render leads table function
  const renderLeadsTable = () => {
    if (!filteredLeads || filteredLeads.length === 0) {
      return <div style={{textAlign: 'center', padding: '20px'}}>No leads to display</div>;
    }

    return (
      <div style={{overflowX: 'auto'}}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Lead Number</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Assigned To</th>
              <th style={styles.th}>Requirements</th>
              <th style={styles.th}>Country Travelling To</th>
              <th style={styles.th}>Last Quoted Price</th>
              <th style={styles.th}>Next Follow-up</th>
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
                      fontSize: 'inherit'
                    }}
                  >
                    {lead.leadNumber}
                  </button>
                </td>
                <td style={styles.td}>{lead.name}</td>
                <td style={styles.td}>{lead.email}</td>
                <td style={styles.td}>{lead.phone}</td>
                <td style={styles.td}>
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                    style={{
                      padding: '5px',
                      borderRadius: '3px',
                      border: '1px solid #ddd',
                      fontSize: '12px'
                    }}
                  >
                    {leadStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}>{lead.assignedTo?.name || 'Unassigned'}</td>
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
                <td style={styles.td}>
                  {lead.lastQuotedPrice ? (
                    <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                      ₹{lead.lastQuotedPrice.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Not quoted</span>
                  )}
                </td>
                <td style={styles.td}>{lead.nextFollowUpDate || '-'}</td>
                <td style={styles.td}>{lead.dateOfTravel || '-'}</td>
                <td style={styles.td}>
                  <button 
                    onClick={() => handleEditLead(lead)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginRight: '5px'
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => navigate(`/lead/${lead.leadNumber}`)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginRight: '5px'
                    }}
                  >
                    Quote
                  </button>
                  <button 
                    onClick={() => handleDeleteLead(lead._id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  useEffect(() => {
    if (user && user.organization) {
      // Always fetch leads and sales users for analytics
      fetchLeads();
      fetchSalesUsers();
      
      // Fetch additional data based on active view
      if (activeView === 'sightseeings') {
        fetchSightseeings();
      } else if (activeView === 'transfers') {
        fetchTransfers();
      } else if (activeView === 'hotels') {
        fetchHotels();
      }
      
      // Always set loading to false after a short delay to ensure UI shows
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 2000); // 2 seconds timeout
      
      return () => clearTimeout(timeout);
    } else {
      setLoading(false); // Set loading to false if no user
    }
  }, [fetchLeads, fetchSalesUsers, fetchSightseeings, fetchTransfers, fetchHotels, fetchQuotesAndUpdateLeads, user, activeView]);

  useEffect(() => {
    if (leads.length > 0 && salesUsers.length > 0) {
      calculateMetrics(leads, salesUsers);
    }
  }, [leads, salesUsers, calculateMetrics]);

  // Recalculate metrics when filters change
  useEffect(() => {
    if (leads.length > 0 && salesUsers.length > 0) {
      calculateMetrics(leads, salesUsers);
    }
  }, [analyticsFilters.month, analyticsFilters.salesPerson, leads, salesUsers, calculateMetrics]);

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '1px solid #dee2e6',
      flexWrap: 'wrap',
      gap: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    nav: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    },
    navLink: {
      padding: '8px 16px',
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#666',
      transition: 'all 0.2s'
    },
    activeNavLink: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    metricCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    metricValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#007bff',
      marginBottom: '5px'
    },
    metricLabel: {
      fontSize: '14px',
      color: '#666'
    },
    performanceTable: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      backgroundColor: '#f8f9fa',
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      borderBottom: '2px solid #dee2e6'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #dee2e6'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '20px',
      marginBottom: '20px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="dashboard-title">Manager Dashboard</h1>
            <p className="welcome-message">
              Welcome, {user?.name} • {user?.organization?.name}
            </p>
          </div>
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
        <div className="navigation-tabs">
          <button
            className={`nav-tab ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            Analytics
          </button>
          <button
            className={`nav-tab ${activeView === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveView('tasks')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            Tasks
          </button>
          <button
            className={`nav-tab ${activeView === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveView('leads')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Leads
          </button>
          <button
            className={`nav-tab ${activeView === 'sightseeings' ? 'active' : ''}`}
            onClick={() => setActiveView('sightseeings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Sightseeings
          </button>
          <button
            className={`nav-tab ${activeView === 'transfers' ? 'active' : ''}`}
            onClick={() => setActiveView('transfers')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
            </svg>
            Transfers
          </button>
          <button
            className={`nav-tab ${activeView === 'hotels' ? 'active' : ''}`}
            onClick={() => setActiveView('hotels')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4zm-1 7h-6v-2h6v2z"/>
            </svg>
            Hotels
          </button>
          <button
            className={`nav-tab ${activeView === 'invoices' ? 'active' : ''}`}
            onClick={() => navigate('/invoices')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            Invoices
          </button>
          <button
            className={`nav-tab ${activeView === 'suppliers' ? 'active' : ''}`}
            onClick={() => navigate('/suppliers')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Suppliers
          </button>
          <button
            className={`nav-tab ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => navigate('/calendar')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            Calendar
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      {activeView === 'overview' && (
        <div className="analytics-overview">
          {/* Page Header */}
          <div className="analytics-header">
            <div className="header-content">
              <h1 className="analytics-title">Analytics Overview</h1>
              <p className="analytics-subtitle">Track your team's performance and business metrics</p>
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
              <label className="filter-label">Sales Person</label>
              <select
                value={analyticsFilters.salesPerson}
                onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, salesPerson: e.target.value }))}
                className="filter-select"
              >
                <option value="all">All Sales Team</option>
                {salesUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-actions">
              <button
                onClick={() => downloadAnalyticsReport()}
                className="download-btn primary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                Download Report
              </button>
              
              <button
                onClick={() => downloadCalendarReport()}
                className="download-btn secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                Download Calendar
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
                <div className="metric-value">{metrics.ongoingLeads}</div>
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
                <div className="metric-value">{metrics.convertedLeads}</div>
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
                <div className="metric-value">₹{metrics.totalBookedAmount.toLocaleString('en-IN')}</div>
                <div className="metric-label">Total Booked Amount</div>
                <div className="metric-description">Revenue from conversions</div>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon team">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.998 2.998 0 0 0 17.14 6h-3.28c-.8 0-1.54.38-2.02 1.01L8.03 14H5v8h15zm-5.5-16h3.28l2.5 7.5H19.5L17 6z"/>
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-value">{salesUsers.length}</div>
                <div className="metric-label">Sales Team Members</div>
                <div className="metric-description">Active team members</div>
              </div>
            </div>
          </div>

          {/* Sales Performance Table */}
          <div className="performance-section">
            <div className="performance-header">
              <h3 className="performance-title">Sales Performance</h3>
              <div className="performance-description">Individual team member performance metrics</div>
            </div>
            <div className="performance-table-container">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Sales Person</th>
                    <th>Total Leads</th>
                    <th>Converted</th>
                    <th>Conversion Rate</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.salesPerformance.map((performance, index) => (
                    <tr key={performance.id}>
                      <td className="person-cell">
                        <div className="person-info">
                          <div className="person-avatar">
                            {performance.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="person-name">{performance.name}</div>
                        </div>
                      </td>
                      <td className="number-cell">{performance.totalLeads}</td>
                      <td className="number-cell">{performance.convertedLeads}</td>
                      <td className="rate-cell">
                        <div className="rate-badge">
                          {performance.conversionRate}%
                        </div>
                      </td>
                      <td className="amount-cell">₹{performance.totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leads View - Same as Operations Dashboard */}
      {activeView === 'leads' && (
        <div style={{width: '100%'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
            <h3 style={{margin: 0, fontSize: '24px', fontWeight: '600', color: '#343a40'}}>All Leads</h3>
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
                    onClick={() => setFilters({ status: '', travelToCountry: '', dateRange: '', searchQuery: '', assignedTo: '', followUpDate: '' })}
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
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>Assigned To</label>
                    <select
                      value={filters.assignedTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">All Users</option>
                      {salesUsers.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
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
                    {leads.length === 0 ? 'No leads found. Click "Add New Lead" to create your first lead.' : 'No leads match your filters. Try adjusting your filter criteria.'}
                  </p>
                </div>
              ) : (
                renderLeadsTable()
              )}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Add New Lead</h3>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Travel Date</label>
                  <input
                    type="date"
                    name="dateOfTravel"
                    value={formData.dateOfTravel}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Requirements</label>
                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      minHeight: '80px'
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      minHeight: '80px'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hotels View */}
      {activeView === 'hotels' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#333' }}>Hotels</h3>
            <button style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              + Add Hotel
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {hotels.map(hotel => (
              <div key={hotel._id} style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: '#333' }}>{hotel.name}</h4>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: hotel.rating >= 4 ? '#28a745' : hotel.rating >= 3 ? '#ffc107' : '#dc3545',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    ⭐ {hotel.rating || 'N/A'}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
                  📍 {hotel.address}
                </p>
                <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
                  📞 {hotel.phone}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {hotel.roomCategories?.length || 0} room types
                  </span>
                  <div>
                    <button style={{
                      padding: '4px 8px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginRight: '5px'
                    }}>
                      Edit
                    </button>
                    <button style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {hotels.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              No hotels found. Click "Add Hotel" to create one.
            </div>
          )}
        </div>
      )}

      {/* Sightseeings View */}
      {activeView === 'sightseeings' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#333' }}>Sightseeings</h3>
            <button style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              + Add Sightseeing
            </button>
          </div>
          
          {loadingSightseeings ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              Loading sightseeings...
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {sightseeings.map(sightseeing => (
                  <div key={sightseeing._id} style={{
                    backgroundColor: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{sightseeing.name}</h4>
                    <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
                      {sightseeing.description?.substring(0, 100)}...
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#007bff' }}>
                        ₹{sightseeing.rate?.toLocaleString('en-IN')}/person
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {sightseeing.duration} hours
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {sightseeings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  No sightseeings found. Click "Add Sightseeing" to create one.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Transfers View */}
      {activeView === 'transfers' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#333' }}>Transfers</h3>
            <button style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              + Add Transfer
            </button>
          </div>
          
          {loadingTransfers ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              Loading transfers...
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>From</th>
                      <th style={styles.th}>To</th>
                      <th style={styles.th}>Vehicle Type</th>
                      <th style={styles.th}>Capacity</th>
                      <th style={styles.th}>Rate</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map(transfer => (
                      <tr key={transfer._id}>
                        <td style={styles.td}>{transfer.name}</td>
                        <td style={styles.td}>{transfer.fromLocation}</td>
                        <td style={styles.td}>{transfer.toLocation}</td>
                        <td style={styles.td}>{transfer.vehicleType}</td>
                        <td style={styles.td}>{transfer.capacity} persons</td>
                        <td style={styles.td}>₹{transfer.rate?.toLocaleString('en-IN')}</td>
                        <td style={styles.td}>
                          <button style={{
                            padding: '4px 8px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginRight: '5px'
                          }}>
                            Edit
                          </button>
                          <button style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {transfers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    No transfers found. Click "Add Transfer" to create one.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
