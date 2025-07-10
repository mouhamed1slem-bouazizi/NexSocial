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

// Main posting endpoint
router.post('/', requireUser, async (req, res) => {
  try {
    console.log('📝 Creating new post for user:', req.user._id);
    console.log('📊 Post data:', JSON.stringify(req.body, null, 2));

    const { content, platforms, selectedAccounts, scheduledAt, media, discordChannels } = req.body;

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
          case 'facebook':
            result = await postToFacebook(account, content, processedMedia);
            break;
          case 'instagram':
            result = await postToInstagram(account, content, processedMedia);
            break;
          case 'twitter':
            result = await postToTwitter(account, content, processedMedia);
            break;
          case 'linkedin':
            result = await postToLinkedIn(account, content, processedMedia);
            break;
          case 'youtube':
            result = await postToYouTube(account, content, processedMedia);
            break;
          case 'tiktok':
            result = await postToTikTok(account, content, processedMedia);
            break;
          case 'telegram':
            result = await postToTelegram(account, content, processedMedia);
            break;
          case 'discord':
            result = await postToDiscord(account, content, processedMedia, discordChannels);
            break;
          case 'reddit':
            result = await postToReddit(account, content, processedMedia);
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
    console.error('❌ Error in post creation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create post'
    });
  }
});

// AI content generation endpoint
router.post('/ai-generate', requireUser, async (req, res) => {
  try {
    console.log('🤖 AI content generation request:', req.body);
    
    const { prompt, tone, platforms } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const content = await generateSocialMediaContent(prompt, tone, platforms);
    
    res.json({
      success: true,
      content,
      message: 'Content generated successfully'
    });

  } catch (error) {
    console.error('❌ AI generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate content'
    });
  }
});

