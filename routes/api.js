// Middleware to triple all prices in the prices API response

const express = require('express');
const axios = require('axios');
const NumberHistory = require('../models/NumberHistory');
const User = require('../models/User');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Get servers from Bazaar Verse API
router.get('/servers', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(process.env.OTPBUDDY_BASE_URL, {
      params: {
        api_key: process.env.OTPBUDDY_API_KEY,
        action: 'getServers'
      }
    });

    res.json({ 
      success: true, 
      data: response.data 
    });

  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch servers' 
    });
  }
});

// Get countries from Bazaar Verse API
router.get('/countries', requireAuth, async (req, res) => {
  try {
    const serverId = req.query.server_id || '1';
    
    const response = await axios.get(process.env.OTPBUDDY_BASE_URL, {
      params: {
        api_key: process.env.OTPBUDDY_API_KEY,
        action: 'getCountries',
        server_id: serverId
      }
    });

    // Handle API error responses
    if (typeof response.data === 'string') {
      return res.status(400).json({ 
        success: false, 
        message: response.data 
      });
    }

    res.json({ 
      success: true, 
      data: response.data 
    });

  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch countries' 
    });
  }
});

// Get services from Bazaar Verse API
router.get('/services', requireAuth, async (req, res) => {
  try {
    const serverId = req.query.server_id || '1';
    const country = req.query.country || '22'; // Default to India
    
    // console.log(`Fetching services for server_id: ${serverId}, country: ${country}`);
    
    const response = await axios.get(process.env.OTPBUDDY_BASE_URL, {
      params: {
        api_key: process.env.OTPBUDDY_API_KEY,
        action: 'getServices',
        server_id: serverId,
        country: country
      }
    });

    // console.log('Services API response:', response.data);

    // Handle API error responses
    if (typeof response.data === 'string') {
      console.log('Services API returned string error:', response.data);
      return res.status(400).json({ 
        success: false, 
        message: response.data 
      });
    }

    res.json({ 
      success: true, 
      data: response.data 
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch services' 
    });
  }
});

// Get prices from Bazaar Verse API
router.get('/prices', requireAuth, async (req, res) => {
  try {
    const serverId = req.query.server_id || '1';
    const country = req.query.country || '22'; // Default to India
    
    const response = await axios.get(process.env.OTPBUDDY_BASE_URL, {
      params: {
        api_key: process.env.OTPBUDDY_API_KEY,
        action: 'getPrices',
        server_id: serverId,
        country: country
      }
    });

    // Handle API error responses
    if (typeof response.data === 'string') {
      return res.status(400).json({ 
        success: false, 
        message: response.data 
      });
    }

    // Send original prices to frontend
    res.json({ 
      success: true, 
      data: response.data 
    });

  } catch (error) {
    console.error('Get prices error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch prices' 
    });
  }
});

