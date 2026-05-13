import axios from 'axios';

class CurrencyService {
  constructor() {
    this.cache = {
      rates: null,
      timestamp: null,
      ttl: 3600000 // 1 hour cache
    };
    
    // Fallback rates if API fails
    this.fallbackRates = {
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
    };
  }

  async getRealTimeRates() {
    try {
      // Check cache first
      if (this.cache.rates && this.cache.timestamp && 
          (Date.now() - this.cache.timestamp) < this.cache.ttl) {
        console.log('📊 Using cached currency rates');
        return this.cache.rates;
      }

      console.log('📊 Fetching real-time currency rates from backend...');
      
      // Use backend API for consistency
      const response = await axios.get('/api/quotes/exchange-rates', {
        timeout: 5000
      });

      if (response.data && response.data.success && response.data.rates) {
        // Update cache
        this.cache.rates = response.data.rates;
        this.cache.timestamp = Date.now();

        console.log('📊 Real-time rates fetched successfully from backend:', {
          'USD': 1,
          'EUR': response.data.rates.EUR,
          'GBP': response.data.rates.GBP,
          'INR': response.data.rates.INR,
          'THB': response.data.rates.THB,
          'MYR': response.data.rates.MYR,
          'IDR': response.data.rates.IDR,
          'SGD': response.data.rates.SGD,
          'AED': response.data.rates.AED
        });

        return response.data.rates;
      } else if (response.data && response.data.fallbackRates) {
        // Use fallback rates from backend if available
        console.log('📊 Using fallback rates from backend');
        this.cache.rates = response.data.fallbackRates;
        this.cache.timestamp = Date.now();
        return response.data.fallbackRates;
      }
    } catch (error) {
      console.error('❌ Error fetching real-time rates from backend:', error.message);
      console.log('📊 Using local fallback rates');
    }

    // Return fallback rates if API fails
    return this.fallbackRates;
  }

  async getExchangeRate(currency) {
    const rates = await this.getRealTimeRates();
    return rates[currency] || 1;
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (!amount || fromCurrency === toCurrency) return amount;
    
    const rates = await this.getRealTimeRates();
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;
    
    return Math.round(convertedAmount * 100) / 100;
  }

  // Clear cache (for testing or manual refresh)
  clearCache() {
    this.cache.rates = null;
    this.cache.timestamp = null;
  }
}

export default new CurrencyService();