// Helper function to post to Facebook
const postToFacebook = async (account, content, media = []) => {
  try {
    const body = {
      message: content,
      access_token: account.access_token
    };

    // Add media if provided
    if (media.length > 0) {
      // For now, Facebook posting with media is complex and requires photo/video upload endpoints
      // We'll post text-only and mention media count
      body.message += `\n\n📸 Includes ${media.length} media item${media.length > 1 ? 's' : ''}`;
      console.log(`Facebook: Media upload not implemented yet. Posted text with media note.`);
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to post to Facebook');
    }

    return {
      success: true,
      postId: data.id,
      message: media.length > 0 
        ? `Posted to Facebook successfully (${media.length} media items noted)`
        : 'Posted to Facebook successfully',
      mediaCount: media.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// NOTE: Twitter media upload requires OAuth 1.0a authentication
// Current setup uses OAuth 2.0 Bearer tokens which work for posting but not media upload
// For full media upload support, we would need to implement OAuth 1.0a authentication

// Helper function to create a simple media hosting solution
const createMediaPreview = (media) => {
  if (media.length === 0) return '';
  
  const mediaTypes = media.map(m => {
    if (m.type === 'image') return '🖼️';
    if (m.type === 'video') return '🎬';
    return '📎';
  }).join('');
  
  return `\n\n${mediaTypes} Media attached: ${media.map(m => m.name).join(', ')}`;
};

// Helper function to post to Twitter
const postToTwitter = async (account, content, media = []) => {
  try {
    console.log(`Posting to Twitter for account ${account.username}`);
    console.log(`Content: ${content}`);
    console.log(`Media items: ${media.length}`);
    
    // Function to attempt Twitter posting with token refresh fallback
    const attemptTwitterPost = async (currentAccount, retryCount = 0) => {
      try {
    // Check if we have OAuth 1.0a credentials for media upload
        const hasOAuth1Credentials = currentAccount.oauth1_access_token && currentAccount.oauth1_access_token_secret;
    
    if (!hasOAuth1Credentials && media.length > 0) {
      console.log('No OAuth 1.0a credentials found for media upload. Falling back to text-only posting.');
      
          // Add media information to the tweet text
      let tweetText = content;
      const mediaPreview = createMediaPreview(media);
          const totalLength = tweetText.length + mediaPreview.length;
      
      if (totalLength <= 280) {
            tweetText += mediaPreview;
      } else {
            // Truncate content to make room for media info
            const availableSpace = 280 - mediaPreview.length;
            tweetText = tweetText.substring(0, Math.max(0, availableSpace)) + mediaPreview;
          }
          
          console.log(`Modified tweet to include media reference`);
      
      const body = {
        text: tweetText.substring(0, 280)
      };

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentAccount.access_token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Twitter post error:', data);
            
            // Handle unauthorized error with token refresh
            if (response.status === 401) {
              throw new Error('UNAUTHORIZED');
            }
        
        // Handle duplicate content error specifically
        if (data.detail && data.detail.includes('duplicate content')) {
          throw new Error('Twitter rejected duplicate content. Please modify your message or reconnect your Twitter account for media upload.');
        }
        
        throw new Error(data.errors?.[0]?.message || 'Failed to post to Twitter');
      }

      return {
        success: true,
        postId: data.data.id,
        message: `Posted to Twitter successfully (${media.length} media item${media.length > 1 ? 's' : ''} referenced in text - reconnect account for direct upload)`,
        mediaCount: 0,
        mediaNote: `⚠️ Media files were referenced in the tweet text. To upload actual media to Twitter, please reconnect your Twitter account to enable dual authentication.`
      };
    }

    // Use TwitterOAuthService for media upload and posting
    const twitterService = new TwitterOAuthService();
    let mediaIds = [];

    // Upload media if provided and we have OAuth 1.0a credentials
    if (media.length > 0 && hasOAuth1Credentials) {
      console.log('Uploading media to Twitter...');
      
      const mediaUploadPromises = media.map(async (mediaItem) => {
        try {
          const mediaId = await twitterService.uploadMedia(
            mediaItem, 
                currentAccount.oauth1_access_token, 
                currentAccount.oauth1_access_token_secret
          );
          return mediaId;
        } catch (error) {
          console.error(`Failed to upload media ${mediaItem.name}:`, error);
          return null;
        }
      });

      const uploadResults = await Promise.all(mediaUploadPromises);
      mediaIds = uploadResults.filter(id => id !== null);
      
      console.log(`Successfully uploaded ${mediaIds.length} out of ${media.length} media items`);
    }

        // Post tweet with original content (no timestamp modification)
    const tweetData = await twitterService.postTweet(
          content,
      mediaIds,
          currentAccount.access_token
    );

    let message = 'Posted to Twitter successfully';
    if (media.length > 0) {
      if (mediaIds.length === media.length) {
        message += ` with ${media.length} media item${media.length > 1 ? 's' : ''}`;
      } else if (mediaIds.length > 0) {
        message += ` with ${mediaIds.length} of ${media.length} media items (some uploads failed)`;
      } else {
        message += ` (media upload failed - posted text only)`;
      }
    }

    return {
      success: true,
      postId: tweetData.id,
      message: message,
      mediaCount: mediaIds.length,
      mediaNote: media.length > 0 && mediaIds.length === 0 ? 'Media upload failed, but text was posted successfully' : undefined
    };
      } catch (error) {
        console.error('Twitter posting attempt failed:', error);
        
        // Handle unauthorized error with token refresh
        if (error.message === 'UNAUTHORIZED' || error.message.includes('Unauthorized')) {
          if (retryCount === 0 && currentAccount.refresh_token) {
            console.log('🔄 Attempting to refresh Twitter token...');
            
            try {
              const twitterService = new TwitterOAuthService();
              const refreshedTokens = await twitterService.refreshOAuth2Token(currentAccount.refresh_token);
              
              // Update tokens in database
              await SocialAccountService.updateTokens(
                currentAccount.id,
                currentAccount.user_id,
                refreshedTokens.access_token,
                refreshedTokens.refresh_token
              );
              
              console.log('✅ Twitter token refreshed successfully, retrying post...');
              
              // Update current account with new tokens
              currentAccount.access_token = refreshedTokens.access_token;
              if (refreshedTokens.refresh_token) {
                currentAccount.refresh_token = refreshedTokens.refresh_token;
              }
              
              // Retry posting with new token
              return await attemptTwitterPost(currentAccount, retryCount + 1);
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              
              if (refreshError.message === 'REFRESH_TOKEN_EXPIRED') {
                throw new Error('REFRESH_TOKEN_EXPIRED');
              }
              
              throw new Error(`Token refresh failed: ${refreshError.message}`);
            }
          } else {
            // No refresh token available or already tried once
            throw new Error('UNAUTHORIZED');
          }
        }
        
        throw error;
      }
    };

    // Attempt posting with token refresh fallback
    return await attemptTwitterPost(account);
  } catch (error) {
    console.error('Twitter posting error:', error);
    
    // Enhanced error handling with specific user guidance
    if (error.message === 'UNAUTHORIZED') {
    return {
      success: false,
        error: 'Twitter authentication expired. Please refresh your Twitter token from the Dashboard → Settings → Social Accounts.',
        requiresTokenRefresh: true,
        platform: 'twitter'
      };
    }
    
    if (error.message === 'REFRESH_TOKEN_EXPIRED') {
      return {
        success: false,
        error: 'Twitter tokens have expired. Please reconnect your Twitter account from the Dashboard → Settings → Social Accounts.',
        requiresReconnect: true,
        platform: 'twitter'
      };
    }
    
    return {
      success: false,
      error: error.message,
      platform: 'twitter'
    };
  }
};

// Helper function to post to LinkedIn
const postToLinkedIn = async (account, content, media = []) => {
  try {
    console.log(`🔗 Posting to LinkedIn for account ${account.username}`);
    console.log(`Content: ${content}`);
    console.log(`Media items: ${media.length}`);

    // Validate LinkedIn user ID - must be a real LinkedIn member ID (not a fake generated one)
    const isFakeLinkedInId = account.platform_user_id.includes('linkedin_posting_');
    if (isFakeLinkedInId || !account.platform_user_id || account.platform_user_id.length < 3) {
      console.log('❌ Invalid LinkedIn member ID detected:', account.platform_user_id);
      return {
        success: false,
        error: 'LinkedIn posting requires a valid member ID. Please reconnect your LinkedIn account to enable posting.',
        requiresReconnect: true
      };
    }

    let mediaAssets = [];
    
    // Process media uploads if any
    if (media.length > 0) {
      console.log('🔗 Processing media for LinkedIn...');
      
      for (const mediaItem of media) {
        try {
          console.log(`🔗 Processing media: ${mediaItem.name} (${mediaItem.type})`);
          
          // Determine media type - handle both full MIME types and simplified types
          const mediaType = mediaItem.type.toLowerCase();
          const isImage = mediaType.startsWith('image/') || mediaType === 'image';
          const isVideo = mediaType.startsWith('video/') || mediaType === 'video';
          
          console.log(`🔗 Media type detection: "${mediaItem.type}" -> isImage: ${isImage}, isVideo: ${isVideo}`);
          
          if (!isImage && !isVideo) {
            console.log(`🔗 Skipping unsupported media type: ${mediaItem.type}`);
            continue;
          }
          
          // Convert base64 to buffer
          const base64Data = mediaItem.data.split(',')[1];
          if (!base64Data) {
            console.error('🔗 Invalid media data format');
            continue;
          }
          
          const mediaBuffer = Buffer.from(base64Data, 'base64');
          console.log(`🔗 Media buffer size: ${mediaBuffer.length} bytes`);
          
          // Step 1: Register upload for LinkedIn
          const registerUploadBody = {
            registerUploadRequest: {
              recipes: isImage ? ['urn:li:digitalmediaRecipe:feedshare-image'] : ['urn:li:digitalmediaRecipe:feedshare-video'],
              owner: `urn:li:person:${account.platform_user_id}`,
              serviceRelationships: [{
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent'
              }]
            }
          };
          
          console.log('🔗 Registering upload with LinkedIn...');
          const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${account.access_token}`,
              'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify(registerUploadBody)
          });
          
          if (!registerResponse.ok) {
            const registerError = await registerResponse.text();
            console.error('🔗 Failed to register upload:', registerResponse.status, registerError);
            continue;
          }
          
          const registerData = await registerResponse.json();
          console.log('🔗 Register response:', JSON.stringify(registerData, null, 2));
          
          const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
          const asset = registerData.value.asset;
          
          console.log('🔗 Upload URL:', uploadUrl);
          console.log('🔗 Asset URN:', asset);
          
          console.log('🔗 Upload registered, uploading media...');
          
          // Step 2: Upload the actual media file (binary upload as per LinkedIn documentation)
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${account.access_token}`
            },
            body: mediaBuffer
          });
          
          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.text();
            console.error('🔗 Failed to upload media:', uploadResponse.status, uploadError);
            console.error('🔗 Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));
            continue;
          }
          
          console.log('🔗 Media uploaded successfully:', uploadResponse.status);
          mediaAssets.push({
            status: 'READY',
            description: {
              text: `Media uploaded via NexSocial`
            },
            media: asset,
            title: {
              text: mediaItem.name
            }
          });
          
        } catch (mediaError) {
          console.error('🔗 Error processing media item:', mediaError);
          continue;
        }
      }
    }
    
    // Create the LinkedIn post
    let postBody;
    
    if (mediaAssets.length > 0) {
      // Determine shareMediaCategory based on media type - handle both full MIME types and simplified types
      const hasVideo = media.some(item => {
        const mediaType = item.type.toLowerCase();
        return mediaType.startsWith('video/') || mediaType === 'video';
      });
      const shareMediaCategory = hasVideo ? 'VIDEO' : 'IMAGE';
      
      console.log('🔗 Media category determination:', {
        mediaTypes: media.map(item => item.type),
        hasVideo,
        shareMediaCategory
      });
      
      // Post with media
      postBody = {
        author: `urn:li:person:${account.platform_user_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: shareMediaCategory,
            media: mediaAssets
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
    } else {
      // Text-only post
      postBody = {
        author: `urn:li:person:${account.platform_user_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
    }
    
    console.log('🔗 Creating LinkedIn post...');
    console.log('🔗 Post body:', JSON.stringify(postBody, null, 2));
    
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postBody)
    });

    const data = await response.json();
    console.log('🔗 LinkedIn API response:', response.status, data);

    if (!response.ok) {
      console.error('🔗 LinkedIn post creation failed:', response.status, data);
      throw new Error(data.message || `LinkedIn API error: ${response.status} ${response.statusText}`);
    }

    const successMessage = mediaAssets.length > 0 
      ? `Posted to LinkedIn successfully with ${mediaAssets.length} media item${mediaAssets.length > 1 ? 's' : ''}!`
      : 'Posted to LinkedIn successfully!';

    console.log('✅ LinkedIn post created successfully:', data.id);

    return {
      success: true,
      postId: data.id,
      message: successMessage,
      mediaCount: mediaAssets.length,
      uploadedMedia: mediaAssets.map((asset, index) => ({
        type: media[index]?.type?.startsWith('video/') ? 'video' : 'image',
        name: media[index]?.name || 'Unknown',
        status: 'uploaded',
        assetUrn: asset.media
      }))
    };
  } catch (error) {
    console.error('🔗 LinkedIn posting error:', error);
    return {
      success: false,
      error: error.message || 'Failed to post to LinkedIn'
    };
  }
};

