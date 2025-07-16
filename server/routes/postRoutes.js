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

// Helper function to refresh Reddit access token
const refreshRedditToken = async (account) => {
  try {
    console.log('🔄 Refreshing Reddit access token...');
    
    if (!account.refresh_token) {
      throw new Error('REFRESH_TOKEN_NOT_AVAILABLE');
    }
    
    // Prepare Basic Auth header
    const credentials = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NexSocial/1.0'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Reddit token refresh failed:', response.status, errorText);
      
      // Check if refresh token is expired or invalid
      if (response.status === 400 || response.status === 401) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      
      throw new Error(`Token refresh failed: ${errorText}`);
    }
    
    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      console.error('❌ No access token in Reddit refresh response:', tokenData);
      throw new Error('Invalid refresh response');
    }
    
    console.log('✅ Reddit token refresh successful');
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || account.refresh_token, // Use new refresh token if provided
      expires_in: tokenData.expires_in || 3600 // Default 1 hour
    };
  } catch (error) {
    console.error('❌ Reddit token refresh error:', error);
    throw error;
  }
};

// Reddit posting function with external video hosting and subreddit selection
const postToReddit = async (account, content, media = [], subredditSettings = {}) => {
  const SocialAccountService = require('../services/socialAccountService.js');
  const { getSupabase } = require('../config/database.js');
  
  const attemptRedditPost = async (currentAccount, retryCount = 0) => {
    try {
      console.log(`🔴 Posting to Reddit for account ${currentAccount.username} (attempt ${retryCount + 1})`);
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
          .eq('user_id', currentAccount.user_id)
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
        const metadata = currentAccount.metadata ? JSON.parse(currentAccount.metadata) : {};
        targetSubreddit = metadata.default_subreddit || `u_${currentAccount.username}`;
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
        
        const isVideo = mediaItem.type && (mediaItem.type.startsWith('video/') || mediaItem.type === 'video');
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
                'Authorization': `Bearer ${currentAccount.access_token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            });
            
            console.log('✅ Video posted successfully as link');
            console.log('📊 Reddit response:', response.data);
            
            // Update posting success stats if using a selected subreddit
            if (subredditSettings && subredditSettings.selectedSubredditId) {
              await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, true);
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
              await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, false);
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
          'Authorization': `Bearer ${currentAccount.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Update posting success stats if using a selected subreddit
      if (subredditSettings && subredditSettings.selectedSubredditId) {
        await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, true);
      }
      
      return {
        success: true,
        postId: response.data?.json?.data?.id,
        url: response.data?.json?.data?.url,
        platform: 'reddit'
      };
      
    } catch (error) {
      console.error('❌ Reddit posting attempt failed:', error);
      
      // Enhanced debugging for Reddit token issues
      console.log('🔍 Debug info for Reddit token refresh:');
      console.log(`  - Error status: ${error.response?.status}`);
      console.log(`  - Error message: ${error.message}`);
      console.log(`  - Retry count: ${retryCount}`);
      console.log(`  - Refresh token exists: ${!!currentAccount.refresh_token}`);
      console.log(`  - Refresh token length: ${currentAccount.refresh_token?.length || 0}`);
      console.log(`  - Account ID: ${currentAccount.id}`);
      console.log(`  - Account username: ${currentAccount.username}`);
      
      // Handle unauthorized error with token refresh
      if ((error.response?.status === 401 || error.message.includes('Request failed with status code 401')) && retryCount === 0 && currentAccount.refresh_token) {
        console.log('🔄 Attempting to refresh Reddit token...');
        
        try {
          const refreshedTokens = await refreshRedditToken(currentAccount);
          
          // Update tokens in database
          await SocialAccountService.updateTokens(
            currentAccount.id,
            currentAccount.user_id,
            refreshedTokens.access_token,
            refreshedTokens.refresh_token
          );
          
          console.log('✅ Reddit token refreshed successfully, retrying post...');
          
          // Update current account with new tokens
          currentAccount.access_token = refreshedTokens.access_token;
          if (refreshedTokens.refresh_token) {
            currentAccount.refresh_token = refreshedTokens.refresh_token;
          }
          
          // Retry posting with new token
          return await attemptRedditPost(currentAccount, retryCount + 1);
        } catch (refreshError) {
          console.error('❌ Reddit token refresh failed:', refreshError);
          
          if (refreshError.message === 'REFRESH_TOKEN_EXPIRED' || refreshError.message === 'REFRESH_TOKEN_NOT_AVAILABLE') {
            // Enhanced user-friendly error message
            const errorMsg = '🔧 Reddit Authentication Required: Your Reddit account connection has expired. Please go to Settings → Social Accounts → Disconnect and reconnect your Reddit account to continue posting.';
            throw new Error(errorMsg);
          }
          
          throw new Error(`Reddit token refresh failed: ${refreshError.message}`);
        }
      }
      
      // Special handling for 401 errors without refresh token
      if ((error.response?.status === 401 || error.message.includes('Request failed with status code 401')) && !currentAccount.refresh_token) {
        console.log('❌ Reddit authentication expired and no refresh token available');
        const errorMsg = '🔧 Reddit Authentication Required: Your Reddit account connection has expired and cannot be automatically renewed. Please go to Settings → Social Accounts → Disconnect and reconnect your Reddit account to continue posting.';
        
        // Update posting failure stats if using a selected subreddit
        if (subredditSettings && subredditSettings.selectedSubredditId) {
          await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, false);
        }
        
        throw new Error(errorMsg);
      }
      
      // Update posting failure stats if using a selected subreddit
      if (subredditSettings && subredditSettings.selectedSubredditId) {
        await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, false);
      }
      
      throw error;
    }
  };

  // Start the posting attempt
  try {
    return await attemptRedditPost(account);
  } catch (error) {
    console.error('❌ Error posting to Reddit:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to post to Reddit',
      platform: 'reddit'
    };
  }
};

module.exports = router; 