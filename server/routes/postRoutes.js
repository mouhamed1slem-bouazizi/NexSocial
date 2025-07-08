const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');
const TwitterOAuthService = require('../services/twitterOAuthService.js');
const YouTubeService = require('../services/youtubeService.js');
const { generateSocialMediaContent } = require('../services/llmService.js');
const FormData = require('form-data');
const axios = require('axios');

const router = express.Router();

// Main posting endpoint
router.post('/', requireUser, async (req, res) => {
  try {
    console.log('📝 Creating new post for user:', req.user._id);
    console.log('📊 Post data:', JSON.stringify(req.body, null, 2));

    const { content, platforms, selectedAccounts, scheduledAt, media } = req.body;

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
            result = await postToDiscord(account, content, processedMedia);
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
const postToDiscord = async (account, content, media = []) => {
  try {
    console.log(`🎮 Posting to Discord for account ${account.username}`);
    console.log(`📝 Content: ${content}`);
    console.log(`📎 Media items: ${media.length}`);
    
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
    
    // Get the first available text channel in the primary guild
    let targetChannelId = null;
    
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
          console.log(`🎯 Target channel: #${textChannel.name} (${textChannel.id})`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch Discord channels:', error);
    }
    
    if (!targetChannelId) {
      throw new Error('No suitable Discord channel found for posting. Ensure bot has access to at least one text channel.');
    }
    
    // Prepare the message payload
    const messagePayload = {
      content: content.length > 2000 ? content.substring(0, 1997) + '...' : content
    };
    
    // Handle media files
    let mediaUploadResults = [];
    if (media.length > 0) {
      console.log(`📤 Preparing to upload ${media.length} media file(s) to Discord`);
      
      // Discord allows up to 10 files per message, each up to 25MB (with Nitro)
      const maxFiles = Math.min(media.length, 10);
      const mediaToUpload = media.slice(0, maxFiles);
      
      // Create form data for the message with attachments
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Add the message content
      formData.append('payload_json', JSON.stringify(messagePayload));
      
      // Add each media file
      mediaToUpload.forEach((mediaItem, index) => {
        formData.append(`files[${index}]`, Buffer.from(mediaItem.buffer), {
          filename: mediaItem.name,
          contentType: mediaItem.type.includes('image') ? 'image/jpeg' : 
                      mediaItem.type.includes('video') ? 'video/mp4' : 
                      'application/octet-stream'
        });
      });
      
      // Send message with attachments
      const response = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Discord posting error:', data);
        throw new Error(data.message || 'Failed to post to Discord');
      }
      
      mediaUploadResults = data.attachments || [];
      
      console.log(`✅ Posted to Discord with ${mediaUploadResults.length} media file(s)`);
      
      return {
        success: true,
        postId: data.id,
        platform: 'discord',
        message: `Posted to Discord successfully with ${mediaUploadResults.length} media file(s)`,
        details: {
          channelId: targetChannelId,
          guildId: primaryGuild.id,
          guildName: primaryGuild.name,
          mediaCount: mediaUploadResults.length,
          messageUrl: `https://discord.com/channels/${primaryGuild.id}/${targetChannelId}/${data.id}`
        }
      };
      
    } else {
      // Send text-only message
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
        console.error('❌ Discord posting error:', data);
        throw new Error(data.message || 'Failed to post to Discord');
      }
      
      console.log(`✅ Posted text message to Discord`);
      
      return {
        success: true,
        postId: data.id,
        platform: 'discord',
        message: 'Posted to Discord successfully',
        details: {
          channelId: targetChannelId,
          guildId: primaryGuild.id,
          guildName: primaryGuild.name,
          messageUrl: `https://discord.com/channels/${primaryGuild.id}/${targetChannelId}/${data.id}`
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

module.exports = router;