// Helper function to post to Instagram
const postToInstagram = async (account, content, media = []) => {
  try {
    // Instagram posting requires media, so we'll return an error if no media is provided
    if (media.length === 0) {
      return {
        success: false,
        error: 'Instagram posts require at least one media item'
      };
    }

    console.log(`Instagram: Media upload not fully implemented yet. Will post text with media note.`);
    
    // Instagram media upload is complex and requires proper file upload handling
    // For now, we'll return an informational message
    return {
      success: false,
      error: `Instagram media upload not yet implemented. Please post directly to Instagram. (Would have posted: "${content}" with ${media.length} media items)`
    };

    // TODO: Implement proper Instagram media upload
    // This requires:
    // 1. Upload media to Instagram's media endpoint
    // 2. Create media container
    // 3. Publish the container
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to post to YouTube (Video upload)
const postToYouTube = async (account, content, media = []) => {
  try {
    console.log(`📺 Posting to YouTube for account ${account.username}`);
    console.log(`Content: ${content}`);
    console.log(`Media items: ${media.length}`);

    // YouTube requires video content - check if we have video media
    const videoMedia = media.filter(item => {
      const type = item.type?.toLowerCase() || '';
      const name = item.name?.toLowerCase() || '';
      
      console.log(`📺 Checking media item:`, {
        name: item.name,
        type: item.type,
        typeLower: type,
        nameLower: name
      });
      
      // Check if type starts with 'video/' or is just 'video'
      // Also check file extension for video files
      const isVideoType = type.startsWith('video/') || type === 'video';
      const isVideoExtension = /\.(mp4|mov|avi|wmv|flv|webm|mkv|3gp|m4v)$/i.test(name);
      
      console.log(`📺 Video detection results:`, {
        isVideoType,
        isVideoExtension,
        typeStartsWithVideo: type.startsWith('video/'),
        typeEqualsVideo: type === 'video',
        finalResult: isVideoType || isVideoExtension
      });
      
      return isVideoType || isVideoExtension;
    });
    
    console.log('📺 Video media detection:');
    console.log('📺 Total media items:', media.length);
    console.log('📺 Media details:', media.map(item => ({ name: item.name, type: item.type })));
    console.log('📺 Video media found:', videoMedia.length);
    
    if (videoMedia.length === 0) {
      console.log('📺 No video content found for YouTube');
      return {
        success: false,
        error: 'YouTube requires video content. Please upload a video file to post to YouTube. Text-only posts are not supported.',
        platform: 'youtube'
      };
    }

    if (videoMedia.length > 1) {
      console.log('📺 Multiple videos detected - YouTube supports one video per post');
      return {
        success: false,
        error: 'YouTube supports one video per post. Please select a single video file.',
        platform: 'youtube'
      };
    }

    const videoFile = videoMedia[0];
    console.log(`📺 Processing video: ${videoFile.name} (${videoFile.type})`);
    console.log(`📺 Video data length: ${videoFile.data?.length || 0} characters`);

    // Validate video data
    if (!videoFile.data) {
      console.error('📺 No video data found in media item');
      return {
        success: false,
        error: 'Video file data is missing. Please try uploading the video again.',
        platform: 'youtube'
      };
    }

    // Convert base64 video data to buffer
    try {
      const base64Data = videoFile.data.split(',')[1];
      if (!base64Data) {
        console.error('📺 Invalid base64 data format');
        return {
          success: false,
          error: 'Invalid video file format. Please ensure the video is properly uploaded.',
          platform: 'youtube'
        };
      }
      
      const videoBuffer = Buffer.from(base64Data, 'base64');
      console.log(`📺 Video buffer size: ${videoBuffer.length} bytes`);
      
      if (videoBuffer.length === 0) {
        console.error('📺 Video buffer is empty');
        return {
          success: false,
          error: 'Video file appears to be empty. Please try uploading a valid video file.',
          platform: 'youtube'
        };
      }
      
      // Get video metadata
      const videoMetadata = await YouTubeService.getVideoMetadata(videoBuffer, videoFile.name);
      console.log('📺 Video metadata:', videoMetadata);

      // Prepare upload metadata
      const uploadMetadata = {
        title: content.substring(0, 100) || `Video from NexSocial - ${new Date().toLocaleDateString()}`,
        description: content.length > 100 ? content : `${content}\n\nPosted via NexSocial`,
        tags: ['NexSocial', 'SocialMedia'],
        privacyStatus: 'public',
        categoryId: '22', // People & Blogs
        mimeType: videoMetadata.mimeType,
        duration: videoMetadata.duration,
        isShort: videoMetadata.isShort,
        filename: videoFile.name
      };

      // Add hashtags from content as tags
      const hashtagMatches = content.match(/#[\w]+/g);
      if (hashtagMatches) {
        const hashtags = hashtagMatches.map(tag => tag.substring(1)); // Remove # symbol
        uploadMetadata.tags = [...uploadMetadata.tags, ...hashtags];
      }

      // Upload video (automatically detects if it's a Short)
      let result;
      if (videoMetadata.isShort) {
        console.log('📺 Uploading as YouTube Short...');
        result = await YouTubeService.uploadShort(account.access_token, videoBuffer, uploadMetadata);
      } else {
        console.log('📺 Uploading as regular YouTube video...');
        result = await YouTubeService.uploadVideo(account.access_token, videoBuffer, uploadMetadata);
      }

      console.log('✅ YouTube video upload successful!');
      console.log('📺 Video URL:', result.videoUrl);

      return {
        success: true,
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        message: result.isShort 
          ? `YouTube Short uploaded successfully! 🎬 Watch it at: ${result.videoUrl}`
          : `YouTube video uploaded successfully! 🎬 Watch it at: ${result.videoUrl}`,
        platform: 'youtube',
        isShort: result.isShort,
        title: result.title,
        description: result.description,
        mediaCount: 1,
        uploadedMedia: [{
          type: 'video',
          url: result.videoUrl,
          isShort: result.isShort
        }]
      };

    } catch (bufferError) {
      console.error('📺 Error processing video data:', bufferError);
      return {
        success: false,
        error: 'Failed to process video file. Please ensure the video is in a supported format.',
        platform: 'youtube'
      };
    }
  } catch (error) {
    console.error('📺 YouTube posting error:', error);
    
    // Handle specific YouTube API errors
    if (error.message.includes('quotaExceeded')) {
      return {
        success: false,
        error: 'YouTube API quota exceeded. Please try again later or check your Google Cloud Console quota settings.',
        platform: 'youtube'
      };
    } else if (error.message.includes('insufficientPermissions')) {
      return {
        success: false,
        error: 'Insufficient permissions to upload videos to YouTube. Please check your channel settings and verify your channel.',
        platform: 'youtube'
      };
    } else if (error.message.includes('uploadLimitExceeded')) {
      return {
        success: false,
        error: 'YouTube upload limit exceeded. Please try again later or check your channel limits.',
        platform: 'youtube'
      };
    } else if (error.message.includes('mediaBodyRequired')) {
      return {
        success: false,
        error: 'YouTube API requires video content. Text-only posts are not supported.',
        platform: 'youtube'
      };
    } else {
      return {
        success: false,
        error: error.message || 'Failed to upload video to YouTube',
        platform: 'youtube'
      };
    }
  }
};

// Helper function to post to TikTok
const postToTikTok = async (account, content, media = []) => {
  try {
    console.log(`🎵 TikTok posting for account ${account.username}`);
    
    // TikTok requires video content for posts
    const videoMedia = media.filter(item => item.type.startsWith('video/'));
    
    if (videoMedia.length === 0) {
      return {
        success: false,
        error: 'TikTok requires video content. Please upload a video file to post to TikTok.',
        platform: 'tiktok'
      };
    }

    if (videoMedia.length > 1) {
      return {
        success: false,
        error: 'TikTok supports one video per post. Please select a single video file.',
        platform: 'tiktok'
      };
    }

    // For now, return a placeholder implementation
    // TikTok Content Posting API requires special approval and has limited availability
    return {
      success: false,
      error: 'TikTok video posting API requires special approval from TikTok. Currently only available for verified business accounts.',
      platform: 'tiktok'
    };
  } catch (error) {
    console.error('🎵 TikTok posting error:', error);
    return {
      success: false,
      error: error.message || 'Failed to post to TikTok',
      platform: 'tiktok'
    };
  }
};

// Post to Telegram
const postToTelegram = async (account, content, media = []) => {
  try {
    console.log(`🔵 Posting to Telegram for account: ${account.username}`);
    
    const chatId = account.platform_user_id;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Check if this is a group+channel connection
    let channelInfo = null;
    if (account.refresh_token) {
      try {
        channelInfo = JSON.parse(account.refresh_token);
        if (channelInfo.channelId) {
          console.log(`🔗 Detected group+channel connection: ${channelInfo.channelTitle}`);
        }
      } catch (e) {
        // refresh_token is not channel info, continue normally
      }
    }

    let result;
    let targetId, targetType;
    
    // Smart posting logic: 
    // - If there's a linked channel, post ONLY to the channel (it will auto-forward to supergroup)
    // - If no linked channel, post directly to the group/supergroup
    if (channelInfo && channelInfo.channelId) {
      console.log(`📢 Posting to linked channel (will auto-forward to group): ${channelInfo.channelTitle}`);
      targetId = channelInfo.channelId;
      targetType = 'channel';
    } else {
      console.log(`📱 Posting directly to group/supergroup`);
      targetId = chatId;
      targetType = 'group';
    }
    
    // Send the post to the target (either channel or group)
    if (media.length === 0) {
      result = await sendTelegramTextMessage(targetId, content, botToken);
    } else {
      if (media.length === 1) {
        const mediaItem = media[0];
        if (mediaItem.type === 'image') {
          result = await sendTelegramPhoto(targetId, mediaItem, content, botToken);
        } else if (mediaItem.type === 'video') {
          result = await sendTelegramVideo(targetId, mediaItem, content, botToken);
        } else {
          result = await sendTelegramDocument(targetId, mediaItem, content, botToken);
        }
      } else {
        result = await sendTelegramMediaGroup(targetId, media, content, botToken);
      }
    }
    
    if (result.ok) {
      let message;
      if (media.length === 0) {
        message = channelInfo 
          ? `Text posted to channel (auto-forwarding to linked group): ${channelInfo.channelTitle}`
          : 'Text posted to group successfully';
      } else if (media.length === 1) {
        const mediaType = media[0].type === 'image' ? 'Image' : media[0].type === 'video' ? 'Video' : 'Document';
        message = channelInfo 
          ? `${mediaType} posted to channel (auto-forwarding to linked group): ${channelInfo.channelTitle}`
          : `${mediaType} posted to group successfully`;
      } else {
        message = channelInfo 
          ? `Media group (${media.length} items) posted to channel (auto-forwarding to linked group): ${channelInfo.channelTitle}`
          : `Media group (${media.length} items) posted to group successfully`;
      }
        
      console.log(`✅ Telegram posting completed: ${message}`);
      return {
        success: true,
        postId: Array.isArray(result.result) ? result.result[0].message_id.toString() : result.result.message_id.toString(),
        platform: 'telegram',
        message: message,
        details: {
          targetType: targetType,
          targetId: targetId,
          channelTitle: channelInfo?.channelTitle,
          autoForwarding: !!channelInfo,
          mediaCount: media.length,
          mediaTypes: media.map(m => m.type)
        }
      };
    } else {
      const errorMsg = `Failed to post to ${targetType}: ${result.description || 'Unknown error'}`;
      console.log(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('❌ Error posting to Telegram:', error);
    return {
      success: false,
      error: error.message || 'Failed to post to Telegram'
    };
  }
};

// Send text message to Telegram
async function sendTelegramTextMessage(chatId, text, botToken) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('❌ Telegram send message error:', error);
    throw error;
  }
}

// Send photo to Telegram
async function sendTelegramPhoto(chatId, mediaItem, caption, botToken) {
  try {
    console.log(`📸 Uploading photo to Telegram: ${mediaItem.name}`);
    console.log(`🎯 Target chat ID: ${chatId}`);
    console.log(`🤖 Bot token length: ${botToken ? botToken.length : 'undefined'}`);
    
    // Quick test to ensure basic API access works
    try {
      const testResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const testResult = await testResponse.json();
      if (!testResult.ok) {
        throw new Error(`Bot token invalid: ${testResult.description}`);
      }
      console.log(`✅ Bot token verified successfully: @${testResult.result.username}`);
    } catch (error) {
      console.error('❌ Bot token verification failed:', error);
      throw new Error(`Bot token verification failed: ${error.message}`);
    }

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', Buffer.from(mediaItem.buffer), { filename: mediaItem.name });
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log(`📸 Photo upload result:`, result.ok ? '✅ Success' : `❌ Failed: ${result.description}`);
    
    return result;
  } catch (error) {
    console.error('❌ Telegram send photo error:', error);
    throw error;
  }
}

// Send video to Telegram
async function sendTelegramVideo(chatId, mediaItem, caption, botToken) {
  try {
    console.log(`🎥 Uploading video to Telegram: ${mediaItem.name}`);
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('video', Buffer.from(mediaItem.buffer), { filename: mediaItem.name });
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  } catch (error) {
    console.error('❌ Telegram send video error:', error);
    throw error;
  }
}

// Send document to Telegram
async function sendTelegramDocument(chatId, mediaItem, caption, botToken) {
  try {
    console.log(`📄 Uploading document to Telegram: ${mediaItem.name}`);
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', Buffer.from(mediaItem.buffer), { filename: mediaItem.name });
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  } catch (error) {
    console.error('❌ Telegram send document error:', error);
    throw error;
  }
}

// Send media group to Telegram
async function sendTelegramMediaGroup(chatId, media, caption, botToken) {
  try {
    console.log(`📁 Uploading media group to Telegram (${media.length} items)`);
    
    const mediaArray = media.map((item, index) => ({
      type: item.type === 'image' ? 'photo' : 'video',
      media: `attach://file${index}`,
      caption: index === 0 ? caption : undefined,
      parse_mode: index === 0 ? 'HTML' : undefined
    }));
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('media', JSON.stringify(mediaArray));
    
    media.forEach((item, index) => {
      formData.append(`file${index}`, Buffer.from(item.buffer), { filename: item.name });
    });
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  } catch (error) {
    console.error('❌ Telegram send media group error:', error);
    throw error;
  }
}

// Discord posting function
const postToDiscord = async (account, content, media = [], discordChannels = {}) => {
  try {
    console.log(`🎮 Posting to Discord for account ${account.username}`);
    console.log(`📝 Content: ${content}`);
    console.log(`📎 Media items: ${media.length}`);
    
    // Check if user selected a specific channel for this account
    const selectedChannelId = discordChannels[account.id];
    if (selectedChannelId) {
      console.log(`🎯 User selected channel: ${selectedChannelId}`);
    }
    
    // Parse metadata to get Discord-specific info
    console.log(`🔍 Discord account metadata:`, account.metadata);
    let metadata = {};
    try {
      metadata = JSON.parse(account.metadata || '{}');
      console.log(`🔍 Parsed metadata:`, metadata);
    } catch (error) {
      console.error('❌ Failed to parse Discord metadata:', error);
      console.log(`🔍 Raw metadata value:`, account.metadata);
    }
    
    const guilds = metadata.guilds || [];
    let primaryGuild = metadata.primaryGuild;
    
    console.log(`🔍 Primary guild from metadata:`, primaryGuild);
    console.log(`🔍 Available guilds:`, guilds.length);
    
    // Fallback: If no primaryGuild in metadata, try to get user's guilds using access token
    if (!primaryGuild && account.access_token) {
      console.log(`🔄 No primary guild found, attempting to fetch guilds using access token...`);
      try {
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { 'Authorization': `Bearer ${account.access_token}` }
        });
        
        if (guildsResponse.ok) {
          const freshGuildsData = await guildsResponse.json();
          console.log(`🔄 Fetched ${freshGuildsData.length} guilds from Discord API`);
          
          // Find a suitable guild (prioritize ones where user has management permissions)
          primaryGuild = freshGuildsData.find(guild => 
            (guild.permissions & 0x20) || // MANAGE_MESSAGES
            (guild.permissions & 0x8) ||  // ADMINISTRATOR  
            guild.owner
          ) || freshGuildsData[0]; // Fallback to first guild
          
          if (primaryGuild) {
            console.log(`✅ Found fallback primary guild: ${primaryGuild.name} (${primaryGuild.id})`);
            
            // Update account metadata with the correct information
            try {
              await SocialAccountService.update(account.id, {
                metadata: JSON.stringify({
                  ...metadata,
                  guilds: freshGuildsData,
                  primaryGuild: primaryGuild,
                  updated_at: new Date().toISOString()
                })
              }, account.user_id);
              console.log(`✅ Updated account metadata with primary guild information`);
            } catch (updateError) {
              console.log(`⚠️ Could not update account metadata:`, updateError.message);
            }
          }
        }
      } catch (apiError) {
        console.log(`⚠️ Could not fetch guilds from Discord API:`, apiError.message);
      }
    }
    
    if (!primaryGuild) {
      throw new Error('No Discord server found for posting. Please ensure the Discord bot has been added to at least one server where you have posting permissions, or try reconnecting your Discord account.');
    }
    
    // Determine target channel - use user selection or fallback to auto-detection
    let targetChannelId = selectedChannelId; // Start with user selection
    let targetChannelName = 'user-selected';
    
    // If user didn't select a channel, use the original auto-detection logic
    if (!targetChannelId) {
      console.log(`🔍 No channel selected by user, auto-detecting suitable channel...`);
      
      try {
        // Fetch guild channels using bot token
        const channelsResponse = await fetch(`https://discord.com/api/guilds/${primaryGuild.id}/channels`, {
          headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });
        
        if (channelsResponse.ok) {
          const channels = await channelsResponse.json();
          // Find the first text channel where bot has permission to send messages
          const textChannel = channels.find(channel => 
            channel.type === 0 && // Text channel
            channel.name !== 'rules' && 
            channel.name !== 'announcements'
          );
          
          if (textChannel) {
            targetChannelId = textChannel.id;
            targetChannelName = textChannel.name;
            console.log(`🎯 Auto-detected channel: #${textChannel.name} (${textChannel.id})`);
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch Discord channels:', error);
      }
    } else {
      console.log(`🎯 Using user-selected channel: ${targetChannelId}`);
      
      // Optionally verify the channel exists and bot has access (for better error messages)
      try {
        const channelResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}`, {
          headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });
        
        if (channelResponse.ok) {
          const channelData = await channelResponse.json();
          targetChannelName = channelData.name;
          console.log(`✅ Verified access to selected channel: #${channelData.name}`);
        } else {
          console.log(`⚠️ Could not verify selected channel, but proceeding with posting attempt`);
        }
  } catch (error) {
        console.log(`⚠️ Could not verify selected channel access:`, error.message);
      }
    }
    
    if (!targetChannelId) {
      throw new Error('No suitable Discord channel found for posting. Ensure bot has access to at least one text channel.');
    }
    
    // Prepare the base content (will be refined later for media posts)
    const baseContent = content?.trim() || '';
    console.log(`📝 Base content: "${baseContent}" (${baseContent.length} chars)`);
    
    // Prepare the message payload for text-only messages
    const messagePayload = {
      content: baseContent.length > 2000 ? baseContent.substring(0, 1997) + '...' : baseContent
    };
    
    // Handle media files
    let mediaUploadResults = [];
    if (media.length > 0) {
      console.log(`📤 Preparing to upload ${media.length} media file(s) to Discord`);
      
      // Discord allows up to 10 files per message, each up to 25MB (with Nitro) or 8MB (without)
      const maxFiles = Math.min(media.length, 10);
      const mediaToUpload = media.slice(0, maxFiles);
      
      // Check file sizes and warn if too large
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
      const oversizedFiles = mediaToUpload.filter(item => item.size > MAX_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        console.log(`⚠️  Warning: ${oversizedFiles.length} file(s) exceed Discord's 25MB limit`);
      }
      
      // Log media details for debugging
      mediaToUpload.forEach((item, index) => {
        console.log(`📎 Media ${index + 1}: ${item.name} (${item.type}, ${(item.size / 1024 / 1024).toFixed(2)}MB)`);
      });
      
      // Use axios for better form-data handling
      const axios = require('axios');
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Ensure content is not empty and properly formatted
      const finalContent = baseContent || 'Media attachment';
      const truncatedContent = finalContent.length > 2000 ? finalContent.substring(0, 1997) + '...' : finalContent;
      console.log(`📝 Final content being sent: "${truncatedContent}" (${truncatedContent.length} chars)`);
      
      // Add the message content as JSON
      formData.append('payload_json', JSON.stringify({
        content: truncatedContent
      }));
      
      // Add each media file
      mediaToUpload.forEach((mediaItem, index) => {
        console.log(`📎 Adding file ${index}: ${mediaItem.name} (${mediaItem.type}, ${mediaItem.size} bytes)`);
        formData.append(`files[${index}]`, mediaItem.buffer, {
          filename: mediaItem.name,
          contentType: mediaItem.type
        });
      });
      
      console.log(`📤 Sending Discord message with ${mediaToUpload.length} attachments to channel ${targetChannelId}`);
      
      try {
        // Send message with attachments using axios
        const response = await axios.post(`https://discord.com/api/channels/${targetChannelId}/messages`, formData, {
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            ...formData.getHeaders()
          }
        });
        
        const data = response.data;
        
        mediaUploadResults = data.attachments || [];
        
        console.log(`✅ Posted to Discord with ${mediaUploadResults.length} media file(s)`);
        console.log(`📊 Message details: ID=${data.id}, Channel=${targetChannelId}, Guild=${primaryGuild.id}`);
        
        return {
          success: true,
          postId: data.id,
          platform: 'discord',
          message: `Posted to Discord #${targetChannelName} successfully with ${mediaUploadResults.length} media file(s)`,
          details: {
            channelId: targetChannelId,
            channelName: targetChannelName,
            guildId: primaryGuild.id,
            guildName: primaryGuild.name,
            mediaCount: mediaUploadResults.length,
            messageUrl: `https://discord.com/channels/${primaryGuild.id}/${targetChannelId}/${data.id}`,
            userSelected: !!selectedChannelId
          }
        };
        
      } catch (error) {
        console.error('❌ Discord posting error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorData: error.response?.data
        });
        
        // Provide more specific error messages
        if (error.response?.status === 413) {
          throw new Error('File too large for Discord (max 25MB per file)');
        } else if (error.response?.status === 403) {
          throw new Error('Bot lacks permissions to post in this Discord channel');
        } else if (error.response?.status === 400 && error.response?.data?.message) {
          throw new Error(`Discord API error: ${error.response.data.message}`);
        } else {
          throw new Error(`Discord posting failed (${error.response?.status || 'Unknown'}): ${error.response?.data?.message || error.message}`);
        }
      }
      
    } else {
      // Send text-only message
      console.log(`📤 Sending text-only message to Discord`);
      console.log(`📝 Message payload: ${JSON.stringify(messagePayload)}`);
      
      // Ensure text-only message has content
      if (!messagePayload.content || messagePayload.content.trim() === '') {
        throw new Error('Cannot send empty message to Discord');
      }
      
      const response = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
        },
        body: JSON.stringify(messagePayload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Discord posting error:', {
          status: response.status,
          statusText: response.statusText,
          errorData: data
        });
        throw new Error(data.message || 'Failed to post to Discord');
      }
      
      console.log(`✅ Posted text message to Discord`);
      
      return {
        success: true,
        postId: data.id,
        platform: 'discord',
        message: `Posted to Discord #${targetChannelName} successfully`,
        details: {
          channelId: targetChannelId,
          channelName: targetChannelName,
          guildId: primaryGuild.id,
          guildName: primaryGuild.name,
          messageUrl: `https://discord.com/channels/${primaryGuild.id}/${targetChannelId}/${data.id}`,
          userSelected: !!selectedChannelId
        }
      };
    }
    
  } catch (error) {
    console.error('❌ Error posting to Discord:', error);
    return {
      success: false,
      error: error.message || 'Failed to post to Discord',
      platform: 'discord'
    };
  }
};

