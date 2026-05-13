const axios = require('axios');

async function testCurrencyAPI() {
  try {
    console.log('Testing ExchangeRate-API...');
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
      timeout: 5000
    });
    
    console.log('✅ API Response successful');
    console.log('Sample rates:', {
      'EUR': response.data.rates.EUR,
      'GBP': response.data.rates.GBP,
      'INR': response.data.rates.INR,
      'THB': response.data.rates.THB,
      'SGD': response.data.rates.SGD
    });
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout - API might be slow or unreachable');
    }
  }
}

testCurrencyAPI();
