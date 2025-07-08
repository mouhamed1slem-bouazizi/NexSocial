const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');
const TwitterOAuthService = require('../services/twitterOAuthService.js');
const YouTubeService = require('../services/youtubeService.js');
const { generateSocialMediaContent } = require('../services/llmService.js');
const FormData = require('form-data');
const axios = require('axios');

const router = express.Router();

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
    
    // Check if we have OAuth 1.0a credentials for media upload
    const hasOAuth1Credentials = account.oauth1_access_token && account.oauth1_access_token_secret;
    
    if (!hasOAuth1Credentials && media.length > 0) {
      console.log('No OAuth 1.0a credentials found for media upload. Falling back to text-only posting.');
      
      // Create a unique timestamp to avoid duplicate content
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      
      // Add media information to the tweet text with timestamp for uniqueness
      let tweetText = content;
      const mediaPreview = createMediaPreview(media);
      const uniqueNote = `\n\n⏰ ${timestamp}`;
      const totalLength = tweetText.length + mediaPreview.length + uniqueNote.length;
      
      if (totalLength <= 280) {
        tweetText += mediaPreview + uniqueNote;
      } else {
        // Truncate content to make room for media info and timestamp
        const availableSpace = 280 - mediaPreview.length - uniqueNote.length;
        tweetText = tweetText.substring(0, Math.max(0, availableSpace)) + mediaPreview + uniqueNote;
      }
      
      console.log(`Modified tweet to include media reference with timestamp`);
      
      const body = {
        text: tweetText.substring(0, 280)
      };

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Twitter post error:', data);
        
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
            account.oauth1_access_token, 
            account.oauth1_access_token_secret
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

    // Post tweet with media (add timestamp to avoid duplicates)
    let tweetContent = content;
    if (mediaIds.length === 0) {
      // Add timestamp to avoid duplicate content when no media is uploaded
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const uniqueNote = `\n\n⏰ ${timestamp}`;
      if (tweetContent.length + uniqueNote.length <= 280) {
        tweetContent += uniqueNote;
      } else {
        tweetContent = tweetContent.substring(0, 280 - uniqueNote.length) + uniqueNote;
      }
    }
    
    const tweetData = await twitterService.postTweet(
      tweetContent,
      mediaIds,
      account.access_token
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
    console.error('Twitter posting error:', error);
    return {
      success: false,
      error: error.message
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
      console.log(`✅ Bot verified: ${testResult.result.first_name} (@${testResult.result.username})`);
    } catch (botError) {
      console.error('❌ Bot verification failed:', botError);
      throw new Error(`Bot verification failed: ${botError.message}`);
    }
    
    // Convert base64 to buffer
    console.log('📊 Media item structure:', {
      name: mediaItem.name,
      type: mediaItem.type,
      hasData: !!mediaItem.data,
      dataLength: mediaItem.data ? mediaItem.data.length : 0,
      dataPrefix: mediaItem.data ? mediaItem.data.substring(0, 50) : 'no data'
    });
    
    if (!mediaItem.data) {
      throw new Error('No media data provided');
    }
    
    const base64Data = mediaItem.data.includes(',') ? mediaItem.data.split(',')[1] : mediaItem.data;
    const mediaBuffer = Buffer.from(base64Data, 'base64');
    
    console.log(`📊 Buffer created: ${mediaBuffer.length} bytes (${(mediaBuffer.length / 1024).toFixed(2)} KB)`);
    
    if (mediaBuffer.length === 0) {
      throw new Error('Invalid media data - buffer is empty');
    }
    
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('photo', mediaBuffer, {
      filename: mediaItem.name,
      contentType: mediaItem.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    });
    
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }
    
    console.log('📤 FormData prepared, using axios for upload...');
    
    try {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000 // 30 second timeout
      });
      
      const result = response.data;
      console.log('📤 Axios response received:', response.status);
      
      if (!result.ok) {
        console.error('❌ Telegram photo upload failed:', result);
        throw new Error(result.description || 'Failed to upload photo to Telegram');
      }
      
      console.log('✅ Photo uploaded to Telegram successfully');
      return result;
         } catch (axiosError) {
       console.error('❌ Axios request failed:', axiosError.message);
       if (axiosError.response) {
         console.error('❌ Response status:', axiosError.response.status);
         console.error('❌ Response data:', axiosError.response.data);
         throw new Error(`Telegram API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
       } else {
         throw new Error(`Network error: ${axiosError.message}`);
       }
     }
  } catch (error) {
    console.error('❌ Telegram send photo error:', error);
    throw error;
  }
}

// Send video to Telegram
async function sendTelegramVideo(chatId, mediaItem, caption, botToken) {
  try {
    console.log(`🎬 Uploading video to Telegram: ${mediaItem.name}`);
    
    // Convert base64 to buffer
    console.log('📊 Video item structure:', {
      name: mediaItem.name,
      type: mediaItem.type,
      hasData: !!mediaItem.data,
      dataLength: mediaItem.data ? mediaItem.data.length : 0,
      dataPrefix: mediaItem.data ? mediaItem.data.substring(0, 50) : 'no data'
    });
    
    if (!mediaItem.data) {
      throw new Error('No video data provided');
    }
    
    const base64Data = mediaItem.data.includes(',') ? mediaItem.data.split(',')[1] : mediaItem.data;
    const mediaBuffer = Buffer.from(base64Data, 'base64');
    
    console.log(`📊 Video buffer created: ${mediaBuffer.length} bytes (${(mediaBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
    if (mediaBuffer.length === 0) {
      throw new Error('Invalid video data - buffer is empty');
    }
    
    // Telegram video size limit is 50MB
    if (mediaBuffer.length > 50 * 1024 * 1024) {
      throw new Error('Video file too large. Telegram limit is 50MB.');
    }
    
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('video', mediaBuffer, {
      filename: mediaItem.name,
      contentType: 'video/mp4'
    });
    
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }
    
    console.log('📤 Video FormData prepared, sending to Telegram...');
    
    try {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendVideo`, formData, {
        headers: formData.getHeaders(),
        timeout: 60000 // 60 second timeout for videos
      });
      
      const result = response.data;
      console.log('📤 Axios video response received:', response.status);
      
      if (!result.ok) {
        console.error('❌ Telegram video upload failed:', result);
        throw new Error(result.description || 'Failed to upload video to Telegram');
      }
      
      console.log('✅ Video uploaded to Telegram successfully');
      return result;
    } catch (axiosError) {
      console.error('❌ Axios video request failed:', axiosError.message);
      if (axiosError.response) {
        console.error('❌ Response status:', axiosError.response.status);
        console.error('❌ Response data:', axiosError.response.data);
        throw new Error(`Telegram API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else {
        throw new Error(`Network error: ${axiosError.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Telegram send video error:', error);
    throw error;
  }
}

// Send document to Telegram
async function sendTelegramDocument(chatId, mediaItem, caption, botToken) {
  try {
    console.log(`📎 Uploading document to Telegram: ${mediaItem.name}`);
    
    // Convert base64 to buffer
    const base64Data = mediaItem.data.split(',')[1] || mediaItem.data; // Remove data URI prefix if present
    const mediaBuffer = Buffer.from(base64Data, 'base64');
    
    console.log(`📊 Document size: ${(mediaBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Telegram document size limit is 50MB
    if (mediaBuffer.length > 50 * 1024 * 1024) {
      throw new Error('Document file too large. Telegram limit is 50MB.');
    }
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', mediaBuffer, {
      filename: mediaItem.name,
      contentType: 'application/octet-stream'
    });
    
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error('❌ Telegram document upload failed:', result);
      throw new Error(result.description || 'Failed to upload document to Telegram');
    }
    
    console.log('✅ Document uploaded to Telegram successfully');
    return result;
  } catch (error) {
    console.error('❌ Telegram send document error:', error);
    throw error;
  }
}

// Send media group to Telegram
async function sendTelegramMediaGroup(chatId, mediaItems, caption, botToken) {
  try {
    console.log(`📸🎬 Uploading media group to Telegram: ${mediaItems.length} items`);
    
    // Telegram media group limits: 2-10 items, max 50MB per item
    if (mediaItems.length < 2 || mediaItems.length > 10) {
      throw new Error('Media group must contain 2-10 items');
    }
    
    const formData = new FormData();
    const media = [];
    
    // Process each media item
    for (let index = 0; index < mediaItems.length; index++) {
      const item = mediaItems[index];
      const attachmentName = `media_${index}`;
      
      // Convert base64 to buffer
      const base64Data = item.data.split(',')[1] || item.data;
      const mediaBuffer = Buffer.from(base64Data, 'base64');
      
      console.log(`📊 Item ${index + 1} (${item.name}): ${(mediaBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Check size limit
      if (mediaBuffer.length > 50 * 1024 * 1024) {
        throw new Error(`File ${item.name} too large. Telegram limit is 50MB per file.`);
      }
      
      // Determine content type
      let contentType = 'application/octet-stream';
      if (item.type === 'image') {
        contentType = item.name.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
      } else if (item.type === 'video') {
        contentType = 'video/mp4';
      }
      
      // Add to form data
      formData.append(attachmentName, mediaBuffer, {
        filename: item.name,
        contentType: contentType
      });
      
      // Add to media array
      media.push({
        type: item.type === 'image' ? 'photo' : 'video',
        media: `attach://${attachmentName}`,
        caption: index === 0 ? caption : undefined, // Only add caption to first item
        parse_mode: index === 0 ? 'HTML' : undefined
      });
    }
    
    formData.append('chat_id', chatId);
    formData.append('media', JSON.stringify(media));
    
    console.log('📤 Sending media group to Telegram...');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error('❌ Telegram media group upload failed:', result);
      throw new Error(result.description || 'Failed to upload media group to Telegram');
    }
    
    console.log('✅ Media group uploaded to Telegram successfully');
    return result;
  } catch (error) {
    console.error('❌ Telegram send media group error:', error);
    throw error;
  }
}

// Main posting function
const postToSocialMedia = async (account, content, media = []) => {
  console.log(`Posting to ${account.platform} for account ${account.username}`);

  switch (account.platform) {
    case 'facebook':
      return await postToFacebook(account, content, media);
    case 'twitter':
      return await postToTwitter(account, content, media);
    case 'linkedin':
      return await postToLinkedIn(account, content, media);
    case 'instagram':
      return await postToInstagram(account, content, media);
    case 'youtube':
      return await postToYouTube(account, content, media);
    case 'tiktok':
      return await postToTikTok(account, content, media);
    case 'pinterest':
    case 'discord':
    case 'telegram':
      return await postToTelegram(account, content, media);
    case 'whatsapp':
    case 'snapchat':
    case 'reddit':
    case 'vimeo':
    case 'threads':
    case 'twitch':
    case 'line':
    case 'tumblr':
    case 'vk':
      return {
        success: false,
        error: `Posting to ${account.platform} is not implemented yet. This platform is available for connection but posting functionality is coming soon.`
      };
    default:
      return {
        success: false,
        error: `Posting to ${account.platform} is not supported yet`
      };
  }
};

// Create and publish a post
router.post('/', requireUser, async (req, res) => {
  try {
    const { content, selectedAccounts, scheduledAt, media = [] } = req.body;
    const userId = req.user.id;

    console.log(`📝 Creating post for user: ${userId}`);
    console.log(`Selected accounts: ${selectedAccounts?.join(', ')}`);
    console.log(`Media items: ${media.length}`);
    if (media.length > 0) {
      console.log('Media details:', media.map(m => `${m.name} (${m.type})`).join(', '));
    }

    // Validate input
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Post content is required'
      });
    }

    if (!selectedAccounts || selectedAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one social account must be selected'
      });
    }

    // Check if scheduled for future
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      // TODO: Implement scheduling logic (could use a job queue like Bull)
      return res.status(200).json({
        success: true,
        message: 'Post scheduled successfully',
        results: {}
      });
    }

    // Get the selected social accounts
    const accountPromises = selectedAccounts.map(accountId => 
      SocialAccountService.getById(accountId, userId)
    );

    const accounts = await Promise.all(accountPromises);
    const validAccounts = accounts.filter(account => account && account.is_connected);

    if (validAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid connected accounts found'
      });
    }

    // Post to each selected account
    const results = {};
    const postPromises = validAccounts.map(async (account) => {
      const result = await postToSocialMedia(account, content, media);
      results[account.id] = result;
      return result;
    });

    await Promise.all(postPromises);

    // Check if at least one post was successful
    const successfulPosts = Object.values(results).filter(result => result.success);
    const failedPosts = Object.values(results).filter(result => !result.success);

    // Check for LinkedIn reconnection requirements
    const linkedinReconnectRequired = Object.values(results).some(result => 
      result.requiresReconnect && result.error && result.error.includes('LinkedIn')
    );

    let message = '';
    if (successfulPosts.length === validAccounts.length) {
      message = 'Post published successfully to all selected accounts';
    } else if (successfulPosts.length > 0) {
      message = `Post published to ${successfulPosts.length} of ${validAccounts.length} accounts`;
      if (linkedinReconnectRequired) {
        message += '. LinkedIn accounts need to be reconnected for posting.';
      }
    } else {
      if (linkedinReconnectRequired) {
        message = 'LinkedIn accounts need to be reconnected with profile permissions to enable posting. Please reconnect your LinkedIn account.';
      } else {
        message = 'Failed to publish post to any account';
      }
    }

    console.log(`✅ Post creation completed. Success: ${successfulPosts.length}, Failed: ${failedPosts.length}`);

    res.status(200).json({
      success: successfulPosts.length > 0,
      message,
      results,
      linkedinReconnectRequired
    });

  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create post'
    });
  }
});

