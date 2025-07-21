# Bazaar Verse OTP Dashboard

A comprehensive web dashboard for managing OTP Buddy virtual numbers with user and admin panels.

## Features

### User Panel
- **Dashboard**: View balance, statistics, and recent activity
- **Buy Numbers**: Purchase virtual numbers from different countries and services
- **Number History**: Track all purchased numbers and their OTP status
- **Real-time SMS checking**: Automatic OTP retrieval and status updates

### Admin Panel
- **Admin Dashboard**: Monitor system statistics and revenue
- **User Management**: Create, edit, and manage user accounts
- **Real-time Analytics**: Track user activity and system performance

## Prerequisites

- Node.js 16+ and npm
- MongoDB database (local or cloud)
- OTP Buddy API key

## Installation

1. **Clone or download the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Update the `.env` file with your settings:
   ```env
   # MongoDB Configuration
   MONGO_URI=your_mongodb_connection_string

   # OTP Buddy API Configuration
   OTPBUDDY_API_KEY=your_otpbuddy_api_key

   # Admin Credentials (change these!)
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password
   
   # Session Secret (change this!)
   SESSION_SECRET=your_random_secret_key
   ```

4. **Initialize the database:**
   ```bash
   node init-db.js
   ```

5. **Start the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the dashboard:**
   - Open your browser to `http://localhost:3000`
   - Login with admin credentials to access admin panel
   - Create user accounts through admin panel

## API Endpoints

### Authentication
- `POST /auth/login` - User/Admin login
- `POST /auth/logout` - Logout
- `GET /auth/check` - Check authentication status

### User API
- `GET /user/api/dashboard-data` - Get user dashboard data
- `GET /user/api/history` - Get number history with pagination

### Admin API
- `GET /admin/api/dashboard-data` - Get admin dashboard data
- `GET /admin/api/users` - Get users list with filters
- `POST /admin/api/users` - Create new user
- `PUT /admin/api/users/:id` - Update user
- `DELETE /admin/api/users/:id` - Delete user

### OTP Buddy Integration
- `GET /api/servers` - Get available servers
- `GET /api/countries` - Get countries for server
- `GET /api/services` - Get services for country
- `POST /api/buy-number` - Purchase virtual number
- `GET /api/sms-status/:id` - Check SMS/OTP status
- `POST /api/cancel-number/:id` - Cancel number

## Database Models

### User Schema
```javascript
{
  username: String (unique),
  password: String (hashed),
  email: String,
  role: 'user' | 'admin',
  isActive: Boolean,
  apiKey: String,
  balance: Number,
  totalSpent: Number,
  createdAt: Date,
  lastLogin: Date
}
```

### NumberHistory Schema
```javascript
{
  userId: ObjectId (ref: User),
  activationId: String (unique),
  phoneNumber: String,
  service: String,
  serviceName: String,
  country: String,
  countryName: String,
  serverId: String,
  serverName: String,
  status: 'WAITING' | 'RECEIVED' | 'CANCELLED' | 'ERROR',
  otpCode: String,
  cost: Number,
  purchasedAt: Date,
  completedAt: Date,
  lastChecked: Date
}
```

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Rate limiting
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Role-based access control

## File Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── init-db.js            # Database initialization
├── models/               # Database models
│   ├── User.js
│   └── NumberHistory.js
├── routes/               # API routes
│   ├── auth.js
│   ├── user.js
│   ├── admin.js
│   └── api.js
└── views/                # HTML templates
    ├── login.html
    ├── user/
    │   ├── dashboard.html
    │   ├── buy-number.html
    │   └── history.html
    └── admin/
        ├── dashboard.html
        └── users.html
```

## Usage Guide

### For Users
1. **Login**: Use credentials provided by admin
2. **Check Balance**: View current balance on dashboard
3. **Buy Numbers**: 
   - Select server, country, and service
   - Set cost and purchase
   - Number will appear in history
4. **Monitor OTP**: 
   - Check history page for OTP codes
   - Use refresh button to check SMS status
   - Cancel numbers if needed

### For Admins
1. **Monitor System**: View dashboard for system statistics
2. **Manage Users**:
   - Create new user accounts
   - Set initial balance
   - Activate/deactivate accounts
   - Edit user details
3. **Track Revenue**: Monitor successful transactions

## Customization

### Styling
- Bootstrap 5 is used for UI components
- Custom CSS can be added to HTML files
- Logo can be replaced in the root directory

### API Integration
- Update OTP Buddy API endpoints in `/routes/api.js`
- Modify cost calculation logic as needed
- Add new service providers by extending the API routes

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**:
   - Check MONGO_URI in .env file
   - Ensure MongoDB is running
   - Verify network connectivity

2. **OTP Buddy API Errors**:
   - Verify API key is correct
   - Check API endpoints are accessible
   - Monitor API rate limits

3. **Login Issues**:
   - Run `node init-db.js` to create admin user
   - Check username/password combination
   - Verify user account is active

### Logs
- Server logs are displayed in console
- MongoDB connection status is logged
- API errors are logged with details

## Support

For support and customization requests, please refer to the documentation or contact the development team.

## License

This project is licensed for use with Bazaar Verse OTP services.
