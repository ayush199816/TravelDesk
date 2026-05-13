const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierAssignment = require('../models/SupplierAssignment');
const Quote = require('../models/Quote');
const auth = require('../middleware/auth');

// Get supplier details with activities and payments
router.get('/:id/details', auth, async (req, res) => {
  try {
    const supplierId = req.params.id;
    const organizationId = req.user.organization;

    // Get supplier details
    const supplier = await Supplier.findOne({ 
      _id: supplierId, 
      organization: organizationId 
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    console.log(`🔍 Looking for assignments for supplier: ${supplier.name} (${supplierId})`);

    // Get all supplier assignments for this supplier
    const assignments = await SupplierAssignment.find({ 
      supplier: supplierId,
      organization: organizationId 
    })
    .populate('quote', 'quoteNumber country adultPax childPax createdAt')
    .populate('lead', 'leadNumber name')
    .sort({ createdAt: -1 });

    console.log(`📊 Found ${assignments.length} assignments for supplier ${supplier.name}`);
    
    // Debug: Show raw assignment data
    assignments.forEach((assignment, index) => {
      console.log(`🔍 RAW ASSIGNMENT ${index + 1}:`, {
        id: assignment._id,
        activityName: assignment.activityName,
        paymentStatus: assignment.paymentStatus,
        amount: assignment.amount,
        agreedPrice: assignment.agreedPrice,
        totalPaidAmount: assignment.totalPaidAmount,
        remainingAmount: assignment.remainingAmount
      });
    });

    // Convert assignments to activities and payments
    const activities = [];
    const payments = [];

    // Process assignments with proper async handling
    const processedAssignments = await Promise.all(assignments.map(async (assignment, index) => {
      console.log(`Processing assignment ${index + 1}: ${assignment.activityType} - ${assignment.activityName || 'N/A'}`);
      console.log(`🔢 Original assignment amount: ₹${assignment.amount || 0}`);
      
      let calculatedAmount = assignment.amount || 0;
      let nightsInfo = '';
      
      // Always try to get better details from quote data, even if amount exists
      try {
        const quote = await Quote.findById(assignment.quote);
        console.log(`📋 Found quote: ${quote?.quoteNumber}`);
        
        if (quote && assignment.activityType === 'hotel') {
          // Find the hotel room in the quote that matches this assignment
          if (quote.hotels) {
            for (const hotel of quote.hotels) {
              console.log(`🏨 Checking hotel: ${hotel.name}`);
              if (hotel.rooms) {
                for (const room of hotel.rooms) {
                  const roomAmount = (room.adultRate * room.numberOfRooms * (room.nights || 1)) || 0;
                  console.log(`🛏️ Room: ${room.roomName}, Rate: ₹${room.adultRate}, Rooms: ${room.numberOfRooms}, Nights: ${room.nights || 1}, Total: ₹${roomAmount}`);
                  
                  // Use calculated amount if original is 0 or if we find a better calculation
                  if (!assignment.amount || assignment.amount === 0 || roomAmount > calculatedAmount) {
                    calculatedAmount = roomAmount;
                    nightsInfo = room.nights ? `${room.nights} nights` : '1 night';
                    console.log(`💰 Updated amount: ₹${calculatedAmount} (${room.numberOfRooms} room(s) × ₹${room.adultRate} × ${room.nights || 1} nights)`);
                  }
                }
              }
            }
          }
        } else if (quote && assignment.activityType === 'sightseeing') {
          // Use the assignedItems from the assignment which already has the correct amounts
          if (assignment.assignedItems && assignment.assignedItems.length > 0) {
            let totalSightseeingAmount = 0;
            
            for (const item of assignment.assignedItems) {
              console.log(`🏛️ Checking assigned sightseeing item: ${item.name}`);
              console.log(`� Item amount: ₹${item.price || 0}`);
              
              totalSightseeingAmount += item.price || 0;
            }
            
            // Use the summed amount from assignedItems
            if (!assignment.amount || assignment.amount === 0 || totalSightseeingAmount > calculatedAmount) {
              calculatedAmount = totalSightseeingAmount;
              console.log(`💰 Updated total sightseeing amount: ₹${calculatedAmount} (${assignment.assignedItems.length} items from assignedItems)`);
            }
          } else {
            console.log(`⚠️ No assignedItems found for sightseeing assignment`);
          }
        }
      } catch (error) {
        console.log('Error fetching quote data:', error.message);
      }
      
      const activity = {
        name: assignment.activityName || `${assignment.activityType} - ${assignment.quote?.quoteNumber}`,
        type: assignment.activityType,
        quoteNumber: assignment.quote?.quoteNumber || 'N/A',
        date: assignment.date || assignment.createdAt,
        amount: calculatedAmount,
        paymentStatus: assignment.paymentStatus || 'pending',
        details: assignment.details || `Day ${assignment.dayNumber || 'N/A'}${nightsInfo ? ` • ${nightsInfo}` : ''}`,
        activityId: assignment._id,
        quoteId: assignment.quote?._id,
        leadId: assignment.lead?._id,
        leadNumber: assignment.lead?.leadNumber,
        leadName: assignment.lead?.name,
        dayNumber: assignment.dayNumber
      };

      const payment = {
        activityName: assignment.activityName || activity.name,
        activityType: assignment.activityType,
        quoteNumber: assignment.quote?.quoteNumber || 'N/A',
        amount: calculatedAmount,
        status: assignment.paymentStatus || 'pending',
        dueDate: assignment.dueDate || assignment.date || assignment.createdAt,
        paidDate: assignment.paidDate,
        utrNumber: assignment.utrNumber,
        paymentId: assignment._id,
        activityId: assignment._id,
        quoteId: assignment.quote?._id,
        leadNumber: assignment.lead?.leadNumber,
        leadName: assignment.lead?.name
      };

      return { activity, payment };
    }));

    // Add processed assignments to arrays
    processedAssignments.forEach(({ activity, payment }) => {
      activities.push(activity);
      payments.push(payment);
    });

    console.log(`📊 SUMMARY: Found ${activities.length} activities and ${payments.length} payments for supplier ${supplier.name}`);

    // Sort activities by date (most recent first)
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Sort payments by due date
    payments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Calculate statistics
    const totalActivities = activities.length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const paidPayments = payments.filter(p => p.status === 'paid').length;
    const totalAmount = activities.reduce((sum, activity) => sum + (activity.amount || 0), 0);
    const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidAmount = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

    console.log('📈 STATS DEBUG:');
    console.log(`- Activities: ${activities.length}`, activities.map(a => ({ name: a.name, amount: a.amount, paymentStatus: a.paymentStatus })));
    console.log(`- Payments: ${payments.length}`, payments.map(p => ({ name: p.activityName, amount: p.amount, status: p.status })));
    console.log(`- Total Activities: ${totalActivities}`);
    console.log(`- Pending Payments: ${pendingPayments}`);
    console.log(`- Paid Payments: ${paidPayments}`);
    console.log(`- Total Amount: ₹${totalAmount}`);
    console.log(`- Pending Amount: ₹${pendingAmount}`);
    console.log(`- Paid Amount: ₹${paidAmount}`);

    const response = {
      ...supplier.toObject(),
      activities,
      payments,
      stats: {
        totalActivities,
        pendingPayments,
        paidPayments,
        totalAmount,
        pendingAmount,
        paidAmount
      },
      recentActivities: activities.slice(0, 10) // Last 10 activities
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching supplier details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Temporary debug endpoint to check assignments
router.get('/:id/debug', auth, async (req, res) => {
  try {
    const supplierId = req.params.id;
    const organizationId = req.user.organization;
    
    console.log(`🔍 DEBUG: Checking assignments for supplier ${supplierId} in org ${organizationId}`);
    
    const assignments = await SupplierAssignment.find({ 
      supplier: supplierId,
      organization: organizationId 
    })
    .populate('quote', 'quoteNumber')
    .populate('lead', 'leadNumber name')
    .populate('supplier', 'name type');
    
    console.log(`📊 DEBUG: Found ${assignments.length} assignments`);
    assignments.forEach((assignment, index) => {
      console.log(`Assignment ${index + 1}:`, {
        activityType: assignment.activityType,
        activityName: assignment.activityName,
        quoteNumber: assignment.quote?.quoteNumber,
        amount: assignment.amount,
        paymentStatus: assignment.paymentStatus,
        supplierName: assignment.supplier?.name
      });
    });
    
    res.json({
      supplierId,
      organizationId,
      assignmentsFound: assignments.length,
      assignments: assignments
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
