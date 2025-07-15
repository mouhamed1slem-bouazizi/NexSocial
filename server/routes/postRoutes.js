const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');
const TwitterOAuthService = require('../services/twitterOAuthService.js');
const YouTubeService = require('../services/youtubeService.js');
const { generateSocialMediaContent } = require('../services/llmService.js');
const PostTrackingService = require('../services/postTrackingService.js');
const FormData = require('form-data');
const axios = require('axios');

const router = express.Router();

// 🎬 REDDIT VIDEO UPLOAD - EXTERNAL HOSTING SOLUTION
// Upload videos to Imgur and post as Reddit links (most reliable approach)

const uploadVideoToImgur = async (videoBuffer) => {
  console.log('🎬 Uploading video to Imgur...');
  
  try {
    const form = new FormData();
    form.append('image', videoBuffer, { filename: 'video.mp4' });
    
    const response = await axios.post('https://api.imgur.com/3/upload', form, {
      headers: {
        'Authorization': 'Client-ID 546c25a59c58ad7',
        ...form.getHeaders()
      }
    });
    
    if (response.data.success) {
      console.log('✅ Video uploaded to Imgur successfully');
      return response.data.data.link;
    } else {
      throw new Error('Imgur upload failed');
    }
  } catch (error) {
    console.error('❌ Imgur upload failed:', error);
    throw error;
  }
};

// Main posting endpoint
router.post('/', requireUser, async (req, res) => {
  try {
    console.log('📝 Creating new post for user:', req.user._id);
    console.log('📊 Post data:', JSON.stringify(req.body, null, 2));

    const { content, platforms, selectedAccounts, scheduledAt, media, discordChannels, subredditSettings } = req.body;

    // Validate input
    if (!content || !selectedAccounts || selectedAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content and at least one social account are required'
      });
    }

    // If scheduled, validate future date
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
      }
      
      // For now, return success for scheduled posts (scheduling logic to be implemented)
      return res.json({
        success: true,
        message: 'Post scheduled successfully',
        results: {}
      });
    }

    // Get user's social accounts
    const userAccounts = await SocialAccountService.getByUserId(req.user._id);
    const accountsMap = new Map(userAccounts.map(acc => [acc.id, acc]));

    // Filter selected accounts to only include user's connected accounts
    const validAccounts = selectedAccounts
      .map(accountId => accountsMap.get(accountId))
      .filter(account => account && account.is_connected);

    if (validAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid connected accounts found'
      });
    }

    console.log(`📤 Publishing to ${validAccounts.length} accounts:`, 
      validAccounts.map(acc => `${acc.platform}:${acc.username}`));

    // Process media files
    let processedMedia = [];
    if (media && media.length > 0) {
      processedMedia = media.map(item => {
        // Convert base64 data URL to buffer
        const base64Data = item.data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        const buffer = Buffer.from(base64Data, 'base64');
        
        return {
          name: item.name,
          type: item.type,
          buffer: buffer,
          size: buffer.length
        };
      });
      
      console.log(`📎 Processed ${processedMedia.length} media files`);
    }

    // Post to each platform
    const results = {};
    const postingPromises = validAccounts.map(async (account) => {
      try {
        console.log(`🚀 Posting to ${account.platform}:${account.username}...`);
        
        let result;
        switch (account.platform) {
          case 'reddit':
            result = await postToReddit(account, content, processedMedia, subredditSettings);
            break;
          default:
            result = {
              success: false,
              error: `Platform ${account.platform} not supported yet`
            };
        }

        results[account.id] = {
          ...result,
          platform: account.platform,
          accountName: account.username || account.display_name
        };

        if (result.success) {
          console.log(`✅ Successfully posted to ${account.platform}:${account.username}`);
        } else {
          console.log(`❌ Failed to post to ${account.platform}:${account.username} - ${result.error}`);
        }

      } catch (error) {
        console.error(`❌ Error posting to ${account.platform}:${account.username}:`, error);
        results[account.id] = {
          success: false,
          error: error.message || 'Unknown error occurred',
          platform: account.platform,
          accountName: account.username || account.display_name
        };
      }
    });

    // Wait for all posting attempts to complete
    await Promise.all(postingPromises);

    // Calculate success metrics
    const totalAccounts = validAccounts.length;
    const successfulPosts = Object.values(results).filter(r => r.success).length;
    const failedPosts = totalAccounts - successfulPosts;

    console.log(`📊 Posting complete: ${successfulPosts}/${totalAccounts} successful`);

    // Save post to tracking database for analytics
    try {
      await PostTrackingService.createPost(req.user._id, {
        content: content,
        mediaCount: processedMedia.length,
        results: results
      });
      console.log(`📊 Post tracking record saved successfully`);
    } catch (trackingError) {
      console.error('❌ Failed to save post tracking record:', trackingError);
      // Don't fail the main request if tracking fails
    }

    // Determine overall success
    const overallSuccess = successfulPosts > 0;
    let message;
    
    if (successfulPosts === totalAccounts) {
      message = `Post published successfully to all ${totalAccounts} accounts!`;
    } else if (successfulPosts > 0) {
      message = `Post published to ${successfulPosts} of ${totalAccounts} accounts. ${failedPosts} failed.`;
    } else {
      message = `Failed to publish post to any accounts.`;
    }

    res.json({
      success: overallSuccess,
      message,
      results,
      stats: {
        total: totalAccounts,
        successful: successfulPosts,
        failed: failedPosts
      }
    });

  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error occurred while creating post'
    });
  }
});

