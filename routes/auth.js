const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated. Please contact admin.' 
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Create session
    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      balance: user.balance
    };

    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        username: user.username,
        role: user.role,
        balance: user.balance
      },
      redirectUrl: user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Could not log out' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// Check authentication status
router.get('/check', (req, res) => {
  if (req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ 
      authenticated: false 
    });
  }
});

module.exports = router;
