const express = require('express');
const currencyService = require('./services/currencyService');

async function testCurrencyService() {
  try {
    console.log('Testing backend currency service...');
    const rates = await currencyService.getRealTimeRates();
    console.log('✅ Currency service response:', rates);
    
    // Check if we're getting real rates or fallback
    if (rates.INR === 83.5) {
      console.log('❌ Using fallback rates - API might be failing');
    } else if (rates.INR === 95.67) {
      console.log('✅ Using real-time rates');
    } else {
      console.log('🤔 Unknown rates - INR:', rates.INR);
    }
  } catch (error) {
    console.error('❌ Error testing currency service:', error);
  }
}

testCurrencyService();
