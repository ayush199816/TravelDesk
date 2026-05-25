import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api/axios';
import QuoteBuilder from '../components/QuoteBuilder';
import QuoteInvoiceSectionSimple from '../components/QuoteInvoiceSectionSimple';
import QuoteSupplierSection from '../components/QuoteSupplierSection';
import './LeadDetailPage.css';

const LeadDetailPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { leadNumber } = useParams();
  const [lead, setLead] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [supplierSectionKey, setSupplierSectionKey] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [shareOptions, setShareOptions] = useState({
    hotels: true,
    flights: true,
    transportation: true,
    inclusions: true,
    exclusions: true,
    dayWiseItinerary: true
  });
  const [invoices, setInvoices] = useState([]);
  const [recommendedQuotes, setRecommendedQuotes] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const fetchLeadByNumber = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/leads/by-number/${leadNumber}?organization=${user.organization._id}`);
      setLead(response.data);
      setError(null);
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Lead not found');
      } else if (error.response?.status === 403) {
        setError('Access denied: You can only view leads from your organization');
      } else {
        setError('Error fetching lead details');
      }
    } finally {
      setLoading(false);
    }
  }, [leadNumber, user.organization._id]);

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await api.get(`/quotes?organization=${user.organization._id}&lead=${lead._id}`);
      setQuotes(response.data);
    } catch (error) {
      // Error fetching quotes
    }
  }, [lead?._id, user.organization._id]);

  useEffect(() => {
    if (leadNumber && user?.organization?._id) {
      fetchLeadByNumber();
    }
  }, [leadNumber, user, fetchLeadByNumber]);

  const fetchRecommendedQuotes = useCallback(async () => {
    if (!lead) return;
    
    try {
      setLoadingRecommendations(true);
      
      // Build query parameters based on lead data
      const params = new URLSearchParams();
      params.append('organization', user.organization._id);
      params.append('excludeLead', lead._id); // Exclude current lead's quotes
      
      if (lead.travelToCountry) {
        params.append('country', lead.travelToCountry);
      }
      
      if (lead.tags && lead.tags.length > 0) {
        params.append('tags', lead.tags.join(','));
      }
      
      const url = `/quotes/recommendations?${params.toString()}`;
      
      const response = await api.get(url);
      setRecommendedQuotes(response.data || []);
    } catch (error) {
      setRecommendedQuotes([]);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [lead, user.organization._id]);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get(`/invoices/lead/${lead._id}?organization=${user.organization._id}`);
      setInvoices(response.data);
    } catch (error) {
      // Error fetching invoices
    }
  }, [lead?._id, user.organization._id]);

  useEffect(() => {
    if (lead?._id) {
      fetchQuotes();
      fetchInvoices();
      fetchRecommendedQuotes();
    }
  }, [lead?._id, fetchQuotes, fetchInvoices, fetchRecommendedQuotes]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleCreateQuote = () => {
    if (quotes.length >= 3) {
      alert('Maximum 3 quotes allowed. Please delete an existing quote to create a new one.');
      return;
    }
    setEditingQuote(null);
    setShowQuoteBuilder(true);
  };

  const handleEditQuote = (quote) => {
    setEditingQuote(quote);
    setShowQuoteBuilder(true);
  };

  const handleDeleteQuote = async (quoteId) => {
    if (!window.confirm('Are you sure you want to delete this quote?')) {
      return;
    }
    try {
      await api.delete(`/quotes/${quoteId}`);
      setQuotes(quotes.filter(q => q._id !== quoteId));
    } catch (error) {
      alert('Error deleting quote: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleQuoteSave = (savedQuote) => {
    if (editingQuote) {
      // Update existing quote
      setQuotes(quotes.map(q => q._id === savedQuote._id ? savedQuote : q));
    } else {
      // Add new quote
      setQuotes([...quotes, savedQuote]);
    }
    setShowQuoteBuilder(false);
    setEditingQuote(null);
  };

  const handleAddRecommendedQuote = async (recommendedQuote) => {
    if (quotes.length >= 3) {
      alert('Maximum 3 quotes allowed. Please delete an existing quote to add this recommendation.');
      return;
    }

    try {
      // Create a new quote based on the recommended one
      const newQuoteData = {
        lead: lead._id,
        organization: user.organization._id,
        quoteNumber: `QT-${lead.leadNumber}-${quotes.length + 1}`,
        country: recommendedQuote.country,
        travelStartDate: recommendedQuote.travelStartDate,
        travelEndDate: recommendedQuote.travelEndDate,
        adultPax: lead.adultPax || recommendedQuote.adultPax,
        childPax: lead.childPax || recommendedQuote.childPax,
        currency: recommendedQuote.currency,
        total: recommendedQuote.total,
        subtotal: recommendedQuote.subtotal || recommendedQuote.total, // Add subtotal
        markupType: recommendedQuote.markupType || 'percentage',
        markupValue: recommendedQuote.markupValue || 0,
        markupAmount: recommendedQuote.markupAmount || 0,
        discountType: recommendedQuote.discountType || 'amount',
        discountValue: recommendedQuote.discountValue || 0,
        discountAmount: recommendedQuote.discountAmount || 0,
        taxRate: recommendedQuote.taxRate,
        flights: recommendedQuote.flights || [],
        hotels: recommendedQuote.hotels || [],
        sightseeings: recommendedQuote.sightseeings || [],
        transfers: recommendedQuote.transfers || [],
        inclusions: recommendedQuote.inclusions || [],
        exclusions: recommendedQuote.exclusions || [],
        days: recommendedQuote.days || [],
        notes: `Based on similar quote: ${recommendedQuote.quoteNumber}`,
        isRecommended: true,
        createdBy: user._id // Add createdBy field
      };

      const response = await api.post('/quotes', newQuoteData);
      const savedQuote = response.data;
      
      // Add to quotes list
      setQuotes([...quotes, savedQuote]);
      
      // Remove from recommendations
      setRecommendedQuotes(recommendedQuotes.filter(q => q._id !== recommendedQuote._id));
      
      alert('Quote added successfully! You can now edit it to customize for this lead.');
    } catch (error) {
      alert('Error adding quote: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatWhatsAppMessage = useCallback((quote, index, options = shareOptions) => {
    const quoteId = `QT-${lead.leadNumber}-${index + 1}`;
    const startDate = new Date(quote.travelStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const nights = Math.ceil((new Date(quote.travelEndDate) - new Date(quote.travelStartDate)) / (1000 * 60 * 60 * 24));
    
    let message = `Hi Mr. ${lead.name},

