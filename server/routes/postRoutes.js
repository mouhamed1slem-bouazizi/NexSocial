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

const uploadVideoToReddit = async (accessToken, videoBuffer, subreddit, title, thumbnailUrl) => {
  try {
    // Step 1: Submit the post to get a video upload lease.
    console.log('📹 Submitting video post to get upload lease...');
    const submitResponse = await axios.post(
      'https://oauth.reddit.com/api/submit',
      new URLSearchParams({
        api_type: 'json',
        kind: 'video',
        sr: subreddit,
        title: title,
        video_poster_url: thumbnailUrl,
      }).toString(),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NexSocial/1.0',
        },
      }
    );

    console.log('📹 Raw submit response from Reddit:', JSON.stringify(submitResponse.data, null, 2));

    if (submitResponse.data.json.errors.length > 0) {
      const errorDetails = submitResponse.data.json.errors[0];
      console.error('❌ Reddit API returned errors:', errorDetails);
      // Example error: ["BAD_URL", "the video_poster_url can't be empty", "video_poster_url"]
      throw new Error(`Reddit API Error: ${errorDetails[1]}`);
    }

    const postData = submitResponse.data.json.data;
    const uploadUrl = postData.video_upload_endpoint;
    const websocketUrl = postData.video_websocket_url;

    if (!uploadUrl) {
      console.error('❌ Failed to get upload URL from Reddit response:', postData);
      throw new Error('Failed to get a valid video upload lease from Reddit. No upload URL found.');
    }
    
    // Step 2: Upload the video file to the lease URL.
    console.log('⬆️ Uploading video to Reddit...');
    await axios.post(uploadUrl, videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('✅ Video successfully uploaded to Reddit.');
    
    // The video is processed asynchronously.
    return {
      success: true,
      websocketUrl: websocketUrl,
    };
  } catch (error) {
    console.error('❌ Reddit video upload failed.');
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error message:', error.message);
    }
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

