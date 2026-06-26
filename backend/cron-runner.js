#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'https://traveldesk-yxkp.onrender.com/api/health/cron-trigger';

const runCronJob = async () => {
  try {
    console.log(`Running cron job at: ${new Date().toISOString()}`);
    
    const response = await axios.post(BACKEND_URL, {}, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Cron job success:', response.data);
  } catch (error) {
    console.error('Cron job failed:', error.message);
    
    // Retry logic
    if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
      console.log('Retrying in 30 seconds...');
      setTimeout(runCronJob, 30000);
    }
  }
};

// Run immediately when called
runCronJob();