`;
    message += `Greetings from ${user.organization.name}.

`;
    message += `Thank you for your query with us. As per your requirements, following are the package details.

`;
    message += `Trip ID ${quoteId}
`;
    message += `----------
`;
    message += `${quote.country} Trip
`;
    message += `* ${startDate} for ${nights} Nights, ${nights + 1} Days
`;
    message += `* ${quote.adultPax} Adults${quote.childPax > 0 ? `, ${quote.childPax} Child` : ''}

`;
    
    // Calculate cost breakdown
    const totalAmount = quote.total || 0;
    const flightTotal = quote.flights ? quote.flights.reduce((sum, flight) => sum + (flight.price || 0), 0) : 0;
    const tcsAmount = quote.tcsAmount || 0;

    // Calculate package cost (Total - TCS - Flight)
    // Note: totalAmount already includes discount deduction from backend
    const packageCost = totalAmount - tcsAmount - flightTotal;
    
    message += `Price (${quote.currency}):
`;
    
    // Show package cost breakdown
    message += `* Total Package Cost: ${Math.round(packageCost).toLocaleString()} ${quote.currency}\n`;
    
    // Show TCS if exists
    if (tcsAmount > 0) {
      message += `* TCS (2.5%): ${Math.round(tcsAmount).toLocaleString()} ${quote.currency}\n`;
    }

    // Show Flight Cost if exists
    if (flightTotal > 0) {
      message += `* Flight Cost: ${Math.round(flightTotal).toLocaleString()} ${quote.currency}\n`;
    }
    
    // Show Total Cost
    message += `* Total Cost: ${Math.round(totalAmount).toLocaleString()} ${quote.currency}\n`;
    
    // Calculate per-person division based on total cost
    // Children pay 70% of adult rate
    const totalPerAdult = quote.adultPax > 0 ? totalAmount / (quote.adultPax + (quote.childPax * 0.7)) : 0;
    const totalPerChild = totalPerAdult * 0.7;
    
    // Show per-person pricing
    if (quote.adultPax > 0) {
      message += `\n* ${Math.round(totalPerAdult).toLocaleString()} / Person (Package) x ${quote.adultPax} Pax\n`;
    }
    if (quote.childPax > 0) {
      message += `* ${Math.round(totalPerChild).toLocaleString()} / Child (Package) x ${quote.childPax} Child\n`;
    }
    message += `

`;
    
    // Hotels section (no individual prices)
    if (options.hotels && quote.hotels && quote.hotels.length > 0) {
      message += `🏨  Hotels
`;
      message += `-----------
`;
      
      quote.hotels.forEach((hotel, hotelIndex) => {
        if (hotel.rooms && hotel.rooms.length > 0) {
          hotel.rooms.forEach((room, roomIndex) => {
            const checkIn = new Date(room.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const checkOut = new Date(room.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            
            message += `${checkIn.replace(',', '')} to ${checkOut.replace(',', '')} at ${hotel.city}
`;
            message += `Check-in: ${checkIn.replace(',', '')} & Check-out: ${checkOut.replace(',', '')}
`;
            message += `${hotel.name} ${hotel.isTemporary ? '' : `(⭐${hotel.starRating || 3} Star)`}
`;
            message += `${room.roomName} • ${room.numberOfRooms} Room (${quote.adultPax} Pax${quote.childPax > 0 ? ` + ${quote.childPax} Child` : ''})

`;
          });
        }
      });
    }
    
    // Flights section
    if (options.flights && quote.flights && quote.flights.length > 0) {
      message += `✈️  Flights
`;
      message += `-----------
`;
      
      quote.flights.forEach((flight, flightIndex) => {
        const departureDate = new Date(flight.departureDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const arrivalDate = new Date(flight.arrivalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        
        message += `${flight.airline} ${flight.flightNumber}
`;
        message += `${flight.departureCity} → ${flight.arrivalCity}
