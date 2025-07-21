const axios = require('axios');
const FormData = require('form-data');

const postToFacebook = async (account, content, media = [], postDetails = {}) => {
  try {
    const { targetId } = postDetails;
    const pageId = targetId || account.platformUserId;
    const accessToken = account.accessToken;

    if (!pageId || !accessToken) {
      throw new Error('Missing Page ID or Page Access Token for Facebook post.');
    }

    // First, validate the access token by checking if it's still valid
    console.log(`🔍 Validating Facebook access token for page ${pageId}`);
    const tokenValidationResponse = await axios.get(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);
    
    if (!tokenValidationResponse.data || !tokenValidationResponse.data.id) {
      throw new Error('Facebook access token is invalid or expired. Please reconnect your Facebook account.');
    }
    
    console.log(`✅ Facebook access token is valid for: ${tokenValidationResponse.data.name || pageId}`);

    if (media.length > 0) {
      const mediaItem = media[0];
      
      // Improved video detection - check both type and file extension
      const isVideo = (mediaItem.type && mediaItem.type.startsWith('video/')) || 
                     (mediaItem.name && /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(mediaItem.name));
      
      // Check file size - Facebook limits: Videos 1.75GB, Images 4MB
      const fileSizeMB = mediaItem.buffer.length / (1024 * 1024);
      console.log(`📁 File size: ${fileSizeMB.toFixed(2)}MB, Type: ${mediaItem.type}, Name: ${mediaItem.name}`);
      
      if (isVideo && fileSizeMB > 1024) { // 1GB limit for videos
        throw new Error(`Video file is too large (${fileSizeMB.toFixed(2)}MB). Facebook allows videos up to 1GB.`);
      }
      
      if (!isVideo && fileSizeMB > 4) { // 4MB limit for images
        throw new Error(`Image file is too large (${fileSizeMB.toFixed(2)}MB). Facebook allows images up to 4MB.`);
      }

      const endpoint = isVideo ? 'videos' : 'photos';
      const postUrl = `https://graph.facebook.com/v18.0/${pageId}/${endpoint}`;

      console.log(`📤 Posting ${isVideo ? 'video' : 'image'} to Facebook page: ${pageId}`);
      console.log(`🔗 Using endpoint: ${endpoint}`);

      const formData = new FormData();
      formData.append('access_token', accessToken);
      
      // For photos, use 'message' parameter, for videos use 'description'
      if (isVideo) {
        formData.append('description', content);
        // Set proper content type for video
        formData.append('source', mediaItem.buffer, {
          filename: mediaItem.name || 'video.mp4',
          contentType: mediaItem.type || 'video/mp4',
        });
      } else {
        formData.append('message', content);
        // Set proper content type for image
        formData.append('source', mediaItem.buffer, {
          filename: mediaItem.name || 'image.jpg',
          contentType: mediaItem.type || 'image/jpeg',
        });
      }

      const config = {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: isVideo ? 600000 : 60000, // 10 minutes for videos, 1 minute for images
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };

      console.log(`📋 Request config: ${JSON.stringify({
        url: postUrl,
        timeout: config.timeout,
        isVideo: isVideo,
        fileSize: `${fileSizeMB.toFixed(2)}MB`
      })}`);

      const response = await axios.post(postUrl, formData, config);

      console.log(`✅ Successfully posted ${isVideo ? 'video' : 'image'} to Facebook. Post ID: ${response.data.id}`);

      return {
        success: true,
        postId: response.data.id,
        message: 'Media posted to Facebook successfully',
      };
    }

    // Text-only post
    console.log(`📤 Posting text to Facebook page: ${pageId}`);
    const postUrl = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    const response = await axios.post(postUrl, {
      message: content,
      access_token: accessToken,
    });

    console.log(`✅ Successfully posted text to Facebook. Post ID: ${response.data.id}`);

    return {
      success: true,
      postId: response.data.id,
      message: 'Posted to Facebook successfully',
    };
  } catch (error) {
    console.error(`❌ Facebook posting error for account ${account.id}:`, error.message);
    
    // Provide more specific error details
    if (error.response?.data) {
      console.error('📋 Facebook API Error Details:', JSON.stringify(error.response.data, null, 2));
      
      // Handle specific Facebook API errors
      if (error.response.data.error) {
        const fbError = error.response.data.error;
        
        if (fbError.code === 100 || fbError.type === 'OAuthException') {
          return {
            success: false,
            error: 'Facebook access token is invalid or expired. Please reconnect your Facebook account.',
          };
        }
        
        if (fbError.code === 200) {
          return {
            success: false,
            error: 'Missing permissions to post to this Facebook page. Please check your page permissions.',
          };
        }
        
        if (fbError.code === 368) {
          return {
            success: false,
            error: 'The Facebook page access token is temporarily unavailable. Please try again later.',
          };
        }
        
        // Handle file upload specific errors
        if (fbError.error_subcode === 1366046) {
          return {
            success: false,
            error: 'File format not supported or file too large. Please use a smaller MP4 video file (under 100MB) or a supported image format.',
          };
        }
        
        // Return the specific Facebook error message
        return {
          success: false,
          error: `Facebook API Error: ${fbError.message}`,
        };
      }
    }
    
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = postToFacebook; 