// Helper function to create media references for Reddit posts
// Reddit OAuth API has limited media upload capabilities, so we reference media in post text
const createRedditMediaReference = async (mediaItem) => {
  try {
    console.log(`📎 Creating Reddit media reference for: ${mediaItem.name}`);
    
    // Extract media information
    let mediaInfo = {
      name: mediaItem.name || 'Untitled Media',
      type: 'Unknown',
      size: 'Unknown'
    };
    
    // Determine media type from data or filename
    if (mediaItem.data && mediaItem.data.startsWith('data:')) {
      const mimeMatch = mediaItem.data.match(/data:([^;]+);/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        if (mimeType.startsWith('image/')) {
          mediaInfo.type = 'Image';
        } else if (mimeType.startsWith('video/')) {
          mediaInfo.type = 'Video';
        } else if (mimeType.startsWith('audio/')) {
          mediaInfo.type = 'Audio';
        }
      }
      
      // Calculate approximate size from base64 data
      const base64Data = mediaItem.data.split(',')[1];
      if (base64Data) {
        const sizeBytes = (base64Data.length * 3) / 4;
        if (sizeBytes > 1024 * 1024) {
          mediaInfo.size = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
        } else if (sizeBytes > 1024) {
          mediaInfo.size = `${(sizeBytes / 1024).toFixed(1)} KB`;
        } else {
          mediaInfo.size = `${sizeBytes} bytes`;
        }
      }
    } else if (mediaItem.buffer) {
      mediaInfo.size = `${(mediaItem.buffer.length / 1024).toFixed(1)} KB`;
      
      // Try to determine type from filename extension
      const name = mediaItem.name || '';
      const ext = name.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
        mediaInfo.type = 'Image';
      } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
        mediaInfo.type = 'Video';
      } else if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
        mediaInfo.type = 'Audio';
      }
    }
    
    // Create a markdown-formatted media reference
    const mediaReference = `**📎 Media Attachment: ${mediaInfo.name}**\n- Type: ${mediaInfo.type}\n- Size: ${mediaInfo.size}`;
    
    console.log(`✅ Created Reddit media reference successfully`);
    return {
      reference: mediaReference,
      mediaInfo: mediaInfo,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Failed to create Reddit media reference:', error);
    // Return a fallback reference instead of throwing
    return {
      reference: `**📎 Media Attachment: ${mediaItem.name || 'Media File'}**\n- Note: Media file could not be processed`,
      mediaInfo: { name: mediaItem.name || 'Media File', type: 'Unknown', size: 'Unknown' },
      success: false,
      error: error.message
    };
  }
};