`;
        message += `${departureDate} ${flight.departureTime} - ${arrivalDate} ${flight.arrivalTime}
`;
        if (flight.pnr) {
          message += `PNR: ${flight.pnr}
`;
        }
        
        if (flightIndex < quote.flights.length - 1) {
          message += `
`;
        }
      });
      message += `
`;
    }
    
    // Activities and Transfers section
    if (options.transportation && quote.days && quote.days.length > 0) {
      message += `🚖  Transportation and Activities
`;
      message += `-----------
`;
      
      quote.days.forEach((day, dayIndex) => {
        const dayDate = new Date(day.date).toLocaleDateString('en-GB', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        });
        
        let dayActivities = [];
        
        // Add sightseeings
        if (day.sightseeings && day.sightseeings.length > 0) {
          day.sightseeings.forEach(item => {
            const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 
              ? item.sightseeing 
              : { name: item.name || 'Sightseeing', location: item.location || '' };
            const adultCount = item.adultCount || quote.adultPax;
            const childCount = item.includeChild !== false ? (item.childCount || quote.childPax) : 0;
            
            dayActivities.push(`${sightseeing.name} (${adultCount} Ad${childCount > 0 ? ` + ${childCount} Ch` : ''})`);
          });
        }
        
        // Add transfers
        if (day.transfers && day.transfers.length > 0) {
          day.transfers.forEach(item => {
            const transfer = item.transfer && typeof item.transfer === 'object' 
              ? item.transfer 
              : { name: item.name || 'Transfer', fromLocation: item.fromLocation || '', toLocation: item.toLocation || '' };
            dayActivities.push(`${transfer.name}`);
          });
        }
        
        if (dayActivities.length > 0) {
          message += `${dayDate.replace(',', '')} - Day ${dayIndex + 1}
`;
          dayActivities.forEach(activity => {
            message += `* ${activity}
`;
          });
        }
      });
      message += `
`;
    }
    
    // Detailed day-wise itinerary
    if (options.dayWiseItinerary && quote.days && quote.days.length > 0) {
      message += `----------
`;
      
      quote.days.forEach((day, dayIndex) => {
        const dayDate = new Date(day.date).toLocaleDateString('en-GB', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
        
        message += `${dayDate.replace(',', '')}
`;
        message += `----
`;
        
        // Add sightseeings with details (no individual prices)
        if (day.sightseeings && day.sightseeings.length > 0) {
          day.sightseeings.forEach(item => {
            const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 
              ? item.sightseeing 
              : { name: item.name || 'Sightseeing', location: item.location || '', duration: item.duration || 'N/A' };
            message += `${sightseeing.name}
`;
            message += `Enjoy your visit to ${sightseeing.name} in ${sightseeing.location}. Duration: ${sightseeing.duration}.

`;
          });
        }
        
        // Add transfers with details (no individual prices)
        if (day.transfers && day.transfers.length > 0) {
          day.transfers.forEach(item => {
            const transfer = item.transfer && typeof item.transfer === 'object' 
              ? item.transfer 
              : { name: item.name || 'Transfer', fromLocation: item.fromLocation || '', toLocation: item.toLocation || '' };
            message += `${transfer.name}
`;
            message += `Transfer from ${transfer.fromLocation} to ${transfer.toLocation}.

`;
          });
        }
        
        if (dayIndex < quote.days.length - 1) {
          message += `----------
`;
        }
      });
    }
    
    // Inclusions
    if (options.inclusions) {
      message += `Inclusions
`;
      message += `-----------
`;
      message += `+ Accommodation in well-rated hotels/resorts as per the itinerary
`;
      message += `+ Daily breakfast at the hotel (except on Day 1)
`;
      message += `+ Sightseeing as per itinerary in a private/shared vehicle
`;
      message += `+ Airport Transfers
`;
      message += `+ All toll taxes, parking charges, driver allowances
`;
      message += `+ Entry tickets to attractions (as mentioned in the itinerary)
`;
      message += `+ Assistance by our local representative

`;
    }
    
    // Exclusions
    if (options.exclusions) {
      message += `Exclusions
`;
      message += `-----------
`;
      message += `- Airfare / Train fare / Bus tickets
`;
      message += `- Meals other than those specified in the Hotel inclusions
`;
      message += `- Personal expenses: Laundry, telephone calls, room service, mini-bar, etc.
`;
      message += `- Early check-in or late check-out at hotels (subject to availability)
`;
      message += `- Tips, porterage, and guide charges
`;
      message += `- Optional tours and activities not mentioned in the itinerary
`;
      message += `- Cost of any medical or travel insurance (unless included)
`;
      message += `- Any additional cost due to flight cancellation, delay, natural calamity, etc.

`;
      message += `NOTE: Anything not mentioned in the inclusions is excluded

`;
    }
    
    return message;
  }, [lead, user.organization.name, shareOptions]);

  const formatEmailMessage = useCallback((quote, index) => {
    const startDate = new Date(quote.travelStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const endDate = new Date(quote.travelEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const nights = Math.ceil((new Date(quote.travelEndDate) - new Date(quote.travelStartDate)) / (1000 * 60 * 60 * 24));
    const days = nights + 1;
    
    // Calculate cost breakdown
    const totalAmount = quote.total || 0;
    const tcsAmount = quote.tcsAmount || 0;
    
    let message = `Dear ${lead.name},
