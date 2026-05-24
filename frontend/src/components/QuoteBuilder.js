import React, { useState, useEffect, useContext, useCallback } from 'react';

import api from '../api/axios';

import { AuthContext } from '../contexts/AuthContext';

import currencyService from '../services/currencyService';



const QuoteBuilder = ({ lead, quote, onClose, onSave }) => {

  const { user } = useContext(AuthContext);

  

  const [exchangeRates, setExchangeRates] = useState({

    'USD': 1,

    'EUR': 0.85,

    'GBP': 0.73,

    'INR': 83.5,

    'AUD': 1.35,

    'CAD': 1.25,

    'SGD': 1.34,

    'THB': 36.5,

    'MYR': 4.65,

    'IDR': 15700,

    'PHP': 56.5,

    'VND': 24000,

    'HKD': 7.8,

    'JPY': 110,

    'CNY': 6.45,

    'KRW': 1180,

    'AED': 3.67

  });



  // const getExchangeRate = (currency) => {

  //   return exchangeRates[currency] || 1;

  // };



  // Load real-time exchange rates on component mount

  useEffect(() => {

    const loadExchangeRates = async () => {

      try {

        const rates = await currencyService.getRealTimeRates();

        setExchangeRates(rates);

      } catch (error) {

      }

    };

    

    loadExchangeRates();

  }, []);

  

  const [quoteData, setQuoteData] = useState({

    travelStartDate: '',

    travelEndDate: '',

    country: '',

    days: [], // Will contain day-wise activities and transfers

    adultPax: 1,

    childPax: 0,

    notes: '',

    markupType: 'percentage',

    markupValue: 0,

    discountType: 'amount',

    discountValue: 0,

    taxRate: 0,

    taxCalculationType: 'markup', // 'markup' or 'total'

    tcsEnabled: false, // TCS 2.5% checkbox

    currency: user.organization?.currency || 'USD',

    hotels: [], // Separate hotels array

    flights: [] // Flights array

  });

  

  const [availableSightseeings, setAvailableSightseeings] = useState([]);

  const [availableTransfers, setAvailableTransfers] = useState([]);

  const [availableHotels, setAvailableHotels] = useState([]);

  const [loading, setLoading] = useState(false);

  

  // Search states

  const [sightseeingSearch, setSightseeingSearch] = useState('');

  const [transferSearch, setTransferSearch] = useState({});

  const [hotelSearch, setHotelSearch] = useState('');

  const [filteredSightseeings, setFilteredSightseeings] = useState([]);

  const [filteredTransfers, setFilteredTransfers] = useState({});

  const [filteredHotels, setFilteredHotels] = useState([]);

  const [showTempHotelForm, setShowTempHotelForm] = useState(false);

  const [tempHotelData, setTempHotelData] = useState({

    name: '',

    city: '',

    country: quoteData.country,

    starRating: 3,

    roomCategories: [{

      name: 'Standard Room',

      basePrice: '',

      currency: quoteData.currency,

      maxOccupancy: 2

    }]

  });

  

  const fetchAvailableServices = useCallback(async () => {

    try {

      setLoading(true);

      const [servicesResponse, hotelsResponse] = await Promise.all([

        api.get(`/quotes/available-services?organization=${user.organization._id}&country=${quoteData.country}&startDate=${quoteData.travelStartDate}&endDate=${quoteData.travelEndDate}`),

        api.get(`/hotels?organization=${user.organization._id}`)

      ]);

      setAvailableSightseeings(servicesResponse.data.sightseeings);

      setAvailableTransfers(servicesResponse.data.transfers);

      setAvailableHotels(hotelsResponse.data);

    } catch (error) {
      // Try fetching hotels without country filter as fallback

      try {

        const hotelsResponse = await api.get(`/hotels?organization=${user.organization._id}`);

        setAvailableHotels(hotelsResponse.data);

      } catch (hotelError) {

      }

    } finally {

      setLoading(false);

    }

  }, [quoteData.country, quoteData.travelStartDate, quoteData.travelEndDate, user.organization._id]);



  // Filter sightseeings based on search

  useEffect(() => {

    if (!sightseeingSearch.trim()) {

      setFilteredSightseeings(availableSightseeings);

    } else {

      const searchLower = sightseeingSearch.toLowerCase();

      const filtered = availableSightseeings.filter(sightseeing =>

        sightseeing.name.toLowerCase().includes(searchLower) ||

        (sightseeing.location && sightseeing.location.toLowerCase().includes(searchLower)) ||

        (sightseeing.description && sightseeing.description.toLowerCase().includes(searchLower))

      );

      setFilteredSightseeings(filtered);

    }

  }, [sightseeingSearch, availableSightseeings]);



  // Filter transfers based on search for each day

  useEffect(() => {

    const newFilteredTransfers = {};

    Object.keys(transferSearch).forEach(dayIndex => {

      const searchTerm = transferSearch[dayIndex];

      if (!searchTerm.trim()) {

        newFilteredTransfers[dayIndex] = availableTransfers;

      } else {

        const searchLower = searchTerm.toLowerCase();

        const filtered = availableTransfers.filter(transfer =>

          transfer.name.toLowerCase().includes(searchLower) ||

          (transfer.fromLocation && transfer.fromLocation.toLowerCase().includes(searchLower)) ||

          (transfer.toLocation && transfer.toLocation.toLowerCase().includes(searchLower)) ||

          (transfer.vehicleType && transfer.vehicleType.toLowerCase().includes(searchLower))

        );

        newFilteredTransfers[dayIndex] = filtered;

      }

    });

    setFilteredTransfers(newFilteredTransfers);

  }, [transferSearch, availableTransfers]);



  // Filter hotels based on search

  useEffect(() => {

    if (!hotelSearch.trim()) {

      setFilteredHotels(availableHotels);

    } else {

      const searchLower = hotelSearch.toLowerCase();

      const filtered = availableHotels.filter(hotel =>

        hotel.name.toLowerCase().includes(searchLower) ||

        (hotel.city && hotel.city.toLowerCase().includes(searchLower)) ||

        (hotel.country && hotel.country.toLowerCase().includes(searchLower)) ||

        (hotel.starRating && hotel.starRating.toString().includes(searchLower)) ||

        (hotel.address && hotel.address.toLowerCase().includes(searchLower))

      );

      setFilteredHotels(filtered);

    }

  }, [hotelSearch, availableHotels]);

  

  const fetchHotels = useCallback(async () => {

    try {

      const hotelsResponse = await api.get(`/hotels?organization=${user.organization._id}`);

      setAvailableHotels(hotelsResponse.data);

    } catch (error) {

    }

  }, [user.organization._id]);

  

  // Fetch hotels as soon as organization is available

  useEffect(() => {

    if (user.organization._id) {
      fetchHotels();
    }

  }, [user.organization._id, fetchHotels]);

  

  // Fetch available services when country or dates change

  useEffect(() => {

    if (quoteData.country && quoteData.travelStartDate && quoteData.travelEndDate && user.organization._id) {
      fetchAvailableServices();
    }

  }, [quoteData.country, quoteData.travelStartDate, quoteData.travelEndDate, user.organization._id, fetchAvailableServices]);

  

  // Fetch available services when quote is loaded for editing

  useEffect(() => {

    if (quote && quote.country && quote.travelStartDate && quote.travelEndDate) {

      fetchAvailableServices();

    }

  }, [quote, fetchAvailableServices]);

  

  const handleInputChange = (e) => {

    const { name, value, type, checked } = e.target;

    setQuoteData(prev => {

      const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };

      

      // If currency changed, reconvert all existing rates

      if (name === 'currency' && prev.currency !== value) {

        const oldCurrency = prev.currency;

        const newCurrency = value;

        

        // Convert sightseeing rates

        if (newData.days) {

          newData.days = newData.days.map(day => ({

            ...day,

            sightseeings: day.sightseeings.map((item, idx) => ({

              ...item,

              adultRate: Math.round((item.adultRate / exchangeRates[oldCurrency]) * exchangeRates[newCurrency] * 100) / 100,

              childRate: Math.round((item.childRate / exchangeRates[oldCurrency]) * exchangeRates[newCurrency] * 100) / 100,

              currency: newCurrency,

              order: item.order !== undefined ? item.order : idx

            })),

            transfers: day.transfers.map((item, idx) => ({

              ...item,

              rate: Math.round((item.rate / exchangeRates[oldCurrency]) * exchangeRates[newCurrency] * 100) / 100,

              currency: newCurrency,

              order: item.order !== undefined ? item.order : (day.sightseeings.length + idx)

            }))

          }));

        }

        

        // Convert hotel room rates

        if (newData.hotels) {

          newData.hotels = newData.hotels.map(hotel => ({

            ...hotel,

            rooms: hotel.rooms.map(room => ({

              ...room,

              adultRate: Math.round((room.adultRate / exchangeRates[oldCurrency]) * exchangeRates[newCurrency] * 100) / 100,

              currency: newCurrency

            }))

          }));

        }

      }

      

      // If adultPax changed, update all sightseeing adult counts

      if (name === 'adultPax' && prev.days) {

        newData.days = prev.days.map(day => ({

          ...day,

          sightseeings: day.sightseeings.map(item => ({

            ...item,

            adultCount: parseInt(value)

          }))

        }));

      }

      

      // If childPax changed, update all sightseeing child counts

      if (name === 'childPax' && prev.days) {

        newData.days = prev.days.map(day => ({

          ...day,

          sightseeings: day.sightseeings.map(item => ({

            ...item,

            childCount: parseInt(value)

          }))

        }));

      }

      

      return newData;

    });

  };

  

  // Initialize days when travel dates change (for both new and existing quotes)

  useEffect(() => {

    if (quoteData.travelStartDate && quoteData.travelEndDate) {

      const start = new Date(quoteData.travelStartDate);

      const end = new Date(quoteData.travelEndDate);

      const days = [];

      

      for (let d = new Date(start), dayNumber = 1; d <= end; d.setDate(d.getDate() + 1), dayNumber++) {

        // For existing quotes, try to preserve existing day data

        const existingDay = quote?.days?.find(existingDay => 

          new Date(existingDay.date).toDateString() === new Date(d).toDateString()

        );

        

        days.push({

          dayNumber,

          date: new Date(d).toISOString().split('T')[0],

          sightseeings: (existingDay?.sightseeings || []).map((item, idx) => ({
            ...item,
            order: item.order !== undefined ? item.order : idx
          })),

          transfers: (existingDay?.transfers || []).map((item, idx) => ({
            ...item,
            order: item.order !== undefined ? item.order : ((existingDay?.sightseeings?.length || 0) + idx)
          })),

          hotels: existingDay?.hotels || []

        });

      }

      

      setQuoteData(prev => ({ ...prev, days }));

    }

  }, [quoteData.travelStartDate, quoteData.travelEndDate, quote]);

  

  // Update tempHotelData country when quoteData.country changes

  useEffect(() => {

    if (quoteData.country) {

      setTempHotelData(prev => ({ ...prev, country: quoteData.country }));

    }

  }, [quoteData.country]);



  // Initialize form with quote data when editing (run after services are fetched)

  useEffect(() => {

    if (quote) {

      const quoteDataToSet = {

        travelStartDate: quote.travelStartDate ? new Date(quote.travelStartDate).toISOString().split('T')[0] : '',

        travelEndDate: quote.travelEndDate ? new Date(quote.travelEndDate).toISOString().split('T')[0] : '',

        country: quote.country || '',

        days: quote.days || [],

        adultPax: quote.adultPax || 1,

        childPax: quote.childPax || 0,

        notes: quote.notes || '',

        markupType: quote.markupType || 'percentage',

        markupValue: quote.markupValue || 0,

        discountType: quote.discountType || 'amount',

        discountValue: quote.discountValue || 0,

        taxRate: quote.taxRate || 0,

        taxCalculationType: quote.taxCalculationType || 'markup',

        tcsEnabled: quote.tcsEnabled || false,

        currency: quote.currency || user.organization?.currency || 'USD',

        hotels: quote.hotels || [],

        flights: quote.flights ? quote.flights.map(flight => ({

          ...flight,

          departureDate: flight.departureDate ? new Date(flight.departureDate).toISOString().split('T')[0] : '',

          arrivalDate: flight.arrivalDate ? new Date(flight.arrivalDate).toISOString().split('T')[0] : ''

        })) : []

      };

      

      // Ensure backward compatibility for child preferences

      if (quoteDataToSet.days && quoteDataToSet.days.length > 0) {

        quoteDataToSet.days = quoteDataToSet.days.map(day => ({

          ...day,

          sightseeings: day.sightseeings.map((item, idx) => ({

            ...item,

            adultCount: item.adultCount || quote.adultPax,

            childCount: item.childCount || quote.childPax || 0,

            includeChild: item.includeChild !== undefined ? item.includeChild : true,

            order: item.order !== undefined ? item.order : idx

          }))

        }));

      }

      

      setQuoteData(quoteDataToSet);

      

      // Fetch services for the quote's country and dates

      if (quote.country && quote.travelStartDate && quote.travelEndDate) {

        const fetchServicesForQuote = async () => {

          try {

            setLoading(true);

            const [servicesResponse, hotelsResponse] = await Promise.all([

              api.get(`/quotes/available-services?organization=${user.organization._id}&country=${quote.country}&startDate=${new Date(quote.travelStartDate).toISOString().split('T')[0]}&endDate=${new Date(quote.travelEndDate).toISOString().split('T')[0]}`),

              api.get(`/hotels?organization=${user.organization._id}`)

            ]);

            setAvailableSightseeings(servicesResponse.data.sightseeings);

            setAvailableTransfers(servicesResponse.data.transfers);

            setAvailableHotels(hotelsResponse.data);

          } catch (error) {

          } finally {

            setLoading(false);

          }

        };

        

        fetchServicesForQuote();

      }

    } else if (lead) {

      // Initialize with lead data when creating new quote

      setQuoteData(prev => ({

        ...prev,

        country: lead.country || '',

        adultPax: lead.adultPax || 1,

        childPax: lead.childPax || 0,

        currency: lead.currency || 'USD'

      }));

    }

  }, [quote, lead, user.organization?._id, user.organization?.currency]);

  

  const addSightseeingToDay = (dayIndex, sightseeing, childRate) => {

    setQuoteData(prev => {

      const newDays = [...prev.days];

      // Check if this sightseeing already exists for this day

      const alreadyExists = newDays[dayIndex].sightseeings.some(

        item => item.sightseeing.toString() === sightseeing._id.toString()

      );

      

      if (!alreadyExists) {

        // Use current exchange rates (synchronously available from state)

        const convertedAdultRate = sightseeing.currency === prev.currency ? 

          sightseeing.rate : 

          Math.round((sightseeing.rate / exchangeRates[sightseeing.currency]) * exchangeRates[prev.currency] * 100) / 100;

        const convertedChildRate = sightseeing.currency === prev.currency ? 

          (childRate || sightseeing.childRate || 0) : 

          Math.round(((childRate || sightseeing.childRate || 0) / exchangeRates[sightseeing.currency]) * exchangeRates[prev.currency] * 100) / 100;

        

        newDays[dayIndex].sightseeings.push({

          sightseeing: sightseeing._id,

          rate: convertedAdultRate, // Required field - base rate per person (converted)

          adultRate: convertedAdultRate,

          childRate: convertedChildRate,

          currency: prev.currency, // Always use quote currency

          adultCount: prev.adultPax,

          childCount: prev.childPax,

          includeChild: true,

          order: (newDays[dayIndex].sightseeings.length + (newDays[dayIndex].transfers?.length || 0))

        });

      }

      return { ...prev, days: newDays };

    });

  };

  

  const removeSightseeingFromDay = (dayIndex, sightseeingIndex) => {

    setQuoteData(prev => {

      const newDays = [...prev.days];

      newDays[dayIndex].sightseeings.splice(sightseeingIndex, 1);

      return { ...prev, days: newDays };

    });

  };



  const updateSightseeingPax = (dayIndex, sightseeingIndex, field, value) => {

    setQuoteData(prev => {

      const newDays = [...prev.days];

      const sightseeing = newDays[dayIndex].sightseeings[sightseeingIndex];

      

      if (field === 'includeChild') {

        sightseeing.includeChild = value;

        sightseeing.childCount = value ? quoteData.childPax : 0;

      }

      

      return { ...prev, days: newDays };

    });

  };

  

  const addTransferToDay = (dayIndex, transfer) => {

    setQuoteData(prev => {

      const newDays = [...prev.days];

      // Check if this transfer already exists for this day

      const alreadyExists = newDays[dayIndex].transfers.some(

        item => item.transfer.toString() === transfer._id.toString()

      );

      

      if (!alreadyExists) {

        // Use current exchange rates (synchronously available from state)

        const convertedRate = transfer.currency === prev.currency ? 

          transfer.rate : 

          Math.round((transfer.rate / exchangeRates[transfer.currency]) * exchangeRates[prev.currency] * 100) / 100;

        

        newDays[dayIndex].transfers.push({

          transfer: transfer._id,

          rate: convertedRate,

          currency: prev.currency, // Always use quote currency

          name: transfer.name,

          fromLocation: transfer.fromLocation,

          toLocation: transfer.toLocation,

          vehicleType: transfer.vehicleType,

          capacity: transfer.capacity,

          order: (newDays[dayIndex].sightseeings.length + (newDays[dayIndex].transfers?.length || 0))

        });

      }

      return { ...prev, days: newDays };

    });

  };

  

  const removeTransferFromDay = (dayIndex, transferIndex) => {

    setQuoteData(prev => {

      const newDays = [...prev.days];

      newDays[dayIndex].transfers.splice(transferIndex, 1);

      return { ...prev, days: newDays };

    });

  };

  // Function to get all activities for a day combined and sorted by order
  const getDayActivities = (dayIndex) => {
    const day = quoteData.days[dayIndex];
    const activities = [];
    
    (day.sightseeings || []).forEach((s, idx) => {
      activities.push({ ...s, type: 'sightseeing', index: idx, arrayType: 'sightseeings' });
    });
    
    (day.transfers || []).forEach((t, idx) => {
      activities.push({ ...t, type: 'transfer', index: idx, arrayType: 'transfers' });
    });
    
    return activities.sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  // Function to move an activity up in order
  const moveActivityUp = (dayIndex, activityType, activityIndex) => {
    setQuoteData(prev => {
      const newDays = [...prev.days];
      const day = newDays[dayIndex];
      
      const activities = getDayActivities(dayIndex);
      const currentActivity = activities.find(a => a.type === activityType && a.index === activityIndex);
      
      if (!currentActivity || currentActivity.order <= 0) return prev;
      
      // Find the activity with order - 1
      const prevActivity = activities.find(a => (a.order || 0) === currentActivity.order - 1);
      
      if (prevActivity) {
        // Swap orders
        const tempOrder = currentActivity.order;
        newDays[dayIndex][currentActivity.arrayType][currentActivity.index].order = prevActivity.order;
        newDays[dayIndex][prevActivity.arrayType][prevActivity.index].order = tempOrder;
      }
      
      return { ...prev, days: newDays };
    });
  };

  // Function to move an activity down in order
  const moveActivityDown = (dayIndex, activityType, activityIndex) => {
    setQuoteData(prev => {
      const newDays = [...prev.days];
      const day = newDays[dayIndex];
      
      const activities = getDayActivities(dayIndex);
      const currentActivity = activities.find(a => a.type === activityType && a.index === activityIndex);
      const maxOrder = activities.length - 1;
      
      if (!currentActivity || currentActivity.order >= maxOrder) return prev;
      
      // Find the activity with order + 1
      const nextActivity = activities.find(a => (a.order || 0) === currentActivity.order + 1);
      
      if (nextActivity) {
        // Swap orders
        const tempOrder = currentActivity.order;
        newDays[dayIndex][currentActivity.arrayType][currentActivity.index].order = nextActivity.order;
        newDays[dayIndex][nextActivity.arrayType][nextActivity.index].order = tempOrder;
      }
      
      return { ...prev, days: newDays };
    });
  };



  const handleTempHotelChange = (field, value) => {

    setTempHotelData(prev => ({

      ...prev,

      [field]: value

    }));

  };



  const addRoomCategoryToTempHotel = () => {

    setTempHotelData(prev => ({

      ...prev,

      roomCategories: [...prev.roomCategories, {

        name: 'New Room',

        basePrice: '',

        currency: quoteData.currency,

        maxOccupancy: 2

      }]

    }));

  };



  const updateRoomCategoryInTempHotel = (index, field, value) => {

    setTempHotelData(prev => ({

      ...prev,

      roomCategories: prev.roomCategories.map((room, i) => 

        i === index ? { ...room, [field]: value } : room

      )

    }));

  };



  const removeRoomCategoryFromTempHotel = (index) => {

    setTempHotelData(prev => ({

      ...prev,

      roomCategories: prev.roomCategories.filter((_, i) => i !== index)

    }));

  };



  // Flight management functions

  const addFlight = () => {

    setQuoteData(prev => ({

      ...prev,

      flights: [...prev.flights, {

        airline: '',

        flightNumber: '',

        pnr: '',

        departureCity: '',

        departureDate: '',

        departureTime: '',

        arrivalCity: '',

        arrivalDate: '',

        arrivalTime: '',

        price: 0

      }]

    }));

  };



  const updateFlight = (index, field, value) => {

    setQuoteData(prev => ({

      ...prev,

      flights: (prev.flights || []).map((flight, i) => 

        i === index ? { ...flight, [field]: value } : flight

      )

    }));

  };



  const removeFlight = (index) => {

    setQuoteData(prev => ({

      ...prev,

      flights: (prev.flights || []).filter((_, i) => i !== index)

    }));

  };



  // Separate hotel management functions

  const addHotel = (hotel) => {

    setQuoteData(prev => {

      // Check if hotel already exists

      const existingHotel = prev.hotels.find(h => h.hotel === hotel._id || (h.isTemporary && hotel.isTemporary && h.name === hotel.name));

      if (existingHotel) {

        return prev; // Don't add duplicate

      }

      

      const newHotels = [...prev.hotels, {

        hotel: hotel._id,

        name: hotel.name,

        city: hotel.city,

        starRating: hotel.starRating,

        rooms: [],

        isTemporary: hotel.isTemporary || false,

        roomCategories: hotel.roomCategories || [],

        images: hotel.images || [] // Include hotel images

      }];

      return { ...prev, hotels: newHotels };

    });

  };



  const addRoomToHotel = (hotelIndex, roomCategory) => {

    const nights = Math.ceil((new Date(quoteData.travelEndDate) - new Date(quoteData.travelStartDate)) / (1000 * 60 * 60 * 24));

    

    // Convert room price to quote currency if it's different

    const convertedAdultRate = roomCategory.currency === quoteData.currency ? 

      roomCategory.basePrice : 

      Math.round((roomCategory.basePrice / exchangeRates[roomCategory.currency]) * exchangeRates[quoteData.currency] * 100) / 100;

    

    setQuoteData(prev => {

      const newHotels = [...prev.hotels];

      const newRoom = {

        roomCategory: roomCategory._id || roomCategory.name,

        roomName: roomCategory.name,

        adultRate: convertedAdultRate,

        numberOfRooms: 1,

        checkIn: quoteData.travelStartDate,

        checkOut: quoteData.travelEndDate,

        nights: nights,

        currency: quoteData.currency

      };

      newHotels[hotelIndex].rooms.push(newRoom);

      

      return { ...prev, hotels: newHotels };

    });

  };



  const updateRoomInHotel = (hotelIndex, roomIndex, field, value) => {

    setQuoteData(prev => {

      const newHotels = [...prev.hotels];

      newHotels[hotelIndex].rooms[roomIndex][field] = value;

      

      // Recalculate nights if dates change

      if (field === 'checkIn' || field === 'checkOut') {

        const checkIn = new Date(newHotels[hotelIndex].rooms[roomIndex].checkIn);

        const checkOut = new Date(newHotels[hotelIndex].rooms[roomIndex].checkOut);

        newHotels[hotelIndex].rooms[roomIndex].nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      }

      

      return { ...prev, hotels: newHotels };

    });

  };



  const removeRoomFromHotel = (hotelIndex, roomIndex) => {

    setQuoteData(prev => {

      const newHotels = [...prev.hotels];

      newHotels[hotelIndex].rooms.splice(roomIndex, 1);

      return { ...prev, hotels: newHotels };

    });

  };



  const removeHotel = (hotelIndex) => {

    setQuoteData(prev => {

      const newHotels = [...prev.hotels];

      newHotels.splice(hotelIndex, 1);

      return { ...prev, hotels: newHotels };

    });

  };



  const addTempHotelToQuote = async () => {

    try {

      // Validate required fields

      if (!tempHotelData.name || !tempHotelData.city || !tempHotelData.country) {

        alert('Please fill in all required fields (Hotel Name, City, Country)');

        return;

      }

      

      // Validate room categories

      const invalidRooms = tempHotelData.roomCategories.filter(room => !room.name || !room.basePrice || room.basePrice <= 0);

      if (invalidRooms.length > 0) {

        alert('Please fill in room names and valid prices for all rooms');

        return;

      }

      

      // Save temporary hotel to database first

      const response = await api.post('/temporary-hotels', {

        name: tempHotelData.name,

        city: tempHotelData.city,

        country: tempHotelData.country,

        starRating: tempHotelData.starRating,

        roomCategories: tempHotelData.roomCategories.map(room => ({

          ...room,

          basePrice: parseFloat(room.basePrice) || 0,

          currency: quoteData.currency

        }))

      });

      

      const savedHotel = response.data;

      

      // Add to quote with database ID

      const tempHotel = {

        isTemporary: true,

        hotel: savedHotel._id,

        name: savedHotel.name,

        city: savedHotel.city,

        country: savedHotel.country,

        starRating: savedHotel.starRating,

        roomCategories: savedHotel.roomCategories

      };

      

      addHotel(tempHotel);

      setShowTempHotelForm(false);

      setTempHotelData({

        name: '',

        city: '',

        country: quoteData.country,

        starRating: 3,

        roomCategories: [{

          name: 'Standard Room',

          basePrice: '',

          currency: quoteData.currency,

          maxOccupancy: 2

        }]

      });

    } catch (error) {
      alert('Error saving temporary hotel: ' + (error.response?.data?.message || error.message));

    }

  };

  

  const calculateTotals = () => {

    let sightseeingTotal = 0;

    let transferTotal = 0;

    let hotelTotal = 0;

    let flightTotal = 0;

    

    // Calculate day-wise sightseeings and transfers

    if (quoteData.days && quoteData.days.length > 0) {

      quoteData.days.forEach(day => {

        if (day.sightseeings && day.sightseeings.length > 0) {

          day.sightseeings.forEach(item => {

            // Use the same smart data access as display logic

            const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 

              ? item.sightseeing 

              : availableSightseeings.find(s => s._id === item.sightseeing);

            

            // Use individual passenger counts for calculation

            const adultCount = item.adultCount || quoteData.adultPax;

            const childCount = item.includeChild !== false ? (item.childCount || quoteData.childPax) : 0;

            

            if (item.adultRate || item.childRate) {

              sightseeingTotal += (item.adultRate * adultCount) + (item.childRate * childCount);

            } else if (sightseeing) {

              // Fallback to sightseeing rates

              sightseeingTotal += (sightseeing.rate * adultCount) + ((sightseeing.childRate || 0) * childCount);

            }

          });

        }

        

        if (day.transfers && day.transfers.length > 0) {

          day.transfers.forEach(item => {

            // Use the same smart data access as display logic

            const transfer = item.transfer && typeof item.transfer === 'object' 

              ? item.transfer 

              : availableTransfers.find(t => t._id === item.transfer);

            

            // Use item rate for calculation (already calculated)

            if (item.rate) {

              transferTotal += item.rate;

            } else if (transfer) {

              // Fallback to transfer rate

              transferTotal += transfer.rate;

            }

          });

        }

      });

    }

    

    // Calculate separate hotels

    if (quoteData.hotels && quoteData.hotels.length > 0) {

      quoteData.hotels.forEach(hotelItem => {

        hotelItem.rooms.forEach(room => {

          hotelTotal += room.adultRate * room.numberOfRooms * room.nights;

        });

      });

    }

    

    // Calculate flight total

    if (quoteData.flights && Array.isArray(quoteData.flights) && quoteData.flights.length > 0) {

      quoteData.flights.forEach(flight => {

        flightTotal += parseFloat(flight.price) || 0;

      });

    }

    

    const subtotal = sightseeingTotal + transferTotal + hotelTotal + flightTotal;

    const markupValue = parseFloat(quoteData.markupValue) || 0;

    const taxRate = parseFloat(quoteData.taxRate) || 0;

    const markupAmount = quoteData.markupType === 'percentage' 

      ? subtotal * (markupValue / 100) 

      : markupValue;

    const markupSubtotal = subtotal + markupAmount;

    

    // Calculate tax based on tax calculation type

    let taxAmount = 0;

    if (quoteData.taxCalculationType === 'markup') {

      // Tax on markup only

      taxAmount = markupAmount * (taxRate / 100);

    } else {

      // Tax on subtotal + markup

      taxAmount = markupSubtotal * (taxRate / 100);

    }

    

    // Calculate TCS (2.5%) if enabled on Subtotal + Markup + Tax

    const tcsBase = markupSubtotal + taxAmount;

    const tcsAmount = quoteData.tcsEnabled ? tcsBase * 0.025 : 0;

    // Calculate discount
    const discountValue = parseFloat(quoteData.discountValue) || 0;
    const discountAmount = quoteData.discountType === 'percentage'
      ? (markupSubtotal + taxAmount + tcsAmount) * (discountValue / 100)
      : discountValue;

    const total = markupSubtotal + taxAmount + tcsAmount - discountAmount;

    

    return {

      sightseeingTotal: isNaN(sightseeingTotal) ? 0 : sightseeingTotal,

      transferTotal: isNaN(transferTotal) ? 0 : transferTotal,

      hotelTotal: isNaN(hotelTotal) ? 0 : hotelTotal,

      flightTotal: isNaN(flightTotal) ? 0 : flightTotal,

      subtotal: isNaN(subtotal) ? 0 : subtotal,

      markupAmount: isNaN(markupAmount) ? 0 : markupAmount,

      discountType: quoteData.discountType,

      discountValue: quoteData.discountValue,

      discountAmount: isNaN(discountAmount) ? 0 : discountAmount,

      taxAmount: isNaN(taxAmount) ? 0 : taxAmount,

      tcsAmount: isNaN(tcsAmount) ? 0 : tcsAmount,

      total: isNaN(total) ? 0 : total 

    };

  };

  

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const totals = calculateTotals();

      

      // Ensure all hotel rooms have currency

      const hotelsWithCurrency = quoteData.hotels.map(hotel => ({

        ...hotel,

        rooms: hotel.rooms.map(room => ({

          ...room,

          currency: room.currency || quoteData.currency

        }))

      }));

      

      const quotePayload = {

        ...quoteData,

        hotels: hotelsWithCurrency,

        lead: lead._id,

        organization: user.organization._id,

        quoteNumber: quote?.quoteNumber || `Q-${Date.now()}`, // Generate quote number if creating new

        ...totals

      };

      let response;

      if (quote) {

        // Update existing quote

        response = await api.put(`/quotes/${quote._id}`, quotePayload);

      } else {

        // Create new quote

        response = await api.post('/quotes', quotePayload);

      }

      

      onSave(response.data);

      onClose();

    } catch (error) {
      alert('Error saving quote: ' + (error.response?.data?.message || error.message));

    }

  };

  

  const styles = {

    modal: {

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

    },

    modalContent: {

      backgroundColor: 'white',

      borderRadius: '12px',

      width: '95%',

      maxWidth: '1200px',

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

      fontSize: '24px',

      fontWeight: '600',

      color: '#343a40'

    },

    modalBody: {

      padding: '32px'

    },

    formGrid: {

      display: 'grid',

      gridTemplateColumns: '1fr 1fr 1fr',

      gap: '20px',

      marginBottom: '30px'

    },

    formGroup: {

      display: 'flex',

      flexDirection: 'column'

    },

    label: {

      fontSize: '14px',

      fontWeight: '600',

      color: '#495057',

      marginBottom: '8px'

    },

    input: {

      padding: '10px 12px',

      border: '2px solid #e9ecef',

      borderRadius: '6px',

      fontSize: '14px'

    },

    tabs: {

      display: 'flex',

      gap: '10px',

      marginBottom: '20px',

      borderBottom: '2px solid #e9ecef'

    },

    tab: {

      padding: '12px 24px',

      cursor: 'pointer',

      border: 'none',

      backgroundColor: 'transparent',

      fontSize: '16px',

      fontWeight: '500',

      color: '#6c757d',

      borderBottom: '3px solid transparent'

    },

    activeTab: {

      color: '#007bff',

      borderBottom: '3px solid #007bff'

    },

    serviceGrid: {

      display: 'grid',

      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',

      gap: '20px',

      marginBottom: '30px'

    },

    serviceCard: {

      border: '1px solid #dee2e6',

      borderRadius: '8px',

      padding: '16px',

      backgroundColor: '#f8f9fa'

    },

    serviceTitle: {

      fontSize: '16px',

      fontWeight: '600',

      marginBottom: '8px'

    },

    serviceDetails: {

      fontSize: '14px',

      color: '#6c757d',

      marginBottom: '12px'

    },

    addButton: {

      padding: '8px 16px',

      backgroundColor: '#28a745',

      color: 'white',

      border: 'none',

      borderRadius: '4px',

      cursor: 'pointer',

      fontSize: '14px'

    },

    selectedItems: {

      marginBottom: '30px'

    },

    selectedItem: {

      display: 'flex',

      justifyContent: 'space-between',

      alignItems: 'center',

      padding: '12px',

      border: '1px solid #dee2e6',

      borderRadius: '6px',

      marginBottom: '8px'

    },

    removeButton: {

      padding: '6px 12px',

      backgroundColor: '#dc3545',

      color: 'white',

      border: 'none',

      borderRadius: '4px',

      cursor: 'pointer',

      fontSize: '12px'

    },

    totals: {

      backgroundColor: '#f8f9fa',

      padding: '20px',

      borderRadius: '8px',

      marginBottom: '20px'

    },

    totalRow: {

      display: 'flex',

      justifyContent: 'space-between',

      marginBottom: '8px'

    },

    totalRowFinal: {

      display: 'flex',

      justifyContent: 'space-between',

      fontSize: '18px',

      fontWeight: '600',

      borderTop: '2px solid #dee2e6',

      paddingTop: '12px'

    },

    modalFooter: {

      padding: '20px 32px',

      borderTop: '1px solid #e9ecef',

      display: 'flex',

      justifyContent: 'flex-end',

      gap: '12px'

    },

    cancelButton: {

      padding: '10px 20px',

      backgroundColor: '#6c757d',

      color: 'white',

      border: 'none',

      borderRadius: '6px',

      cursor: 'pointer'

    },

    saveButton: {

      padding: '10px 20px',

      backgroundColor: '#007bff',

      color: 'white',

      border: 'none',

      borderRadius: '6px',

      cursor: 'pointer'

    }

  };

  

  return (

    <React.Fragment>

      <div style={styles.modal}>

        <div style={styles.modalContent}>

          <div style={styles.modalHeader}>

            <h3 style={styles.modalTitle}>{quote ? 'Edit Quote' : 'Create Quote'} for {lead.name}</h3>

          </div>

        

          <form onSubmit={handleSubmit} style={styles.modalBody}>

            <div style={styles.formGrid}>

              <div style={styles.formGroup}>

                <label style={styles.label}>Travel Start Date</label>

                <input

                  type="date"

                  name="travelStartDate"

                  value={quoteData.travelStartDate}

                  onChange={handleInputChange}

                  style={styles.input}

                  required

                />

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>Travel End Date</label>

                <input

                  type="date"

                  name="travelEndDate"

                  value={quoteData.travelEndDate}

                  onChange={handleInputChange}

                  style={styles.input}

                  required

                />

            </div>

            <div style={styles.formGroup}>

              <label style={styles.label}>Country</label>

              <input

                type="text"

                name="country"

                value={quoteData.country}

                onChange={handleInputChange}

                style={styles.input}

                placeholder="e.g., United Arab Emirates"

                required

              />

            </div>

            <div style={styles.formGroup}>

              <label style={styles.label}>Adult Passengers</label>

              <input

                type="number"

                name="adultPax"

                value={quoteData.adultPax}

                onChange={handleInputChange}

                style={styles.input}

                min="1"

                required

              />

            </div>

            <div style={styles.formGroup}>

              <label style={styles.label}>Child Passengers</label>

              <input

                type="number"

                name="childPax"

                value={quoteData.childPax}

                onChange={handleInputChange}

                style={styles.input}

                min="0"

              />

            </div>

            <div style={styles.formGroup}>

              <label style={styles.label}>Currency</label>

              <select

                name="currency"

                value={quoteData.currency}

                onChange={handleInputChange}

                style={styles.input}

              >

                <option value="USD">USD</option>

                <option value="EUR">EUR</option>

                <option value="GBP">GBP</option>

                <option value="INR">INR</option>

                <option value="THB">THB</option>

                <option value="MYR">MYR</option>

                <option value="IDR">IDR</option>

                <option value="SGD">SGD</option>

                <option value="AED">AED</option>

              </select>

            </div>

            <div style={styles.formGroup}>

              <label style={styles.label}>Tax Rate (%)</label>

              <input

                type="number"

                name="taxRate"

                value={quoteData.taxRate}

                onChange={handleInputChange}

                style={styles.input}

                min="0"

                max="100"

                step="0.1"

              />

            </div>

            <div style={styles.formGroup}>

              <label style={styles.label}>Notes</label>

              <input

                type="text"

                name="notes"

                value={quoteData.notes}

                onChange={handleInputChange}

                style={styles.input}

                placeholder="Optional notes for the quote"

              />

            </div>

          </div>

          

          {/* Separate Hotels Section */}

          <div style={{

            backgroundColor: '#f8f9fa',

            padding: '20px',

            borderRadius: '8px',

            marginBottom: '20px',

            border: '1px solid #dee2e6'

          }}>

            <h4 style={{marginBottom: '15px', color: '#495057'}}>Hotels</h4>

            

            <div style={{marginBottom: '15px'}}>

              {/* Dropdown Search */}

              <select

                id="hotel-select"

                style={{...styles.input, width: '300px', marginRight: '10px'}}

                onChange={(e) => {

                  const value = e.target.value;

                  if (value) {

                    const hotel = filteredHotels.find(h => h._id === value);

                    if (hotel) {

                      addHotel(hotel);

                      setHotelSearch('');

                    }

                    e.target.value = '';

                  }

                }}

              >

                <option value="">🔍 Search hotels... {hotelSearch && `(searching: ${hotelSearch})`}</option>

                {Array.isArray(filteredHotels) && filteredHotels.map(hotel => (

                  <option key={hotel._id} value={hotel._id}>

                    {hotel.name} - {hotel.city} ({'⭐'.repeat(hotel.starRating)})

                  </option>

                ))}

              </select>

              

              <input

                type="text"

                placeholder="Type to filter hotels..."

                value={hotelSearch}

                onChange={(e) => setHotelSearch(e.target.value)}

                style={{

                  ...styles.input,

                  width: '300px',

                  marginRight: '10px'

                }}

              />

              

              <button

                type="button"

                onClick={() => setShowTempHotelForm(true)}

                style={{

                  padding: '8px 16px',

                  backgroundColor: '#6c757d',

                  color: 'white',

                  border: 'none',

                  borderRadius: '4px',

                  cursor: 'pointer',

                  marginRight: '10px'

                }}

              >

                + Add Temporary Hotel

              </button>

              

              {hotelSearch && (

                <button

                  type="button"

                  onClick={() => setHotelSearch('')}

                  style={{

                    padding: '8px 16px',

                    backgroundColor: '#dc3545',

                    color: 'white',

                    border: 'none',

                    borderRadius: '4px',

                    cursor: 'pointer'

                  }}

                >

                  Clear

                </button>

              )}

            </div>

            

            {quoteData.hotels.map((hotelItem, hotelIndex) => (

              <div key={hotelIndex} style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                marginBottom: '10px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>

                  <div>

                    <strong style={{fontSize: '16px'}}>{hotelItem.name}</strong>

                    <div style={{color: '#6c757d', fontSize: '14px'}}>

                      {hotelItem.city} • {'⭐'.repeat(hotelItem.starRating || 0)}

                      {hotelItem.isTemporary && <span style={{color: '#dc3545', marginLeft: '10px'}}> (Temporary)</span>}

                    </div>

                  </div>

                  <button

                    type="button"

                    style={{

                      padding: '6px 12px',

                      backgroundColor: '#dc3545',

                      color: 'white',

                      border: 'none',

                      borderRadius: '4px',

                      cursor: 'pointer'

                    }}

                    onClick={() => removeHotel(hotelIndex)}

                  >

                    Remove Hotel

                  </button>

                </div>

                

                <div style={{marginBottom: '10px'}}>

                  <h6 style={{marginBottom: '8px', color: '#495057'}}>Rooms</h6>

                  <select

                    id={`room-select-${hotelIndex}`}

                    style={{...styles.input, width: '350px', marginRight: '10px', fontSize: '12px'}}

                  >

                    <option value="">+ Add Room</option>

                    {(() => {

                      if (hotelItem.isTemporary) {

                        return hotelItem.roomCategories?.map((room, index) => {

                          // Convert room price to quote currency for display (temporary hotels should already be in quote currency, but just in case)

                          const convertedRate = room.currency === quoteData.currency ? 

                            room.basePrice : 

                            Math.round((room.basePrice / exchangeRates[room.currency]) * exchangeRates[quoteData.currency] * 100) / 100;

                          

                          return (

                            <option key={index} value={index}>

                              {room.name} - {quoteData.currency} {convertedRate}/night

                            </option>

                          );

                        });

                      } else {

                        const foundHotel = availableHotels.find(h => h._id === hotelItem.hotel);

                        return foundHotel?.roomCategories?.map(room => {

                          // Convert room price to quote currency for display

                          const convertedRate = room.currency === quoteData.currency ? 

                            room.basePrice : 

                            Math.round((room.basePrice / exchangeRates[room.currency]) * exchangeRates[quoteData.currency] * 100) / 100;

                          

                          return (

                            <option key={room._id} value={room._id}>

                              {room.name} - {quoteData.currency} {convertedRate}/night

                            </option>

                          );

                        }) || [];

                      }

                    })()}

                  </select>

                  <button

                    type="button"

                    onClick={() => {

                      const select = document.getElementById(`room-select-${hotelIndex}`);

                      const value = select.value;

                      if (value) {

                        const roomCategory = hotelItem.isTemporary 

                          ? hotelItem.roomCategories[parseInt(value)]

                          : availableHotels.find(h => h._id === hotelItem.hotel)?.roomCategories?.find(r => r._id === value);

                        if (roomCategory) {

                          addRoomToHotel(hotelIndex, roomCategory);

                        }

                        select.value = '';

                      }

                    }}

                    style={{

                      padding: '4px 8px',

                      backgroundColor: '#28a745',

                      color: 'white',

                      border: 'none',

                      borderRadius: '4px',

                      cursor: 'pointer',

                      fontSize: '12px'

                    }}

                  >

                    Add Room

                  </button>

                </div>

                

                {hotelItem.rooms.map((room, roomIndex) => (

                  <div key={roomIndex} style={{

                    backgroundColor: '#f8f9fa',

                    padding: '10px',

                    borderRadius: '4px',

                    marginBottom: '6px',

                    border: '1px solid #dee2e6'

                  }}>

                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>

                      <span style={{fontWeight: '500'}}>{room.roomName}</span>

                      <button

                        type="button"

                        style={{

                          padding: '2px 6px',

                          backgroundColor: '#dc3545',

                          color: 'white',

                          border: 'none',

                          borderRadius: '3px',

                          cursor: 'pointer',

                          fontSize: '10px'

                        }}

                        onClick={() => removeRoomFromHotel(hotelIndex, roomIndex)}

                      >

                        Remove

                      </button>

                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '8px', fontSize: '12px'}}>

                      <div>

                        <label style={{display: 'block', marginBottom: '2px', fontSize: '10px', color: '#6c757d'}}>Check-in</label>

                        <input

                          type="date"

                          value={room.checkIn ? new Date(room.checkIn).toISOString().split('T')[0] : ''}

                          onChange={(e) => updateRoomInHotel(hotelIndex, roomIndex, 'checkIn', e.target.value)}

                          style={{padding: '4px', border: '1px solid #ddd', borderRadius: '2px', width: '100%'}}

                        />

                      </div>

                      <div>

                        <label style={{display: 'block', marginBottom: '2px', fontSize: '10px', color: '#6c757d'}}>Check-out</label>

                        <input

                          type="date"

                          value={room.checkOut ? new Date(room.checkOut).toISOString().split('T')[0] : ''}

                          onChange={(e) => updateRoomInHotel(hotelIndex, roomIndex, 'checkOut', e.target.value)}

                          style={{padding: '4px', border: '1px solid #ddd', borderRadius: '2px', width: '100%'}}

                        />

                      </div>

                      <div>

                        <label style={{display: 'block', marginBottom: '2px', fontSize: '10px', color: '#6c757d'}}>Rooms</label>

                        <input

                          type="number"

                          value={room.numberOfRooms}

                          onChange={(e) => updateRoomInHotel(hotelIndex, roomIndex, 'numberOfRooms', parseInt(e.target.value))}

                          style={{padding: '4px', border: '1px solid #ddd', borderRadius: '2px', width: '100%'}}

                          min="1"

                          max="10"

                        />

                      </div>

                      <div>

                        <label style={{display: 'block', marginBottom: '2px', fontSize: '10px', color: '#6c757d'}}>Room Rate</label>

                        <input

                          type="number"

                          value={room.adultRate}

                          onChange={(e) => updateRoomInHotel(hotelIndex, roomIndex, 'adultRate', parseFloat(e.target.value) || 0)}

                          style={{

                            padding: '4px',

                            border: '1px solid #ddd',

                            borderRadius: '2px',

                            width: '100%',

                            fontSize: '12px'

                          }}

                          min="0"

                          step="0.01"

                        />

                      </div>

                      <div>

                        <label style={{display: 'block', marginBottom: '2px', fontSize: '10px', color: '#6c757d'}}>Total</label>

                        <div style={{padding: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', textAlign: 'center', fontWeight: '500'}}>

                          {quoteData.currency} {room.adultRate * room.numberOfRooms * room.nights}

                        </div>

                      </div>

                    </div>

                    <div style={{fontSize: '11px', color: '#6c757d', marginTop: '4px'}}>

                      {room.numberOfRooms} room(s) × {room.nights} night(s) × {quoteData.currency} {room.adultRate}/night = {quoteData.currency} {room.adultRate * room.numberOfRooms * room.nights}

                    </div>

                  </div>

                ))}

              </div>

            ))}

            

            {quoteData.hotels.length === 0 && (

              <div style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>

                No hotels added yet. Add a hotel to include accommodation in your quote.

              </div>

            )}

          </div>

          

          {/* Flights Section */}

          <div style={{

            backgroundColor: '#f8f9fa',

            padding: '20px',

            borderRadius: '8px',

            marginBottom: '20px',

            border: '1px solid #dee2e6'

          }}>

            <h4 style={{marginBottom: '15px', color: '#495057'}}>Flights</h4>

            

            <div style={{marginBottom: '15px'}}>

              <button

                type="button"

                onClick={addFlight}

                style={{

                  padding: '8px 16px',

                  backgroundColor: '#007bff',

                  color: 'white',

                  border: 'none',

                  borderRadius: '4px',

                  cursor: 'pointer'

                }}

              >

                + Add Flight

              </button>

            </div>

            

            {(quoteData.flights || []).map((flight, index) => (

              <div key={index} style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                marginBottom: '10px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px'}}>

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Airline *</label>

                    <input

                      type="text"

                      value={flight.airline || ''}

                      onChange={(e) => updateFlight(index, 'airline', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., Emirates, Qatar Airways"

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Flight Number *</label>

                    <input

                      type="text"

                      value={flight.flightNumber || ''}

                      onChange={(e) => updateFlight(index, 'flightNumber', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., EK234"

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>PNR (Optional)</label>

                    <input

                      type="text"

                      value={flight.pnr || ''}

                      onChange={(e) => updateFlight(index, 'pnr', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., ABC123"

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Price *</label>

                    <input

                      type="number"

                      value={flight.price || 0}

                      onChange={(e) => updateFlight(index, 'price', parseFloat(e.target.value) || 0)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="0.00"

                      min="0"

                      step="0.01"

                    />

                  </div>

                </div>

                

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px'}}>

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Departure City *</label>

                    <input

                      type="text"

                      value={flight.departureCity || ''}

                      onChange={(e) => updateFlight(index, 'departureCity', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., New York"

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Departure Date *</label>

                    <input

                      type="date"

                      value={flight.departureDate || ''}

                      onChange={(e) => updateFlight(index, 'departureDate', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Departure Time *</label>

                    <input

                      type="time"

                      value={flight.departureTime || ''}

                      onChange={(e) => updateFlight(index, 'departureTime', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                    />

                  </div>

                </div>

                

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px'}}>

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Arrival City *</label>

                    <input

                      type="text"

                      value={flight.arrivalCity || ''}

                      onChange={(e) => updateFlight(index, 'arrivalCity', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., London"

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Arrival Date *</label>

                    <input

                      type="date"

                      value={flight.arrivalDate || ''}

                      onChange={(e) => updateFlight(index, 'arrivalDate', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Arrival Time *</label>

                    <input

                      type="time"

                      value={flight.arrivalTime || ''}

                      onChange={(e) => updateFlight(index, 'arrivalTime', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                    />

                  </div>

                </div>

                

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px'}}>

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Baggage Allowance *</label>

                    <input

                      type="text"

                      value={flight.baggage || '20 kg'}

                      onChange={(e) => updateFlight(index, 'baggage', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., 20 kg, 30 kg + 7 kg hand carry"

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Departure Airport Code</label>

                    <input

                      type="text"

                      value={flight.departureAirport || ''}

                      onChange={(e) => updateFlight(index, 'departureAirport', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., BOM, JFK"

                    />

                  </div>

                  

                  <div>

                    <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold'}}>Arrival Airport Code</label>

                    <input

                      type="text"

                      value={flight.arrivalAirport || ''}

                      onChange={(e) => updateFlight(index, 'arrivalAirport', e.target.value)}

                      style={{padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '100%'}}

                      placeholder="e.g., LHR, DXB"

                    />

                  </div>

                </div>

                

                <div style={{marginTop: '10px', textAlign: 'right'}}>

                  <button

                    type="button"

                    onClick={() => removeFlight(index)}

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

                    Remove Flight

                  </button>

                </div>

              </div>

            ))}

            

            {(!quoteData.flights || quoteData.flights.length === 0) && (

              <div style={{

                textAlign: 'center',

                padding: '20px',

                color: '#6c757d',

                fontStyle: 'italic'

              }}>

                No flights added. Click "+ Add Flight" to add flight details.

              </div>

            )}

          </div>

          

          {quoteData.days.length > 0 && (

            <div>

              <h3 style={{marginBottom: '20px'}}>Day-wise Itinerary</h3>

              {quoteData.days.map((day, dayIndex) => (

                <div key={dayIndex} style={{

                  border: '2px solid #e9ecef',

                  borderRadius: '8px',

                  padding: '20px',

                  marginBottom: '20px',

                  backgroundColor: '#f8f9fa'

                }}>

                  <h4 style={{marginBottom: '15px', color: '#495057'}}>

                    Day {day.dayNumber} - {new Date(day.date).toLocaleDateString()}

                  </h4>

                  

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>

                    {/* Sightseeings for this day */}

                    <div>

                      <h5 style={{marginBottom: '10px', fontSize: '16px'}}>Sightseeings</h5>

                      {loading ? (

                        <p>Loading sightseeings...</p>

                      ) : availableSightseeings.length === 0 ? (

                        <p>No sightseeings found for this destination.</p>

                      ) : (

                        <div>

                          <div style={{marginBottom: '15px'}}>

                            {/* Dropdown Search */}

                            <select

                              id={`sightseeing-select-${dayIndex}`}

                              style={{...styles.input, width: '100%', marginBottom: '8px'}}

                              onChange={(e) => {

                                const value = e.target.value;

                                if (value) {

                                  const sightseeing = filteredSightseeings.find(s => s._id === value);

                                  if (sightseeing) {

                                    addSightseeingToDay(dayIndex, sightseeing, sightseeing.childRate || 0);

                                    setSightseeingSearch('');

                                  }

                                  e.target.value = '';

                                }

                              }}

                            >

                              <option value="">🔍 Search sightseeings... {sightseeingSearch && `(searching: ${sightseeingSearch})`}</option>

                              {filteredSightseeings.map(sightseeing => {

                                // Convert rates to quote currency for display

                                const convertedAdultRate = sightseeing.currency === quoteData.currency ? 

                                  sightseeing.rate : 

                                  Math.round((sightseeing.rate / exchangeRates[sightseeing.currency]) * exchangeRates[quoteData.currency] * 100) / 100;

                                const convertedChildRate = sightseeing.currency === quoteData.currency ? 

                                  (sightseeing.childRate || 0) : 

                                  Math.round(((sightseeing.childRate || 0) / exchangeRates[sightseeing.currency]) * exchangeRates[quoteData.currency] * 100) / 100;

                                

                                return (

                                  <option key={sightseeing._id} value={sightseeing._id}>

                                    {sightseeing.name} - Adult: {quoteData.currency} {convertedAdultRate}, Child: {quoteData.currency} {convertedChildRate}

                                  </option>

                                );

                              })}

                            </select>

                            

                            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>

                              <input

                                type="text"

                                placeholder="Type to filter sightseeings..."

                                value={sightseeingSearch}

                                onChange={(e) => setSightseeingSearch(e.target.value)}

                                style={{

                                  ...styles.input,

                                  flex: '1'

                                }}

                              />

                              

                              {sightseeingSearch && (

                                <button

                                  type="button"

                                  onClick={() => setSightseeingSearch('')}

                                  style={{

                                    padding: '8px 16px',

                                    backgroundColor: '#dc3545',

                                    color: 'white',

                                    border: 'none',

                                    borderRadius: '4px',

                                    cursor: 'pointer'

                                  }}

                                >

                                  Clear

                                </button>

                              )}

                            </div>

                          </div>

                          

                          {day.sightseeings.map((item, sightseeingIndex) => {

                            // Try to get sightseeing data from multiple sources

                            const sightseeing = item.sightseeing && typeof item.sightseeing === 'object' 

                              ? item.sightseeing 

                              : availableSightseeings.find(s => s._id === item.sightseeing);

                            

                            // Use populated data, then available services, then fallback

                            const displayName = sightseeing?.name || item.name || 'Sightseeing';

                            const displayLocation = sightseeing?.location || item.location || '';

                            const displayDuration = sightseeing?.duration || item.duration || 'N/A';

                            

                            return (

                              <div key={sightseeingIndex} style={{

                                backgroundColor: 'white',

                                padding: '10px',

                                borderRadius: '6px',

                                marginBottom: '8px',

                                border: '1px solid #dee2e6'

                              }}>

                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>

                                  <div>

                                    <strong>{displayName}</strong><br />

                                    <small style={{color: '#6c757d'}}>

                                      {displayLocation} • {displayDuration}

                                    </small><br />

                                    <div style={{marginTop: '5px'}}>

                                      <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px'}}>

                                        <small style={{fontSize: '11px'}}>

                                          Adult: {quoteData.currency} {item.adultRate} × {item.adultCount || quoteData.adultPax} = {quoteData.currency} {item.adultRate * (item.adultCount || quoteData.adultPax)}

                                        </small>

                                      </div>

                                      {quoteData.childPax > 0 && (

                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>

                                          <small style={{fontSize: '11px'}}>

                                            Child: {quoteData.currency} {item.childRate} × {item.childCount || 0} = {quoteData.currency} {item.childRate * (item.childCount || 0)}

                                          </small>

                                          <label style={{fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px'}}>

                                            <input

                                              type="checkbox"

                                              checked={item.includeChild !== false}

                                              onChange={(e) => updateSightseeingPax(dayIndex, sightseeingIndex, 'includeChild', e.target.checked)}

                                              style={{margin: 0}}

                                            />

                                            Include Child

                                          </label>

                                        </div>

                                      )}

                                    </div>

                                  </div>

                                  <div style={{display: 'flex', gap: '5px'}}>
                                    <button
                                      type="button"
                                      onClick={() => moveActivityUp(dayIndex, 'sightseeing', sightseeingIndex)}
                                      disabled={item.order === 0}
                                      style={{
                                        ...styles.removeButton,
                                        opacity: item.order === 0 ? 0.5 : 1,
                                        cursor: item.order === 0 ? 'not-allowed' : 'pointer',
                                        padding: '5px 10px',
                                        fontSize: '14px'
                                      }}
                                      title="Move up"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveActivityDown(dayIndex, 'sightseeing', sightseeingIndex)}
                                      disabled={item.order === (day.sightseeings.length + day.transfers.length - 1)}
                                      style={{
                                        ...styles.removeButton,
                                        opacity: item.order === (day.sightseeings.length + day.transfers.length - 1) ? 0.5 : 1,
                                        cursor: item.order === (day.sightseeings.length + day.transfers.length - 1) ? 'not-allowed' : 'pointer',
                                        padding: '5px 10px',
                                        fontSize: '14px'
                                      }}
                                      title="Move down"
                                    >
                                      ↓
                                    </button>
                                    <button

                                      type="button"

                                      style={styles.removeButton}

                                      onClick={() => removeSightseeingFromDay(dayIndex, sightseeingIndex)}

                                    >

                                      Remove

                                    </button>
                                  </div>

                                </div>

                              </div>

                            );

                          })}

                        </div>

                      )}

                    </div>

                    

                    {/* Transfers for this day */}

                    <div>

                      <h5 style={{marginBottom: '10px', fontSize: '16px'}}>Transfers</h5>

                      {loading ? (

                        <p>Loading transfers...</p>

                      ) : (

                        <div>

                          <div style={{marginBottom: '15px'}}>

                            {/* Dropdown Search */}

                            <select

                              id={`transfer-select-${dayIndex}`}

                              style={{...styles.input, width: '100%', marginBottom: '8px'}}

                              onChange={(e) => {

                                const value = e.target.value;

                                if (value) {

                                  const transfer = (filteredTransfers[dayIndex] || availableTransfers).find(t => t._id === value);

                                  if (transfer) {

                                    addTransferToDay(dayIndex, transfer);

                                    setTransferSearch(prev => ({

                                      ...prev,

                                      [dayIndex]: ''

                                    }));

                                  }

                                  e.target.value = '';

                                }

                              }}

                            >

                              <option value="">🔍 Search transfers... {transferSearch[dayIndex] && `(searching: ${transferSearch[dayIndex]})`}</option>

                              {(filteredTransfers[dayIndex] || availableTransfers).map(transfer => {

                                // Convert rate to quote currency for display

                                const convertedRate = transfer.currency === quoteData.currency ? 

                                  transfer.rate : 

                                  Math.round((transfer.rate / exchangeRates[transfer.currency]) * exchangeRates[quoteData.currency] * 100) / 100;

                                

                                return (

                                  <option key={transfer._id} value={transfer._id}>

                                    {transfer.name} - {quoteData.currency} {convertedRate}

                                  </option>

                                );

                              })}

                            </select>

                            

                            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>

                              <input

                                type="text"

                                placeholder="Type to filter transfers..."

                                value={transferSearch[dayIndex] || ''}

                                onChange={(e) => setTransferSearch(prev => ({

                                  ...prev,

                                  [dayIndex]: e.target.value

                                }))}

                                style={{

                                  ...styles.input,

                                  flex: '1'

                                }}

                              />

                              

                              {transferSearch[dayIndex] && (

                                <button

                                  type="button"

                                  onClick={() => setTransferSearch(prev => ({

                                    ...prev,

                                    [dayIndex]: ''

                                  }))}

                                  style={{

                                    padding: '8px 16px',

                                    backgroundColor: '#dc3545',

                                    color: 'white',

                                    border: 'none',

                                    borderRadius: '4px',

                                    cursor: 'pointer'

                                  }}

                                >

                                  Clear

                                </button>

                              )}

                            </div>

                          </div>

                          

                          {day.transfers.map((item, transferIndex) => {

                            // Try to get transfer data from multiple sources

                            let transfer = item.transfer && typeof item.transfer === 'object' 

                              ? item.transfer 

                              : availableTransfers.find(t => t._id === item.transfer);

                            

                            // If still not found, try to use stored data or create a basic display

                            if (!transfer && item.name) {

                              transfer = {

                                name: item.name,

                                fromLocation: item.fromLocation || 'Hotel',

                                toLocation: item.toLocation || 'Airport',

                                vehicleType: item.vehicleType || 'Vehicle',

                                capacity: item.capacity || 'N/A'

                              };

                            }

                            

                            // Use populated data, then available services, then fallback

                            const displayName = transfer?.name || item.name || 'Transfer Service';

                            const displayFromLocation = transfer?.fromLocation || item.fromLocation || 'Pickup';

                            const displayToLocation = transfer?.toLocation || item.toLocation || 'Drop-off';

                            const displayVehicleType = transfer?.vehicleType || item.vehicleType || 'Standard Vehicle';

                            const displayCapacity = transfer?.capacity || item.capacity || 'Varies';

                            

                            // If we still have undefined values, show a simpler format

                            const routeDisplay = (displayFromLocation === 'Pickup' && displayToLocation === 'Drop-off') 

                              ? 'Transfer Service' 

                              : `${displayFromLocation} → ${displayToLocation}`;

                            

                            return (

                              <div key={transferIndex} style={{

                                backgroundColor: 'white',

                                padding: '10px',

                                borderRadius: '6px',

                                marginBottom: '8px',

                                border: '1px solid #dee2e6'

                              }}>

                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>

                                  <div>

                                    <strong>{displayName}</strong><br />

                                    <small style={{color: '#6c757d'}}>

                                      {routeDisplay}<br />

                                      {displayVehicleType} ({displayCapacity} persons)

                                    </small><br />

                                    <small>

                                      Rate: {quoteData.currency} {item.rate}

                                    </small>

                                  </div>

                                  <div style={{display: 'flex', gap: '5px'}}>
                                    <button
                                      type="button"
                                      onClick={() => moveActivityUp(dayIndex, 'transfer', transferIndex)}
                                      disabled={item.order === 0}
                                      style={{
                                        ...styles.removeButton,
                                        opacity: item.order === 0 ? 0.5 : 1,
                                        cursor: item.order === 0 ? 'not-allowed' : 'pointer',
                                        padding: '5px 10px',
                                        fontSize: '14px'
                                      }}
                                      title="Move up"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveActivityDown(dayIndex, 'transfer', transferIndex)}
                                      disabled={item.order === (day.sightseeings.length + day.transfers.length - 1)}
                                      style={{
                                        ...styles.removeButton,
                                        opacity: item.order === (day.sightseeings.length + day.transfers.length - 1) ? 0.5 : 1,
                                        cursor: item.order === (day.sightseeings.length + day.transfers.length - 1) ? 'not-allowed' : 'pointer',
                                        padding: '5px 10px',
                                        fontSize: '14px'
                                      }}
                                      title="Move down"
                                    >
                                      ↓
                                    </button>
                                    <button

                                      type="button"

                                      style={styles.removeButton}

                                      onClick={() => removeTransferFromDay(dayIndex, transferIndex)}

                                    >

                                      Remove

                                    </button>
                                  </div>

                                </div>

                              </div>

                            );

                          })}

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

          

          {/* Markup Section */}

          <div style={{

            backgroundColor: '#f8f9fa',

            padding: '20px',

            borderRadius: '8px',

            marginBottom: '20px',

            border: '1px solid #dee2e6'

          }}>

            <h4 style={{marginBottom: '15px', color: '#495057'}}>Pricing Options</h4>

            <div style={styles.formGrid}>

              <div style={styles.formGroup}>

                <label style={styles.label}>Markup Type</label>

                <select

                  name="markupType"

                  value={quoteData.markupType}

                  onChange={handleInputChange}

                  style={styles.input}

                >

                  <option value="percentage">Percentage</option>

                  <option value="amount">Fixed Amount</option>

                </select>

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>Markup Value</label>

                <input

                  type="number"

                  name="markupValue"

                  value={quoteData.markupValue}

                  onChange={handleInputChange}

                  style={styles.input}

                  min="0"

                  step="0.01"

                  placeholder={quoteData.markupType === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 100'}

                />

              </div>

            </div>

          </div>

          

          {/* Discount Section */}

          <div style={{

            backgroundColor: '#f8f9fa',

            padding: '20px',

            borderRadius: '8px',

            marginBottom: '20px',

            border: '1px solid #dee2e6'

          }}>

            <h4 style={{marginBottom: '15px', color: '#495057'}}>Discount Options</h4>

            <div style={styles.formGrid}>

              <div style={styles.formGroup}>

                <label style={styles.label}>Discount Type</label>

                <select

                  name="discountType"

                  value={quoteData.discountType}

                  onChange={handleInputChange}

                  style={styles.input}

                >

                  <option value="amount">Fixed Amount</option>

                  <option value="percentage">Percentage</option>

                </select>

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>Discount Value</label>

                <input

                  type="number"

                  name="discountValue"

                  value={quoteData.discountValue}

                  onChange={handleInputChange}

                  style={styles.input}

                  min="0"

                  step="0.01"

                  placeholder={quoteData.discountType === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 100'}

                />

              </div>

            </div>

          </div>

          

          {/* Tax Section */}

          <div style={{

            backgroundColor: '#f8f9fa',

            padding: '20px',

            borderRadius: '8px',

            marginBottom: '20px',

            border: '1px solid #dee2e6'

          }}>

            <h4 style={{marginBottom: '15px', color: '#495057'}}>Tax Options</h4>

            <div style={styles.formGrid}>

              <div style={styles.formGroup}>

                <label style={styles.label}>Tax Rate (%)</label>

                <input

                  type="number"

                  name="taxRate"

                  value={quoteData.taxRate}

                  onChange={handleInputChange}

                  style={styles.input}

                  min="0"

                  step="0.01"

                  placeholder="e.g., 5 for 5%"

                />

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>Tax Calculation On</label>

                <select

                  name="taxCalculationType"

                  value={quoteData.taxCalculationType || 'markup'}

                  onChange={handleInputChange}

                  style={styles.input}

                >

                  <option value="markup">Markup Only</option>

                  <option value="total">Subtotal + Markup</option>

                </select>

              </div>

              <div style={styles.formGroup}>

                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px'}}>

                  <input

                    type="checkbox"

                    name="tcsEnabled"

                    checked={quoteData.tcsEnabled || false}

                    onChange={handleInputChange}

                    style={{width: '18px', height: '18px'}}

                  />

                  <label style={{margin: 0, fontSize: '14px', cursor: 'pointer'}}>Add TCS 2.5%</label>

                </div>

              </div>

            </div>

          </div>

          

          {/* Quote Totals */}

          <div style={styles.totals}>

            {(() => {

              const totals = calculateTotals();

              return (

                <React.Fragment>

                  <h4 style={{marginBottom: '15px', color: '#495057'}}>Quote Totals</h4>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px'}}>

              <div style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Sightseeing Total</div>

                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#495057'}}>

                  {quoteData.currency} {(totals.sightseeingTotal || 0).toFixed(2)}

                </div>

              </div>

              <div style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Transfer Total</div>

                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#495057'}}>

                  {quoteData.currency} {(totals.transferTotal || 0).toFixed(2)}

                </div>

              </div>

              <div style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Hotel Total</div>

                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#495057'}}>

                  {quoteData.currency} {(totals.hotelTotal || 0).toFixed(2)}

                </div>

              </div>

              <div style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Flight Total</div>

                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#495057'}}>

                  {quoteData.currency} {(totals.flightTotal || 0).toFixed(2)}

                </div>

              </div>

              <div style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Subtotal</div>

                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#495057'}}>

                  {quoteData.currency} {(totals.subtotal || 0).toFixed(2)}

                </div>

              </div>

              <div style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Markup Amount</div>

                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#28a745'}}>

                  +{quoteData.currency} {(totals.markupAmount || 0).toFixed(2)}

                </div>

              </div>

              <div style={{

                backgroundColor: 'white',

                padding: '15px',

                borderRadius: '6px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Tax Amount</div>

                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#dc3545'}}>

                  +{quoteData.currency} {(totals.taxAmount || 0).toFixed(2)}

                </div>

              </div>

              {totals.tcsAmount > 0 && (

                <div style={{

                  backgroundColor: 'white',

                  padding: '15px',

                  borderRadius: '6px',

                  border: '1px solid #dee2e6'

                }}>

                  <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>TCS (2.5%)</div>

                  <div style={{fontSize: '18px', fontWeight: 'bold', color: '#fd7e14'}}>

                    +{quoteData.currency} {(totals.tcsAmount || 0).toFixed(2)}

                  </div>

                </div>

              )}

              {totals.discountAmount > 0 && (

                <div style={{

                  backgroundColor: 'white',

                  padding: '15px',

                  borderRadius: '6px',

                  border: '1px solid #dee2e6'

                }}>

                  <div style={{fontSize: '12px', color: '#6c757d', marginBottom: '5px'}}>Discount</div>

                  <div style={{fontSize: '18px', fontWeight: 'bold', color: '#28a745'}}>

                    -{quoteData.currency} {(totals.discountAmount || 0).toFixed(2)}

                  </div>

                </div>

              )}

              <div style={{

                backgroundColor: '#007bff',

                color: 'white',

                padding: '20px',

                borderRadius: '6px',

                border: 'none',

                textAlign: 'center'

              }}>

                <div style={{fontSize: '14px', marginBottom: '5px'}}>Grand Total</div>

                <div style={{fontSize: '24px', fontWeight: 'bold'}}>

                  {quoteData.currency} {(totals.total || 0).toFixed(2)}

                </div>

              </div>

            </div>

                </React.Fragment>

              );

            })()}

          </div>

          

          <div style={{textAlign: 'center', marginTop: '30px'}}>

            <button

              type="button"

              onClick={onClose}

              style={{

                padding: '12px 24px',

                backgroundColor: '#6c757d',

                color: 'white',

                border: 'none',

                borderRadius: '6px',

                cursor: 'pointer',

                marginRight: '10px',

                fontSize: '16px'

              }}

            >

              Cancel

            </button>

            <button

              type="submit"

              style={{

                padding: '12px 24px',

                backgroundColor: '#007bff',

                color: 'white',

                border: 'none',

                borderRadius: '6px',

                cursor: 'pointer',

                fontSize: '16px'

              }}

            >

              Create Quote

            </button>

          </div>

        </form>

        </div>

      </div>

  

    {/* Temporary Hotel Modal */}

    {showTempHotelForm && (

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

          borderRadius: '10px',

          maxWidth: '600px',

          width: '90%',

          maxHeight: '80vh',

          overflowY: 'auto'

        }}>

          <h3 style={{marginBottom: '20px', color: '#333'}}>Add Temporary Hotel</h3>

          

          <div style={{marginBottom: '15px'}}>

            <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Hotel Name *</label>

            <input

              type="text"

              value={tempHotelData.name}

              onChange={(e) => handleTempHotelChange('name', e.target.value)}

              style={{

                width: '100%',

                padding: '8px',

                border: '1px solid #ddd',

                borderRadius: '4px'

              }}

              placeholder="Enter hotel name"

              required

            />

          </div>

          

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px'}}>

            <div>

              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>City *</label>

              <input

                type="text"

                value={tempHotelData.city}

                onChange={(e) => handleTempHotelChange('city', e.target.value)}

                style={{

                  width: '100%',

                  padding: '8px',

                  border: '1px solid #ddd',

                  borderRadius: '4px'

                }}

                placeholder="Enter city"

                required

              />

            </div>

            

            <div>

              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Country *</label>

              <input

                type="text"

                value={tempHotelData.country}

                onChange={(e) => handleTempHotelChange('country', e.target.value)}

                style={{

                  width: '100%',

                  padding: '8px',

                  border: '1px solid #ddd',

                  borderRadius: '4px'

                }}

                placeholder="Enter country"

                required

              />

            </div>

            

            <div>

              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Star Rating</label>

              <select

                value={tempHotelData.starRating}

                onChange={(e) => handleTempHotelChange('starRating', parseInt(e.target.value))}

                style={{

                  width: '100%',

                  padding: '8px',

                  border: '1px solid #ddd',

                  borderRadius: '4px'

                }}

              >

                <option value={1}>1 Star</option>

                <option value={2}>2 Stars</option>

                <option value={3}>3 Stars</option>

                <option value={4}>4 Stars</option>

                <option value={5}>5 Stars</option>

              </select>

            </div>

          </div>

          

          <div style={{marginBottom: '20px'}}>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>

              <h4 style={{margin: 0, color: '#333'}}>Room Categories</h4>

              <button

                type="button"

                onClick={addRoomCategoryToTempHotel}

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

            

            {tempHotelData.roomCategories.map((room, index) => (

              <div key={index} style={{

                backgroundColor: '#f8f9fa',

                padding: '15px',

                borderRadius: '6px',

                marginBottom: '10px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center'}}>

                  <input

                    type="text"

                    value={room.name}

                    onChange={(e) => updateRoomCategoryInTempHotel(index, 'name', e.target.value)}

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

                    onChange={(e) => updateRoomCategoryInTempHotel(index, 'basePrice', e.target.value)}

                    style={{

                      padding: '6px',

                      border: '1px solid #ddd',

                      borderRadius: '4px'

                    }}

                    placeholder="Price/night"

                    min="0"

                  />

                  

                  <input

                    type="number"

                    value={room.maxOccupancy}

                    onChange={(e) => updateRoomCategoryInTempHotel(index, 'maxOccupancy', parseInt(e.target.value))}

                    style={{

                      padding: '6px',

                      border: '1px solid #ddd',

                      borderRadius: '4px'

                    }}

                    placeholder="Max guests"

                    min="1"

                    max="10"

                  />

                  

                  {tempHotelData.roomCategories.length > 1 && (

                    <button

                      type="button"

                      onClick={() => removeRoomCategoryFromTempHotel(index)}

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

          

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>

            <button

              type="button"

              onClick={() => {

                setShowTempHotelForm(false);

                setTempHotelData({

                  name: '',

                  city: '',

                  country: quoteData.country,

                  starRating: 3,

                  roomCategories: [{

                    name: 'Standard Room',

                    basePrice: '',

                    currency: quoteData.currency,

                    maxOccupancy: 2

                  }]

                });

              }}

              style={{

                padding: '10px 20px',

                backgroundColor: '#6c757d',

                color: 'white',

                border: 'none',

                borderRadius: '4px',

                cursor: 'pointer'

              }}

            >

              Cancel

            </button>

            

            <button

              type="button"

              onClick={addTempHotelToQuote}

              disabled={!tempHotelData.name || !tempHotelData.city}

              style={{

                padding: '10px 20px',

                backgroundColor: tempHotelData.name && tempHotelData.city ? '#007bff' : '#6c757d',

                color: 'white',

                border: 'none',

                borderRadius: '4px',

                cursor: tempHotelData.name && tempHotelData.city ? 'pointer' : 'not-allowed'

              }}

            >

              Add Hotel to Quote

            </button>

          </div>

        </div>

      </div>

    )}

    </React.Fragment>

  );

};



export default QuoteBuilder;

