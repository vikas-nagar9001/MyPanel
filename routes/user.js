const express = require('express');
const path = require('path');
const NumberHistory = require('../models/NumberHistory');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'user') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// User dashboard page
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'user', 'dashboard.html'));
});

// Buy number page
router.get('/buy-number', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'user', 'buy-number.html'));
});

// Number history page
router.get('/history', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'user', 'history.html'));
});

// Get user dashboard data
router.get('/api/dashboard-data', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get recent number history (exclude auto-cancelled)
    const recentNumbers = await NumberHistory.find({ 
      userId,
      status: { $ne: 'AUTO_CANCELLED' }
    })
      .sort({ purchasedAt: -1 })
      .limit(5)
      .lean();

    // Get statistics (exclude auto-cancelled)
    const totalNumbers = await NumberHistory.countDocuments({ 
      userId,
      status: { $ne: 'AUTO_CANCELLED' }
    });
    const successfulNumbers = await NumberHistory.countDocuments({ 
      userId, 
      status: 'RECEIVED'
    });
    const pendingNumbers = await NumberHistory.countDocuments({ 
      userId, 
      status: 'WAITING' 
    });

    res.json({
      success: true,
      data: {
        user: {
          username: user.username,
          balance: user.balance,
          totalSpent: user.totalSpent
        },
        stats: {
          totalNumbers,
          successfulNumbers,
          pendingNumbers,
          successRate: totalNumbers > 0 ? ((successfulNumbers / totalNumbers) * 100).toFixed(1) : 0
        },
        recentNumbers
      }
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get number history with pagination
router.get('/api/history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Exclude AUTO_CANCELLED from history
    const filter = { 
      userId,
      status: { $ne: 'AUTO_CANCELLED' }
    };
    
    // Add status filter if provided
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status.toUpperCase();
    }

    // Get total count
    const total = await NumberHistory.countDocuments(filter);

    // Get history with pagination
    const history = await NumberHistory.find(filter)
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