Greetings from ${user.organization.name}!

Thank you for choosing us to plan your upcoming vacation. Our sales team has carefully curated a personalized itinerary for your ${nights} Nights / ${days} Days ${quote.country} package starting on ${startDate}.

Please find a quick overview of your travel details below:

📋 Trip Summary:
Destination: ${quote.country}
Travelers: ${quote.adultPax} Adult${quote.adultPax > 1 ? 's' : ''}${quote.childPax > 0 ? `, ${quote.childPax} Child${quote.childPax > 1 ? 'ren' : ''}` : ''}
Duration: ${nights} Nights / ${days} Days
Travel Dates: ${startDate} – ${endDate}`;

    // Add accommodation details separately
    if (quote.hotels && quote.hotels.length > 0) {
      message += `

Accommodation:`;
      quote.hotels.forEach((hotel, hotelIndex) => {
        if (hotel.rooms && hotel.rooms.length > 0) {
          hotel.rooms.forEach((room, roomIndex) => {
            message += `
${hotel.name}, ${hotel.city} – ${room.numberOfRooms} x ${room.roomName}`;
            if (hotel.isTemporary) {
              message += ` (Includes Breakfast)`;
            } else {
              message += ` (⭐${hotel.starRating || 3} Star${room.breakfastIncluded ? ' - Includes Breakfast' : ''})`;
            }
          });
        }
      });
    }

    // Add brief itinerary
    if (quote.days && quote.days.length > 0) {
      message += `

🗓️ Brief Itinerary:`;
      quote.days.forEach((day, dayIndex) => {
        const dayDate = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        let dayActivities = [];
        
        // Add sightseeings
        if (day.sightseeings && day.sightseeings.length > 0) {
          day.sightseeings.forEach(item => {
            const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 
              ? item.sightseeing 
              : { name: item.name || 'Sightseeing', location: item.location || '' };
            dayActivities.push(sightseeing.name);
          });
        }
        
        // Add transfers
        if (day.transfers && day.transfers.length > 0) {
          day.transfers.forEach(item => {
            const transfer = item.transfer && typeof item.transfer === 'object' 
              ? item.transfer 
              : { name: item.name || 'Transfer', fromLocation: item.fromLocation || '', toLocation: item.toLocation || '' };
            dayActivities.push(transfer.name);
          });
        }
        
        if (dayActivities.length > 0) {
          message += `
Day ${dayIndex + 1} (${dayDate}): ${dayActivities.join(' – ')}`;
        }
      });
    }

    // Add payment information
    message += `

💳 Commercials & Payment Information
The total package cost is ${quote.currency} ${Math.round(totalAmount).toLocaleString()}/-`;
    
    if (tcsAmount > 0) {
      message += ` (exclusive of a 2% TCS amount of ${quote.currency} ${Math.round(tcsAmount).toLocaleString()})`;
    }
    
    message += `.

To confirm your booking and secure the blocked rooms and transfers, please provide us with your final approval. You can initiate the payment using the bank details provided below:

(I have also attached the Google Pay QR code/screenshot to this email for a quick and seamless transaction.)

Once the payment is processed, please share a screenshot of the transaction confirmation. 

We will immediately proceed with issuing your travel vouchers, hotel confirmations, and detailed itinerary.

Please look through the attached quote and let us know if you would like to make any modifications to the services. Looking forward to your green light!

