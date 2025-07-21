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
      const postUrl = `https://graph.facebook.com/v18.0/${pageId}/${endpoint}`;

      const formData = new FormData();
      formData.append('access_token', accessToken);
      formData.append('caption', content);
      formData.append('source', mediaItem.buffer, {
        filename: mediaItem.name || (isVideo ? 'video.mp4' : 'image.jpg'),
        contentType: mediaItem.type,
      });

      const response = await axios.post(postUrl, formData, {
        headers: formData.getHeaders(),
      });

      return {
        success: true,
        postId: response.data.id,
        message: 'Media posted to Facebook successfully',
      };
    }

    const postUrl = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    const body = {
      message: content,
      access_token: accessToken,
    };

    const response = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to post to Facebook');
    }

    return {
      success: true,
      postId: data.id,
      message: 'Posted to Facebook successfully',
    };
  } catch (error) {
    console.error(`❌ Facebook posting error for account ${account.id}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = postToFacebook; 