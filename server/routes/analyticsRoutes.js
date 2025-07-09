const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const PostTrackingService = require('../services/postTrackingService.js');

const router = express.Router();

// Get dashboard analytics data
router.get('/dashboard', requireUser, async (req, res) => {
  try {
    console.log(`📊 Fetching dashboard analytics for user: ${req.user._id}`);

    // Fetch all analytics data in parallel
    const [
      postsStats,
      engagementData,
      platformDistribution
    ] = await Promise.all([
      PostTrackingService.getPostsStats(req.user._id),
      PostTrackingService.getEngagementData(req.user._id),
      PostTrackingService.getPlatformDistribution(req.user._id)
    ]);

    console.log(`✅ Analytics data fetched successfully`);

    res.json({
      success: true,
      data: {
        postsStats: postsStats,
        engagementData: engagementData,
        platformDistribution: platformDistribution
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analytics data'
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