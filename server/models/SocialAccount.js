const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit', 'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk']
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  platformUserId: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  followers: {
    type: Number,
    default: 0
  },
  isConnected: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  connectedAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  versionKey: false,
  timestamps: true
});

// Compound index to ensure one account per platform per user
socialAccountSchema.index({ userId: 1, platform: 1, platformUserId: 1 }, { unique: true });

// Transform output to match frontend expectations
socialAccountSchema.set('toJSON', {
  transform: (doc, ret) => {
    // Remove sensitive data from API responses
    delete ret.accessToken;
    delete ret.refreshToken;
    return ret;
  }
});

const SocialAccount = mongoose.model('SocialAccount', socialAccountSchema);

module.exports = SocialAccount;