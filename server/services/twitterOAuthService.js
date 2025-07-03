const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

class TwitterOAuthService {
  constructor() {
    // OAuth 2.0 credentials (for posting tweets)
    this.oauth2ClientId = process.env.TWITTER_CLIENT_ID;
    this.oauth2ClientSecret = process.env.TWITTER_CLIENT_SECRET;
    
    // OAuth 1.0a credentials (for media upload)
    this.oauth1ConsumerKey = process.env.TWITTER_CONSUMER_KEY || process.env.TWITTER_CLIENT_ID;
    this.oauth1ConsumerSecret = process.env.TWITTER_CONSUMER_SECRET || process.env.TWITTER_CLIENT_SECRET;
    
    // Debug logging
    console.log('🔧 Twitter OAuth Service initialized:');
    console.log('   OAuth 2.0 Client ID:', this.oauth2ClientId ? `${this.oauth2ClientId.substring(0, 10)}...` : 'MISSING');
    console.log('   OAuth 2.0 Client Secret:', this.oauth2ClientSecret ? 'SET' : 'MISSING');
    console.log('   OAuth 1.0a Consumer Key:', this.oauth1ConsumerKey ? `${this.oauth1ConsumerKey.substring(0, 10)}...` : 'MISSING');
    console.log('   OAuth 1.0a Consumer Secret:', this.oauth1ConsumerSecret ? 'SET' : 'MISSING');
    
    // Initialize OAuth 1.0a instance
    this.oauth1 = OAuth({
      consumer: {
        key: this.oauth1ConsumerKey,
        secret: this.oauth1ConsumerSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
      },
    });
  }

  // Generate OAuth 1.0a request token (step 1 of 3-legged OAuth)
  async getOAuth1RequestToken() {
    try {
      const callbackUrl = `${process.env.BASE_URL}/api/oauth/twitter/callback`;
      console.log('🔧 OAuth 1.0a Request Token Details:');
      console.log('   Callback URL:', callbackUrl);
      console.log('   Consumer Key:', this.oauth1ConsumerKey ? `${this.oauth1ConsumerKey.substring(0, 10)}...` : 'MISSING');
      console.log('   Consumer Secret:', this.oauth1ConsumerSecret ? 'SET' : 'MISSING');
      
      const requestData = {
        url: 'https://api.twitter.com/oauth/request_token',
        method: 'POST',
        data: {
          oauth_callback: callbackUrl
        }
      };

      const authHeader = this.oauth1.toHeader(this.oauth1.authorize(requestData));

      const response = await fetch(requestData.url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader.Authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(requestData.data)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`OAuth 1.0a request token failed: ${responseText}`);
      }

      // Parse the response
      const params = new URLSearchParams(responseText);
      const oauthToken = params.get('oauth_token');
      const oauthTokenSecret = params.get('oauth_token_secret');
      const oauthCallbackConfirmed = params.get('oauth_callback_confirmed');

      if (!oauthToken || !oauthTokenSecret || oauthCallbackConfirmed !== 'true') {
        throw new Error('Invalid OAuth 1.0a request token response');
      }

      return {
        oauthToken,
        oauthTokenSecret,
        authUrl: `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`
      };
    } catch (error) {
      console.error('OAuth 1.0a request token error:', error);
      throw error;
    }
  }

  // Exchange OAuth 1.0a verifier for access token (step 3 of 3-legged OAuth)
  async getOAuth1AccessToken(oauthToken, oauthTokenSecret, oauthVerifier) {
    try {
      const requestData = {
        url: 'https://api.twitter.com/oauth/access_token',
        method: 'POST',
        data: {
          oauth_verifier: oauthVerifier
        }
      };

      const token = {
        key: oauthToken,
        secret: oauthTokenSecret
      };

      const authHeader = this.oauth1.toHeader(this.oauth1.authorize(requestData, token));

      const response = await fetch(requestData.url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader.Authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(requestData.data)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`OAuth 1.0a access token failed: ${responseText}`);
      }

      // Parse the response
      const params = new URLSearchParams(responseText);
      const accessToken = params.get('oauth_token');
      const accessTokenSecret = params.get('oauth_token_secret');
      const userId = params.get('user_id');
      const screenName = params.get('screen_name');

      if (!accessToken || !accessTokenSecret) {
        throw new Error('Invalid OAuth 1.0a access token response');
      }

      return {
        accessToken,
        accessTokenSecret,
        userId,
        screenName
      };
    } catch (error) {
      console.error('OAuth 1.0a access token error:', error);
      throw error;
    }
  }

  // Get user info using OAuth 2.0 (for profile data)
  async getOAuth2UserInfo(oauth2AccessToken) {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics', {
        headers: {
          'Authorization': `Bearer ${oauth2AccessToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth 2.0 user info failed: ${errorText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('OAuth 2.0 user info error:', error);
      throw error;
    }
  }

  // Upload media using OAuth 1.0a
  async uploadMedia(mediaData, oauth1AccessToken, oauth1AccessTokenSecret) {
    try {
      // Convert base64 to buffer
      const base64Data = mediaData.data.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Determine content type
      let contentType = mediaData.type;
      if (mediaData.data.includes('data:')) {
        const match = mediaData.data.match(/data:([^;]+)/);
        if (match) {
          contentType = match[1];
        }
      }

      console.log(`Uploading media to Twitter: ${mediaData.name} (${contentType}, ${buffer.length} bytes)`);

      // Create form data
      const FormData = require('form-data');
      const form = new FormData();
      form.append('media', buffer, {
        filename: mediaData.name,
        contentType: contentType
      });

      // Prepare OAuth 1.0a request
      const requestData = {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        method: 'POST'
      };

      const token = {
        key: oauth1AccessToken,
        secret: oauth1AccessTokenSecret
      };

      const authHeader = this.oauth1.toHeader(this.oauth1.authorize(requestData, token));

      const response = await fetch(requestData.url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader.Authorization,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Media upload failed:', response.status, errorText);
        throw new Error(`Media upload failed: ${errorText}`);
      }

      const uploadData = await response.json();
      
      if (!uploadData.media_id_string) {
        throw new Error('No media ID returned from Twitter');
      }

      console.log(`Successfully uploaded media: ${uploadData.media_id_string}`);
      return uploadData.media_id_string;
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  // Post tweet using OAuth 2.0
  async postTweet(content, mediaIds, oauth2AccessToken) {
    try {
      const body = {
        text: content.substring(0, 280)
      };

      if (mediaIds && mediaIds.length > 0) {
        body.media = {
          media_ids: mediaIds
        };
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oauth2AccessToken}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Tweet post failed:', errorData);
        throw new Error(errorData.errors?.[0]?.message || 'Failed to post tweet');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Tweet posting error:', error);
      throw error;
    }
  }
}

module.exports = TwitterOAuthService; 