// Buy number from Bazaar Verse API
router.post('/buy-number', requireAuth, async (req, res) => {
  try {
    const { service, country, server_id, service_name, country_name, server_name } = req.body;
    const userId = req.session.user.id;

    // Get actual price from API before purchase
    let actualCost = 0;
    try {
      const priceResponse = await axios.get(process.env.OTPBUDDY_BASE_URL, {
        params: {
          api_key: process.env.OTPBUDDY_API_KEY,
          action: 'getPrices',
          server_id: server_id || '1',
          country: country || '22'
        }
      });

      // Extract price for the specific service
      if (priceResponse.data && typeof priceResponse.data === 'object') {
        const countryPrices = priceResponse.data[country || '22'];
        if (countryPrices && countryPrices[service]) {
          const servicePrices = countryPrices[service];
          // Get the first available price
          const firstPrice = Object.keys(servicePrices)[0];
          actualCost = parseFloat(firstPrice) || 1.0;
        } else {
          actualCost = 1.0; // Fallback cost
        }
      } else {
        actualCost = 1.0; // Fallback cost
      }
    } catch (priceError) {
      console.log('Price fetch error, using fallback cost:', priceError.message);
      actualCost = 1.0; // Fallback cost
    }

    // Check user balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.balance < actualCost) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient balance. Required: ₹${actualCost.toFixed(2)}, Available: ₹${user.balance.toFixed(2)}` 
      });
    }

    // Call Bazaar Verse API to get number
    const response = await axios.get(process.env.OTPBUDDY_BASE_URL, {
      params: {
        api_key: process.env.OTPBUDDY_API_KEY,
        action: 'getNumber',
        service: service,
        country: country || '22',
        server_id: server_id || '1'
      }
    });

    // Handle API responses
    let responseStr;
    
    if (typeof response.data === 'string') {
      responseStr = response.data;
    } else if (typeof response.data === 'object' && response.data !== null) {
      responseStr = Object.keys(response.data)[0];
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid response format from API' 
      });
    }

    // Parse the response (ACCESS_NUMBER:activationId:phoneNumber)
    const parts = responseStr.split(':');
    
    if (parts.length !== 3 || parts[0] !== 'ACCESS_NUMBER') {
      return res.status(400).json({ 
        success: false, 
        message: responseStr // Return the actual error message from API
      });
    }

    const activationId = parts[1];
    const phoneNumber = parts[2];

    // Save to database
    const numberHistory = new NumberHistory({
      userId: userId,
      activationId: activationId,
      phoneNumber: phoneNumber,
      service: service,
      serviceName: service_name,
      country: country || '22',
      countryName: country_name,
      serverId: server_id || '1',
      serverName: server_name,
      cost: actualCost,
      status: 'WAITING',
      apiResponse: responseStr
    });

    await numberHistory.save();

    // Deduct balance
    user.balance -= actualCost;
    user.totalSpent += actualCost;
    await user.save();

    // Update session balance
    req.session.user.balance = user.balance;

    res.json({ 
      success: true, 
      message: 'Number purchased successfully',
      data: {
        activationId: activationId,
        phoneNumber: phoneNumber,
        service: service_name,
        country: country_name,
        server: server_name,
        cost: actualCost,
        remainingBalance: user.balance
      }
    });

  } catch (error) {
    console.error('Buy number error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to purchase number' 
    });
  }
});

// Get SMS/OTP status
router.get('/sms-status/:activationId', requireAuth, async (req, res) => {
  try {
    const { activationId } = req.params;
    const userId = req.session.user.id;

    // Find the number in database
    const numberRecord = await NumberHistory.findOne({ 
      activationId: activationId,
      userId: userId 
    });

    if (!numberRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'Number not found' 
      });
    }

    // Call Bazaar Verse API to get status
    const response = await axios.get(process.env.OTPBUDDY_BASE_URL, {
      params: {
        api_key: process.env.OTPBUDDY_API_KEY,
        action: 'getStatus',
        id: activationId
      }
    });

    let status = 'WAITING';
    let otpCode = null;

    // Parse response
    if (typeof response.data === 'string') {
      const responseStr = response.data;
      
      if (responseStr.startsWith('STATUS_OK:')) {
        status = 'RECEIVED';
        otpCode = responseStr.replace('STATUS_OK:', '');
      } else if (responseStr === 'STATUS_CANCEL') {
        status = 'CANCELLED';
      } else if (responseStr === 'STATUS_WAIT_CODE') {
        status = 'WAITING';
      } else {
        status = 'ERROR';
      }
    }

    // Update database
    await numberRecord.updateStatus(status, otpCode);

    res.json({ 
      success: true, 
      data: {
        status: status,
        otpCode: otpCode,
        phoneNumber: numberRecord.phoneNumber,
        service: numberRecord.serviceName,
        lastChecked: new Date()
      }
    });

  } catch (error) {
    console.error('Get SMS status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check SMS status' 
    });
  }
});