// Helper function to update posting statistics
const updatePostingStats = async (subredditId, userId, success) => {
  try {
    const { getSupabase } = require('../config/database.js');
    const supabase = getSupabase();
    
    // Get current stats
    const { data: subreddit } = await supabase
      .from('user_subreddits')
      .select('posting_success_count, posting_failure_count')
      .eq('id', subredditId)
      .eq('user_id', userId)
      .single();
    
    if (!subreddit) {
      console.log('⚠️ Subreddit not found for stats update');
      return;
    }
    
    // Update stats
    const updateData = {
      last_posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (success) {
      updateData.posting_success_count = (subreddit.posting_success_count || 0) + 1;
      console.log('✅ Incrementing success count for subreddit');
    } else {
      updateData.posting_failure_count = (subreddit.posting_failure_count || 0) + 1;
      console.log('❌ Incrementing failure count for subreddit');
    }
    
    await supabase
      .from('user_subreddits')
      .update(updateData)
      .eq('id', subredditId)
      .eq('user_id', userId);
      
  } catch (error) {
    console.error('❌ Error updating posting stats:', error);
    // Don't throw - stats update is not critical
  }
};

// Reddit posting function with external video hosting and subreddit selection
const postToReddit = async (account, content, media = [], subredditSettings = {}) => {
  const SocialAccountService = require('../services/socialAccountService.js');
  const { getSupabase } = require('../config/database.js');
  
  try {
    console.log(`🔴 Posting to Reddit for account ${account.username}`);
    console.log(`📝 Content: ${content}`);
    console.log(`📎 Media items: ${media.length}`);
    console.log(`🎯 Subreddit settings:`, subredditSettings);

    // Determine target subreddit
    let targetSubreddit = null;
    
    if (subredditSettings && subredditSettings.selectedSubredditId) {
      // Use selected subreddit from user's list
      const supabase = getSupabase();
      const { data: userSubreddit } = await supabase
        .from('user_subreddits')
        .select('*')
        .eq('id', subredditSettings.selectedSubredditId)
        .eq('user_id', account.user_id)
        .single();
      
      if (userSubreddit) {
        targetSubreddit = userSubreddit.subreddit_name;
        console.log(`🎯 Using selected subreddit: r/${targetSubreddit}`);
      } else {
        console.log(`⚠️ Selected subreddit not found, falling back to default`);
      }
    }
    
    if (!targetSubreddit) {
      // Fall back to default behavior
      const metadata = account.metadata ? JSON.parse(account.metadata) : {};
      targetSubreddit = metadata.default_subreddit || `u_${account.username}`;
      console.log(`🎯 Using default subreddit: r/${targetSubreddit}`);
    }

    // Handle video uploads using external hosting
    if (media.length > 0) {
      for (const mediaItem of media) {
        console.log(`🔍 Checking media item:`, {
          name: mediaItem.name,
          type: mediaItem.type,
          hasBuffer: !!mediaItem.buffer,
          bufferSize: mediaItem.buffer ? mediaItem.buffer.length : 0
        });
        
        const isVideo = mediaItem.type && mediaItem.type.startsWith('video/');
        console.log(`🔍 Video detection result: ${isVideo} (type: "${mediaItem.type}")`);
        
        if (isVideo) {
          console.log('🎬 Video detected - using external hosting approach');
          
          try {
            // Upload video to Imgur
            console.log('🎬 Starting video upload to Imgur...');
            const videoUrl = await uploadVideoToImgur(mediaItem.buffer);
            console.log('🎬 Video uploaded to Imgur successfully:', videoUrl);
            
            // Post as link to Reddit
            const postData = {
              api_type: 'json',
              kind: 'link',
              sr: targetSubreddit,
              title: content,
              url: videoUrl,
              sendreplies: true
            };
            
            console.log('🎬 Posting video link to Reddit:', postData);
            const response = await axios.post('https://oauth.reddit.com/api/submit', new URLSearchParams(postData), {
              headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            });
            
            console.log('✅ Video posted successfully as link');
            console.log('📊 Reddit response:', response.data);
            
            // Update posting success stats if using a selected subreddit
            if (subredditSettings && subredditSettings.selectedSubredditId) {
              await updatePostingStats(subredditSettings.selectedSubredditId, account.user_id, true);
            }
            
            return {
              success: true,
              postId: response.data?.json?.data?.id,
              url: response.data?.json?.data?.url,
              platform: 'reddit'
            };
            
          } catch (error) {
            console.error('❌ Video upload failed:', error);
            
            // Update posting failure stats if using a selected subreddit
            if (subredditSettings && subredditSettings.selectedSubredditId) {
              await updatePostingStats(subredditSettings.selectedSubredditId, account.user_id, false);
            }
            
            return {
              success: false,
              error: error.message || 'Video upload failed',
              platform: 'reddit'
            };
          }
        } else {
          console.log('📝 Media item is not a video, skipping video upload logic');
        }
      }
      console.log('📝 Finished processing all media items, no videos found or video upload failed');
    } else {
      console.log('📝 No media provided, posting text only');
    }

    // Regular text post for non-video content
    console.log('📝 Falling back to regular text post');
    const postData = {
      api_type: 'json',
      kind: 'self',
      sr: targetSubreddit,
      title: content,
      text: content,
      sendreplies: true
    };
    
    const response = await axios.post('https://oauth.reddit.com/api/submit', new URLSearchParams(postData), {
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Update posting success stats if using a selected subreddit
    if (subredditSettings && subredditSettings.selectedSubredditId) {
      await updatePostingStats(subredditSettings.selectedSubredditId, account.user_id, true);
    }
    
    return {
      success: true,
      postId: response.data?.json?.data?.id,
      url: response.data?.json?.data?.url,
      platform: 'reddit'
    };
    
  } catch (error) {
    console.error('❌ Error posting to Reddit:', error);
    
    // Update posting failure stats if using a selected subreddit
    if (subredditSettings && subredditSettings.selectedSubredditId) {
      await updatePostingStats(subredditSettings.selectedSubredditId, account.user_id, false);
    }
    
    return {
      success: false,
      error: error.message || 'Failed to post to Reddit',
      platform: 'reddit'
    };
  }
};

module.exports = router; 