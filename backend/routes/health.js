const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Simple wake-up endpoint (lightweight, no database calls)
router.get('/wake-up', (req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  
  console.log(`Server wake-up ping received at: ${timestamp}`);
  
  res.status(200).json({
    status: 'awake',
    timestamp,
    uptime: `${Math.floor(uptime)}s`,
    message: 'Server is awake and ready'
  });
});

// Health check endpoint for cron jobs
router.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

    // Check if server is responsive
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();

    res.status(200).json({
      status: 'healthy',
      timestamp,
      uptime: `${Math.floor(uptime)}s`,
      database: dbStatus,
      message: 'Server is running and ready for cron jobs'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Cron job trigger endpoint
router.post('/cron-trigger', async (req, res) => {
  try {
    const { runReminders } = require('../services/reminderService');
    
    console.log('Cron job triggered via external service:', new Date().toISOString());
    
    // Run reminder checks
    await runReminders();
    
    res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      message: 'Cron job executed successfully'
    });
  } catch (error) {
    console.error('Cron job execution error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