Warm regards,
The Booking Team 
${user.organization.name}`;

    return message;
  }, [lead, user.organization.name]);

  const handleShareQuote = (quote, index) => {
    setCurrentQuoteIndex(index);
    setShowShareModal(true);
    // Reset options to defaults
    setShareOptions({
      hotels: true,
      flights: true,
      transportation: true,
      inclusions: true,
      exclusions: true,
      dayWiseItinerary: true
    });
  };

  const updateShareMessage = useCallback((quote, index) => {
    const message = formatWhatsAppMessage(quote, index, shareOptions);
    setShareMessage(message);
  }, [shareOptions, formatWhatsAppMessage]);

  // Update message when share options change
  React.useEffect(() => {
    if (showShareModal && quotes[currentQuoteIndex]) {
      updateShareMessage(quotes[currentQuoteIndex], currentQuoteIndex);
    }
  }, [shareOptions, showShareModal, currentQuoteIndex, quotes, updateShareMessage]);

  const handleShareOnWhatsApp = () => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      alert('Message copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Message copied to clipboard!');
    }
  };

  const handleShareEmail = (quote, index) => {
    setCurrentQuoteIndex(index);
    const message = formatEmailMessage(quote, index);
    const subject = `Travel Quote - ${quote.country} Package - ${new Date(quote.travelStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'})}`;
    setEmailMessage(message);
    setEmailSubject(subject);
    setShowEmailModal(true);
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailMessage);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailMessage);
      alert('Email message copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = emailMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Email message copied to clipboard!');
    }
  };

  const handleDownloadPDF = async (quote, index) => {
    try {
      setDownloadingPDF(true);
      const response = await api.get(`/pdf-generator/quote/${quote._id}`, {
        responseType: 'blob'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Quote-${lead.leadNumber}-${index + 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Error generating PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#28a745';
      case 'contacted': return '#17a2b8';
      case 'qualified': return '#ffc107';
      case 'converted': return '#007bff';
      case 'lost': return '#dc3545';
      default: return '#6c757d';
    }
  };

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
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
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
    mainContent: {
      flex: 1,
      padding: '20px',
      overflow: 'auto',
    },
    backButton: {
      padding: '10px 20px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      marginBottom: '20px',
      fontSize: '14px',
      fontWeight: '500',
    },
    leadCard: {
      background: 'white',
      padding: '15px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      maxWidth: '400px',
      margin: '0 auto',
    },
    leadHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      paddingBottom: '10px',
      borderBottom: '2px solid #e9ecef',
    },
    leadNumber: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#333',
      margin: 0,
    },
    statusBadge: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      color: 'white',
      textTransform: 'uppercase',
    },
    contentContainer: {
      display: 'flex',
      gap: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    quotesSection: {
      flex: 1,
    },
    quotesHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    quotesTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#333',
      margin: 0,
    },
    quoteCard: {
      background: 'white',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '15px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
    },
    quoteCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    },
    quoteHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
    },
    quoteTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333',
      margin: 0,
    },
    quoteActions: {
      display: 'flex',
      gap: '8px',
    },
    quoteButton: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
    },
    editButton: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    deleteButton: {
      backgroundColor: '#dc3545',
      color: 'white',
    },
    shareButton: {
      backgroundColor: '#25D366',
      color: 'white',
    },
    pdfButton: {
      backgroundColor: '#6f42c1',
      color: 'white',
    },
    shareModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    shareModalContent: {
      backgroundColor: 'white',
      borderRadius: '10px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
    },
    shareModalHeader: {
      padding: '20px',
      borderBottom: '1px solid #e9ecef',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    shareModalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      margin: 0,
    },
    shareModalBody: {
      padding: '20px',
      overflow: 'auto',
      flex: 1,
    },
    shareMessageContent: {
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '15px',
      fontFamily: 'monospace',
      fontSize: '12px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: '400px',
      overflow: 'auto',
    },
    shareModalFooter: {
      padding: '20px',
      borderTop: '1px solid #e9ecef',
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
    },
    shareActionButton: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
    },
    whatsappShareButton: {
      backgroundColor: '#25D366',
      color: 'white',
    },
    copyShareButton: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: '#e9ecef',
      color: '#333',
    },
    quoteDetails: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '15px',
    },
    quoteDetail: {
      fontSize: '14px',
      color: '#666',
    },
    quoteTotal: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#28a745',
      textAlign: 'right',
      marginTop: '10px',
    },
    createQuoteButton: {
      padding: '10px 20px',
      backgroundColor: quotes.length >= 3 ? '#6c757d' : '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: quotes.length >= 3 ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontWeight: '500',
    },
    disabledButton: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    detailGroup: {
      marginBottom: '10px',
    },
    detailLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#6c757d',
      marginBottom: '5px',
      textTransform: 'uppercase',
    },
    detailValue: {
      fontSize: '16px',
      color: '#333',
      wordBreak: 'break-word',
    },
    section: {
      marginTop: '15px',
      paddingTop: '10px',
      borderTop: '1px solid #e9ecef',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '8px',
    },
    editHistory: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    },
    historyItem: {
      marginBottom: '15px',
      padding: '12px',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #e9ecef'
    },
    historyMeta: {
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '5px'
    },
    historyChanges: {
      fontSize: '14px',
      color: '#495057'
    },
    loading: {
      textAlign: 'center',
      padding: '60px',
      fontSize: '18px',
      color: '#6c757d',
    },
    error: {
      textAlign: 'center',
      padding: '60px',
      fontSize: '18px',
      color: '#dc3545',
    }
  };

  if (loading) {
    return (
      <div className="lead-detail-page">
        <nav className="nav">
          <div className="nav-links">
            <span className="nav-link">Lead Details</span>
          </div>
          <div className="user-info">
            <span style={{marginRight: '10px'}}>{user?.name}</span>
            <button onClick={toggleMenu} className="menu-button">☰</button>
          </div>
          <div className={`dropdown ${menuOpen ? 'show' : ''}`}>
            <div style={{marginBottom: '10px', fontSize: '16px', color: '#666'}}>
              {user?.name}
            </div>
            <button onClick={handleLogout} className="share-cancel-btn">
              Logout
            </button>
          </div>
        </nav>
        <div className="main-content">
          <div className="loading-state">
            <div className="loading-spinner">⟳</div>
            <div>Loading lead details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lead-detail-page">
        <nav className="nav">
          <div className="nav-links">
            <span className="nav-link">Lead Details</span>
          </div>
          <div className="user-info">
            <span style={{marginRight: '10px'}}>{user?.name}</span>
            <button onClick={toggleMenu} className="menu-button">☰</button>
          </div>
          <div className={`dropdown ${menuOpen ? 'show' : ''}`}>
            <div style={{marginBottom: '10px', fontSize: '16px', color: '#666'}}>
              {user?.name}
            </div>
            <button onClick={handleLogout} className="share-cancel-btn">
              Logout
            </button>
          </div>
        </nav>
        <div className="main-content">
          <button onClick={() => navigate(-1)} className="back-button">← Back</button>
          <div className="error-state">
            <div className="error-message">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-detail-page">
      <nav className="nav">
        <div className="nav-links">
          <span className="nav-link">Lead Details</span>
        </div>
        <div className="user-info">
          <span style={{marginRight: '10px'}}>{user?.name}</span>
          <button onClick={toggleMenu} className="menu-button">☰</button>
        </div>
        <div className={`dropdown ${menuOpen ? 'show' : ''}`}>
          <div style={{marginBottom: '10px', fontSize: '16px', color: '#666'}}>
            {user?.name}
          </div>
          <button onClick={handleLogout} className="share-cancel-btn">
            Logout
          </button>
        </div>
      </nav>
      
      <div className="main-content">
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>
        
        <div className="content-container">
          {/* Lead Details Section */}
          <div className="lead-card">
          <div className="lead-header">
            <div>
              <h1 className="lead-number">{lead.leadNumber}</h1>
              <button 
                onClick={handleCreateQuote}
                className={`create-quote-btn ${quotes.length >= 3 ? 'disabled' : ''}`}
                disabled={quotes.length >= 3}
              >
                {quotes.length >= 3 ? 'Max Quotes Reached' : 'Give Quotation'}
              </button>
            </div>
            <span className="status-badge" style={{backgroundColor: getStatusColor(lead.status)}}>
              {lead.status}
            </span>
          </div>
          
          <div className="details-grid">
            <div className="detail-group">
              <div className="detail-label">Name</div>
              <div className="detail-value">{lead.name}</div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Email</div>
              <div className="detail-value">{lead.email}</div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Phone</div>
              <div className="detail-value">{lead.phone}</div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Assigned To</div>
              <div className="detail-value">
                {lead.assignedTo ? `${lead.assignedTo.name} (${lead.assignedTo.email})` : 'Unassigned'}
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Date of Travel</div>
              <div className="detail-value">
                {lead.dateOfTravel ? new Date(lead.dateOfTravel).toLocaleDateString() : 'Not set'}
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Travel To Country</div>
              <div className="detail-value">{lead.travelToCountry || 'Not set'}</div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Next Follow Up Date</div>
              <div className="detail-value">
                {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : 'Not set'}
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Tags</div>
              <div className="detail-value">
                {lead.tags && lead.tags.length > 0 ? (
                  <div className="tags-container">
                    {lead.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{color: '#6c757d', fontStyle: 'italic'}}>No tags</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="requirements-section">
            <h3 className="requirements-title">Requirements</h3>
            <p className="requirements-text">{lead.requirements || 'No requirements specified'}</p>
          </div>
          
          <div className="notes-section">
            <h3 className="notes-title">Latest Comment</h3>
            <p className="notes-text">{lead.latestComment || 'No comments'}</p>
          </div>
          
          <div className="notes-section">
            <h3 className="notes-title">Notes</h3>
            <p className="notes-text">{lead.notes || 'No notes'}</p>
          </div>
          
          <div className="requirements-section">
            <h3 className="requirements-title">Invoices ({invoices.length})</h3>
            {invoices.length === 0 ? (
              <p className="requirements-text">No invoices generated yet</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {invoices.map((invoice) => (
                  <div key={invoice._id} style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '15px'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <div>
                        <strong style={{fontSize: '16px', color: '#333'}}>{invoice.invoiceNumber}</strong>
                        <div style={{fontSize: '12px', color: '#6c757d', marginTop: '2px'}}>
                          Created: {new Date(invoice.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: invoice.status === 'fully_paid' ? '#d4edda' : 
                                        invoice.status === 'partially_paid' ? '#fff3cd' : 
                                        invoice.status === 'overdue' ? '#f8d7da' : '#e2e3e5',
                        color: invoice.status === 'fully_paid' ? '#155724' : 
                               invoice.status === 'partially_paid' ? '#856404' : 
                               invoice.status === 'overdue' ? '#721c24' : '#383d41'
                      }}>
                        {invoice.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px'}}>
                      <div>
                        <span style={{fontSize: '12px', color: '#6c757d'}}>Total Amount:</span>
                        <div style={{fontSize: '14px', fontWeight: '600', color: '#28a745'}}>
                          {invoice.currency} {invoice.finalAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span style={{fontSize: '12px', color: '#6c757d'}}>Paid Amount:</span>
                        <div style={{fontSize: '14px', fontWeight: '600', color: '#007bff'}}>
                          {invoice.currency} {invoice.paymentCycles
                            .filter(cycle => cycle.status === 'paid')
                            .reduce((sum, cycle) => sum + cycle.amount, 0)
                            .toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '10px'}}>
                      Quote: {invoice.quote?.quoteNumber || 'N/A'} • 
                      {invoice.paymentCycles.length} payment cycles
                    </div>
                    
                                      </div>
                ))}
              </div>
            )}
          </div>
          
          {lead.editHistory && lead.editHistory.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Edit History</h3>
              <div style={styles.editHistory}>
                {lead.editHistory.slice().reverse().map((history, index) => (
                  <div key={index} style={styles.historyItem}>
                    <div style={styles.historyMeta}>
                      <strong>Lead:</strong> {lead.leadNumber} • 
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
            </div>
          )}
        </div>
          
          {/* Recommended Quotes Section */}
          {recommendedQuotes.length > 0 && quotes.length === 0 && (
            <div style={{
              marginBottom: '25px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: '#fff',
                borderRadius: '12px 12px 0 0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{fontSize: '20px'}}>💡</span>
                    Recommended Quotes ({recommendedQuotes.length})
                  </h3>
                  <div style={{
                    fontSize: '13px',
                    color: '#6c757d',
                    backgroundColor: '#e9ecef',
                    padding: '4px 12px',
                    borderRadius: '20px'
                  }}>
                    Based on similar country and tags
                  </div>
                </div>
              </div>
              
              <div style={{padding: '20px'}}>
                {loadingRecommendations ? (
                  <div style={{textAlign: 'center', padding: '30px'}}>
                    <div style={{color: '#6c757d'}}>Loading recommendations...</div>
                  </div>
                ) : recommendedQuotes.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '30px', color: '#6c757d'}}>
                    <div style={{fontSize: '16px', marginBottom: '8px'}}>No recommendations found</div>
                    <div style={{fontSize: '13px'}}>
                      Try adding country or tags to the lead to get better recommendations
                    </div>
                  </div>
                ) : (
                  <div style={{display: 'grid', gap: '15px'}}>
                    {recommendedQuotes.map((recQuote) => (
                      <div key={recQuote._id} style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '10px',
                        border: '1px solid #dee2e6',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{
                            fontWeight: '600',
                            color: '#2c3e50',
                            marginBottom: '8px',
                            fontSize: '16px'
                          }}>
                            {recQuote.quoteNumber} - {recQuote.country}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#6c757d',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>📅</span>
                            {new Date(recQuote.travelStartDate).toLocaleDateString()} - {new Date(recQuote.travelEndDate).toLocaleDateString()}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#6c757d',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>👥</span>
                            {recQuote.adultPax} Adults{recQuote.childPax > 0 && `, ${recQuote.childPax} Children`}
                            <span style={{margin: '0 8px'}}>•</span>
                            <span>💰</span>
                            Total: ₹{recQuote.total?.toLocaleString('en-IN') || '0'}
                          </div>
                          {recQuote.lead && (
                            <div style={{
                              fontSize: '12px',
                              color: '#868e96',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <span>👤</span>
                              From: {recQuote.lead.name}
                            </div>
                          )}
                        </div>
                        <div style={{marginLeft: '20px'}}>
                          <button
                            onClick={() => handleAddRecommendedQuote(recQuote)}
                            disabled={quotes.length >= 3}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: quotes.length >= 3 ? '#6c757d' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: quotes.length >= 3 ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              boxShadow: quotes.length >= 3 ? 'none' : '0 2px 4px rgba(40, 167, 69, 0.3)',
                              transition: 'all 0.2s ease',
                              opacity: quotes.length >= 3 ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                              if (!quotes.length >= 3) {
                                e.target.style.backgroundColor = '#218838';
                                e.target.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!quotes.length >= 3) {
                                e.target.style.backgroundColor = '#28a745';
                                e.target.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            {quotes.length >= 3 ? '📝 Max Quotes' : '✓ Use This Quote'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Quotes Section */}
          <div className="quotes-section">
            <div className="quotes-header">
              <h2 className="quotes-title">Quotes ({quotes.length}/3)</h2>
              <button 
                onClick={handleCreateQuote}
                className={`create-quote-btn ${quotes.length >= 3 ? 'disabled' : ''}`}
                disabled={quotes.length >= 3}
              >
                {quotes.length >= 3 ? '+ Delete Quote to Create New' : '+ Create Quote'}
              </button>
            </div>
            
            {quotes.length === 0 ? (
              <div className="loading-state">
                <div style={{fontSize: '16px', marginBottom: '10px'}}>No quotes created yet</div>
                <div style={{fontSize: '14px'}}>Create your first quote for this lead</div>
              </div>
            ) : (
              quotes.map((quote, index) => (
                <div key={quote._id} className="quote-card">
                  <div className="quote-header">
                    <h3 className="quote-title">Quote {index + 1}</h3>
                    <div className="quote-actions">
                      <button 
                        onClick={() => handleShareQuote(quote, index)}
                        className="quote-button share-btn"
                        title="Share Quote"
                      >
                        📱
                      </button>
                      <button 
                        onClick={() => handleShareEmail(quote, index)}
                        className="quote-button email-btn"
                        title="Email Quote"
                      >
                        ✉️
                      </button>
                      <button 
                        onClick={() => handleDownloadPDF(quote, index)}
                        className="quote-button pdf-btn"
                        title="Download PDF"
                        disabled={downloadingPDF}
                      >
                        {downloadingPDF ? '⏳' : '📄'}
                      </button>
                      <button 
                        onClick={() => handleEditQuote(quote)}
                        className="quote-button edit-btn"
                        title="Edit Quote"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteQuote(quote._id)}
                        className="quote-button delete-btn"
                        title="Delete Quote"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div style={styles.quoteDetails}>
                    <div style={styles.quoteDetail}>
                      <strong>Travel Dates:</strong><br />
                      {new Date(quote.travelStartDate).toLocaleDateString()} - {new Date(quote.travelEndDate).toLocaleDateString()}
                    </div>
                    <div style={styles.quoteDetail}>
                      <strong>Adults:</strong> {quote.adultPax}<br />
                      <strong>Children:</strong> {quote.childPax}
                    </div>
                    <div style={styles.quoteDetail}>
                      <strong>Markup:</strong> {quote.markupType === 'percentage' ? `${quote.markupValue}%` : `${quote.currency} ${quote.markupValue}`}
                    </div>
                    <div style={styles.quoteDetail}>
                      <strong>Status:</strong> {quote.status}
                    </div>
                  </div>
                  
                  <div style={styles.quoteTotal}>
                    Total: {quote.currency} {quote.total?.toLocaleString() || 0}
                  </div>
                  
                  {/* Invoice Generation Section */}
                  <QuoteInvoiceSectionSimple 
                    quote={quote} 
                    onQuoteUpdated={(updatedQuote) => {
                      setQuotes(quotes.map(q => q._id === updatedQuote._id ? updatedQuote : q));
                      // Refresh supplier section to check for new invoice
                      setSupplierSectionKey(prev => prev + 1);
                    }}
                  />
                  
                  {/* Supplier Assignment Section */}
                  <QuoteSupplierSection 
                    key={supplierSectionKey}
                    quote={quote} 
                    onAssignmentUpdated={() => {
                      // Refresh quotes if needed
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
        
        {showQuoteBuilder && (
          <QuoteBuilder
            lead={lead}
            quote={editingQuote}
            onClose={() => {
              setShowQuoteBuilder(false);
              setEditingQuote(null);
            }}
            onSave={handleQuoteSave}
          />
        )}
        
        {showShareModal && (
          <div className="share-modal">
            <div className="share-modal-content">
              <div className="share-modal-header">
                <h3 className="share-modal-title">Quote Message - Quote {currentQuoteIndex + 1}</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
              
              <div className="share-modal-body">
                <div className="share-options">
                  <h4 style={{marginBottom: '10px', fontSize: '14px', fontWeight: '600'}}>Include in Message:</h4>
                  <div className="share-option">
                    <input
                      type="checkbox"
                      checked={shareOptions.hotels}
                      onChange={(e) => setShareOptions(prev => ({...prev, hotels: e.target.checked}))}
                    />
                    <label>🏨 Hotels</label>
                  </div>
                  <div className="share-option">
                    <input
                      type="checkbox"
                      checked={shareOptions.flights}
                      onChange={(e) => setShareOptions(prev => ({...prev, flights: e.target.checked}))}
                    />
                    <label>✈️ Flights</label>
                  </div>
                  <div className="share-option">
                    <input
                      type="checkbox"
                      checked={shareOptions.transportation}
                      onChange={(e) => setShareOptions(prev => ({...prev, transportation: e.target.checked}))}
                    />
                    <label>🚖 Transportation & Activities</label>
                  </div>
                  <div className="share-option">
                    <input
                      type="checkbox"
                      checked={shareOptions.inclusions}
                      onChange={(e) => setShareOptions(prev => ({...prev, inclusions: e.target.checked}))}
                    />
                    <label>✅ Inclusions</label>
                  </div>
                  <div className="share-option">
                    <input
                      type="checkbox"
                      checked={shareOptions.exclusions}
                      onChange={(e) => setShareOptions(prev => ({...prev, exclusions: e.target.checked}))}
                    />
                    <label>❌ Exclusions</label>
                  </div>
                  <div className="share-option">
                    <input
                      type="checkbox"
                      checked={shareOptions.dayWiseItinerary}
                      onChange={(e) => setShareOptions(prev => ({...prev, dayWiseItinerary: e.target.checked}))}
                    />
                    <label>📅 Day-wise Itinerary</label>
                  </div>
                </div>
                
                <div className="share-message">
                  {shareMessage}
                </div>
              </div>
              
              <div className="share-modal-footer">
                <button
                  onClick={handleShareOnWhatsApp}
                  className="share-send-btn"
                >
                  📱 Share on WhatsApp
                </button>
                <button
                  onClick={handleCopyMessage}
                  className="share-cancel-btn"
                >
                  📋 Copy Message
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="share-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Email Share Modal */}
        {showEmailModal && (
          <div className="email-modal">
            <div className="email-modal-content">
              <div className="email-modal-header">
                <h3 className="email-modal-title">Email Quote - Quote {currentQuoteIndex + 1}</h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="close-button"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="email-modal-body">
                <div className="email-subject">
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600'}}>Subject:</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px',
                      marginBottom: '15px'
                    }}
                  />
                </div>
                
                <div className="email-message">
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600'}}>Message:</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      padding: '15px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
              </div>
              
              <div className="email-modal-footer">
                <button
                  onClick={handleSendEmail}
                  className="email-send-btn"
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ✉️ Open Email Client
                </button>
                <button
                  onClick={handleCopyEmail}
                  className="email-copy-btn"
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  📋 Copy Message
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="email-cancel-btn"
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      
      {/* PDF Download Loading Indicator */}
      {downloadingPDF && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Generating PDF...</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Please wait while we create your quote PDF</div>
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
};

export default LeadDetailPage;