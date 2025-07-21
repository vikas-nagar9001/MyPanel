require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function initializeDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      username: process.env.ADMIN_USERNAME || 'admin',
      role: 'admin' 
    });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      process.exit(0);
    }

    // Create default admin user
    const adminUser = new User({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      email: 'admin@bazaarverse.com',
      role: 'admin',
      isActive: true,
      balance: 0,
      totalSpent: 0
    });

    await adminUser.save();
    console.log('✅ Default admin user created successfully');
    console.log(`Username: ${adminUser.username}`);
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('⚠️  Please change the default password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
