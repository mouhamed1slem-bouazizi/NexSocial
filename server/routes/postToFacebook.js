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

    if (media.length > 0) {
      const mediaItem = media[0];
      const isVideo = mediaItem.type && mediaItem.type.startsWith('video/');
      const endpoint = isVideo ? 'videos' : 'photos';
      const postUrl = `https://graph.facebook.com/v18.0/${pageId}/${endpoint}?access_token=${accessToken}`;

      const formData = new FormData();
      // For photos, use 'message' parameter, for videos use 'description'
      if (isVideo) {
        formData.append('description', content);
      } else {
        formData.append('message', content);
      }
      formData.append('source', mediaItem.buffer, {
        filename: mediaItem.name || (isVideo ? 'video.mp4' : 'image.jpg'),
        contentType: mediaItem.type,
      });

      const response = await axios.post(postUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return {
        success: true,
        postId: response.data.id,
        message: 'Media posted to Facebook successfully',
      };
    }

    // Text-only post
    const postUrl = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    const response = await axios.post(postUrl, {
      message: content,
      access_token: accessToken,
    });

    return {
      success: true,
      postId: response.data.id,
      message: 'Posted to Facebook successfully',
    };
  } catch (error) {
    console.error(`❌ Facebook posting error for account ${account.id}:`, error.message);
    if (error.response?.data) {
      console.error('Facebook API Error Details:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = postToFacebook; 