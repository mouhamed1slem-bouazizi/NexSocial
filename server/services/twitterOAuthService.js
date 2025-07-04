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
      // Debug: Log media data structure
      console.log('📤 Media data received:', {
        name: mediaData.name,
        type: mediaData.type,
        dataLength: mediaData.data?.length,
        hasData: !!mediaData.data
      });
      
      // Validate media data
      if (!mediaData.data) {
        throw new Error('Media data is missing');
      }
      
      // Convert base64 to buffer
      const base64Data = mediaData.data.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid base64 data format');
      }
      
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

      // Use simple upload for small files, chunked for larger ones
      if (buffer.length <= 5 * 1024 * 1024) { // 5MB limit for simple upload
        return await this.uploadMediaSimple(buffer, contentType, mediaData.name, oauth1AccessToken, oauth1AccessTokenSecret);
      } else {
        return await this.uploadMediaChunked(buffer, contentType, mediaData.name, oauth1AccessToken, oauth1AccessTokenSecret);
      }
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  // Simple media upload for smaller files
  async uploadMediaSimple(buffer, contentType, filename, oauth1AccessToken, oauth1AccessTokenSecret) {
    try {
      console.log('📤 Using simple media upload...');
      
      // Create form data using URLSearchParams with base64 encoded media
      const formData = new URLSearchParams();
      formData.append('media_data', buffer.toString('base64'));

      const requestData = {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        method: 'POST',
        data: Object.fromEntries(formData)
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
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Simple media upload failed:', response.status, errorText);
        throw new Error(`Media upload failed: ${errorText}`);
      }

      const uploadData = await response.json();
      
      if (!uploadData.media_id_string) {
        throw new Error('No media ID returned from Twitter');
      }

      console.log(`✅ Successfully uploaded media: ${uploadData.media_id_string}`);
      return uploadData.media_id_string;
    } catch (error) {
      console.error('Simple media upload error:', error);
      throw error;
    }
  }

  // Chunked media upload for larger files
  async uploadMediaChunked(buffer, contentType, filename, oauth1AccessToken, oauth1AccessTokenSecret) {
    try {
      const totalBytes = buffer.length;
      const mediaType = contentType;
      
      // Step 1: Initialize upload
      console.log('🔄 Initializing chunked upload...');
      const initData = {
        command: 'INIT',
        total_bytes: totalBytes,
        media_type: mediaType
      };

      const initResponse = await this.makeOAuthRequest(
        'https://upload.twitter.com/1.1/media/upload.json',
        'POST',
        initData,
        oauth1AccessToken,
        oauth1AccessTokenSecret
      );

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('Media init failed:', initResponse.status, errorText);
        throw new Error(`Media init failed: ${errorText}`);
      }

      const initResult = await initResponse.json();
      const mediaIdString = initResult.media_id_string;
      
      console.log('✅ Upload initialized, media ID:', mediaIdString);

      // Step 2: Upload the media in chunks
      console.log('📤 Uploading media chunk...');
      const chunkData = new URLSearchParams();
      chunkData.append('command', 'APPEND');
      chunkData.append('media_id', mediaIdString);
      chunkData.append('segment_index', '0');
      chunkData.append('media', buffer.toString('base64'));

      const appendResponse = await this.makeOAuthRequest(
        'https://upload.twitter.com/1.1/media/upload.json',
        'POST',
        chunkData,
        oauth1AccessToken,
        oauth1AccessTokenSecret,
        'application/x-www-form-urlencoded'
      );

      if (!appendResponse.ok) {
        const errorText = await appendResponse.text();
        console.error('Media append failed:', appendResponse.status, errorText);
        throw new Error(`Media append failed: ${errorText}`);
      }

      console.log('✅ Media chunk uploaded successfully');

      // Step 3: Finalize upload
      console.log('🏁 Finalizing upload...');
      const finalizeData = {
        command: 'FINALIZE',
        media_id: mediaIdString
      };

      const finalizeResponse = await this.makeOAuthRequest(
        'https://upload.twitter.com/1.1/media/upload.json',
        'POST',
        finalizeData,
        oauth1AccessToken,
        oauth1AccessTokenSecret
      );

      if (!finalizeResponse.ok) {
        const errorText = await finalizeResponse.text();
        console.error('Media finalize failed:', finalizeResponse.status, errorText);
        throw new Error(`Media finalize failed: ${errorText}`);
      }

      const finalizeResult = await finalizeResponse.json();
      console.log('✅ Successfully uploaded media:', mediaIdString);
      
      return mediaIdString;
    } catch (error) {
      console.error('Chunked media upload error:', error);
      throw error;
    }
  }

  // Helper method to make OAuth 1.0a authenticated requests
  async makeOAuthRequest(url, method, data, oauth1AccessToken, oauth1AccessTokenSecret, contentType = 'application/x-www-form-urlencoded') {
    const requestData = {
      url: url,
      method: method,
      data: data instanceof URLSearchParams ? Object.fromEntries(data) : data
    };

    const token = {
      key: oauth1AccessToken,
      secret: oauth1AccessTokenSecret
    };

    const authHeader = this.oauth1.toHeader(this.oauth1.authorize(requestData, token));

    const headers = {
      'Authorization': authHeader.Authorization,
      'Content-Type': contentType
    };

    const body = data instanceof URLSearchParams ? data : new URLSearchParams(data);

    return await fetch(url, {
      method: method,
      headers: headers,
      body: body
    });
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
        
        // Handle specific error cases
        if (errorData.detail && errorData.detail.includes('duplicate content')) {
          throw new Error('Twitter rejected duplicate content. Please modify your message or try again later.');
        }
        
        throw new Error(errorData.errors?.[0]?.message || errorData.detail || 'Failed to post tweet');
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