// Unified function to upload media to Imgur
const uploadToImgur = async (mediaItem) => {
  console.log('🎬 Uploading media to Imgur...');
  try {
    const form = new FormData();
    const isVideo = mediaItem.type && mediaItem.type.startsWith('video/');
    const fieldName = isVideo ? 'video' : 'image';
    const fileName = mediaItem.name || (isVideo ? 'video.mp4' : 'image.jpg');

    form.append(fieldName, mediaItem.buffer, { filename: fileName });
    
    const response = await axios.post('https://api.imgur.com/3/upload', form, {
      headers: {
        'Authorization': 'Client-ID 546c25a59c58ad7',
        ...form.getHeaders()
      }
    });

    if (response.data.success) {
      console.log('✅ Media uploaded to Imgur successfully');
      const link = response.data.data.link;
      let thumbnailUrl = link; // Default to the link itself for images
      
      // For videos, Imgur link is to the .mp4. A thumbnail can be constructed.
      if (isVideo && link.includes('imgur.com')) {
          const videoId = link.split('/').pop().split('.')[0];
          thumbnailUrl = `https://i.imgur.com/${videoId}.jpg`;
      }

      return {
        link: link,
        thumbnailUrl: thumbnailUrl
      };
    } else {
      console.error('❌ Imgur upload failed:', response.data.data.error);
      throw new Error('Imgur upload failed');
    }
  } catch (error) {
    console.error('❌ Imgur upload failed:', error);
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

    // Handle media uploads
    if (media.length > 0) {
      const mediaItem = media[0]; // Process only the first media item
      const isVideo = mediaItem.type && (mediaItem.type.startsWith('video/') || mediaItem.type === 'video');

      // Native video upload attempt
      if (isVideo) {
        try {
          console.log('📹 Attempting native Reddit video upload...');
          
          console.log('🖼️ Uploading to Imgur to generate a thumbnail...');
          const imgurUpload = await uploadToImgur(mediaItem);
          console.log('✅ Got thumbnail from Imgur:', imgurUpload.thumbnailUrl);

          const redditVideoResponse = await uploadVideoToReddit(
            currentAccount.access_token,
            mediaItem.buffer,
            targetSubreddit,
            content,
            imgurUpload.thumbnailUrl
          );

          if (subredditSettings && subredditSettings.selectedSubredditId) {
            await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, true);
          }

          return {
            success: true,
            message: 'Video is being processed by Reddit. It may take a few moments to appear.',
            websocketUrl: redditVideoResponse.websocketUrl,
            platform: 'reddit',
          };
        } catch (nativeUploadError) {
          console.error('❌ Native Reddit video upload failed. Falling back to Imgur link.', nativeUploadError.message);
          // Fallback to posting as an Imgur link, which happens below.
        }
      }

      // Fallback or Image Upload: Post as a link from Imgur
      try {
        console.log('☁️ Uploading media to Imgur to post as a link...');
        const imgurUpload = await uploadToImgur(mediaItem);

        const postData = {
          api_type: 'json',
          kind: 'link',
          sr: targetSubreddit,
          title: content,
          url: imgurUpload.link,
          sendreplies: true,
        };

        console.log('🔗 Posting media link to Reddit:', postData);
        const response = await axios.post('https://oauth.reddit.com/api/submit', new URLSearchParams(postData), {
          headers: {
            'Authorization': `Bearer ${currentAccount.access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        console.log('✅ Media link post successful');
        console.log('📊 Reddit response:', response.data);

        if (subredditSettings && subredditSettings.selectedSubredditId) {
          await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, true);
        }

        return {
          success: true,
          postId: response.data?.json?.data?.id,
          url: response.data?.json?.data?.url,
          platform: 'reddit',
        };
      } catch (linkPostError) {
        console.error('❌ Final fallback link post also failed:', linkPostError.message);
        if (subredditSettings && subredditSettings.selectedSubredditId) {
          await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, false);
        }
        throw linkPostError; // Throw the final error
      }
    } else {
      // Logic for text-only posts
      console.log('📝 No media provided, creating a text-only post');
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
      
      if (subredditSettings && subredditSettings.selectedSubredditId) {
        await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, true);
      }
      
      return {
        success: true,
        postId: response.data?.json?.data?.id,
        url: response.data?.json?.data?.url,
        platform: 'reddit'
      };
    }
      
    } catch (error) {
      console.error('❌ Reddit posting attempt failed:', error);
      
      console.log('🔍 Debug info for Reddit token refresh:');
      console.log(`  - Error status: ${error.response?.status}`);
      console.log(`  - Error message: ${error.message}`);
      console.log(`  - Retry count: ${retryCount}`);
      console.log(`  - Refresh token exists: ${!!currentAccount.refresh_token}`);
      
      if ((error.response?.status === 401 || error.message.includes('Request failed with status code 401')) && retryCount === 0 && currentAccount.refresh_token) {
        console.log('🔄 Attempting to refresh Reddit token...');
        
        try {
          const refreshedTokens = await refreshRedditToken(currentAccount);
          
          await SocialAccountService.updateTokens(
            currentAccount.id,
            currentAccount.user_id,
            refreshedTokens.access_token,
            refreshedTokens.refresh_token
          );
          
          console.log('✅ Reddit token refreshed successfully, retrying post...');
          
          currentAccount.access_token = refreshedTokens.access_token;
          if (refreshedTokens.refresh_token) {
            currentAccount.refresh_token = refreshedTokens.refresh_token;
          }
          
          return await attemptRedditPost(currentAccount, retryCount + 1);
        } catch (refreshError) {
          console.error('❌ Reddit token refresh failed:', refreshError);
          
          if (refreshError.message === 'REFRESH_TOKEN_EXPIRED' || refreshError.message === 'REFRESH_TOKEN_NOT_AVAILABLE') {
            const errorMsg = '🔧 Reddit Authentication Required: Your Reddit account connection has expired. Please go to Settings → Social Accounts → Disconnect and reconnect your Reddit account to continue posting.';
            throw new Error(errorMsg);
          }
          
          throw new Error(`Reddit token refresh failed: ${refreshError.message}`);
        }
      }
      
      if ((error.response?.status === 401 || error.message.includes('Request failed with status code 401')) && !currentAccount.refresh_token) {
        console.log('❌ Reddit authentication expired and no refresh token available');
        const errorMsg = '🔧 Reddit Authentication Required: Your Reddit account connection has expired and cannot be automatically renewed. Please go to Settings → Social Accounts → Disconnect and reconnect your Reddit account to continue posting.';
        
        if (subredditSettings && subredditSettings.selectedSubredditId) {
          await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, false);
        }
        
        throw new Error(errorMsg);
      }
      
      if (subredditSettings && subredditSettings.selectedSubredditId) {
        await updatePostingStats(subredditSettings.selectedSubredditId, currentAccount.user_id, false);
      }
      
      throw error;
    }
  };

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