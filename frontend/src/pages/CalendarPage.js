import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './CalendarPage.css';

const CalendarPage = () => {
  const { user } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [shareMessage, setShareMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    eventTypes: {
      'paid-invoice': true,
      'pending-invoice': true,
      'supplier-paid': true,
      'supplier-pending': true,
      'trip-with-suppliers': true,
      'trip-without-suppliers': true,
      'hotel': true,
      'sightseeing': true,
      'transfer': true
    },
    supplierStatus: 'all', // 'all', 'assigned', 'unassigned'
    quoteNumbers: [], // array of selected quote numbers
    dateRange: 'all', // 'all', 'this-month', 'next-month', 'custom'
    customStartDate: '',
    customEndDate: ''
  });

  // Fetch all data needed for calendar
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const [invoicesResponse, quotesResponse, supplierAssignmentsResponse] = await Promise.all([
        api.get('/invoices', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        api.get(`/quotes?organization=${user.organization._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        api.get('/supplier-assignments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const calendarEvents = [];

      // Process invoices
      invoicesResponse.data.forEach(invoice => {
        if (invoice.paymentCycles) {
          invoice.paymentCycles.forEach((cycle, index) => {
            if (cycle.dueDate) {
              calendarEvents.push({
                id: `${invoice._id}-cycle-${index}`,
                date: new Date(cycle.dueDate),
                type: cycle.status === 'paid' ? 'paid-invoice' : 'pending-invoice',
                title: `Invoice ${invoice.invoiceNumber} - Cycle ${index + 1}`,
                amount: cycle.amount,
                guestName: invoice.guestName,
                invoiceNumber: invoice.invoiceNumber,
                cycleNumber: index + 1,
                status: cycle.status,
                utrNumber: cycle.utrNumber
              });
            }
          });
        }
      });

      // Leads are now removed from calendar as requested

      // Process supplier payments
      supplierAssignmentsResponse.data.forEach(assignment => {
        if (assignment.paymentSchedule) {
          assignment.paymentSchedule.forEach((payment, index) => {
            if (payment.dueDate) {
              calendarEvents.push({
                id: `supplier-payment-${assignment._id}-payment-${index}`,
                date: new Date(payment.dueDate),
                type: payment.status === 'paid' ? 'supplier-paid' : 'supplier-pending',
                title: `Supplier Payment - ${assignment.activityName}`,
                activityType: 'Supplier Payment',
                activityName: assignment.activityName,
                supplierName: assignment.supplier?.name || 'Unknown Supplier',
                quoteNumber: assignment.quote?.quoteNumber || 'Unknown Quote',
                paymentAmount: payment.amount,
                paymentStatus: payment.status,
                dueDate: payment.dueDate,
                paidDate: payment.paidDate,
                utrNumber: payment.utrNumber,
                activityTypeDetail: assignment.activityType
              });
            }
          });
        }
      });

      // Process quotes for day-wise activities (only converted trips)
      quotesResponse.data.forEach(quote => {
        if (quote.isConverted && quote.travelStartDate && quote.days) {
          // Check if quote has supplier assignments
          const quoteAssignments = supplierAssignmentsResponse.data.filter(
            assignment => assignment.quote?._id === quote._id
          );
          
          const hasSupplierAssignments = quoteAssignments.length > 0;

          // Add day-wise activities for each day of the trip
          quote.days.forEach((day, dayIndex) => {
            // Use the actual day date if available, otherwise calculate from start date
            let dayDate;
            if (day.date) {
              dayDate = new Date(day.date);
            } else {
              dayDate = new Date(quote.travelStartDate);
              dayDate.setDate(dayDate.getDate() + (day.dayNumber ? day.dayNumber - 1 : dayIndex));
            }
            
            // Normalize date to avoid timezone issues
            const normalizedDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
            
            // Collect all activities for this day to group them
            const dayActivities = {
              sightseeings: [],
              transfers: [],
              hotels: []
            };

            // Collect sightseeings
            if (day.sightseeings && day.sightseeings.length > 0) {
              day.sightseeings.forEach((sightseeing) => {
                const sightseeingName = sightseeing.sightseeing?.name || 'Sightseeing';
                
                // Debug sightseeing matching
                const sightseeingAssignments = supplierAssignmentsResponse.data.filter(
                  assignment => assignment.quote?._id === quote._id && 
                                 assignment.activityType === 'sightseeing'
                );

                const hasSupplierForActivity = sightseeingAssignments.some(assignment => {
                  return assignment.assignedItems && assignment.assignedItems.some(item => {
                    const itemName = item.name || '';
                    const exactMatch = itemName === sightseeingName;
                    const itemContainsSightseeing = itemName.includes(sightseeingName.split(' ')[0]);
                    const sightseeingContainsItem = sightseeingName.includes(itemName.split(' ')[0]);
                    return exactMatch || itemContainsSightseeing || sightseeingContainsItem;
                  });
                });
                dayActivities.sightseeings.push({
                  name: sightseeingName,
                  adultRate: sightseeing.adultRate,
                  childRate: sightseeing.childRate,
                  hasSupplier: hasSupplierForActivity
                });
              });
            }

            // Collect transfers
            if (day.transfers && day.transfers.length > 0) {
              day.transfers.forEach((transfer) => {
                const transferName = transfer.transfer?.name || transfer.name || 'Transfer';
                const fromLocation = transfer.transfer?.fromLocation || transfer.fromLocation || 'From';
                const toLocation = transfer.transfer?.toLocation || transfer.toLocation || 'To';
                // Debug transfer matching - check assignedItems for actual transport names
                const transportAssignments = supplierAssignmentsResponse.data.filter(
                  assignment => assignment.quote?._id === quote._id && 
                                 assignment.activityType === 'transport'
                );

                const hasSupplierForActivity = transportAssignments.some(assignment => {
                  return assignment.assignedItems && assignment.assignedItems.some(item => {
                    const itemName = item.name || '';
                    const exactMatch = itemName === transferName;
                    const itemContainsTransfer = itemName.includes(transferName.split(' - ')[0]);
                    const transferContainsItem = transferName.includes(itemName.split(' - ')[0]);
                    return exactMatch || itemContainsTransfer || transferContainsItem;
                  });
                });
                dayActivities.transfers.push({
                  name: transferName,
                  from: fromLocation,
                  to: toLocation,
                  rate: transfer.rate,
                  vehicleType: transfer.transfer?.vehicleType || transfer.vehicleType,
                  hasSupplier: hasSupplierForActivity
                });
              });
            }

            // Create separate events for each individual activity
            dayActivities.sightseeings.forEach((sightseeing, sightseeingIndex) => {
              calendarEvents.push({
                id: `sightseeing-${quote._id}-day-${dayIndex}-${sightseeingIndex}`,
                date: normalizedDate,
                type: 'sightseeing',
                title: `${quote.quoteNumber} - ${sightseeing.name}`,
                quoteNumber: quote.quoteNumber,
                country: quote.country,
                activityDate: dayDate,
                dayNumber: day.dayNumber || dayIndex + 1,
                adultPax: quote.adultPax,
                childPax: quote.childPax,
                isConverted: quote.isConverted,
                hasSupplier: sightseeing.hasSupplier,
                activityName: sightseeing.name,
                adultRate: sightseeing.adultRate,
                childRate: sightseeing.childRate,
                guestName: quote.leadName || quote.clientName || quote.name || quote.guestName || 'N/A',
                startDate: quote.travelStartDate,
                endDate: quote.travelEndDate
              });
            });

            dayActivities.transfers.forEach((transfer, transferIndex) => {
              calendarEvents.push({
                id: `transfer-${quote._id}-day-${dayIndex}-${transferIndex}`,
                date: normalizedDate,
                type: 'transfer',
                title: `${quote.quoteNumber} - ${transfer.name}`,
                quoteNumber: quote.quoteNumber,
                country: quote.country,
                activityDate: dayDate,
                dayNumber: day.dayNumber || dayIndex + 1,
                adultPax: quote.adultPax,
                childPax: quote.childPax,
                isConverted: quote.isConverted,
                hasSupplier: transfer.hasSupplier,
                activityName: transfer.name,
                from: transfer.from,
                to: transfer.to,
                rate: transfer.rate,
                vehicleType: transfer.vehicleType,
                guestName: quote.leadName || quote.clientName || quote.name || quote.guestName || 'N/A',
                startDate: quote.travelStartDate,
                endDate: quote.travelEndDate
              });
            });

            dayActivities.hotels.forEach((hotel, hotelIndex) => {
              calendarEvents.push({
                id: `hotel-${quote._id}-day-${dayIndex}-${hotelIndex}`,
                date: normalizedDate,
                type: 'hotel',
                title: `${quote.quoteNumber} - ${hotel.name}`,
                quoteNumber: quote.quoteNumber,
                country: quote.country,
                activityDate: dayDate,
                dayNumber: day.dayNumber || dayIndex + 1,
                adultPax: quote.adultPax,
                childPax: quote.childPax,
                isConverted: quote.isConverted,
                hasSupplier: hotel.hasSupplier,
                hotelName: hotel.name,
                roomType: hotel.roomType,
                numberOfRooms: hotel.numberOfRooms,
                adultRate: hotel.adultRate,
                guestName: quote.leadName || quote.clientName || quote.name || quote.guestName || 'N/A',
                startDate: quote.travelStartDate,
                endDate: quote.travelEndDate
              });
            });

            // Collect hotels for this day
            if (day.hotels && day.hotels.length > 0) {
              day.hotels.forEach((hotel) => {
                const hotelName = hotel.hotel?.name || hotel.name || 'Hotel';
                const firstRoom = hotel.rooms?.[0];
                // Check if this specific hotel has supplier assignment (updated for multi-item assignments)
                const hasSupplierForActivity = supplierAssignmentsResponse.data.some(
                  assignment => assignment.quote?._id === quote._id && 
                                 assignment.activityType === 'hotel' &&
                                 (
                                   // Check if hotel is in assignedItems array (new multi-item logic)
                                   (assignment.assignedItems && assignment.assignedItems.length > 0 && 
                                    assignment.assignedItems.some(item => 
                                      item.name === hotelName || 
                                      hotelName.toLowerCase().includes(item.name.toLowerCase()) ||
                                      item.name.toLowerCase().includes(hotelName.toLowerCase())
                                    )) ||
                                   // Fallback to old single-item logic for backward compatibility
                                   assignment.activityName === hotelName ||
                                   assignment.activityName === 'Hotel' ||
                                   hotelName.toLowerCase().includes(assignment.activityName.toLowerCase()) ||
                                   assignment.activityName.toLowerCase().includes(hotelName.toLowerCase())
                                 )
                );
                dayActivities.hotels.push({
                  name: hotelName,
                  roomType: firstRoom?.name || 'Standard',
                  numberOfRooms: firstRoom?.numberOfRooms || 1,
                  adultRate: firstRoom?.adultRate,
                  hasSupplier: hasSupplierForActivity
                });
              });
            }
          });

          // Also process hotels at the quote level (if they exist there)
          if (quote.hotels && quote.hotels.length > 0) {
            quote.hotels.forEach((hotel, index) => {
              const hotelName = hotel.hotel?.name || hotel.name || 'Hotel';
              const firstRoom = hotel.rooms?.[0];
              
              // Check if this specific hotel has supplier assignment
              const hasSupplierForActivity = supplierAssignmentsResponse.data.some(
                assignment => assignment.quote?._id === quote._id && 
                               assignment.activityType === 'hotel' &&
                               (
                                 // Check if hotel is in assignedItems array (new multi-item logic)
                                 (assignment.assignedItems && assignment.assignedItems.length > 0 && 
                                  assignment.assignedItems.some(item => 
                                    item.name === hotelName || 
                                    hotelName.toLowerCase().includes(item.name.toLowerCase()) ||
                                    item.name.toLowerCase().includes(hotelName.toLowerCase())
                                  )) ||
                                 // Fallback to old single-item logic for backward compatibility
                                 assignment.activityName === hotelName ||
                                 assignment.activityName === 'Hotel' ||
                                 hotelName.toLowerCase().includes(assignment.activityName.toLowerCase()) ||
                                 assignment.activityName.toLowerCase().includes(hotelName.toLowerCase())
                               )
              );

              
              // Calculate number of nights from check-in/check-out dates
              let numberOfNights = 1; // Default to 1 night
              if (firstRoom?.checkIn && firstRoom?.checkOut) {
                const checkIn = new Date(firstRoom.checkIn);
                const checkOut = new Date(firstRoom.checkOut);
                const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                numberOfNights = nights > 0 ? nights : 1;
              }
              
              // Create hotel events for each night
              for (let night = 0; night < numberOfNights; night++) {
                const nightDate = new Date(quote.travelStartDate);
                nightDate.setDate(nightDate.getDate() + night);
                const normalizedDate = new Date(nightDate.getFullYear(), nightDate.getMonth(), nightDate.getDate());
                
                const hotelEvent = {
                  id: `hotel-quote-level-${quote._id}-${index}-night-${night}`,
                  date: normalizedDate,
                  type: 'hotel',
                  title: `${hotelName} (Night ${night + 1})`,
                  quoteNumber: quote.quoteNumber,
                  country: quote.country,
                  activityType: 'Hotel',
                  activityName: hotelName,
                  activityDate: nightDate,
                  dayNumber: night + 1,
                  hotelName: hotelName,
                  roomType: firstRoom?.name || 'Standard',
                  numberOfRooms: firstRoom?.numberOfRooms || 1,
                  adultRate: firstRoom?.adultRate,
                  checkIn: firstRoom?.checkIn,
                  checkOut: firstRoom?.checkOut,
                  nightNumber: night + 1,
                  totalNights: numberOfNights,
                  hasSupplier: hasSupplierForActivity,
                  guestName: quote.leadName || quote.clientName || quote.name || quote.guestName || 'N/A',
                  adultPax: quote.adultPax,
                  childPax: quote.childPax,
                  isConverted: quote.isConverted
                };
                calendarEvents.push(hotelEvent);
              }
            });
          }

          // Also add a summary event for the converted trip
          calendarEvents.push({
            id: `trip-summary-${quote._id}`,
            date: new Date(quote.travelStartDate),
            type: hasSupplierAssignments ? 'trip-with-suppliers' : 'trip-without-suppliers',
            title: `🎫 Converted Trip ${quote.quoteNumber}`,
            quoteNumber: quote.quoteNumber,
            country: quote.country,
            startDate: quote.travelStartDate,
            endDate: quote.travelEndDate,
            adultPax: quote.adultPax,
            childPax: quote.childPax,
            hasSuppliers: hasSupplierAssignments,
            isConverted: true,
            totalDays: quote.days ? quote.days.length : 0,
            guestName: quote.leadName || quote.clientName || quote.name || quote.guestName || 'N/A'
          });
        }
      });

      setEvents(calendarEvents);
    } catch (error) {
      // Error fetching calendar data
    } finally {
      setLoading(false);
    }
  }, [user.organization._id]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Apply filters whenever events or filter criteria change
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...events];
      
      // Filter by event types
      filtered = filtered.filter(event => filters.eventTypes[event.type] !== false);
      
      // Filter by supplier status
      if (filters.supplierStatus !== 'all') {
        filtered = filtered.filter(event => {
          const hasSuppliers = event.hasSuppliers;
          return filters.supplierStatus === 'assigned' ? hasSuppliers : !hasSuppliers;
        });
      }
      
      // Filter by quote numbers
      if (filters.quoteNumbers.length > 0) {
        filtered = filtered.filter(event => 
          filters.quoteNumbers.includes(event.quoteNumber)
        );
      }
      
      // Filter by date range
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          
          switch (filters.dateRange) {
            case 'this-month':
              return eventDate.getMonth() === currentMonth && 
                     eventDate.getFullYear() === currentYear;
            case 'next-month':
              const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
              const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
              return eventDate.getMonth() === nextMonth && 
                     eventDate.getFullYear() === nextYear;
            case 'custom':
              if (filters.customStartDate && filters.customEndDate) {
                const start = new Date(filters.customStartDate);
                const end = new Date(filters.customEndDate);
                return eventDate >= start && eventDate <= end;
              }
              return true;
            default:
              return true;
          }
        });
      }
      
      setFilteredEvents(filtered);
    };
    
    applyFilters();
  }, [events, filters]);

  // Calendar navigation
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    if (!date) return [];
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const generateShareMessage = (event) => {
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let message = `Details for tomorrow tour is:\n\n`;
    message += `Quote ID: ${event.quoteNumber}\n`;
    
    const leadName = event.leadName || event.clientName || event.guestName || event.name || event.lead?.name || event.client?.name || 'N/A';
    message += `Name of Lead Pax: ${leadName}\n`;
    message += `Number of Pax: ${event.adultPax} Adults${event.childPax > 0 ? `, ${event.childPax} Children` : ''}\n`;
    message += `Pickup Time: ${event.pickupTime || 'To be confirmed'}\n`;
    message += `Day Sightseeings and Transfers:\n`;
    
    // Handle trip events with activities array
    if (event.activities) {
      // Add sightseeings
      if (event.activities.sightseeings.length > 0) {
        message += `\n🏛️ Sightseeing:\n`;
        event.activities.sightseeings.forEach((sightseeing, index) => {
          message += `${index + 1}. ${sightseeing.name}\n`;
        });
      }
      
      // Add transfers
      if (event.activities.transfers.length > 0) {
        message += `\n🚐 Transfers:\n`;
        event.activities.transfers.forEach((transfer, index) => {
          message += `${index + 1}. ${transfer.name} - ${transfer.fromLocation || 'Pickup'} to ${transfer.toLocation || 'Drop-off'}\n`;
        });
      }
    }
    
    // Handle individual sightseeing events
    if (event.type === 'sightseeing') {
      message += `\n🏛️ Sightseeing:\n`;
      message += `1. ${event.activityName}\n`;
    }
    
    // Handle individual transfer events
    if (event.type === 'transfer') {
      message += `\n🚐 Transfers:\n`;
      message += `1. ${event.activityName} - ${event.from || 'Pickup'} to ${event.to || 'Drop-off'}\n`;
    }
    
    // Check if there's anything to share
    if (!event.activities && event.type !== 'sightseeing' && event.type !== 'transfer') {
      return '';
    }
    
    if (event.activities && !event.activities.sightseeings.length && !event.activities.transfers.length) {
      return '';
    }
    
    return message;
  };

  const shareTourDetails = (event) => {
    // Fetch lead name from quote data since it's not in event data
    fetchLeadNameFromQuote(event.quoteNumber, event);
  };

  const fetchLeadNameFromQuote = async (quoteNumber, event) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quotes/${quoteNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const quoteData = await response.json();
        
        // Update event with lead name from quote
        event.leadName = quoteData.leadName || quoteData.clientName || quoteData.name || quoteData.lead?.name || quoteData.client?.name || 'N/A';
      } else {
        event.leadName = 'N/A';
      }
    } catch (error) {
      event.leadName = 'N/A';
    }
    
    const message = generateShareMessage(event);
    if (!message) {
      alert('No sightseeings or transfers available to share for this tour.');
      return;
    }
    
    setShareMessage(message);
    setShowShareModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Tour details copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy tour details. Please copy manually.');
    });
  };

  // Handle date click
  const handleDateClick = (date, dayEvents) => {
    setSelectedDate(date);
    setSelectedDateEvents(dayEvents);
    setShowEventModal(true);
  };

  // Get event color based on type
  const getEventColor = (type) => {
    switch (type) {
      case 'paid-invoice': return '#28a745';
      case 'pending-invoice': return '#dc3545';
      case 'supplier-paid': return '#198754';
      case 'supplier-pending': return '#dc3545';
      case 'trip-with-suppliers': return '#6f42c1';
      case 'trip-without-suppliers': return '#e83e8c';
      case 'sightseeing': return '#20c997';
      case 'transfer': return '#0d6efd';
      case 'hotel': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  // Get event icon
  const getEventIcon = (type) => {
    switch (type) {
      case 'paid-invoice': return '✅';
      case 'pending-invoice': return '💰';
      case 'supplier-paid': return '�';
      case 'supplier-pending': return '⏳';
      case 'trip-with-suppliers': return '🎫';
      case 'trip-without-suppliers': return '🎯';
      case 'sightseeing': return '🏛️';
      case 'transfer': return '🚐';
      case 'hotel': return '🏨';
      default: return '📅';
    }
  };

  const getEventDescription = (event) => {
    switch (event.type) {
      case 'paid-invoice':
        return `Invoice: ${event.quoteNumber} | Guest: ${event.guestName || 'N/A'} | Amount: ₹${event.amount?.toLocaleString('en-IN') || '0'}`;
      case 'pending-invoice':
        return `Invoice: ${event.quoteNumber} | Guest: ${event.guestName || 'N/A'} | Amount: ₹${event.amount?.toLocaleString('en-IN') || '0'}`;
      case 'supplier-paid':
        return `${event.activityName} | Supplier: ${event.supplierName || 'N/A'} | Amount: ₹${event.paymentAmount?.toLocaleString('en-IN') || '0'}`;
      case 'supplier-pending':
        return `${event.activityName} | Supplier: ${event.supplierName || 'N/A'} | Amount: ₹${event.paymentAmount?.toLocaleString('en-IN') || '0'}`;
      case 'trip-with-suppliers':
        return `Quote: ${event.quoteNumber} | ${event.adultPax || 0} Adults${event.childPax > 0 ? `, ${event.childPax} Children` : ''} | Suppliers Assigned`;
      case 'trip-without-suppliers':
        return `Quote: ${event.quoteNumber} | ${event.adultPax || 0} Adults${event.childPax > 0 ? `, ${event.childPax} Children` : ''} | No Suppliers`;
      case 'hotel':
        return `Day ${event.dayNumber || 'N/A'} | Rooms: ${event.numberOfRooms || 1} | Rate: ₹${event.adultRate?.toLocaleString('en-IN') || '0'}/night | ${event.hasSupplier ? 'Supplier Assigned' : 'No Supplier'}`;
      case 'sightseeing':
        return `Day ${event.dayNumber || 'N/A'} | Rate: ₹${event.adultRate?.toLocaleString('en-IN') || '0'}/adult | ${event.hasSupplier ? 'Supplier Assigned' : 'No Supplier'}`;
      case 'transfer':
        return `Day ${event.dayNumber || 'N/A'} | ${event.from || 'N/A'} to ${event.to || 'N/A'} | ${event.vehicleType || 'Standard'} | ${event.hasSupplier ? 'Supplier Assigned' : 'No Supplier'}`;
      default:
        return event.title || 'No description available';
    }
  };

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="calendar-container">
        {/* Header */}
        <div className="calendar-header">
          <div className="header-left">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              ← Back to Dashboard
            </button>
            <h1>📅 Operations Calendar</h1>
          </div>
          <div className="header-right">
            <button
              onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
              className="btn btn-primary"
            >
              {viewMode === 'month' ? 'Week View' : 'Month View'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '8px 16px',
                backgroundColor: showFilters ? '#28a745' : '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔍 {showFilters ? 'Filters Active' : 'Filters'}
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Today
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '2px solid #28a745'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: 0, color: '#28a745' }}>🔍 Calendar Filters</h3>
              <button
                onClick={() => {
                  setFilters({
                    eventTypes: {
                      'paid-invoice': true,
                      'pending-invoice': true,
                      'supplier-paid': true,
                      'supplier-pending': true,
                      'trip-with-suppliers': true,
                      'trip-without-suppliers': true,
                      'hotel': true,
                      'sightseeing': true,
                      'transfer': true
                    },
                    supplierStatus: 'all',
                    quoteNumbers: [],
                    dateRange: 'all',
                    customStartDate: '',
                    customEndDate: ''
                  });
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Reset All
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              
              {/* Event Types */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Event Types</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries({
                    'paid-invoice': '✅ Paid Invoices',
                    'pending-invoice': '💰 Pending Invoices', 
                    'supplier-paid': '💳 Supplier Paid',
                    'supplier-pending': '⏳ Supplier Pending',
                    'trip-with-suppliers': '🎫 Trips (Suppliers Assigned)',
                    'trip-without-suppliers': '🎯 Trips (No Suppliers)',
                    'hotel': '🏨 Hotels',
                    'sightseeing': '🏛️ Sightseeing',
                    'transfer': '🚐 Transfers'
                  }).map(([type, label]) => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={filters.eventTypes[type]}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          eventTypes: {
                            ...prev.eventTypes,
                            [type]: e.target.checked
                          }
                        }))}
                        style={{ cursor: 'pointer' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Supplier Status */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Supplier Status</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { value: 'all', label: '📋 All Events' },
                    { value: 'assigned', label: '✅ Suppliers Assigned' },
                    { value: 'unassigned', label: '❌ Suppliers Not Assigned' }
                  ].map(option => (
                    <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="supplierStatus"
                        checked={filters.supplierStatus === option.value}
                        onChange={() => setFilters(prev => ({ ...prev, supplierStatus: option.value }))}
                        style={{ cursor: 'pointer' }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Date Range */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Date Range</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { value: 'all', label: '📅 All Dates' },
                    { value: 'this-month', label: '📆 This Month' },
                    { value: 'next-month', label: '🗓️ Next Month' },
                    { value: 'custom', label: '📌 Custom Range' }
                  ].map(option => (
                    <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="dateRange"
                        checked={filters.dateRange === option.value}
                        onChange={() => setFilters(prev => ({ ...prev, dateRange: option.value }))}
                        style={{ cursor: 'pointer' }}
                      />
                      {option.label}
                    </label>
                  ))}
                  
                  {filters.dateRange === 'custom' && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="date"
                        value={filters.customStartDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, customStartDate: e.target.value }))}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      />
                      <input
                        type="date"
                        value={filters.customEndDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, customEndDate: e.target.value }))}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Active Filters Summary */}
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              <strong>Active Filters:</strong> Showing {filteredEvents.length} of {events.length} events
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Legend</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>✅ Paid Invoice</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>💰 Pending Payment</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#198754', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>💳 Supplier Paid</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>⏳ Supplier Pending</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#6f42c1', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>🎫 Converted Trip (Suppliers Assigned)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#e83e8c', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>🎯 Converted Trip (No Suppliers)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#20c997', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>🏛️ Sightseeing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#0d6efd', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>🚐 Transfer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#fd7e14', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '14px' }}>🏨 Hotel</span>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => navigateMonth('prev')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Previous
          </button>
          <h2 style={{ margin: 0, color: '#333' }}>{monthYear}</h2>
          <button
            onClick={() => navigateMonth('next')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {/* Week day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#007bff' }}>
            {weekDays.map(day => (
              <div key={day} style={{ 
                padding: '15px', 
                textAlign: 'center', 
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((date, index) => {
              const dayEvents = date ? getEventsForDate(date) : [];
              const isToday = date && date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  onClick={() => date && handleDateClick(date, dayEvents)}
                  style={{
                    minHeight: '160px',
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    backgroundColor: isToday ? '#e3f2fd' : (date ? 'white' : '#f8f9fa'),
                    cursor: date ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                >
                  {date && (
                    <>
                      <div style={{ 
                        fontWeight: isToday ? 'bold' : 'normal',
                        color: isToday ? '#1976d2' : '#333',
                        marginBottom: '8px',
                        fontSize: '16px'
                      }}>
                        {date.getDate()}
                      </div>
                      
                      {/* Event dots container */}
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '4px',
                        marginTop: '8px'
                      }}>
                        {dayEvents.slice(0, 8).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: getEventColor(event.type),
                              cursor: 'pointer',
                              transition: 'transform 0.2s',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.5)';
                              const rect = e.target.getBoundingClientRect();
                              setTooltipPosition({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10
                              });
                              setHoveredEvent(event);
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              setHoveredEvent(null);
                            }}
                            title={event.title}
                          />
                        ))}
                        {dayEvents.length > 8 && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#666',
                            fontWeight: 'bold',
                            alignSelf: 'center',
                            marginTop: '2px'
                          }}>
                            +{dayEvents.length - 8}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Modal */}
        {showEventModal && selectedDate && (
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
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ 
                padding: '20px', 
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0 }}>
                  {formatDate(selectedDate)}
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ padding: '20px' }}>
                {selectedDateEvents.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#666' }}>No events for this date</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {selectedDateEvents.map(event => (
                      <div key={event.id} style={{
                        border: `2px solid ${getEventColor(event.type)}`,
                        borderRadius: '8px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          marginBottom: '10px'
                        }}>
                          <span style={{ fontSize: '20px' }}>{getEventIcon(event.type)}</span>
                          <h4 style={{ margin: 0, color: getEventColor(event.type) }}>
                            {event.title}
                          </h4>
                        </div>
                        
                        {/* Invoice Details */}
                        {(event.type === 'paid-invoice' || event.type === 'pending-invoice') && (
                          <div style={{ fontSize: '14px' }}>
                            <p><strong>Guest:</strong> {event.guestName}</p>
                            <p><strong>Amount:</strong> ₹{event.amount?.toLocaleString('en-IN')}</p>
                            <p><strong>Status:</strong> {event.status === 'paid' ? 'Paid' : 'Pending'}</p>
                            {event.utrNumber && <p><strong>UTR:</strong> {event.utrNumber}</p>}
                          </div>
                        )}
                        
                        {/* Lead details removed as requested */}
                        
                        {/* Quote/Supplier Details */}
                        {(event.type === 'assigned-suppliers' || event.type === 'unassigned-suppliers') && (
                          <div style={{ fontSize: '14px' }}>
                            <p><strong>Quote:</strong> {event.quoteNumber}</p>
                            <p><strong>Country:</strong> {event.country}</p>
                            <p><strong>Travel Dates:</strong> {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</p>
                            <p><strong>Passengers:</strong> {event.adultPax} Adults{event.childPax > 0 && `, ${event.childPax} Children`}</p>
                            <p><strong>Suppliers:</strong> {event.hasSuppliers ? 'Assigned' : 'Not Assigned'}</p>
                          </div>
                        )}
                        
                        {/* Trip Summary Events (for converted trip summaries) */}
                        {(event.type === 'trip-with-suppliers' || event.type === 'trip-without-suppliers') && (
                          <div style={{ fontSize: '14px' }}>
                            <p><strong>Guest:</strong> {event.guestName}</p>
                            <p><strong>Quote:</strong> {event.quoteNumber}</p>
                            <p><strong>Country:</strong> {event.country}</p>
                            <p><strong>Travel Dates:</strong> {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</p>
                            <p><strong>Passengers:</strong> {event.adultPax} Adults{event.childPax > 0 && `, ${event.childPax} Children`}</p>
                            <p><strong>Status:</strong> {event.isConverted ? '✅ Converted to Booking' : '📋 Quote'}</p>
                            <p><strong>Suppliers:</strong> {event.hasSuppliers ? '✅ Assigned' : '❌ Not Assigned'}</p>
                            <p><strong>Total Days:</strong> {event.totalDays}</p>
                          </div>
                        )}
                        
                        {/* Supplier Payment Details */}
                        {(event.type === 'supplier-paid' || event.type === 'supplier-pending') && (
                          <div style={{ fontSize: '14px' }}>
                            <p><strong>Activity:</strong> {event.activityName}</p>
                            <p><strong>Type:</strong> {event.activityTypeDetail}</p>
                            <p><strong>Supplier:</strong> {event.supplierName}</p>
                            <p><strong>Quote:</strong> {event.quoteNumber}</p>
                            <p><strong>Amount:</strong> ₹{event.paymentAmount?.toLocaleString('en-IN')}</p>
                            <p><strong>Status:</strong> {event.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}</p>
                            <p><strong>Due Date:</strong> {new Date(event.dueDate).toLocaleDateString()}</p>
                            {event.paidDate && <p><strong>Paid Date:</strong> {new Date(event.paidDate).toLocaleDateString()}</p>}
                            {event.utrNumber && <p><strong>UTR:</strong> {event.utrNumber}</p>}
                          </div>
                        )}
                        
                        {/* Sightseeing Details */}
                        {event.type === 'sightseeing' && (
                          <div style={{ fontSize: '14px' }}>
                            <p><strong>Guest:</strong> {event.guestName}</p>
                            <p><strong>Quote:</strong> {event.quoteNumber}</p>
                            <p><strong>Country:</strong> {event.country}</p>
                            <p><strong>Day:</strong> {event.dayNumber}</p>
                            <p><strong>Activity:</strong> {event.activityName}</p>
                            <p><strong>Adult Rate:</strong> ₹{event.adultRate?.toLocaleString('en-IN')}</p>
                            <p><strong>Child Rate:</strong> ₹{event.childRate?.toLocaleString('en-IN')}</p>
                            <p><strong>Passengers:</strong> {event.adultPax} Adults{event.childPax > 0 && `, ${event.childPax} Children`}</p>
                            <p><strong>Status:</strong> {event.isConverted ? '✅ Converted to Booking' : '📋 Quote'}</p>
                            <p><strong>Supplier:</strong> {event.hasSupplier ? '✅ Assigned' : '❌ Not Assigned'}</p>
                            
                            {/* Share Button for Sightseeing */}
                            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                              <button
                                onClick={() => shareTourDetails(event)}
                                style={{
                                  padding: '10px 20px',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                              >
                                📤 Share Tour Details
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Transfer Details */}
                        {event.type === 'transfer' && (
                          <div style={{ fontSize: '14px' }}>
                            <p><strong>Guest:</strong> {event.guestName}</p>
                            <p><strong>Quote:</strong> {event.quoteNumber}</p>
                            <p><strong>Country:</strong> {event.country}</p>
                            <p><strong>Day:</strong> {event.dayNumber}</p>
                            <p><strong>Transfer:</strong> {event.activityName}</p>
                            <p><strong>Route:</strong> {event.from} to {event.to}</p>
                            <p><strong>Vehicle:</strong> {event.vehicleType || 'Standard'}</p>
                            <p><strong>Rate:</strong> ₹{event.rate?.toLocaleString('en-IN')}</p>
                            <p><strong>Passengers:</strong> {event.adultPax} Adults{event.childPax > 0 && `, ${event.childPax} Children`}</p>
                            <p><strong>Status:</strong> {event.isConverted ? '✅ Converted to Booking' : '📋 Quote'}</p>
                            <p><strong>Supplier:</strong> {event.hasSupplier ? '✅ Assigned' : '❌ Not Assigned'}</p>
                            
                            {/* Share Button for Transfer */}
                            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                              <button
                                onClick={() => shareTourDetails(event)}
                                style={{
                                  padding: '10px 20px',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                              >
                                📤 Share Tour Details
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Hotel Details */}
                        {event.type === 'hotel' && (
                          <div style={{ fontSize: '14px' }}>
                            <p><strong>Guest:</strong> {event.guestName}</p>
                            <p><strong>Quote:</strong> {event.quoteNumber}</p>
                            <p><strong>Country:</strong> {event.country}</p>
                            <p><strong>Day:</strong> {event.dayNumber}</p>
                            <p><strong>Hotel:</strong> {event.hotelName}</p>
                            <p><strong>Room Type:</strong> {event.roomType}</p>
                            <p><strong>Rooms:</strong> {event.numberOfRooms}</p>
                            <p><strong>Adult Rate:</strong> ₹{event.adultRate?.toLocaleString('en-IN')}</p>
                            <p><strong>Passengers:</strong> {event.adultPax} Adults{event.childPax > 0 && `, ${event.childPax} Children`}</p>
                            <p><strong>Status:</strong> {event.isConverted ? '✅ Converted to Booking' : '📋 Quote'}</p>
                            <p><strong>Supplier:</strong> {event.hasSupplier ? '✅ Assigned' : '❌ Not Assigned'}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Share Modal */}
        {showShareModal && (
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
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ 
                padding: '20px', 
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0 }}>
                  📤 Share Tour Details
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ padding: '20px' }}>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  padding: '15px',
                  marginBottom: '15px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {shareMessage}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      copyToClipboard(shareMessage);
                      setShowShareModal(false);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    📋 Copy to Clipboard
                  </button>
                  
                  <button
                    onClick={() => setShowShareModal(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* React-based Tooltip */}
        {hoveredEvent && (
          <div
            style={{
              position: 'fixed',
              background: '#333',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              zIndex: 10000,
              top: tooltipPosition.y - 40,
              left: tooltipPosition.x,
              transform: 'translateX(-50%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              transition: 'opacity 0.2s'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {getEventIcon(hoveredEvent.type)} {hoveredEvent.title}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>
              {getEventDescription(hoveredEvent)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
