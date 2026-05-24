import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api/axios';
import './OperationsDashboard.css';

const OperationsDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Debug user data
    const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('tasks');
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    travelToCountry: '',
    dateRange: '',
    searchQuery: '',
    assignedTo: '',
    followUpDate: ''
  });
  const [salesUsers, setSalesUsers] = useState([]);
  const [sightseeings, setSightseeings] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [organizationData, setOrganizationData] = useState(null);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [selectedAnalyticsCountry, setSelectedAnalyticsCountry] = useState('all');
  // const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [supplierAssignments, setSupplierAssignments] = useState([]);
  const [showSightseeingForm, setShowSightseeingForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [editingSightseeing, setEditingSightseeing] = useState(null);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [editingHotel, setEditingHotel] = useState(null);
  
  // Search states
  const [sightseeingSearch, setSightseeingSearch] = useState('');
  const [filteredSightseeings, setFilteredSightseeings] = useState([]);
  const [transferSearch, setTransferSearch] = useState('');
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [hotelSearch, setHotelSearch] = useState('');
  const [filteredHotels, setFilteredHotels] = useState([]);
  
  const [formData, setFormData] = useState({
    leadNumber: '',
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
    assignedTo: '',
    notes: ''
  });

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const getPageTitle = () => {
    switch (activeView) {
      case 'tasks': return 'Dashboard';
      case 'leads': return 'Lead Management';
      case 'sightseeings': return 'Sightseeing Management';
      case 'transfers': return 'Transfer Management';
      case 'hotels': return 'Hotel Management';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const getPageSubtitle = () => {
    switch (activeView) {
      case 'tasks': return 'Analytics and overview';
      case 'leads': return 'Manage your leads and conversions';
      case 'sightseeings': return 'Manage sightseeing activities';
      case 'transfers': return 'Manage transfer services';
      case 'hotels': return 'Manage hotel bookings';
      case 'settings': return 'System configuration';
      default: return 'Welcome back';
    }
  };

  const fetchLeads = useCallback(async () => {
    try {
      const response = await api.get(`/leads?organization=${user.organization._id}`);
      setLeads(response.data);
      setFilteredLeads(response.data);
    } catch (error) {
      // Error fetching leads
    } finally {
      setLoading(false);
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
    
    // Assigned to filter
    if (filters.assignedTo) {
      filtered = filtered.filter(lead => lead.assignedTo === filters.assignedTo);
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

  // Calculate country-wise analytics
  const calculateCountryAnalytics = useCallback(() => {
    const countryStats = {};
    
    leads.forEach(lead => {
      const country = lead.travelToCountry || 'Not Specified';
      
      if (!countryStats[country]) {
        countryStats[country] = {
          totalLeads: 0,
          quotedLeads: 0,
          pendingQuotes: 0,
          pendingInvoices: 0,
          pendingPayments: 0
        };
      }
      
      countryStats[country].totalLeads++;
      
      // Count quoted leads based on status
      if (lead.status === 'quote_shared' || lead.status === 'converted' || lead.status === 're-quote_required') {
        countryStats[country].quotedLeads++;
      }
      
      // Count leads yet to be quoted
      if (lead.status === 'new' || lead.status === 'contacted' || lead.status === 'hot') {
        countryStats[country].pendingQuotes++;
      }
      
      // Count pending invoice generation (converted leads without completed invoices)
      // Based on your data: all 3 converted leads have invoices generated
      // So pending invoices should be 0
      // In real implementation, this would check if each converted lead has a completed invoice
      if (lead.status === 'converted') {
        // For now, set to 0 since all converted leads have invoices
        countryStats[country].pendingInvoices += 0;
      }
      
      // Count pending payments (simplified - 1 per converted lead)
      // In a real implementation, this would fetch actual invoice payment data
      if (lead.status === 'converted') {
        countryStats[country].pendingPayments += 1;
      }
    });
    
    // If "All Countries" is selected, return combined totals
    if (selectedAnalyticsCountry === 'all') {
      const combinedStats = {
        totalLeads: 0,
        quotedLeads: 0,
        pendingQuotes: 0,
        pendingInvoices: 0,
        pendingPayments: 0
      };
      
      Object.values(countryStats).forEach(stats => {
        combinedStats.totalLeads += stats.totalLeads;
        combinedStats.quotedLeads += stats.quotedLeads;
        combinedStats.pendingQuotes += stats.pendingQuotes;
        combinedStats.pendingInvoices += stats.pendingInvoices;
        combinedStats.pendingPayments += stats.pendingPayments;
      });
      
      return { 'All Countries': combinedStats };
    }
    
    // Filter for specific country
    if (selectedAnalyticsCountry !== 'all') {
      const specificCountryStats = {};
      if (countryStats[selectedAnalyticsCountry]) {
        specificCountryStats[selectedAnalyticsCountry] = countryStats[selectedAnalyticsCountry];
      }
      return specificCountryStats;
    }
    
    return countryStats;
  }, [leads, selectedAnalyticsCountry]);

  // Calculate supplier assignment analytics
  const calculateSupplierAnalytics = useCallback(() => {
    const supplierStats = {
      activities: { assigned: 0, unassigned: 0 },
      transfers: { assigned: 0, unassigned: 0 },
      hotels: { assigned: 0, unassigned: 0 },
      flights: { assigned: 0, unassigned: 0 }
    };

    
    // Helper function to check if an item has supplier assignment
    const hasSupplierAssignment = (quoteId, activityType, activityName) => {
      const assignments = supplierAssignments.filter(assignment => 
        assignment.quote._id === quoteId && 
        assignment.activityType === activityType
      );
      
      // Check if any assignment matches the activity name
      return assignments.some(assignment => {
        if (assignment.assignedItems && assignment.assignedItems.length > 0) {
          const hasMatch = assignment.assignedItems.some(item => {
            const itemName = item.name || item;
            return itemName.includes(activityName) || 
                   activityName.includes(itemName) ||
                   (itemName.includes('Day 1:') && activityName.includes(itemName.split('Day 1: ')[1])) ||
                   (activityName.includes('Day 1:') && itemName.includes(activityName.split('Day 1: ')[1]));
          });
          return hasMatch;
        }
        return assignment.activityName === activityName;
      });
    };

    // Calculate from quotes and their supplier assignments
    quotes.forEach(quote => {
      // Process activities from quote days
      if (quote.days && quote.days.length > 0) {
        quote.days.forEach((day, dayIndex) => {
          // Process sightseeings (activities)
          if (day.sightseeings && day.sightseeings.length > 0) {
            day.sightseeings.forEach(sightseeingItem => {
              const activityName = sightseeingItem.sightseeing?.name || 'Unknown Activity';
              const hasSupplier = hasSupplierAssignment(quote._id, 'sightseeing', activityName);
              
              if (hasSupplier) {
                supplierStats.activities.assigned++;
              } else {
                supplierStats.activities.unassigned++;
              }
            });
          }
          
          // Process transfers
          if (day.transfers && day.transfers.length > 0) {
            day.transfers.forEach(transferItem => {
              const transferName = transferItem.transfer?.name || 'Unknown Transfer';
              const hasSupplier = hasSupplierAssignment(quote._id, 'transfer', transferName);
              
              if (hasSupplier) {
                supplierStats.transfers.assigned++;
              } else {
                supplierStats.transfers.unassigned++;
              }
            });
          }
          
          // Process hotels from day level
          if (day.hotels && day.hotels.length > 0) {
            day.hotels.forEach(hotelItem => {
              const hotelName = hotelItem.hotel?.name || hotelItem.name || 'Unknown Hotel';
              const hasSupplier = hasSupplierAssignment(quote._id, 'hotel', hotelName);
              
              if (hasSupplier) {
                supplierStats.hotels.assigned++;
              } else {
                supplierStats.hotels.unassigned++;
              }
            });
          }
        });
      }
      
      // Process quote-level hotels
      if (quote.hotels && quote.hotels.length > 0) {
        quote.hotels.forEach(hotelItem => {
          const hotelName = hotelItem.name || 'Unknown Hotel';
          const hasSupplier = hasSupplierAssignment(quote._id, 'hotel', hotelName);
          
          if (hasSupplier) {
            supplierStats.hotels.assigned++;
          } else {
            supplierStats.hotels.unassigned++;
          }
        });
      }
      
      // Process quote-level flights
      if (quote.flights && quote.flights.length > 0) {
        quote.flights.forEach(flightItem => {
          const flightName = flightItem.name || flightItem.flightNumber || 'Unknown Flight';
          const hasSupplier = hasSupplierAssignment(quote._id, 'flight', flightName);
          
          if (hasSupplier) {
            supplierStats.flights.assigned++;
          } else {
            supplierStats.flights.unassigned++;
          }
        });
      }
    });

    
    return supplierStats;
  }, [quotes, supplierAssignments]);

  
  // Update filtered leads when leads or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);


  const fetchSalesUsers = useCallback(async () => {
    try {
      const response = await api.get(`/leads/users/sales?organization=${user.organization._id}`);
      setSalesUsers(response.data);
    } catch (error) {
      // Error fetching sales users
    }
  }, [user.organization._id]);

  const fetchSightseeings = useCallback(async () => {
    try {
      const response = await api.get(`/sightseeings?organization=${user.organization._id}`);
      setSightseeings(response.data);
    } catch (error) {
      // Error fetching sightseeings
    }
  }, [user.organization._id]);

  const fetchTransfers = useCallback(async () => {
    try {
      const response = await api.get(`/transfers?organization=${user.organization._id}`);
      setTransfers(response.data);
    } catch (error) {
      // Error fetching transfers
    }
  }, [user.organization._id]);

  const fetchHotels = useCallback(async () => {
    try {
      const response = await api.get(`/hotels?organization=${user.organization._id}`);
      setHotels(response.data);
    } catch (error) {
      // Error fetching hotels
    }
  }, [user.organization._id]);

  const fetchSupplierAssignments = useCallback(async () => {
    try {
      const response = await api.get('/supplier-assignments');
      setSupplierAssignments(response.data);
    } catch (error) {
      // Error fetching supplier assignments
    }
  }, []);

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await api.get(`/quotes?organization=${user.organization._id}`);
      setQuotes(response.data);
    } catch (error) {
      // Error fetching quotes
    }
  }, [user.organization._id]);

  const fetchOrganizationData = useCallback(async () => {
    try {
      const response = await api.get(`/organizations/${user.organization._id}`);
      setOrganizationData(response.data);
      
      // Fetch lead statuses
      try {
        const statusesResponse = await api.get(`/leads/statuses?organization=${user.organization._id}`);
        setLeadStatuses(statusesResponse.data);
      } catch (statusError) {
        setLeadStatuses(['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'booking_confirmed', 'lost']);
      }
    } catch (error) {
      // Error fetching organization data
    }
  }, [user.organization._id]);

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
      const maxLeadNumber = Array.isArray(leads) && leads.length > 0 
        ? Math.max(...leads.map(lead => parseInt(lead.leadNumber.split('-')[1]) || 0), 0)
        : 0;
      const nextLeadNumber = `LN-${String(maxLeadNumber + 1).padStart(4, '0')}`;
      const leadData = {
        ...formData,
        leadNumber: nextLeadNumber,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        organization: user.organization._id
      };
      // Only include assignedTo if it's not empty
      if (!formData.assignedTo) {
        delete leadData.assignedTo;
      }
      await api.post('/leads', leadData);
      alert('Lead created successfully!');
      fetchLeads();
      setShowAddForm(false);
      setFormData({
        leadNumber: '',
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
        assignedTo: '',
        notes: ''
      });
    } catch (error) {
      alert('Error creating lead: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    // Fetch organization data on component mount
    fetchOrganizationData();
  }, [fetchOrganizationData]);

  useEffect(() => {
    // Always fetch leads and sales users for analytics
    fetchLeads();
    fetchSalesUsers();
    
    // Always fetch supplier data for analytics
    fetchSightseeings();
    fetchTransfers();
    fetchHotels();
    fetchSupplierAssignments();
    
    // Also fetch specific view data when needed
    if (activeView === 'sightseeings') {
      fetchSightseeings();
    } else if (activeView === 'transfers') {
      fetchTransfers();
    } else if (activeView === 'hotels') {
      fetchHotels();
    }
  }, [activeView, fetchLeads, fetchSalesUsers, fetchSightseeings, fetchTransfers, fetchHotels, fetchSupplierAssignments]);

  // Fetch leads for analytics (regardless of active view)
  useEffect(() => {
    fetchLeads();
    fetchQuotes();
  }, [fetchLeads, fetchQuotes]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const leadData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      };
      await api.put(`/leads/${editingLead._id}`, leadData);
      alert('Lead updated successfully!');
      fetchLeads();
      setShowEditForm(false);
      setEditingLead(null);
      setFormData({
        leadNumber: '',
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
        assignedTo: '',
        notes: ''
      });
    } catch (error) {
      alert('Error updating lead: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setFormData({
      leadNumber: lead.leadNumber,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      dateOfTravel: lead.dateOfTravel,
      travelToCountry: lead.travelToCountry,
      status: lead.status,
      requirements: lead.requirements,
      latestComment: lead.latestComment,
      nextFollowUpDate: lead.nextFollowUpDate,
      tags: lead.tags ? lead.tags.join(', ') : '',
      assignedTo: lead.assignedTo?._id || '',
      notes: lead.notes
    });
    setShowEditForm(true);
  };

  const handleDeleteLead = async (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await api.delete(`/leads/${leadId}`);
        alert('Lead deleted successfully!');
        fetchLeads();
      } catch (error) {
        alert('Error deleting lead: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Filter sightseeings based on search
  useEffect(() => {
    if (!sightseeingSearch.trim()) {
      setFilteredSightseeings(sightseeings);
    } else {
      const searchLower = sightseeingSearch.toLowerCase();
      const filtered = sightseeings.filter(sightseeing =>
        sightseeing.name.toLowerCase().includes(searchLower) ||
        (sightseeing.location && sightseeing.location.toLowerCase().includes(searchLower)) ||
        (sightseeing.country && sightseeing.country.toLowerCase().includes(searchLower)) ||
        (sightseeing.description && sightseeing.description.toLowerCase().includes(searchLower)) ||
        (sightseeing.duration && sightseeing.duration.toLowerCase().includes(searchLower))
      );
      setFilteredSightseeings(filtered);
    }
  }, [sightseeingSearch, sightseeings]);

  // Filter transfers based on search
  useEffect(() => {
    if (!transferSearch.trim()) {
      setFilteredTransfers(transfers);
    } else {
      const searchLower = transferSearch.toLowerCase();
      const filtered = transfers.filter(transfer =>
        transfer.name.toLowerCase().includes(searchLower) ||
        (transfer.fromLocation && transfer.fromLocation.toLowerCase().includes(searchLower)) ||
        (transfer.toLocation && transfer.toLocation.toLowerCase().includes(searchLower)) ||
        (transfer.vehicleType && transfer.vehicleType.toLowerCase().includes(searchLower)) ||
        (transfer.description && transfer.description.toLowerCase().includes(searchLower))
      );
      setFilteredTransfers(filtered);
    }
  }, [transferSearch, transfers]);

  // Filter hotels based on search
  useEffect(() => {
    if (!hotelSearch.trim()) {
      setFilteredHotels(hotels);
    } else {
      const searchLower = hotelSearch.toLowerCase();
      const filtered = hotels.filter(hotel =>
        hotel.name.toLowerCase().includes(searchLower) ||
        (hotel.city && hotel.city.toLowerCase().includes(searchLower)) ||
        (hotel.country && hotel.country.toLowerCase().includes(searchLower)) ||
        (hotel.description && hotel.description.toLowerCase().includes(searchLower)) ||
        (hotel.starRating && hotel.starRating.toString().includes(searchLower))
      );
      setFilteredHotels(filtered);
    }
  }, [hotelSearch, hotels]);

  const [sightseeingFormData, setSightseeingFormData] = useState({
    name: '',
    description: '',
    rate: '',
    childRate: '',
    currency: organizationData?.currency || 'USD',
    duration: '',
    location: '',
    country: ''
  });
  
  const [sightseeingImages, setSightseeingImages] = useState([]);
  const [sightseeingImagePreviews, setSightseeingImagePreviews] = useState([]);
  const [existingSightseeingImages, setExistingSightseeingImages] = useState([]);

  const [transferFormData, setTransferFormData] = useState({
    name: '',
    description: '',
    rate: '',
    currency: organizationData?.currency || 'USD',
    vehicleType: '',
    capacity: '',
    fromLocation: '',
    toLocation: '',
    country: ''
  });

  const [hotelFormData, setHotelFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phoneNumber: '',
    email: '',
    website: '',
    starRating: 3,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    amenities: [],
    roomCategories: [{
      name: 'Standard Room',
      basePrice: 0,
      currency: organizationData?.currency || 'USD',
      maxOccupancy: 2,
      totalRooms: 1
    }]
  });
  
  const [hotelImages, setHotelImages] = useState([]);
  const [hotelImagePreviews, setHotelImagePreviews] = useState([]);
  const [existingHotelImages, setExistingHotelImages] = useState([]);

  const handleSightseeingFormChange = (e) => {
    const { name, value } = e.target;
    setSightseeingFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSightseeingImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Update file state
    setSightseeingImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSightseeingImagePreviews(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeSightseeingImage = (index) => {
    // Check if this is an existing image (URL) or new image (File)
    const imageToRemove = sightseeingImagePreviews[index];
    
    if (typeof imageToRemove === 'string' && imageToRemove.startsWith('http')) {
      // This is an existing image URL
      setExistingSightseeingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      // This is a new uploaded file
      setSightseeingImages(prev => prev.filter((_, i) => i !== index));
    }
    
    setSightseeingImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleTransferFormChange = (e) => {
    const { name, value } = e.target;
    setTransferFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHotelFormChange = (e) => {
    const { name, value } = e.target;
    setHotelFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleHotelImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Update file state
    setHotelImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setHotelImagePreviews(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeHotelImage = (index) => {
    // Check if this is an existing image (URL) or new image (File)
    const imageToRemove = hotelImagePreviews[index];
    
    if (typeof imageToRemove === 'string' && imageToRemove.startsWith('http')) {
      // This is an existing image URL
      setExistingHotelImages(prev => prev.filter((_, i) => i !== index));
    } else {
      // This is a new uploaded file
      setHotelImages(prev => prev.filter((_, i) => i !== index));
    }
    
    setHotelImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addRoomCategoryToHotel = () => {
    setHotelFormData(prev => ({
      ...prev,
      roomCategories: [...prev.roomCategories, {
        name: 'New Room',
        basePrice: 0,
        currency: organizationData?.currency || 'USD',
        maxOccupancy: 2,
        totalRooms: 1
      }]
    }));
  };

  const updateRoomCategoryInHotel = (index, field, value) => {
    setHotelFormData(prev => ({
      ...prev,
      roomCategories: prev.roomCategories.map((room, i) => 
        i === index ? { ...room, [field]: field === 'basePrice' ? parseFloat(value) || 0 : value } : room
      )
    }));
  };

  const removeRoomCategoryFromHotel = (index) => {
    setHotelFormData(prev => ({
      ...prev,
      roomCategories: prev.roomCategories.filter((_, i) => i !== index)
    }));
  };

  const handleHotelSubmit = async (e) => {
    e.preventDefault();
    
    // Validate room categories
    const invalidRooms = hotelFormData.roomCategories.filter(room => 
      !room.name || 
      room.basePrice === '' || 
      room.basePrice === null || 
      room.basePrice === undefined || 
      parseFloat(room.basePrice) < 0 ||
      !room.maxOccupancy || 
      room.maxOccupancy < 1 ||
      !room.totalRooms || 
      room.totalRooms < 1
    );
    
    if (invalidRooms.length > 0) {
      alert('Please fill in all room details: room name, valid price (≥ 0), max occupancy (≥ 1), and total rooms (≥ 1) for all rooms.');
      return;
    }
    
    try {
      const formData = new FormData();
      
      // Add form data
      Object.keys(hotelFormData).forEach(key => {
        if (key === 'roomCategories') {
          formData.append(key, JSON.stringify(hotelFormData[key]));
        } else if (key === 'amenities') {
          formData.append(key, JSON.stringify(hotelFormData[key]));
        } else {
          formData.append(key, hotelFormData[key]);
        }
      });
      
      // Add organization
      formData.append('organization', user.organization._id);
      
      // Add existing images (as URLs)
      if (editingHotel && existingHotelImages.length > 0) {
        formData.append('existingImages', JSON.stringify(existingHotelImages));
      }
      
      // Add new images
      hotelImages.forEach((image, index) => {
        formData.append('images', image);
      });
      
      if (editingHotel) {
        await api.put(`/hotels/${editingHotel._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/hotels', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      fetchHotels();
      setShowHotelForm(false);
      setEditingHotel(null);
      setHotelFormData({
        name: '',
        description: '',
        address: '',
        city: '',
        country: '',
        phoneNumber: '',
        email: '',
        website: '',
        starRating: 3,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        amenities: [],
        roomCategories: [{
          name: 'Standard Room',
          basePrice: 0,
          currency: organizationData?.currency || 'USD',
          maxOccupancy: 2,
          totalRooms: 1
        }]
      });
      setHotelImages([]);
      setHotelImagePreviews([]);
      setExistingHotelImages([]);
    } catch (error) {
      
      if (error.response?.data?.validationErrors) {
        const validationErrors = error.response.data.validationErrors.map(err => 
          `${err.field}: ${err.message}`
        ).join('\n');
        alert('Error saving hotel:\n' + error.response.data.message + '\n\nValidation Errors:\n' + validationErrors);
      } else {
        alert('Error saving hotel: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const deleteHotel = async (id) => {
    if (window.confirm('Are you sure you want to delete this hotel?')) {
      try {
        await api.delete(`/hotels/${id}`);
        fetchHotels();
      } catch (error) {
        // Error deleting hotel
      }
    }
  };

  const handleEditHotel = (hotel) => {
    setEditingHotel(hotel);
    setHotelFormData({
      name: hotel.name,
      description: hotel.description,
      address: hotel.address,
      city: hotel.city,
      country: hotel.country,
      phoneNumber: hotel.phoneNumber || '',
      email: hotel.email || '',
      website: hotel.website || '',
      starRating: hotel.starRating,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      amenities: hotel.amenities || [],
      roomCategories: hotel.roomCategories || []
    });
    // Set existing images for editing
    setHotelImages([]); // Clear new uploaded files
    setHotelImagePreviews(hotel.images || []); // Show existing images
    setExistingHotelImages(hotel.images || []); // Track existing images
    setShowHotelForm(true);
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus });
      fetchLeads();
    } catch (error) {
      // Error updating lead status
    }
  };

  const handleSightseeingSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      
      // Add form data
      Object.keys(sightseeingFormData).forEach(key => {
        formData.append(key, sightseeingFormData[key]);
      });
      
      // Add organization
      formData.append('organization', user.organization._id);
      
      // Add existing images (as URLs)
      if (editingSightseeing && existingSightseeingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(existingSightseeingImages));
      }
      
      // Add new images
      sightseeingImages.forEach((image, index) => {
        formData.append('images', image);
      });
      
      if (editingSightseeing) {
        await api.put(`/sightseeings/${editingSightseeing._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/sightseeings', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      fetchSightseeings();
      setShowSightseeingForm(false);
      setEditingSightseeing(null);
      setSightseeingFormData({
        name: '',
        description: '',
        rate: '',
        childRate: '',
        currency: organizationData?.currency || 'USD',
        duration: '',
        location: '',
        country: ''
      });
      setSightseeingImages([]);
      setSightseeingImagePreviews([]);
    } catch (error) {
      alert('Error saving sightseeing: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...transferFormData,
        organization: user.organization._id
      };
      
      if (editingTransfer) {
        await api.put(`/transfers/${editingTransfer._id}`, data);
      } else {
        await api.post('/transfers', data);
      }
      
      fetchTransfers();
      setShowTransferForm(false);
      setEditingTransfer(null);
      setTransferFormData({
        name: '',
        description: '',
        rate: '',
        currency: organizationData?.currency || 'USD',
        vehicleType: '',
        capacity: '',
        fromLocation: '',
        toLocation: '',
        country: ''
      });
    } catch (error) {
      alert('Error saving transfer: ' + (error.response?.data?.message || error.message));
    }
  };

  const deleteSightseeing = async (id) => {
    if (window.confirm('Are you sure you want to delete this sightseeing?')) {
      try {
        await api.delete(`/sightseeings/${id}`);
        fetchSightseeings();
      } catch (error) {
        // Error deleting sightseeing
      }
    }
  };

  const deleteTransfer = async (id) => {
    if (window.confirm('Are you sure you want to delete this transfer?')) {
      try {
        await api.delete(`/transfers/${id}`);
        fetchTransfers();
      } catch (error) {
        // Error deleting transfer
      }
    }
  };

  const handleEditSightseeing = (sightseeing) => {
    setEditingSightseeing(sightseeing);
    setSightseeingFormData({
      name: sightseeing.name,
      description: sightseeing.description,
      rate: sightseeing.rate,
      childRate: sightseeing.childRate || '',
      currency: sightseeing.currency,
      duration: sightseeing.duration || '',
      location: sightseeing.location,
      country: sightseeing.country
    });
    // Set existing images for editing
    setSightseeingImages([]); // Clear new uploaded files
    setSightseeingImagePreviews(sightseeing.images || []); // Show existing images
    setExistingSightseeingImages(sightseeing.images || []); // Track existing images
    setShowSightseeingForm(true);
  };

  const handleEditTransfer = (transfer) => {
    setEditingTransfer(transfer);
    setTransferFormData({
      name: transfer.name,
      description: transfer.description,
      rate: transfer.rate,
      currency: transfer.currency,
      vehicleType: transfer.vehicleType,
      capacity: transfer.capacity,
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      country: transfer.country
    });
    setShowTransferForm(true);
  };


  const renderLeadsTable = () => {
    if (loading) {
      return <div style={{textAlign: 'center', padding: '20px'}}>Loading leads...</div>;
    }

    return (
      <div className="leads-table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th className="lead-number-cell">Lead Number</th>
              <th className="name-cell">Name</th>
              <th className="email-cell">Email</th>
              <th className="phone-cell">Phone</th>
              <th className="status-cell">Status</th>
              <th className="assigned-cell">Assigned To</th>
              <th className="requirements-cell">Requirements</th>
              <th className="country-cell">Country Travelling To</th>
              <th className="followup-cell">Next Follow-up</th>
              <th className="travel-date-cell">Travel Date</th>
              <th className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => (
              <tr key={lead._id}>
                <td className="lead-number-cell">
                  <button
                    onClick={() => navigate(`/lead/${lead.leadNumber}`)}
                    className="lead-link-btn"
                  >
                    {lead.leadNumber}
                  </button>
                </td>
                <td className="name-cell">{lead.name}</td>
                <td className="email-cell">{lead.email}</td>
                <td className="phone-cell">{lead.phone}</td>
                <td className="status-cell">
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                    className="status-select"
                  >
                    {leadStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="assigned-cell">{lead.assignedTo?.name || 'Unassigned'}</td>
                <td className="requirements-cell" title={lead.requirements || ''}>
                  {lead.requirements ? (lead.requirements.length > 50 ? lead.requirements.substring(0, 50) + '...' : lead.requirements) : '-'}
                </td>
                <td className="country-cell">
                  {lead.travelToCountry ? (
                    <span className="country-badge">
                      {lead.travelToCountry}
                    </span>
                  ) : (
                    <span className="not-specified">Not specified</span>
                  )}
                </td>
                <td className="followup-cell">{lead.nextFollowUpDate || '-'}</td>
                <td className="travel-date-cell">{lead.dateOfTravel || '-'}</td>
                <td className="actions-cell">
                  <div className="lead-action-buttons">
                    <button 
                      onClick={() => handleEditLead(lead)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => navigate(`/lead/${lead.leadNumber}`)}
                      className="quote-btn"
                    >
                      Quote
                    </button>
                    <button 
                      onClick={() => handleDeleteLead(lead._id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif'
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
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#e9ecef'
    }
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
    top: '100%',
    right: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    padding: '15px',
    minWidth: '200px',
    zIndex: 1000,
    display: menuOpen ? 'block' : 'none',
    marginTop: '5px'
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
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginRight: '5px',
    transition: 'background-color 0.2s'
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
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#495057',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  removeButton: {
    padding: '4px 8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
  },
};

  return (
    <div className="operations-dashboard">
      {/* Modern Sidebar Navigation */}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="logo-icon">N</div>
            <span className="logo-text">NaviDesk</span>
          </div>
          <button className="sidebar-toggle" onClick={toggleMenu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            <button
              className={`nav-item ${activeView === 'tasks' ? 'nav-active' : ''}`}
              onClick={() => setActiveView('tasks')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-item ${activeView === 'leads' ? 'nav-active' : ''}`}
              onClick={() => setActiveView('leads')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>Leads</span>
            </button>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-title">Management</div>
            <button
              className={`nav-item ${activeView === 'sightseeings' ? 'nav-active' : ''}`}
              onClick={() => setActiveView('sightseeings')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>Sightseeings</span>
            </button>
            <button
              className={`nav-item ${activeView === 'transfers' ? 'nav-active' : ''}`}
              onClick={() => setActiveView('transfers')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <span>Transfers</span>
            </button>
            <button
              className={`nav-item ${activeView === 'hotels' ? 'nav-active' : ''}`}
              onClick={() => setActiveView('hotels')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4zm-1 7h-6v-2h6v2z"/>
              </svg>
              <span>Hotels</span>
            </button>
            <button
              className={`nav-item ${activeView === 'invoices' ? 'nav-active' : ''}`}
              onClick={() => navigate('/invoices')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <span>Invoices</span>
            </button>
          </div>
          
          {(() => {
            const userRole = user?.role;
            const allowedRoles = ['organization_admin', 'manager', 'operations'];
            const canAccessSuppliers = allowedRoles.includes(userRole);
            return canAccessSuppliers;
          })() && (
            <div className="nav-section">
              <div className="nav-section-title">Operations</div>
              <button
                className={`nav-item ${activeView === 'suppliers' ? 'nav-active' : ''}`}
                onClick={() => navigate('/suppliers')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Suppliers</span>
              </button>
            </div>
          )}
          
          {(() => {
            const userRole = user?.role;
            const allowedRoles = ['organization_admin', 'manager', 'operations', 'accounts'];
            const canAccessCalendar = allowedRoles.includes(userRole);
            return canAccessCalendar;
          })() && (
            <button
              className={`nav-item ${activeView === 'calendar' ? 'nav-active' : ''}`}
              onClick={() => navigate('/calendar')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <span>Calendar</span>
            </button>
          )}
          
          {user.role === 'organization_admin' && (
            <div className="nav-section">
              <div className="nav-section-title">Admin</div>
              <button
                className={`nav-item ${activeView === 'settings' ? 'nav-active' : ''}`}
                onClick={() => setActiveView('settings')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
                <span>Settings</span>
              </button>
            </div>
          )}
          
          {/* Logout Section */}
          <div className="nav-section">
            <div className="nav-section-title">Account</div>
            <button
              className="nav-item logout-btn"
              onClick={logout}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="nav-icon">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-toggle" onClick={toggleMenu}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </button>
            <div className="page-title">
              <h1>{getPageTitle()}</h1>
              <p>{getPageSubtitle()}</p>
            </div>
          </div>
          
          <div className="header-right">
            <div className="org-info">
              <span className="org-name">{user?.organization?.name || 'Organization'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
        {activeView === 'tasks' && (
          <div style={styles.card}>
            <div style={styles.section}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 style={{margin: 0}}>📊 Country-wise Analytics</h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <label style={{fontSize: '14px', fontWeight: '500'}}>Country:</label>
                  <select
                    value={selectedAnalyticsCountry}
                    onChange={(e) => setSelectedAnalyticsCountry(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      minWidth: '150px'
                    }}
                  >
                    <option value="all">All Countries</option>
                    {(() => {
                      const countries = [...new Set(Array.isArray(leads) ? leads.map(lead => lead.travelToCountry || 'Not Specified') : [])].sort();
                      return countries.map(country => (
                        <option key={country} value={country}>
                          {country === 'Not Specified' ? 'Unknown' : country}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
              
              {(() => {
                const countryStats = calculateCountryAnalytics();
                const supplierStats = calculateSupplierAnalytics();
                // const upcomingTrips = calculateUpcomingTrips();
                const countries = Object.keys(countryStats);
                
                return (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '25px'}}>
                    {/* Top Row - Country Analytics */}
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e3e6f0',
                      borderRadius: '12px',
                      padding: '24px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
                    }}>
                      <h4 style={{margin: '0 0 20px 0', color: '#2c3e50', fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px'}}>
                        📊 Country-wise Analytics
                        <select
                          value={selectedAnalyticsCountry}
                          onChange={(e) => setSelectedAnalyticsCountry(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px',
                            marginLeft: 'auto',
                            backgroundColor: '#f8f9fa'
                          }}
                        >
                          <option value="all">All Countries</option>
                          {Object.keys(countryStats).map(country => (
                            <option key={country} value={country}>
                              {country === 'All Countries' ? country : country}
                            </option>
                          ))}
                        </select>
                      </h4>
                      
                      {countries.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '40px', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '8px'}}>
                          <p>No data available for analytics</p>
                        </div>
                      ) : (
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px'}}>
                          {countries.map(country => (
                            <div key={country} style={{
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              padding: '20px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                              <h5 style={{margin: '0 0 15px 0', color: '#495057', fontSize: '16px', fontWeight: '600'}}>
                                🌍 {country === 'All Countries' ? country : country}
                              </h5>
                              
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px'}}>
                                <div style={{textAlign: 'center', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px'}}>
                                  <div style={{fontSize: '22px', fontWeight: '700', color: '#1976d2'}}>
                                    {countryStats[country].totalLeads}
                                  </div>
                                  <div style={{fontSize: '11px', color: '#666', marginTop: '5px'}}>
                                    Total Leads
                                  </div>
                                </div>
                                
                                <div style={{textAlign: 'center', padding: '10px', backgroundColor: '#f3e5f5', borderRadius: '6px'}}>
                                  <div style={{fontSize: '22px', fontWeight: '700', color: '#7b1fa2'}}>
                                    {countryStats[country].quotedLeads}
                                  </div>
                                  <div style={{fontSize: '11px', color: '#666', marginTop: '5px'}}>
                                    Leads Quoted
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                                <div style={{textAlign: 'center', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '6px'}}>
                                  <div style={{fontSize: '18px', fontWeight: '600', color: '#f57c00'}}>
                                    {countryStats[country].pendingQuotes}
                                  </div>
                                  <div style={{fontSize: '10px', color: '#666', marginTop: '3px'}}>
                                    Pending Quotes
                                  </div>
                                </div>
                                
                                <div style={{textAlign: 'center', padding: '10px', backgroundColor: '#fce4ec', borderRadius: '6px'}}>
                                  <div style={{fontSize: '18px', fontWeight: '600', color: '#c2185b'}}>
                                    {countryStats[country].pendingInvoices}
                                  </div>
                                  <div style={{fontSize: '10px', color: '#666', marginTop: '3px'}}>
                                    Pending Invoices
                                  </div>
                                </div>
                                
                                <div style={{textAlign: 'center', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '6px'}}>
                                  <div style={{fontSize: '18px', fontWeight: '600', color: '#388e3c'}}>
                                    {countryStats[country].pendingPayments}
                                  </div>
                                  <div style={{fontSize: '10px', color: '#666', marginTop: '3px'}}>
                                    Pending Payments
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Supplier Assignment Analytics */}
                    <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e3e6f0',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
                      }}>
                        <h4 style={{margin: '0 0 20px 0', color: '#2c3e50', fontSize: '18px', fontWeight: '700'}}>
                          🏢 Supplier Assignment Analytics
                        </h4>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                          {[
                            { type: 'Activities', data: supplierStats.activities, icon: '🎯', color: '#2196f3' },
                            { type: 'Transfers', data: supplierStats.transfers, icon: '🚗', color: '#ff9800' },
                            { type: 'Hotels', data: supplierStats.hotels, icon: '🏨', color: '#4caf50' },
                            { type: 'Flights', data: supplierStats.flights, icon: '✈️', color: '#9c27b0' }
                          ].map(service => (
                          <div key={service.type} style={{
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            <div style={{textAlign: 'center', marginBottom: '15px'}}>
                              <span style={{fontSize: '24px', marginRight: '10px'}}>{service.icon}</span>
                              <span style={{fontSize: '16px', fontWeight: '600', color: '#495057'}}>{service.type}</span>
                            </div>
                            
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                              <div style={{textAlign: 'center', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '6px'}}>
                                <div style={{fontSize: '20px', fontWeight: '700', color: '#388e3c'}}>
                                  {service.data.assigned}
                                </div>
                                <div style={{fontSize: '11px', color: '#666', marginTop: '5px'}}>
                                  Assigned
                                </div>
                              </div>
                              
                              <div style={{textAlign: 'center', padding: '10px', backgroundColor: '#ffebee', borderRadius: '6px'}}>
                                <div style={{fontSize: '20px', fontWeight: '700', color: '#d32f2f'}}>
                                  {service.data.unassigned}
                                </div>
                                <div style={{fontSize: '11px', color: '#666', marginTop: '5px'}}>
                                  Unassigned
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                );
              })()}
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
          </div>
        )}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Add New Lead</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Travel</label>
                    <input
                      type="date"
                      name="dateOfTravel"
                      value={formData.dateOfTravel}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Travel to Country</label>
                    <input
                      type="text"
                      name="travelToCountry"
                      value={formData.travelToCountry}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                    >
                      {leadStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Next Follow Up Date</label>
                    <input
                      type="date"
                      name="nextFollowUpDate"
                      value={formData.nextFollowUpDate}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Requirements</label>
                    <textarea
                      name="requirements"
                      value={formData.requirements}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Latest Comment</label>
                    <textarea
                      name="latestComment"
                      value={formData.latestComment}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Tags</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleFormChange}
                      placeholder="e.g., family, budget, luxury"
                    />
                  </div>
                  <div className="form-group">
                    <label>Assigned To</label>
                    <select
                      name="assignedTo"
                      value={formData.assignedTo}
                      onChange={handleFormChange}
                    >
                      <option value="">Select Sales User</option>
                      {salesUsers.map(user => (
                        <option key={user._id} value={user._id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Add Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showEditForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Edit Lead</h3>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleUpdate} className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Travel</label>
                    <input
                      type="date"
                      name="dateOfTravel"
                      value={formData.dateOfTravel}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Travel to Country</label>
                    <input
                      type="text"
                      name="travelToCountry"
                      value={formData.travelToCountry}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                    >
                      {leadStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Requirements</label>
                    <textarea
                      name="requirements"
                      value={formData.requirements}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Latest Comment</label>
                    <textarea
                      name="latestComment"
                      value={formData.latestComment}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Next Follow Up Date</label>
                    <input
                      type="date"
                      name="nextFollowUpDate"
                      value={formData.nextFollowUpDate}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Tags</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleFormChange}
                      placeholder="e.g., family, budget, luxury"
                    />
                  </div>
                  <div className="form-group">
                    <label>Assigned To</label>
                    <select
                      name="assignedTo"
                      value={formData.assignedTo}
                      onChange={handleFormChange}
                    >
                      <option value="">Select Sales User</option>
                      {salesUsers.map(user => (
                        <option key={user._id} value={user._id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
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
                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setShowEditForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Update Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {activeView === 'sightseeings' && (
          <div>
            <h3 style={{marginBottom: '20px', fontSize: '24px', fontWeight: '600', color: '#333'}}>Sightseeings</h3>
            <button 
              onClick={() => setShowSightseeingForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              Add New Sightseeing
            </button>
            
            {/* Search Bar */}
            <div style={{marginBottom: '20px'}}>
              <input
                type="text"
                placeholder="🔍 Search sightseeings by name, location, country, description..."
                value={sightseeingSearch}
                onChange={(e) => setSightseeingSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  backgroundColor: '#f8f9fa'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
              {sightseeingSearch && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  Found {filteredSightseeings.length} sightseeing{filteredSightseeings.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            {filteredSightseeings.length === 0 && sightseeings.length > 0 ? (
              <div style={{textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6'}}>
                <p style={{margin: 0, color: '#6c757d', fontSize: '16px'}}>
                  No sightseeings found matching "{sightseeingSearch}"
                </p>
                <button 
                  onClick={() => setSightseeingSearch('')}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear Search
                </button>
              </div>
            ) : sightseeings.length === 0 ? (
              <div style={{textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6'}}>
                <p style={{margin: 0, color: '#6c757d', fontSize: '16px'}}>No sightseeings added yet. Click "Add New Sightseeing" to create your first sightseeing.</p>
              </div>
            ) : (
              <div className="sightseeings-table-container">
                <table className="sightseeings-table" style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th} className="name-cell">Name</th>
                      <th style={styles.th} className="location-cell">Location</th>
                      <th style={styles.th} className="country-cell">Country</th>
                      <th style={styles.th} className="duration-cell">Duration</th>
                      <th style={styles.th} className="adult-rate-cell">Adult Rate</th>
                      <th style={styles.th} className="child-rate-cell">Child Rate</th>
                      <th style={styles.th} className="description-cell">Description</th>
                      <th style={styles.th} className="actions-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSightseeings.map(sightseeing => (
                      <tr key={sightseeing._id}>
                        <td style={styles.td} className="name-cell">{sightseeing.name}</td>
                        <td style={styles.td} className="location-cell">{sightseeing.location}</td>
                        <td style={styles.td} className="country-cell">{sightseeing.country}</td>
                        <td style={styles.td} className="duration-cell">{sightseeing.duration || '-'}</td>
                        <td style={styles.td} className="adult-rate-cell">{sightseeing.currency} {sightseeing.rate}</td>
                        <td style={styles.td} className="child-rate-cell">{sightseeing.currency} {sightseeing.childRate || 0}</td>
                        <td style={styles.td} className="description-cell" title={sightseeing.description || ''}>
                          {sightseeing.description ? (sightseeing.description.length > 50 ? sightseeing.description.substring(0, 50) + '...' : sightseeing.description) : '-'}
                        </td>
                        <td style={styles.td} className="actions-cell">
                          <div className="action-buttons">
                            <button 
                              onClick={() => handleEditSightseeing(sightseeing)}
                              className="edit-btn"
                              style={styles.editButton}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => deleteSightseeing(sightseeing._id)}
                              className="delete-btn"
                              style={{...styles.deleteButton, marginLeft: '5px'}}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeView === 'transfers' && (
          <div>
            <h3 style={{marginBottom: '20px', fontSize: '24px', fontWeight: '600', color: '#333'}}>Transfers</h3>
            <button 
              onClick={() => setShowTransferForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              Add New Transfer
            </button>
            
            {/* Search Bar */}
            <div style={{marginBottom: '20px'}}>
              <input
                type="text"
                placeholder="🔍 Search transfers by name, route, vehicle, description..."
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  backgroundColor: '#f8f9fa'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
              {transferSearch && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  Found {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
              
            {filteredTransfers.length === 0 && transfers.length > 0 ? (
              <div style={{textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6'}}>
                <p style={{margin: 0, color: '#6c757d', fontSize: '16px'}}>
                  No transfers found matching "{transferSearch}"
                </p>
                <button 
                  onClick={() => setTransferSearch('')}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear Search
                </button>
              </div>
            ) : transfers.length === 0 ? (
              <div style={{textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6'}}>
                <p style={{margin: 0, color: '#6c757d', fontSize: '16px'}}>No transfers added yet. Click "Add New Transfer" to create your first transfer.</p>
              </div>
            ) : (
              <div className="transfers-table-container">
                <table className="transfers-table" style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th} className="name-cell">Name</th>
                      <th style={styles.th} className="from-cell">From</th>
                      <th style={styles.th} className="to-cell">To</th>
                      <th style={styles.th} className="country-cell">Country</th>
                      <th style={styles.th} className="vehicle-cell">Vehicle</th>
                      <th style={styles.th} className="capacity-cell">Capacity</th>
                      <th style={styles.th} className="rate-cell">Rate</th>
                      <th style={styles.th} className="description-cell">Description</th>
                      <th style={styles.th} className="actions-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map(transfer => (
                      <tr key={transfer._id}>
                        <td style={styles.td} className="name-cell">{transfer.name}</td>
                        <td style={styles.td} className="from-cell">{transfer.fromLocation}</td>
                        <td style={styles.td} className="to-cell">{transfer.toLocation}</td>
                        <td style={styles.td} className="country-cell">{transfer.country}</td>
                        <td style={styles.td} className="vehicle-cell">{transfer.vehicleType}</td>
                        <td style={styles.td} className="capacity-cell">{transfer.capacity} persons</td>
                        <td style={styles.td} className="rate-cell">{transfer.currency} {transfer.rate}</td>
                        <td style={styles.td} className="description-cell" title={transfer.description || ''}>
                          {transfer.description ? (transfer.description.length > 50 ? transfer.description.substring(0, 50) + '...' : transfer.description) : '-'}
                        </td>
                        <td style={styles.td} className="actions-cell">
                          <div className="action-buttons">
                            <button 
                              onClick={() => handleEditTransfer(transfer)}
                              className="edit-btn"
                              style={styles.editButton}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => deleteTransfer(transfer._id)}
                              className="delete-btn"
                              style={{...styles.deleteButton, marginLeft: '5px'}}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeView === 'hotels' && (
          <div>
            <h3 style={{marginBottom: '20px', fontSize: '24px', fontWeight: '600', color: '#333'}}>Hotels</h3>
            <button 
              onClick={() => setShowHotelForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              Add New Hotel
            </button>
            
            {/* Search Bar */}
            <div style={{marginBottom: '20px'}}>
              <input
                type="text"
                placeholder="🔍 Search hotels by name, city, country, rating..."
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  backgroundColor: '#f8f9fa'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
              {hotelSearch && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  Found {filteredHotels.length} hotel{filteredHotels.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            {filteredHotels.length === 0 && hotels.length > 0 ? (
              <div style={{textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6'}}>
                <p style={{margin: 0, color: '#6c757d', fontSize: '16px'}}>
                  No hotels found matching "{hotelSearch}"
                </p>
                <button 
                  onClick={() => setHotelSearch('')}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear Search
                </button>
              </div>
            ) : hotels.length === 0 ? (
              <div style={{textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6'}}>
                <p style={{margin: 0, color: '#6c757d', fontSize: '16px'}}>No hotels added yet. Click "Add New Hotel" to create your first hotel.</p>
              </div>
            ) : (
              <div style={{overflowX: 'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>City</th>
                      <th style={styles.th}>Country</th>
                      <th style={styles.th}>Star Rating</th>
                      <th style={styles.th}>Contact</th>
                      <th style={{...styles.th, minWidth: '150px'}}>Room Categories</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHotels.map(hotel => (
                      <tr key={hotel._id}>
                        <td style={styles.td}>
                          <div>
                            <strong>{hotel.name}</strong><br />
                            <small style={{color: '#6c757d'}}>{hotel.address}</small>
                          </div>
                        </td>
                        <td style={styles.td}>{hotel.city}</td>
                        <td style={styles.td}>{hotel.country}</td>
                        <td style={styles.td}>
                          {'⭐'.repeat(hotel.starRating)}
                        </td>
                        <td style={styles.td}>
                          <div>
                            {hotel.phoneNumber && <small>{hotel.phoneNumber}<br /></small>}
                            {hotel.email && <small>{hotel.email}</small>}
                          </div>
                        </td>
                        <td style={styles.td}>
                          {hotel.roomCategories && hotel.roomCategories.length > 0 ? (
                            <div>
                              {hotel.roomCategories.map((room, index) => (
                                <div key={index} style={{fontSize: '12px', marginBottom: '2px', borderBottom: '1px solid #eee', paddingBottom: '2px'}}>
                                  <strong>{room.name}</strong><br />
                                  <span style={{color: '#6c757d'}}>
                                    {room.currency || 'USD'} {room.basePrice} • {room.maxOccupancy} guests • {room.totalRooms} rooms
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{color: '#6c757d', fontSize: '12px'}}>No rooms</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button 
                            onClick={() => handleEditHotel(hotel)}
                            style={styles.editButton}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteHotel(hotel._id)}
                            style={{...styles.deleteButton, marginLeft: '5px'}}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Hotel Form Modal */}
        {showHotelForm && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{editingHotel ? 'Edit Hotel' : 'Add New Hotel'}</h3>
              </div>
              <form onSubmit={handleHotelSubmit} style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Hotel Name</label>
                    <input
                      type="text"
                      name="name"
                      value={hotelFormData.name}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>City</label>
                    <input
                      type="text"
                      name="city"
                      value={hotelFormData.city}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Country</label>
                    <input
                      type="text"
                      name="country"
                      value={hotelFormData.country}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Address</label>
                    <input
                      type="text"
                      name="address"
                      value={hotelFormData.address}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={hotelFormData.phoneNumber}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={hotelFormData.email}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Website</label>
                    <input
                      type="url"
                      name="website"
                      value={hotelFormData.website}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Star Rating</label>
                    <select
                      name="starRating"
                      value={hotelFormData.starRating}
                      onChange={handleHotelFormChange}
                      style={styles.select}
                    >
                      <option value={1}>1 Star</option>
                      <option value={2}>2 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={5}>5 Stars</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Check-in Time</label>
                    <input
                      type="time"
                      name="checkInTime"
                      value={hotelFormData.checkInTime}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Check-out Time</label>
                    <input
                      type="time"
                      name="checkOutTime"
                      value={hotelFormData.checkOutTime}
                      onChange={handleHotelFormChange}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    name="description"
                    value={hotelFormData.description}
                    onChange={handleHotelFormChange}
                    style={styles.textarea}
                    rows="3"
                  />
                </div>
                
                {/* Image Upload Section */}
                <div style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h4 style={{margin: 0, color: '#333'}}>Hotel Images</h4>
                    <label style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      + Add Images
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleHotelImageChange}
                        style={{display: 'none'}}
                      />
                    </label>
                  </div>
                  
                  {/* Image Previews */}
                  {hotelImagePreviews.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginTop: '10px'
                    }}>
                      {hotelImagePreviews.map((preview, index) => (
                        <div key={index} style={{
                          position: 'relative',
                          width: '100px',
                          height: '100px'
                        }}>
                          <img
                            src={preview}
                            alt={`Hotel ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeHotelImage(index)}
                            style={{
                              position: 'absolute',
                              top: '-5px',
                              right: '-5px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {hotelImagePreviews.length === 0 && (
                    <p style={{
                      color: '#6c757d',
                      fontSize: '14px',
                      fontStyle: 'italic',
                      margin: '10px 0'
                    }}>
                      No images uploaded. Click "Add Images" to upload hotel photos.
                    </p>
                  )}
                </div>
                
                <div style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h4 style={{margin: 0, color: '#333'}}>Room Categories</h4>
                    <button
                      type="button"
                      onClick={addRoomCategoryToHotel}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      + Add Room
                    </button>
                  </div>
                  
                  {hotelFormData.roomCategories.map((room, index) => (
                    <div key={index} style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'center'}}>
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoomCategoryInHotel(index, 'name', e.target.value)}
                          style={{
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                          placeholder="Room name"
                        />
                        
                        <input
                          type="number"
                          value={room.basePrice}
                          onChange={(e) => updateRoomCategoryInHotel(index, 'basePrice', e.target.value)}
                          style={{
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                          placeholder="Price per night"
                          min="0"
                        />
                        
                        <select
                          value={room.currency || organizationData?.currency || 'USD'}
                          onChange={(e) => updateRoomCategoryInHotel(index, 'currency', e.target.value)}
                          style={{
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            minWidth: '80px'
                          }}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                          <option value="AUD">AUD</option>
                          <option value="CAD">CAD</option>
                          <option value="SGD">SGD</option>
                          <option value="THB">THB</option>
                          <option value="MYR">MYR</option>
                          <option value="IDR">IDR</option>
                          <option value="PHP">PHP</option>
                          <option value="VND">VND</option>
                          <option value="HKD">HKD</option>
                          <option value="JPY">JPY</option>
                          <option value="CNY">CNY</option>
                          <option value="KRW">KRW</option>
                          <option value="AED">AED</option>
                        </select>
                        
                        <input
                          type="number"
                          value={room.maxOccupancy}
                          onChange={(e) => updateRoomCategoryInHotel(index, 'maxOccupancy', parseInt(e.target.value))}
                          style={{
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                          placeholder="Max guests"
                          min="1"
                          max="10"
                        />
                        
                        <input
                          type="number"
                          value={room.totalRooms}
                          onChange={(e) => updateRoomCategoryInHotel(index, 'totalRooms', parseInt(e.target.value))}
                          style={{
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                          placeholder="Total rooms"
                          min="1"
                          max="100"
                        />
                        
                        {hotelFormData.roomCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoomCategoryFromHotel(index)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={styles.modalFooter}>
                  <button type="button" style={styles.cancelButton} onClick={() => {
                    setShowHotelForm(false);
                    setEditingHotel(null);
                    setHotelFormData({
                      name: '',
                      description: '',
                      address: '',
                      city: '',
                      country: '',
                      phoneNumber: '',
                      email: '',
                      website: '',
                      starRating: 3,
                      checkInTime: '14:00',
                      checkOutTime: '11:00',
                      amenities: [],
                      roomCategories: [{
                        name: 'Standard Room',
                        basePrice: 0,
                        currency: organizationData?.currency || 'USD',
                        maxOccupancy: 2,
                        totalRooms: 1
                      }]
                    });
                    setHotelImages([]);
                    setHotelImagePreviews([]);
                    setExistingHotelImages([]);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    {editingHotel ? 'Update Hotel' : 'Add Hotel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Sightseeing Form Modal */}
        {showSightseeingForm && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{editingSightseeing ? 'Edit Sightseeing' : 'Add New Sightseeing'}</h3>
              </div>
              <form onSubmit={handleSightseeingSubmit} style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={sightseeingFormData.name}
                      onChange={handleSightseeingFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={sightseeingFormData.location}
                      onChange={handleSightseeingFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Country</label>
                    <input
                      type="text"
                      name="country"
                      value={sightseeingFormData.country}
                      onChange={handleSightseeingFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Duration</label>
                    <input
                      type="text"
                      name="duration"
                      value={sightseeingFormData.duration}
                      onChange={handleSightseeingFormChange}
                      style={styles.input}
                      placeholder="e.g., 2 hours, Half day"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Adult Rate</label>
                    <input
                      type="number"
                      name="rate"
                      value={sightseeingFormData.rate}
                      onChange={handleSightseeingFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Child Rate</label>
                    <input
                      type="number"
                      name="childRate"
                      value={sightseeingFormData.childRate}
                      onChange={handleSightseeingFormChange}
                      style={styles.input}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Currency</label>
                    <select
                      name="currency"
                      value={sightseeingFormData.currency}
                      onChange={handleSightseeingFormChange}
                      style={styles.select}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Description</label>
                    <textarea
                      name="description"
                      value={sightseeingFormData.description}
                      onChange={handleSightseeingFormChange}
                      style={styles.textarea}
                      required
                    />
                  </div>
                  
                  {/* Image Upload Section */}
                  <div style={{marginBottom: '20px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <h4 style={{margin: 0, color: '#333'}}>Sightseeing Images</h4>
                      <label style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}>
                        + Add Images
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleSightseeingImageChange}
                          style={{display: 'none'}}
                        />
                      </label>
                    </div>
                    
                    {/* Image Previews */}
                    {sightseeingImagePreviews.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        marginTop: '10px'
                      }}>
                        {sightseeingImagePreviews.map((preview, index) => (
                          <div key={index} style={{
                            position: 'relative',
                            width: '100px',
                            height: '100px'
                          }}>
                            <img
                              src={preview}
                              alt={`Sightseeing ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeSightseeingImage(index)}
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {sightseeingImagePreviews.length === 0 && (
                      <p style={{
                        color: '#6c757d',
                        fontSize: '14px',
                        fontStyle: 'italic',
                        margin: '10px 0'
                      }}>
                        No images uploaded. Click "Add Images" to upload sightseeing photos.
                      </p>
                    )}
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button type="button" style={styles.cancelButton} onClick={() => {
                    setShowSightseeingForm(false);
                    setEditingSightseeing(null);
                    setSightseeingFormData({
                      name: '',
                      description: '',
                      rate: '',
                      currency: organizationData?.currency || 'USD',
                      duration: '',
                      location: '',
                      country: ''
                    });
                    setSightseeingImages([]);
                    setSightseeingImagePreviews([]);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    {editingSightseeing ? 'Update Sightseeing' : 'Add Sightseeing'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Transfer Form Modal */}
        {showTransferForm && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{editingTransfer ? 'Edit Transfer' : 'Add New Transfer'}</h3>
              </div>
              <form onSubmit={handleTransferSubmit} style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={transferFormData.name}
                      onChange={handleTransferFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>From Location</label>
                    <input
                      type="text"
                      name="fromLocation"
                      value={transferFormData.fromLocation}
                      onChange={handleTransferFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>To Location</label>
                    <input
                      type="text"
                      name="toLocation"
                      value={transferFormData.toLocation}
                      onChange={handleTransferFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Country</label>
                    <input
                      type="text"
                      name="country"
                      value={transferFormData.country}
                      onChange={handleTransferFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Vehicle Type</label>
                    <select
                      name="vehicleType"
                      value={transferFormData.vehicleType}
                      onChange={handleTransferFormChange}
                      style={styles.select}
                      required
                    >
                      <option value="">Select Vehicle</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Van">Van</option>
                      <option value="Bus">Bus</option>
                      <option value="Minibus">Minibus</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Capacity</label>
                    <input
                      type="number"
                      name="capacity"
                      value={transferFormData.capacity}
                      onChange={handleTransferFormChange}
                      style={styles.input}
                      placeholder="Number of passengers"
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rate</label>
                    <input
                      type="number"
                      name="rate"
                      value={transferFormData.rate}
                      onChange={handleTransferFormChange}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Currency</label>
                    <select
                      name="currency"
                      value={transferFormData.currency}
                      onChange={handleTransferFormChange}
                      style={styles.select}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                  <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                    <label style={styles.label}>Description</label>
                    <textarea
                      name="description"
                      value={transferFormData.description}
                      onChange={handleTransferFormChange}
                      style={styles.textarea}
                      required
                    />
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button type="button" style={styles.cancelButton} onClick={() => {
                    setShowTransferForm(false);
                    setEditingTransfer(null);
                    setTransferFormData({
                      name: '',
                      description: '',
                      rate: '',
                      currency: organizationData?.currency || 'USD',
                      vehicleType: '',
                      capacity: '',
                      fromLocation: '',
                      toLocation: '',
                      country: ''
                    });
                  }}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    {editingTransfer ? 'Update Transfer' : 'Add Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {activeView === 'settings' && user.role === 'organization_admin' && (
          <div style={styles.card}>
            <h3 style={{marginBottom: '30px', fontSize: '24px', fontWeight: '600', color: '#333'}}>Organization Settings</h3>
            
            {/* Currency Setting */}
            <div style={{marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'}}>
              <h4 style={{marginBottom: '15px', fontSize: '18px', fontWeight: '600', color: '#495057'}}>Currency Settings</h4>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <label style={{fontWeight: '500', color: '#333'}}>Default Currency:</label>
                <span style={{padding: '8px 16px', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', fontWeight: '500'}}>
                  {organizationData?.currency || 'USD'}
                </span>
              </div>
              <p style={{marginTop: '10px', fontSize: '14px', color: '#6c757d'}}>This currency is used throughout the dashboard for all pricing and financial data.</p>
            </div>
            
            {/* Lead Statuses Setting */}
            <div style={{padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'}}>
              <h4 style={{marginBottom: '15px', fontSize: '18px', fontWeight: '600', color: '#495057'}}>Lead Statuses</h4>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px'}}>
                {leadStatuses.map(status => (
                  <span key={status} style={{
                    padding: '6px 12px', 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    borderRadius: '20px', 
                    fontSize: '14px', 
                    fontWeight: '500'
                  }}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              <p style={{fontSize: '14px', color: '#6c757d'}}>These lead statuses are available for selection in lead management. Contact your system administrator to modify these statuses.</p>
            </div>
            
            {/* Organization Info */}
            <div style={{marginTop: '40px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px'}}>
              <h4 style={{marginBottom: '15px', fontSize: '18px', fontWeight: '600', color: '#495057'}}>Organization Information</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px'}}>
                <div>
                  <strong style={{color: '#333'}}>Organization Name:</strong>
                  <p style={{margin: '5px 0', color: '#495057'}}>{organizationData?.name || 'N/A'}</p>
                </div>
                <div>
                  <strong style={{color: '#333'}}>Phone:</strong>
                  <p style={{margin: '5px 0', color: '#495057'}}>{organizationData?.phone || 'N/A'}</p>
                </div>
                <div>
                  <strong style={{color: '#333'}}>Address:</strong>
                  <p style={{margin: '5px 0', color: '#495057'}}>{organizationData?.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

export default OperationsDashboard;
