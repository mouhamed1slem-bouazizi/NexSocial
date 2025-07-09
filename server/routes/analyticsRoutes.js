const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const PostTrackingService = require('../services/postTrackingService.js');

const router = express.Router();

// Add debugging middleware to catch all analytics requests
router.use((req, res, next) => {
  console.log(`🔍 Analytics route hit: ${req.method} ${req.path}`);
  console.log(`🔍 Full URL: ${req.originalUrl}`);
  console.log(`🔍 Headers: ${JSON.stringify(req.headers.authorization ? 'AUTH_PRESENT' : 'NO_AUTH')}`);
  next();
});

// Simple test route to verify analytics routes are working
router.get('/test', (req, res) => {
  console.log('🧪 Analytics test route hit!');
  console.log('🧪 Environment:', process.env.NODE_ENV);
  console.log('🧪 Request path:', req.path);
  console.log('🧪 Request original URL:', req.originalUrl);
  res.json({
    success: true,
    message: 'Analytics routes are working!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    route: req.originalUrl
  });
});

// Get dashboard analytics data
router.get('/dashboard', requireUser, async (req, res) => {
  try {
    console.log(`📊 Dashboard route HIT! Fetching analytics for user: ${req.user._id}`);
    console.log(`📊 User object:`, req.user);

    // Check if PostTrackingService is available
    if (!PostTrackingService) {
      console.error('❌ PostTrackingService not available');
      return res.status(500).json({
        success: false,
        error: 'PostTrackingService not available'
      });
    }

    console.log('📊 Starting to fetch analytics data...');

    // Fetch all analytics data in parallel with individual error handling
    let postsStats = null;
    let engagementData = null;
    let platformDistribution = null;

    try {
      console.log('📊 Fetching posts stats...');
      postsStats = await PostTrackingService.getPostsStats(req.user._id);
      console.log('✅ Posts stats:', postsStats);
    } catch (error) {
      console.error('❌ Error fetching posts stats:', error.message);
      postsStats = { currentMonth: 0, lastMonth: 0, difference: 0, posts: [] };
    }

    try {
      console.log('📊 Fetching engagement data...');
      engagementData = await PostTrackingService.getEngagementData(req.user._id);
      console.log('✅ Engagement data:', engagementData);
    } catch (error) {
      console.error('❌ Error fetching engagement data:', error.message);
      engagementData = [];
    }

    try {
      console.log('📊 Fetching platform distribution...');
      platformDistribution = await PostTrackingService.getPlatformDistribution(req.user._id);
      console.log('✅ Platform distribution:', platformDistribution);
    } catch (error) {
      console.error('❌ Error fetching platform distribution:', error.message);
      platformDistribution = [];
    }

    console.log(`✅ Analytics data fetched successfully`);
    console.log(`📊 Final response data:`, {
      postsStats,
      engagementData,
      platformDistribution
    });

    const responseData = {
      success: true,
      data: {
        postsStats: postsStats,
        engagementData: engagementData,
        platformDistribution: platformDistribution
      }
    };

    console.log('📤 Sending analytics response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error('❌ Error fetching dashboard analytics:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analytics data',
      details: error.stack
    });
  }
});

// Get posts statistics only
router.get('/posts-stats', requireUser, async (req, res) => {
  try {
    console.log(`📊 Fetching posts stats for user: ${req.user._id}`);

    const postsStats = await PostTrackingService.getPostsStats(req.user._id);

    res.json({
      success: true,
      data: postsStats
    });

  } catch (error) {
    console.error('❌ Error fetching posts stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch posts statistics'
    });
  }
});

// Get engagement data only
router.get('/engagement', requireUser, async (req, res) => {
  try {
    console.log(`📊 Fetching engagement data for user: ${req.user._id}`);

    const engagementData = await PostTrackingService.getEngagementData(req.user._id);

    res.json({
      success: true,
      data: engagementData
    });

  } catch (error) {
    console.error('❌ Error fetching engagement data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch engagement data'
    });
  }
});

// Get platform distribution only
router.get('/platform-distribution', requireUser, async (req, res) => {
  try {
    console.log(`📊 Fetching platform distribution for user: ${req.user._id}`);

    const platformDistribution = await PostTrackingService.getPlatformDistribution(req.user._id);

    res.json({
      success: true,
      data: platformDistribution
    });

  } catch (error) {
    console.error('❌ Error fetching platform distribution:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch platform distribution'
    });
  }
});

module.exports = router; 