// Reddit posting function
const postToReddit = async (account, content, media = []) => {
  try {
    console.log(`🔴 Posting to Reddit for account ${account.username}`);
    console.log(`📝 Content: ${content}`);
    console.log(`📎 Media items: ${media.length}`);
    
    // Parse metadata to get Reddit-specific info
    let metadata = {};
    try {
      metadata = JSON.parse(account.metadata || '{}');
      console.log(`🔍 Parsed metadata:`, metadata);
    } catch (error) {
      console.error('❌ Failed to parse Reddit metadata:', error);
    }
    
    const moderatedSubreddits = metadata.moderated_subreddits || [];
    const karmaInfo = metadata.karma || {};
    console.log(`📊 User moderates ${moderatedSubreddits.length} subreddits`);
    console.log(`📊 User karma: ${karmaInfo.total || 0} (link: ${karmaInfo.link || 0}, comment: ${karmaInfo.comment || 0})`);
    
    // Determine target subreddit
    let targetSubreddit = 'u_' + account.username; // Default to user's profile
    let postToProfile = true;
    
    // Check if user has moderated subreddits and sufficient karma
    if (moderatedSubreddits.length > 0) {
      // Use first moderated subreddit (user has posting permissions there)
      targetSubreddit = moderatedSubreddits[0].name;
      postToProfile = false;
      console.log(`🎯 Using moderated subreddit: r/${targetSubreddit}`);
    } else {
      console.log(`🎯 Posting to user profile: r/${targetSubreddit}`);
    }
    
    // Validate content length
    if (!content || content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }
    
    // Prepare post data
    let postData;
    let postType;
    
    if (media.length > 0) {
      console.log(`📤 Processing ${media.length} media items for Reddit`);
      
      // Filter supported media types
      const supportedMedia = media.filter(m => {
        // Check both the type field and mimeType field, and also check data URL for MIME type
        const type = m.type || '';
        const mimeType = m.mimeType || '';
        
        // Extract MIME type from data URL if available
        let dataMimeType = '';
        if (m.data && m.data.startsWith('data:')) {
          const mimeMatch = m.data.match(/data:([^;]+);/);
          if (mimeMatch) {
            dataMimeType = mimeMatch[1];
          }
        }
        
        console.log(`🔍 Checking media: ${m.name}`);
        console.log(`   type: "${type}"`);
        console.log(`   mimeType: "${mimeType}"`);
        console.log(`   dataMimeType: "${dataMimeType}"`);
        console.log(`   data preview: "${m.data ? m.data.substring(0, 50) + '...' : 'NO_DATA'}"`);
        console.log(`   data starts with 'data:': ${m.data && m.data.startsWith('data:')}`);
        
        // Check if it's an image (multiple ways to detect)
        const isImage = type === 'image' || 
                       type.startsWith('image/') || 
                       mimeType.startsWith('image/') || 
                       dataMimeType.startsWith('image/');
        
        // Check if it's a video (multiple ways to detect)
        const isVideo = type === 'video' || 
                       type.startsWith('video/') || 
                       mimeType.startsWith('video/') || 
                       dataMimeType.startsWith('video/');
        
        console.log(`   isImage: ${isImage}, isVideo: ${isVideo}`);
        
        return isImage || isVideo;
      });
      
      if (supportedMedia.length === 0) {
        console.log(`⚠️ No supported media found, creating text post instead`);
        // Fall back to text post
        postType = 'self';
        postData = {
          api_type: 'json',
          kind: 'self',
          sr: targetSubreddit,
          title: content.length > 300 ? content.substring(0, 297) + '...' : content,
          text: content,
          sendreplies: true,
          validate_on_submit: true
        };
      } else if (supportedMedia.length === 1) {
        // Single image/video post
        const mediaItem = supportedMedia[0];
        
        // Use the same robust detection logic
        const type = mediaItem.type || '';
        const mimeType = mediaItem.mimeType || '';
        let dataMimeType = '';
        if (mediaItem.data && mediaItem.data.startsWith('data:')) {
          const mimeMatch = mediaItem.data.match(/data:([^;]+);/);
          if (mimeMatch) {
            dataMimeType = mimeMatch[1];
          }
        }
        
        const isImage = type === 'image' || 
                       type.startsWith('image/') || 
                       mimeType.startsWith('image/') || 
                       dataMimeType.startsWith('image/');
        
        if (isImage) {
          console.log(`📷 Creating image post for Reddit`);
          
          try {
            // Create media reference for Reddit post (OAuth API has limited media upload)
            const mediaRef = await createRedditMediaReference(mediaItem);
            
            // Create a text post with media reference
            postType = 'self';
            postData = {
              api_type: 'json',
              kind: 'self',
              sr: targetSubreddit,
              title: content.length > 300 ? content.substring(0, 297) + '...' : content,
              text: `${content}\n\n${mediaRef.reference}`,
              sendreplies: true,
              validate_on_submit: true
            };
            
            console.log(`✅ Created Reddit text post with media reference: ${mediaRef.mediaInfo.name}`);
            
          } catch (mediaError) {
            console.error('❌ Failed to create media reference, creating basic text post:', mediaError);
            
            // Fall back to basic text post
            postType = 'self';
            postData = {
              api_type: 'json',
              kind: 'self',
              sr: targetSubreddit,
              title: content.length > 300 ? content.substring(0, 297) + '...' : content,
              text: `${content}\n\n📎 *[Media attachment: ${mediaItem.name}]*`,
              sendreplies: true,
              validate_on_submit: true
            };
          }
        } else {
          // Video post - Reddit's video API is more complex, fall back to text for now
          console.log(`🎥 Video detected - creating text post with video mention`);
          postType = 'self';
          postData = {
            api_type: 'json',
            kind: 'self',
            sr: targetSubreddit,
            title: content.length > 300 ? content.substring(0, 297) + '...' : content,
            text: `${content}\n\n*[Video: ${mediaItem.name}]*`,
            sendreplies: true,
            validate_on_submit: true
          };
        }
      } else {
        // Multiple media items - create text post with detailed media references
        console.log(`📎 Multiple media items detected, creating text post with references`);
        
        const mediaReferences = [];
        for (const mediaItem of supportedMedia) {
          try {
            const mediaRef = await createRedditMediaReference(mediaItem);
            mediaReferences.push(mediaRef.reference);
          } catch (error) {
            console.error(`❌ Failed to create reference for ${mediaItem.name}:`, error);
            mediaReferences.push(`**📎 Media Attachment: ${mediaItem.name}**\n- Note: Could not process file`);
          }
        }
        
        const mediaText = mediaReferences.join('\n\n');
        postType = 'self';
        postData = {
          api_type: 'json',
          kind: 'self',
          sr: targetSubreddit,
          title: content.length > 300 ? content.substring(0, 297) + '...' : content,
          text: `${content}\n\n**Media Attachments:**\n\n${mediaText}`,
          sendreplies: true,
          validate_on_submit: true
        };
      }
    } else {
      // Text post
      postType = 'self';
      postData = {
        api_type: 'json',
        kind: 'self',
        sr: targetSubreddit,
        title: content.length > 300 ? content.substring(0, 297) + '...' : content,
        text: content,
        sendreplies: true,
        validate_on_submit: true
      };
      
      console.log(`📤 Creating text post`);
    }
    
    // Make the post
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NexSocial/1.0'
      },
      body: new URLSearchParams(postData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Reddit posting error:', data);
      
      // Handle specific Reddit API errors
      if (response.status === 401) {
        throw new Error('Reddit authentication expired. Please reconnect your account.');
      } else if (response.status === 403) {
        throw new Error('Permission denied. You may not have posting rights to this subreddit.');
      } else if (response.status === 429) {
        throw new Error('Reddit rate limit exceeded. Please wait before posting again.');
      } else {
        throw new Error(data.message || `Reddit API error (${response.status})`);
      }
    }
    
    // Check for API-level errors
    if (data.json && data.json.errors && data.json.errors.length > 0) {
      const errors = data.json.errors;
      console.error('❌ Reddit API errors:', errors);
      
      // Handle common Reddit errors
      const errorMessages = errors.map(err => {
        const [errorType, errorMsg] = err;
        switch (errorType) {
          case 'RATELIMIT':
            return 'Rate limit exceeded. Please wait before posting again.';
          case 'TOO_LONG':
            return 'Post content is too long for Reddit.';
          case 'NO_TEXT':
            return 'Post must contain text content.';
          case 'SUBREDDIT_NOTALLOWED':
            return `You don't have permission to post in r/${targetSubreddit}.`;
          case 'INVALID_OPTION':
            return 'Invalid post options provided.';
          default:
            return errorMsg || 'Unknown Reddit error';
        }
      });
      
      throw new Error(`Reddit error: ${errorMessages.join(', ')}`);
    }
    
    const postInfo = data.json?.data;
    if (!postInfo) {
      throw new Error('Reddit post submission failed - no response data');
    }
    
    // Construct the Reddit URL
    const redditUrl = `https://reddit.com${postInfo.url}`;
    
    console.log(`✅ Posted to Reddit successfully`);
    console.log(`📊 Post details: ID=${postInfo.id}, URL=${redditUrl}`);
    
    // Determine success message based on post type and media
    let successMessage = `Posted to Reddit r/${targetSubreddit} successfully`;
    if (media.length > 0) {
      if (postType === 'image') {
        successMessage += ` with image upload`;
      } else if (postType === 'self' && media.length > 0) {
        successMessage += ` with ${media.length} media reference(s)`;
      }
    }
    
    return {
      success: true,
      postId: postInfo.id,
      platform: 'reddit',
      message: successMessage,
      details: {
        subreddit: targetSubreddit,
        postType: postType,
        postUrl: redditUrl,
        permalink: postInfo.url,
        fullname: postInfo.name,
        mediaCount: media.length,
        mediaUploaded: postType === 'image',
        postedToProfile: postToProfile,
        userKarma: karmaInfo.total || 0
      }
    };
    
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