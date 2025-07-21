const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const NumberHistory = require('../models/NumberHistory');
const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(401).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Admin dashboard page
router.get('/dashboard', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'dashboard.html'));
});

// User management page
router.get('/users', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'users.html'));
});

// Get admin dashboard data
router.get('/api/dashboard-data', requireAdmin, async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const inactiveUsers = totalUsers - activeUsers;

    // Get number statistics
    const totalNumbers = await NumberHistory.countDocuments();
    const successfulNumbers = await NumberHistory.countDocuments({ status: 'RECEIVED' });
    const pendingNumbers = await NumberHistory.countDocuments({ status: 'WAITING' });
    const cancelledNumbers = await NumberHistory.countDocuments({ status: 'CANCELLED' });

    // Get revenue data
    const revenueData = await NumberHistory.aggregate([
      { $match: { status: 'RECEIVED' } },
      { $group: { _id: null, totalRevenue: { $sum: '$cost' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // Get recent activity
    const recentActivity = await NumberHistory.find()
      .populate('userId', 'username')
      .sort({ purchasedAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        userStats: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers
        },
        numberStats: {
          total: totalNumbers,
          successful: successfulNumbers,
          pending: pendingNumbers,
          cancelled: cancelledNumbers,
          successRate: totalNumbers > 0 ? ((successfulNumbers / totalNumbers) * 100).toFixed(1) : 0
        },
        revenue: {
          total: totalRevenue
        },
        recentActivity
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all users
router.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { role: 'user' };
    
    // Add search filter if provided
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Add status filter if provided
    if (req.query.status && req.query.status !== 'all') {
      filter.isActive = req.query.status === 'active';
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new user
router.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, email, apiKey, balance } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate username length
    if (username.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be at least 3 characters long' 
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    const newUser = new User({
      username: username.toLowerCase(),
      password,
      email: email || '',
      apiKey: apiKey || '',
      balance: parseFloat(balance) || 0,
      role: 'user'
    });

    await newUser.save();

    res.json({ 
      success: true, 
      message: 'User created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        balance: newUser.balance,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed: ' + validationErrors.join(', ')
      });
    }
    
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update user
router.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { username, email, apiKey, balance, isActive } = req.body;
    
    const updateData = {
      username: username.toLowerCase(),
      email: email || '',
      apiKey: apiKey || '',
      balance: parseFloat(balance) || 0,
      isActive: isActive !== undefined ? isActive : true
    };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete user
router.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Also delete user's number history
    await NumberHistory.deleteMany({ userId: req.params.id });

    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
