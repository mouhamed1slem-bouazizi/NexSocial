const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');
const TwitterOAuthService = require('../services/twitterOAuthService.js');
const YouTubeService = require('../services/youtubeService.js');
const { generateSocialMediaContent } = require('../services/llmService.js');
const PostTrackingService = require('../services/postTrackingService.js');
const FormData = require('form-data');
const axios = require('axios');
const postToFacebook = require('./postToFacebook.js');

const router = express.Router();

const uploadVideoToReddit = async (accessToken, videoBuffer, subreddit, title, thumbnailUrl, videoUrl) => {
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
        url: videoUrl, // Provide the source video URL
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

const postToSnapchat = async (account, content, media = [], postDetails = {}) => {
  try {
    const accessToken = account.accessToken;
    const profileId = account.platformUserId;

    if (!profileId || !accessToken) {
      throw new Error('Missing Snapchat Profile ID or Access Token');
    }

    console.log(`📸 Posting to Snapchat profile: ${profileId}`);

    // Snapchat requires media for posts
    if (!media || media.length === 0) {
      throw new Error('Snapchat posts require media (image or video)');
    }

    const mediaItem = media[0];
    console.log(`📎 Processing media: ${mediaItem.name}, Size: ${(mediaItem.buffer.length / (1024 * 1024)).toFixed(2)}MB`);

    // Upload media to Snapchat
    const mediaId = await uploadMediaToSnapchat(mediaItem, profileId, accessToken);
    console.log(`✅ Media uploaded successfully, Media ID: ${mediaId}`);

    // Create Snapchat story
    const publishUrl = `https://businessapi.snapchat.com/v1/public_profiles/${profileId}/stories`;
    
    const publishData = {
      media_id: mediaId
    };

    const response = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(publishData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Snapchat API error: ${result.error?.message || 'Unknown error'}`);
    }

    if (result.request_status === 'SUCCESS') {
      const storyId = result.stories[0].story.id;
      console.log(`✅ Snapchat story created successfully: ${storyId}`);
      
      return {
        success: true,
        postId: storyId,
        message: 'Posted to Snapchat successfully'
      };
    } else {
      throw new Error(`Failed to publish story: ${JSON.stringify(result)}`);
    }

  } catch (error) {
    console.error(`❌ Snapchat posting error for account ${account.id}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

const uploadMediaToSnapchat = async (mediaItem, profileId, accessToken) => {
  try {
    const isVideo = mediaItem.type && mediaItem.type.startsWith('video/');
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
    
    console.log(`📤 Uploading ${mediaType.toLowerCase()} to Snapchat...`);

    // Step 1: Create media container
    const containerUrl = `https://businessapi.snapchat.com/v1/public_profiles/${profileId}/media`;
    
    // Generate encryption key and IV (Snapchat requires AES-256-CBC encryption)
    const crypto = require('crypto');
    const key = crypto.randomBytes(32); // 256-bit key
    const iv = crypto.randomBytes(16);  // 128-bit IV
    
    const containerPayload = {
      type: mediaType,
      name: `snapchat-media-${Date.now()}`,
      key: key.toString('base64'),
      iv: iv.toString('base64')
    };

    const containerResponse = await fetch(containerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(containerPayload)
    });

    const containerData = await containerResponse.json();

    if (!containerResponse.ok) {
      throw new Error(`Failed to create media container: ${containerData.error?.message || 'Unknown error'}`);
    }

    console.log(`📦 Media container created: ${containerData.media_id}`);

    // Step 2: Encrypt and upload media
    const cipher = crypto.createCipher('aes-256-cbc', key);
    cipher.setAutoPadding(true);
    
    let encryptedData = cipher.update(mediaItem.buffer);
    encryptedData = Buffer.concat([encryptedData, cipher.final()]);

    // Upload encrypted media to the provided upload URL
    const uploadResponse = await fetch(containerData.upload_urls[0], {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': encryptedData.length.toString()
      },
      body: encryptedData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload encrypted media: ${uploadResponse.statusText}`);
    }

    console.log(`✅ Encrypted media uploaded successfully`);

    // Step 3: Finalize the upload
    const finalizeUrl = `${containerUrl}/${containerData.media_id}/finalize`;
    const finalizeResponse = await fetch(finalizeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const finalizeData = await finalizeResponse.json();

    if (!finalizeResponse.ok) {
      throw new Error(`Failed to finalize media upload: ${finalizeData.error?.message || 'Unknown error'}`);
    }

    console.log(`🎯 Media upload finalized successfully`);
    return containerData.media_id;

  } catch (error) {
    console.error('❌ Snapchat media upload error:', error.message);
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
    
    // Map database field names to expected property names
    const mapAccountFields = (account) => ({
      ...account,
      platformUserId: account.platform_user_id,
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      displayName: account.display_name
    });
    
    const accountsMap = new Map(userAccounts.map(acc => [acc.id, mapAccountFields(acc)]));

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
        
        // Check file size limits
        const fileSizeMB = buffer.length / (1024 * 1024);
        const isVideo = item.type && item.type.startsWith('video/');
        const isImage = item.type && item.type.startsWith('image/');
        
        // Facebook limits: Videos max 1GB, but for reliability we'll limit to 100MB
        // Images max 10MB
        if (isVideo && fileSizeMB > 100) {
          throw new Error(`Video file "${item.name}" is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is 100MB for reliable posting.`);
        }
        
        if (isImage && fileSizeMB > 10) {
          throw new Error(`Image file "${item.name}" is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is 10MB.`);
        }
        
        console.log(`📁 Processing ${isVideo ? 'video' : 'image'}: ${item.name} (${fileSizeMB.toFixed(2)}MB)`);
        
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
          case 'facebook':
            result = await postToFacebook(account, content, processedMedia);
            break;
          case 'reddit':
            result = await postToReddit(account, content, processedMedia, subredditSettings);
            break;
          case 'snapchat':
            result = await postToSnapchat(account, content, processedMedia);
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
const uploadToImgur = async (mediaBuffer, mediaType) => {
  try {
    console.log('🎬 Uploading media to Imgur...');
    const form = new FormData();
    const isVideo = mediaType && mediaType.startsWith('video/');
    const fieldName = isVideo ? 'video' : 'image';
    const fileName = isVideo ? 'video.mp4' : 'image.jpg';

    form.append(fieldName, mediaBuffer, { filename: fileName });
    
    const response = await axios.post('https://api.imgur.com/3/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Client-ID ${process.env.IMGUR_CLIENT_ID || '546c25a59c58ad7'}`,
      },
    });

    console.log(`[Imgur Upload] isVideo: ${isVideo}`);
    const link = response.data.data.link;
    console.log(`[Imgur Upload] Original Link: ${link}`);

    if (isVideo) {
      // For videos, Imgur link is mp4. Create a thumbnail link.
      const thumbnailUrl = link.replace('.mp4', '.jpg');
      console.log(`✅ Got thumbnail from Imgur: ${thumbnailUrl}`);
      return { mediaUrl: link, thumbnailUrl };
    }

    console.log(`✅ Got thumbnail from Imgur: ${link}`);
    return { mediaUrl: link, thumbnailUrl: link };
  } catch (error) {
    console.error('❌ Imgur upload failed:', error.response ? error.response.data : error.message);
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
          const imgurUpload = await uploadToImgur(mediaItem.buffer, mediaItem.type);
          console.log('✅ Got thumbnail from Imgur:', imgurUpload.thumbnailUrl);

          const redditVideoResponse = await uploadVideoToReddit(
            currentAccount.access_token,
            mediaItem.buffer,
            targetSubreddit,
            content,
            imgurUpload.thumbnailUrl,
            imgurUpload.mediaUrl
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
        const imgurUpload = await uploadToImgur(mediaItem.buffer, mediaItem.type);

        const postData = {
          api_type: 'json',
          kind: 'link',
          sr: targetSubreddit,
          title: content,
          url: imgurUpload.mediaUrl,
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