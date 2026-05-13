import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const QuoteSupplierSection = ({ quote, onAssignmentUpdated }) => {
  const { user } = useContext(AuthContext);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [markingPaidAssignment, setMarkingPaidAssignment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    paymentReference: '',
    utrNumber: '',
    notes: ''
  });
  const [assignments, setAssignments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quoteDetails, setQuoteDetails] = useState(null);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [formData, setFormData] = useState({
    supplierId: '',
    activityType: 'hotel',
    activityName: '',
    activityDescription: '',
    dayNumber: 1,
    agreedPrice: '',
    currency: quote.currency || 'INR',
    paymentSchedule: []
  });

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await axios.get(`/api/supplier-assignments/quote/${quote._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  }, [quote._id]);

  const fetchQuoteDetails = useCallback(async () => {
    try {
      const response = await axios.get(`/api/quotes/${quote._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Quote details fetched:', response.data);
      console.log('Quote details days count:', response.data.days?.length || 0);
      console.log('Quote details hotels count:', response.data.hotels?.length || 0);
      setQuoteDetails(response.data);
    } catch (error) {
      console.error('Error fetching quote details:', error);
    }
  }, [quote._id]);

  const checkForInvoice = useCallback(async () => {
    try {
      const response = await axios.get(`/api/invoices?quoteId=${quote._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const hasInvoiceForQuote = response.data.length > 0;
      setHasInvoice(hasInvoiceForQuote);
      
      if (hasInvoiceForQuote) {
        fetchAssignments();
        fetchSuppliers();
        fetchQuoteDetails();
      }
    } catch (error) {
      console.error('Error checking for invoice:', error);
    }
  }, [quote._id, fetchAssignments, fetchQuoteDetails]);

  useEffect(() => {
    if (quote && quote.isConverted) {
      checkForInvoice();
    }
  }, [quote, checkForInvoice]);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/api/suppliers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      setError('Please select at least one item to assign');
      return;
    }
    
    try {
      // Create a single assignment with multiple assigned items
      const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
      const assignedItems = selectedItems.map(item => ({
        name: item.name,
        dayNumber: item.dayNumber || 1,
        nights: item.nights || 1,
        price: item.price,
        itemData: item.itemData || {}
      }));
      
      const assignmentData = {
        ...formData,
        quoteId: quote._id,
        activityName: `${selectedItems.length} ${formData.activityType}(s) Assigned`,
        agreedPrice: totalPrice,
        dayNumber: 1, // Default to day 1 for multi-item assignments
        activityDescription: `${formData.activityType} assignment for ${selectedItems.length} item(s)`,
        assignedItems: assignedItems
      };
      
      if (editingAssignment) {
        await axios.put(`/api/supplier-assignments/${editingAssignment._id}`, assignmentData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSuccess(`Successfully updated assignment for ${selectedItems.length} ${formData.activityType}(s)`);
      } else {
        await axios.post('/api/supplier-assignments', assignmentData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSuccess(`Successfully assigned ${selectedItems.length} ${formData.activityType}(s) to supplier`);
      }
      
      fetchAssignments();
      setShowAssignmentForm(false);
      setEditingAssignment(null);
      resetForm();
      setSelectedItems([]);
    } catch (error) {
      console.error('Error creating assignment:', error);
      setError(error.response?.data?.message || 'Error creating assignment');
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      supplierId: assignment.supplier._id,
      activityType: assignment.activityType,
      activityName: assignment.activityName,
      activityDescription: assignment.activityDescription,
      dayNumber: assignment.dayNumber,
      agreedPrice: assignment.agreedPrice,
      currency: assignment.currency,
      paymentSchedule: assignment.paymentSchedule || []
    });
    setShowAssignmentForm(true);
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/supplier-assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchAssignments();
      if (onAssignmentUpdated) {
        onAssignmentUpdated();
      }
    } catch (error) {
      setError('Error deleting assignment');
    }
  };

  const handleMarkAsPaid = (assignment) => {
    setMarkingPaidAssignment(assignment);
    setPaymentFormData({
      paymentReference: '',
      utrNumber: '',
      notes: ''
    });
    setShowMarkPaidModal(true);
  };

  const handleSubmitMarkPaid = async () => {
    try {
      const response = await axios.patch(`/api/supplier-assignments/${markingPaidAssignment._id}/mark-paid`, 
        paymentFormData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setSuccess(response.data.message);
      fetchAssignments();
      setShowMarkPaidModal(false);
      setMarkingPaidAssignment(null);
      if (onAssignmentUpdated) {
        onAssignmentUpdated();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error marking as paid');
    }
  };

  const canMarkAsPaid = () => {
    const userRole = user?.role || 'user';
    return ['operations', 'accounts', 'admin'].includes(userRole);
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      activityType: 'hotel',
      activityName: '',
      activityDescription: '',
      dayNumber: 1,
      agreedPrice: '',
      currency: quote.currency || 'INR',
      paymentSchedule: []
    });
    setSelectedItems([]);
    setError('');
    setSuccess('');
  };

  const getSuppliersByType = (type) => {
    return suppliers.filter(s => s.type === type && s.status === 'active');
  };

  const getQuoteItemsByType = (type) => {
    if (!quoteDetails) {
      return [];
    }
    
    switch (type) {
      case 'hotel':
        // Extract hotels from quote-level hotels array (this is where they're actually stored)
        const hotels = [];
        
        if (quoteDetails.hotels && quoteDetails.hotels.length > 0) {
          quoteDetails.hotels.forEach((hotel, index) => {
            // Calculate day number based on check-in date
            let dayNumber = 1;
            if (hotel.rooms && hotel.rooms.length > 0 && hotel.rooms[0].checkIn) {
              const checkInDate = new Date(hotel.rooms[0].checkIn);
              const startDate = new Date(quoteDetails.travelStartDate);
              const diffTime = Math.abs(checkInDate - startDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              dayNumber = diffDays + 1;
            }
            
            const roomData = hotel.rooms && hotel.rooms.length > 0 ? hotel.rooms[0] : {};
            const adultRate = roomData.adultRate || 0;
            const numberOfRooms = roomData.numberOfRooms || 1;
            const nights = roomData.nights || 1;
            const totalPrice = adultRate * numberOfRooms * nights;
            
            hotels.push({
              ...hotel,
              dayNumber: dayNumber,
              price: totalPrice, // Total price for all rooms and nights
              adultRate: adultRate, // Per night rate
              numberOfRooms: numberOfRooms,
              nights: nights,
              roomCategory: roomData.roomCategory || null,
              roomName: roomData.roomName || 'Standard Room'
            });
          });
        }
        
        console.log('quoteDetails in getQuoteItemsByType:', quoteDetails);
        console.log('Constructed hotels array:', hotels);
        return hotels;
      case 'flight':
        return quoteDetails.flights || [];
      case 'transport':
        // Extract transfers from days structure
        const transfers = [];
        if (quoteDetails.days) {
          quoteDetails.days.forEach(day => {
            if (day.transfers && day.transfers.length > 0) {
              day.transfers.forEach(transfer => {
                if (transfer.transfer) {
                  transfers.push({
                    ...transfer.transfer,
                    dayNumber: day.dayNumber,
                    price: transfer.transfer.rate || 0
                  });
                }
              });
            }
          });
        }
        console.log('Constructed transfers array:', transfers);
        return transfers;
      case 'sightseeing':
        // Extract sightseeings from days structure
        const sightseeings = [];
        if (quoteDetails.days) {
          quoteDetails.days.forEach(day => {
            if (day.sightseeings && day.sightseeings.length > 0) {
              day.sightseeings.forEach(sightseeing => {
                if (sightseeing.sightseeing) {
                  // Calculate price based on adults and children
                  const adultCount = sightseeing.adultCount || quoteDetails.adultPax || 1;
                  const childCount = sightseeing.includeChild !== false ? (sightseeing.childCount || quoteDetails.childPax || 0) : 0;
                  
                  // Use the specific rates for this sightseeing item, fallback to sightseeing base rates
                  const adultRate = sightseeing.adultRate || sightseeing.sightseeing.rate || 0;
                  const childRate = sightseeing.childRate || sightseeing.sightseeing.childRate || 0;
                  
                  // Calculate total price for this sightseeing
                  const totalPrice = (adultRate * adultCount) + (childRate * childCount);
                  
                  sightseeings.push({
                    ...sightseeing.sightseeing,
                    dayNumber: day.dayNumber,
                    price: totalPrice,
                    adultRate: adultRate,
                    childRate: childRate,
                    adultCount: adultCount,
                    childCount: childCount,
                    // Store original sightseeing data for reference
                    sightseeingData: sightseeing
                  });
                }
              });
            }
          });
        }
        console.log('Constructed sightseeings array:', sightseeings);
        return sightseeings;
      default:
        return [];
    }
  };

  const getItemName = (item, type) => {
    switch (type) {
      case 'hotel':
        const hotelName = item.name || item.hotelName || 'Hotel';
        return item.dayNumber ? `Day ${item.dayNumber}: ${hotelName}` : hotelName;
      case 'flight':
        return `${item.airline || 'Airline'} - ${item.from || 'Origin'} to ${item.to || 'Destination'}`;
      case 'transport':
        const transportName = item.name || item.vehicleType || 'Transport';
        return item.dayNumber ? `Day ${item.dayNumber}: ${transportName}` : transportName;
      case 'sightseeing':
        const sightseeingName = item.name || item.title || 'Sightseeing';
        return item.dayNumber ? `Day ${item.dayNumber}: ${sightseeingName}` : sightseeingName;
      default:
        return item.name || 'Activity';
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      assigned: '#ffc107',
      confirmed: '#28a745',
      cancelled: '#dc3545',
      completed: '#17a2b8'
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

  const getPaymentStatusBadge = (status) => {
    const colors = {
      pending: '#dc3545',
      partial: '#ffc107',
      paid: '#28a745',
      overdue: '#6f42c1'
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

  if (!quote || !quote.isConverted) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '15px 20px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            🏢 Supplier Assignments
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>Quote must be converted before assigning suppliers.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasInvoice) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#ffc107',
            color: 'black',
            padding: '15px 20px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            🏢 Supplier Assignments
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🧾</div>
            <h4 style={{ color: '#333', marginBottom: '10px' }}>Invoice Required First</h4>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              You must generate an invoice for this quote before assigning suppliers.
            </p>
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '15px',
              marginTop: '15px'
            }}>
              <strong>Next Steps:</strong>
              <ol style={{ textAlign: 'left', marginTop: '10px', marginBottom: '0' }}>
                <li>Generate an invoice for this quote above</li>
                <li>Once invoice is created, supplier assignments will be available</li>
                <li>Assign suppliers to hotels, flights, and activities from your quote</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#28a745',
          color: 'white',
          padding: '15px 20px',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          🏢 Supplier Assignments
        </div>
        
        <div style={{ padding: '20px' }}>
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

          {!showAssignmentForm ? (
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={() => setShowAssignmentForm(true)}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '15px 30px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                ➕ Assign Supplier
              </button>
              <p style={{ color: '#666', margin: 0 }}>
                Assign suppliers for hotels, flights, and activities
              </p>
            </div>
          ) : (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h6 style={{ margin: 0 }}>
                  {editingAssignment ? '✏️ Edit Assignment' : '➕ New Assignment'}
                </h6>
                <button 
                  onClick={() => {
                    setShowAssignmentForm(false);
                    setEditingAssignment(null);
                    resetForm();
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Activity Type *
                    </label>
                    <select
                      value={formData.activityType}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          activityType: e.target.value, 
                          supplierId: '',
                          activityName: '',
                          agreedPrice: ''
                        }));
                        setSelectedItems([]); // Clear selected items when activity type changes
                      }}
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
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Supplier *
                    </label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="">Select supplier...</option>
                      {getSuppliersByType(formData.activityType).map(supplier => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.name} - {supplier.contactPerson}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Show Quote Items for Selected Activity Type with Checkboxes */}
                {getQuoteItemsByType(formData.activityType).length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Select {formData.activityType.charAt(0).toUpperCase() + formData.activityType.slice(1)}s from Quote *
                    </label>
                    <div style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '10px'
                    }}>
                      {getQuoteItemsByType(formData.activityType).map((item, index) => {
                        const itemName = getItemName(item, formData.activityType);
                        const isChecked = selectedItems.some(selected => selected.name === itemName);
                        
                        return (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: index < getQuoteItemsByType(formData.activityType).length - 1 ? '1px solid #eee' : 'none'
                          }}>
                            <input
                              type="checkbox"
                              id={`item-${index}`}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newItem = {
                                    name: itemName,
                                    price: item.price || 0,
                                    dayNumber: item.dayNumber || 1,
                                    nights: item.nights,
                                    itemData: item
                                  };
                                  console.log('Adding item to selectedItems:', newItem);
                                  setSelectedItems(prev => [...prev, newItem]);
                                } else {
                                  setSelectedItems(prev => prev.filter(selected => selected.name !== itemName));
                                }
                              }}
                              style={{
                                marginRight: '10px',
                                transform: 'scale(1.2)'
                              }}
                            />
                            <label htmlFor={`item-${index}`} style={{
                              flex: 1,
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}>
                              <div style={{ fontWeight: '500' }}>{itemName}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {formData.activityType === 'sightseeing' ? (
                                  <>
                                    {quote.currency} {item.adultRate?.toLocaleString() || 0}/adult × {item.adultCount || 1} adult{item.adultCount > 1 ? 's' : ''}
                                    {item.childCount > 0 && (
                                      <> + {quote.currency} {item.childRate?.toLocaleString() || 0}/child × {item.childCount} child{item.childCount > 1 ? 'ren' : ''}</>
                                    )}
                                    {item.dayNumber && ` • Day ${item.dayNumber}`}
                                  </>
                                ) : (
                                  <>
                                    {quote.currency} {item.adultRate?.toLocaleString() || 0}/night × {item.numberOfRooms} room{item.numberOfRooms > 1 ? 's' : ''} × {item.nights} night{item.nights > 1 ? 's' : ''}
                                    {item.dayNumber && ` • Day ${item.dayNumber}`}
                                  </>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#28a745' }}>
                                Total: {quote.currency} {item.price?.toLocaleString() || 0}
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    {selectedItems.length > 0 && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        {console.log('Rendering selectedItems:', selectedItems)}
                        <strong>Selected Items ({selectedItems.length}):</strong>
                        <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                          {selectedItems.map((item, index) => (
                            <li key={index}>
                              {item.name} - {quote.currency} {item.price.toLocaleString()}
                              {formData.activityType === 'sightseeing' && item.itemData && (
                                <>
                                  {' ('}
                                  {item.itemData.adultCount || 1} adult{item.itemData.adultCount > 1 ? 's' : ''}
                                  {item.itemData.childCount > 0 && (
                                    <> + {item.itemData.childCount} child{item.itemData.childCount > 1 ? 'ren' : ''}</>
                                  )}
                                  {')'}
                                </>
                              )}
                              {item.nights && ` (${item.nights} night${item.nights > 1 ? 's' : ''})`}
                            </li>
                          ))}
                        </ul>
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #dee2e6'
                        }}>
                          <strong>Total Price:</strong> {quote.currency} {selectedItems.reduce((sum, item) => sum + item.price, 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Show Activity Name field only for activities without quote items */}
                {getQuoteItemsByType(formData.activityType).length === 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                        No {formData.activityType}s found in this quote.
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        You can still create an assignment by entering details manually below.
                      </div>
                    </div>
                    
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', marginTop: '15px' }}>
                      Activity Name *
                    </label>
                    <input
                      type="text"
                      value={formData.activityName}
                      onChange={(e) => setFormData(prev => ({ ...prev, activityName: e.target.value }))}
                      placeholder="e.g., Custom Activity, Additional Service"
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                )}

                {/* Show Day Number field only for single item assignments or activities without quote items */}
                {selectedItems.length === 0 && getQuoteItemsByType(formData.activityType).length === 0 && (
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Day Number
                      </label>
                      <input
                        type="number"
                        value={formData.dayNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, dayNumber: parseInt(e.target.value) || 1 }))}
                        min="1"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Show day range information for multi-item assignments */}
                {selectedItems.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{
                      backgroundColor: '#e3f2fd',
                      border: '1px solid #bbdefb',
                      borderRadius: '4px',
                      padding: '10px',
                      fontSize: '14px'
                    }}>
                      <strong>📅 Assignment Period:</strong> 
                      {(() => {
                        const days = selectedItems.map(item => item.dayNumber || 1);
                        const minDay = Math.min(...days);
                        const maxDay = Math.max(...days);
                        const totalNights = selectedItems.reduce((sum, item) => sum + (item.nights || 1), 0);
                        
                        if (minDay === maxDay) {
                          return ` Day ${minDay} (${totalNights} total nights)`;
                        } else {
                          return ` Days ${minDay}-${maxDay} (${totalNights} total nights)`;
                        }
                      })()}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Activity Description
                  </label>
                  <textarea
                    value={formData.activityDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, activityDescription: e.target.value }))}
                    rows={2}
                    placeholder="Additional details about this activity..."
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Agreed Price *
                    </label>
                    <input
                      type="number"
                      value={selectedItems.length > 0 ? selectedItems.reduce((sum, item) => sum + item.price, 0) : formData.agreedPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, agreedPrice: e.target.value }))}
                      placeholder="0.00"
                      readOnly={selectedItems.length > 0}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: selectedItems.length > 0 ? '#f8f9fa' : 'white',
                        cursor: selectedItems.length > 0 ? 'not-allowed' : 'text'
                      }}
                    />
                    {selectedItems.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        💡 Auto-calculated from selected items. Editable only when no items are selected.
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAssignmentForm(false);
                      setEditingAssignment(null);
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
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      cursor: 'pointer'
                    }}
                  >
                    {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Assignments List */}
          {assignments.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h6 style={{ marginBottom: '15px' }}>Current Assignments</h6>
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {assignments.map((assignment) => (
                  <div key={assignment._id} style={{
                    padding: '15px',
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: 'white'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <strong>{assignment.activityName}</strong>
                          {getTypeBadge(assignment.activityType)}
                          {getStatusBadge(assignment.status)}
                          {getPaymentStatusBadge(assignment.paymentStatus)}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
                          <span><strong>Supplier:</strong> {assignment.supplier.name}</span>
                          <span><strong>Contact:</strong> {assignment.supplier.contactPerson}</span>
                        </div>
                        
                        {/* Display assigned items if this is a multi-item assignment */}
                        {assignment.assignedItems && assignment.assignedItems.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Assigned Items:</strong>
                            <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                              {assignment.assignedItems.map((item, index) => (
                                <li key={index} style={{ fontSize: '14px', color: '#666' }}>
                                  {item.name} 
                                  {item.dayNumber && <span> - Day {item.dayNumber}</span>}
                                  {item.nights > 1 && <span> - {item.nights} nights</span>}
                                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                    {' '}({assignment.currency} {item.price.toLocaleString()})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Show single day info for backward compatibility */}
                        {!assignment.assignedItems || assignment.assignedItems.length === 0 ? (
                          assignment.dayNumber > 1 && <span><strong>Day:</strong> {assignment.dayNumber}</span>
                        ) : null}
                        
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
                          <span><strong>Total Price:</strong> {assignment.currency} {assignment.agreedPrice.toLocaleString()}</span>
                          <span><strong>Paid:</strong> {assignment.currency} {assignment.totalPaidAmount.toLocaleString()}</span>
                          <span><strong>Remaining:</strong> {assignment.currency} {assignment.remainingAmount.toLocaleString()}</span>
                        </div>
                        
                        {assignment.activityDescription && (
                          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                            {assignment.activityDescription}
                          </p>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => handleEdit(assignment)}
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
                        {canMarkAsPaid() && assignment.paymentStatus !== 'paid' && (
                          <button 
                            onClick={() => handleMarkAsPaid(assignment)}
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Mark as Paid"
                          >
                            💰
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(assignment._id)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Mark as Paid Modal */}
        {showMarkPaidModal && markingPaidAssignment && (
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
              padding: '20px',
              width: '500px',
              maxWidth: '90%'
            }}>
              <h3 style={{ margin: '0 0 15px 0' }}>Mark Assignment as Paid</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Activity:</strong> {markingPaidAssignment.activityName}<br/>
                  <strong>Supplier:</strong> {markingPaidAssignment.supplier.name}<br/>
                  <strong>Amount:</strong> {markingPaidAssignment.currency} {markingPaidAssignment.agreedPrice.toLocaleString()}
                </p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentFormData.paymentReference}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
                  placeholder="e.g., Bank transaction ID, Cheque number"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  UTR Number
                </label>
                <input
                  type="text"
                  value={paymentFormData.utrNumber}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, utrNumber: e.target.value }))}
                  placeholder="Unique Transaction Reference"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Notes (optional)
                </label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional payment details..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowMarkPaidModal(false);
                    setMarkingPaidAssignment(null);
                  }}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitMarkPaid}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    cursor: 'pointer'
                  }}
                >
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default QuoteSupplierSection;