// Get all posts for the authenticated user
router.get('/', requireUser, async (req, res) => {
  try {
    // TODO: Implement post storage and retrieval
    // For now, return empty array
    res.status(200).json({
      success: true,
      posts: []
    });
  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch posts'
    });
  }
});

// AI Content Generation endpoint
router.post('/ai-generate', requireUser, async (req, res) => {
  try {
    const { prompt, tone = 'professional', platforms = [] } = req.body;
    const userId = req.user.id;

    console.log(`🤖 AI content generation requested by user: ${userId}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Tone: ${tone}`);
    console.log(`Platforms: ${platforms.join(', ')}`);

    // Validate input
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required for AI content generation'
      });
    }

    // Generate content using OpenAI
    const generatedContent = await generateSocialMediaContent(prompt.trim(), tone, platforms);

    console.log('✅ AI content generated successfully');

    res.status(200).json({
      success: true,
      content: generatedContent,
      message: 'AI content generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating AI content:', error);
    
    // Handle specific OpenAI errors
    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key is not configured properly. Please check your environment variables.',
        message: 'AI service configuration error'
      });
    }

    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'AI service rate limit exceeded. Please try again in a few minutes.',
        message: 'Rate limit exceeded'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate AI content',
      message: 'AI content generation failed'
    });
  }
});

module.exports = router; 