// Cancel number
router.post('/cancel-number/:activationId', requireAuth, async (req, res) => {
  try {
    const { activationId } = req.params;
    const userId = req.session.user.id;
    
    console.log(`Cancel request received for activation ID: ${activationId}, user ID: ${userId}`);

    // Find the number in database
    const numberRecord = await NumberHistory.findOne({ 
      activationId: activationId,
      userId: userId 
    });

    console.log('Number record found:', numberRecord ? 'Yes' : 'No');

    if (!numberRecord) {
      console.log('Number record not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Number not found' 
      });
    }

    console.log('Current status:', numberRecord.status);

    if (numberRecord.status !== 'WAITING') {
      console.log('Cannot cancel - status is not WAITING');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel this number' 
      });
    }

    console.log('Calling OTP Buddy API to cancel...');
    // Call OTP Buddy API to cancel - use correct action and status
    const response = await axios.get(process.env.OTPBUDDY_BASE_URL, {
      params: {
        api_key: process.env.OTPBUDDY_API_KEY,
        action: 'setStatus',
        id: activationId,
        status: 8  // Status 8 = Cancel activation
      }
    });

    console.log('OTP Buddy API response:', response.data);
    
    // Check if cancellation was successful
    if (typeof response.data === 'string' && response.data.includes('ACCESS_CANCEL')) {
      console.log('Successfully cancelled on OTP Buddy side');
    } else if (typeof response.data === 'string' && response.data.includes('ERROR')) {
      console.log('OTP Buddy API returned error:', response.data);
      // Continue with local cancellation even if API call fails
    } else {
      console.log('Unexpected response from OTP Buddy API:', response.data);
    }

    // Update database and refund user
    await numberRecord.updateStatus('CANCELLED');
    console.log('Database updated to CANCELLED');
    
    // Refund the user
    const user = await User.findById(userId);
    if (user) {
      const oldBalance = user.balance;
      user.balance += numberRecord.cost;
      user.totalSpent -= numberRecord.cost;
      await user.save();
      req.session.user.balance = user.balance;
      console.log(`Refunded ₹${numberRecord.cost}. Balance: ${oldBalance} -> ${user.balance}`);
    }

    const responseData = {
      activationId: activationId,
      status: 'CANCELLED',
      refundAmount: numberRecord.cost,
      newBalance: user.balance
    };

    console.log('Sending success response:', responseData);

    res.json({ 
      success: true, 
      message: 'Number cancelled successfully and amount refunded',
      data: responseData
    });

  } catch (error) {
    console.error('Cancel number error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel number' 
    });
  }
});

// Get active numbers for current user
router.get('/active-numbers', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get all WAITING numbers for the user from last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const activeNumbers = await NumberHistory.find({
      userId: userId,
      status: 'WAITING',
      createdAt: { $gte: fifteenMinutesAgo }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: activeNumbers
    });

  } catch (error) {
    console.error('Get active numbers error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch active numbers'
        });
      }
    });
// Auto-cancel expired numbers (called by cron job or manually)
router.post('/auto-cancel-expired', requireAuth, async (req, res) => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    // Find all WAITING numbers older than 10 minutes
    const expiredNumbers = await NumberHistory.find({
      status: 'WAITING',
      createdAt: { $lt: tenMinutesAgo }
    });

    let processedCount = 0;
    
    for (const numberRecord of expiredNumbers) {
      try {
        // Cancel in OTP Buddy API with correct status
        await axios.get(process.env.OTPBUDDY_BASE_URL, {
          params: {
            api_key: process.env.OTPBUDDY_API_KEY,
            action: 'setStatus',
            id: numberRecord.activationId,
            status: 8  // Status 8 = Cancel activation
          }
        });

        console.log(`Auto-cancelled number ${numberRecord.activationId} on OTP Buddy side`);

        // Update status to AUTO_CANCELLED (won't show in history)
        numberRecord.status = 'AUTO_CANCELLED';
        numberRecord.otpCode = null;
        numberRecord.updatedAt = new Date();
        await numberRecord.save();

        // Refund the user
        const user = await User.findById(numberRecord.userId);
        if (user) {
          user.balance += numberRecord.cost;
          user.totalSpent -= numberRecord.cost;
          await user.save();
        }

        processedCount++;
      } catch (error) {
        console.error(`Error auto-cancelling ${numberRecord.activationId}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Auto-cancelled ${processedCount} expired numbers`,
      data: { processedCount }
    });

  } catch (error) {
    console.error('Auto-cancel expired error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-cancel expired numbers'
    });
  }
});

module.exports = router;
