const mongoose = require('mongoose');

const numberHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activationId: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  serviceName: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  countryName: {
    type: String,
    required: true
  },
  serverId: {
    type: String,
    required: true
  },
  serverName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['WAITING', 'RECEIVED', 'CANCELLED', 'ERROR', 'AUTO_CANCELLED'],
    default: 'WAITING'
  },
  otpCode: {
    type: String,
    default: null
  },
  cost: {
    type: Number,
    required: true,
    default: 0
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  apiResponse: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
numberHistorySchema.index({ userId: 1, purchasedAt: -1 });
numberHistorySchema.index({ activationId: 1 });
numberHistorySchema.index({ status: 1 });

// Method to update status
numberHistorySchema.methods.updateStatus = function(newStatus, otpCode = null) {
  this.status = newStatus;
  this.lastChecked = new Date();
  
  if (otpCode) {
    this.otpCode = otpCode;
    this.completedAt = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('NumberHistory', numberHistorySchema);
