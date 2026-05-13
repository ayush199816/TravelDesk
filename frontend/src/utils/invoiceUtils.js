import axios from 'axios';

// Download invoice PDF
export const downloadInvoicePDF = async (invoiceId, invoiceNumber) => {
  try {
    const response = await axios.get(`/api/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      responseType: 'blob'
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

// Format currency
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Calculate payment cycle amounts
export const calculatePaymentCycles = (totalAmount, firstCycleAmount, totalCycles) => {
  const remainingAmount = totalAmount - firstCycleAmount;
  const cycleAmount = Math.round(remainingAmount / (totalCycles - 1));
  
  const cycles = [];
  for (let i = 1; i <= totalCycles; i++) {
    cycles.push({
      cycleNumber: i,
      amount: i === 1 ? firstCycleAmount : cycleAmount
    });
  }
  
  return {
    cycles,
    remainingAmount,
    cycleAmount,
    totalAmount: firstCycleAmount + (cycleAmount * (totalCycles - 1))
  };
};

// Get status badge variant
export const getStatusVariant = (status) => {
  const variants = {
    draft: 'secondary',
    sent: 'primary',
    partially_paid: 'warning',
    fully_paid: 'success',
    overdue: 'danger',
    cancelled: 'dark'
  };
  return variants[status] || 'secondary';
};

// Check if payment cycle is overdue
export const isOverdue = (dueDate, status) => {
  return status === 'pending' && new Date(dueDate) < new Date();
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Calculate payment progress percentage
export const calculatePaymentProgress = (paymentCycles) => {
  if (!paymentCycles || paymentCycles.length === 0) return 0;
  
  const paidCycles = paymentCycles.filter(cycle => cycle.status === 'paid').length;
  return Math.round((paidCycles / paymentCycles.length) * 100);
};
