const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');
const TwitterOAuthService = require('../services/twitterOAuthService.js');
const { generatePKCE, storePKCE, retrievePKCE } = require('../utils/pkce.js');

const router = express.Router();

// Utility function to get URLs with fallbacks
const getUrls = () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
  
  if (!process.env.BASE_URL) {
    console.log('⚠️  BASE_URL not set, using default:', baseUrl);
  }
  if (!process.env.CLIENT_URL) {
    console.log('⚠️  CLIENT_URL not set, using default:', clientUrl);
  }
  
  return { baseUrl, clientUrl };
};

// OAuth initiation endpoint - returns auth URL instead of redirecting
router.post('/initiate', requireUser, async (req, res) => {
  const { platform } = req.body;
  const userId = req.user._id;

  console.log(`Initiating OAuth for platform: ${platform}, user: ${userId}`);
  console.log('🔧 Environment check for OAuth:');
  console.log('   BASE_URL:', process.env.BASE_URL);
  console.log('   CLIENT_URL:', process.env.CLIENT_URL);

  try {
    const { baseUrl, clientUrl } = getUrls();

    let authUrl;
    let clientId;
    let redirectUri;
    let scope;

    switch (platform) {
      case 'facebook':
        clientId = process.env.FACEBOOK_APP_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/facebook/callback`);
        scope = encodeURIComponent('pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Facebook OAuth not configured' });
        }

        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${userId}`;
        break;

      case 'instagram':
        clientId = process.env.FACEBOOK_APP_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/instagram/callback`);
        scope = encodeURIComponent('instagram_basic,instagram_content_publish');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Instagram OAuth not configured' });
        }

        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${userId}`;
        break;

      case 'twitter':
        // Use the new dual authentication flow
        try {
          const twitterService = new TwitterOAuthService();
          const oauth1Data = await twitterService.getOAuth1RequestToken();
          
          // Store OAuth 1.0a data temporarily using the oauth token as key
          // This allows us to retrieve it later when Twitter calls back
          console.log('Storing OAuth 1.0a data with key:', oauth1Data.oauthToken);
          storePKCE(oauth1Data.oauthToken, {
            userId: userId,
            oauth1Token: oauth1Data.oauthToken,
            oauth1TokenSecret: oauth1Data.oauthTokenSecret,
            oauth2Flow: true // Flag to indicate this is a dual auth flow
          });
          console.log('OAuth 1.0a data stored successfully');
          
          authUrl = oauth1Data.authUrl;
        } catch (error) {
          console.error('Twitter dual auth initiation failed:', error);
          return res.status(500).json({ success: false, error: 'Twitter dual authentication setup failed' });
        }
        break;

      case 'linkedin':
        clientId = process.env.LINKEDIN_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/linkedin/callback`);
        scope = encodeURIComponent('r_liteprofile r_emailaddress w_member_social');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'LinkedIn OAuth not configured' });
        }

        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${userId}`;
        break;

      case 'youtube':
        clientId = process.env.GOOGLE_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/youtube/callback`);
        scope = encodeURIComponent('https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'YouTube OAuth not configured' });
        }

        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&access_type=offline&state=${userId}`;
        break;

      case 'tiktok':
        clientId = process.env.TIKTOK_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/tiktok/callback`);
        scope = encodeURIComponent('user.info.basic,video.list');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'TikTok OAuth not configured' });
        }

        authUrl = `https://www.tiktok.com/auth/authorize/?client_key=${clientId}&response_type=code&scope=${scope}&redirect_uri=${redirectUri}&state=${userId}`;
        break;

      default:
        return res.status(400).json({ success: false, error: 'Unsupported platform' });
    }

    console.log(`Generated OAuth URL for ${platform}:`, authUrl);

    res.json({
      success: true,
      authUrl: authUrl
    });

  } catch (error) {
    console.error(`Error initiating OAuth for ${platform}:`, error);
    res.status(500).json({ success: false, error: 'Failed to initiate OAuth' });
  }
});

// Facebook OAuth callback
router.get('/facebook/callback', async (req, res) => {
  console.log('Facebook OAuth callback received');

  try {
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('No authorization code received from Facebook');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('Exchanging code for access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/facebook/callback`,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from Facebook:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('Successfully obtained Facebook access token');

    // Get user profile
    const profileResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`);
    const profileData = await profileResponse.json();

    if (!profileData.id) {
      console.error('Failed to get Facebook profile data:', profileData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    console.log('Successfully fetched Facebook profile for user:', profileData.name);

    // Save to database
    const accountData = {
      platform: 'facebook',
      username: profileData.name,
      displayName: profileData.name,
      platformUserId: profileData.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: profileData.picture?.data?.url || '',
      followers: 0 // Will be updated via API call
    };

    await SocialAccountService.create(userId, accountData);
    console.log('Facebook account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=facebook_connected`);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Instagram OAuth callback
router.get('/instagram/callback', async (req, res) => {
  console.log('Instagram OAuth callback received');

  try {
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('No authorization code received from Instagram');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('Exchanging code for Instagram access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/instagram/callback`,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token for Instagram:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('Successfully obtained Instagram access token');

    // Get Instagram account info
    const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
    const accountsData = await accountsResponse.json();

    // Find Instagram business account
    let instagramAccount = null;
    for (const account of accountsData.data || []) {
      const igResponse = await fetch(`https://graph.facebook.com/v18.0/${account.id}?fields=instagram_business_account&access_token=${tokenData.access_token}`);
      const igData = await igResponse.json();

      if (igData.instagram_business_account) {
        instagramAccount = igData.instagram_business_account;
        break;
      }
    }

    if (!instagramAccount) {
      console.error('No Instagram business account found');
      return res.redirect(`${process.env.CLIENT_URL}?error=no_instagram_account`);
    }

    console.log('Found Instagram business account:', instagramAccount.id);

    // Get Instagram profile info
    const profileResponse = await fetch(`https://graph.facebook.com/v18.0/${instagramAccount.id}?fields=id,username,name,profile_picture_url,followers_count&access_token=${tokenData.access_token}`);
    const profileData = await profileResponse.json();

    if (!profileData.id) {
      console.error('Failed to get Instagram profile data:', profileData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    console.log('Successfully fetched Instagram profile for user:', profileData.username);

    // Save to database
    const accountData = {
      platform: 'instagram',
      username: profileData.username,
      displayName: profileData.name || profileData.username,
      platformUserId: profileData.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: profileData.profile_picture_url || '',
      followers: profileData.followers_count || 0
    };

    await SocialAccountService.create(userId, accountData);
    console.log('Instagram account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=instagram_connected`);
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Twitter OAuth callback (OAuth 1.0a)
router.get('/twitter/callback', async (req, res) => {
  console.log('Twitter OAuth 1.0a callback received');

  try {
    const { baseUrl, clientUrl } = getUrls();
    const { oauth_token, oauth_verifier, denied } = req.query;

    if (denied) {
      console.error('User denied Twitter OAuth authorization');
      return res.redirect(`${clientUrl}?error=access_denied`);
    }

    if (!oauth_token || !oauth_verifier) {
      console.error('Missing OAuth 1.0a parameters from Twitter');
      return res.redirect(`${clientUrl}?error=invalid_oauth_params`);
    }

    console.log('Exchanging OAuth 1.0a verifier for access token');
    console.log('Looking for stored data with oauth_token:', oauth_token);

    // Retrieve the stored OAuth 1.0a data using the oauth_token as key
    const storedData = retrievePKCE(oauth_token);
    console.log('Retrieved stored data:', storedData ? 'Found' : 'Not found');
    
    if (!storedData || !storedData.oauth1Token || !storedData.oauth1TokenSecret) {
      console.error('No OAuth 1.0a data found for oauth_token:', oauth_token);
      return res.redirect(`${clientUrl}?error=token_exchange_failed`);
    }
    
    const userId = storedData.userId;
    console.log('Retrieved user ID from stored data:', userId);

    // Exchange OAuth 1.0a verifier for access token
    const twitterService = new TwitterOAuthService();
    const oauth1Result = await twitterService.getOAuth1AccessToken(
      storedData.oauth1Token,
      storedData.oauth1TokenSecret,
      oauth_verifier
    );

    console.log('Successfully obtained OAuth 1.0a access token');

    // Now initiate OAuth 2.0 flow for posting privileges
    const clientId = process.env.TWITTER_CLIENT_ID;
    const redirectUri = `${baseUrl}/api/oauth/twitter/oauth2-callback`;
    const scope = 'tweet.read tweet.write users.read offline.access';
    
    // Generate PKCE for OAuth 2.0
    const pkceData = generatePKCE();
    storePKCE(userId, {
      ...oauth1Result,
      oauth2PkceData: pkceData,
      stage: 'oauth2'
    });

    const oauth2AuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${userId}&code_challenge=${pkceData.code_challenge}&code_challenge_method=S256`;

    console.log('Redirecting to OAuth 2.0 authorization');
    res.redirect(oauth2AuthUrl);
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    res.redirect(`${clientUrl}?error=connection_failed`);
  }
});

// Twitter OAuth 2.0 callback (second phase of dual authentication)
router.get('/twitter/oauth2-callback', async (req, res) => {
  console.log('Twitter OAuth 2.0 callback received');

  try {
    const { baseUrl, clientUrl } = getUrls();
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('No authorization code received from Twitter OAuth 2.0');
      return res.redirect(`${clientUrl}?error=oauth2_access_denied`);
    }

    console.log('Exchanging OAuth 2.0 code for access token');

    // Retrieve the stored OAuth data
    const storedData = retrievePKCE(userId);
    if (!storedData || !storedData.oauth2PkceData) {
      console.error('No OAuth 2.0 PKCE data found for user session');
      return res.redirect(`${clientUrl}?error=oauth2_token_exchange_failed`);
    }

    // Exchange code for OAuth 2.0 access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID,
        redirect_uri: `${baseUrl}/api/oauth/twitter/oauth2-callback`,
        code_verifier: storedData.oauth2PkceData.code_verifier
      })
    });

    if (!tokenResponse.ok) {
      console.error('Twitter OAuth 2.0 token exchange failed:', tokenResponse.status, tokenResponse.statusText);
      const errorText = await tokenResponse.text();
      console.error('Twitter OAuth 2.0 error response:', errorText);
      return res.redirect(`${clientUrl}?error=oauth2_token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get OAuth 2.0 access token from Twitter:', tokenData);
      return res.redirect(`${clientUrl}?error=oauth2_token_exchange_failed`);
    }

    console.log('Successfully obtained OAuth 2.0 access token');

    // Get user profile using OAuth 2.0
    const twitterService = new TwitterOAuthService();
    const profileData = await twitterService.getOAuth2UserInfo(tokenData.access_token);

    if (!profileData?.id) {
      console.error('Failed to get Twitter profile data:', profileData);
      return res.redirect(`${clientUrl}?error=profile_fetch_failed`);
    }

    console.log('Successfully fetched Twitter profile for user:', profileData.username);

    // Save to database with both OAuth 1.0a and OAuth 2.0 credentials
    const accountData = {
      platform: 'twitter',
      username: profileData.username,
      displayName: profileData.name,
      platformUserId: profileData.id,
      accessToken: tokenData.access_token, // OAuth 2.0 for posting
      refreshToken: tokenData.refresh_token,
      oauth1AccessToken: storedData.accessToken, // OAuth 1.0a for media upload
      oauth1AccessTokenSecret: storedData.accessTokenSecret,
      profileImage: profileData.profile_image_url || '',
      followers: profileData.public_metrics?.followers_count || 0
    };

    await SocialAccountService.create(userId, accountData);
    console.log('Twitter account with dual authentication successfully saved to database');

    res.redirect(`${clientUrl}?success=twitter_connected`);
  } catch (error) {
    console.error('Twitter OAuth 2.0 callback error:', error);
    res.redirect(`${clientUrl}?error=connection_failed`);
  }
});

// LinkedIn OAuth callback
router.get('/linkedin/callback', async (req, res) => {
  console.log('LinkedIn OAuth callback received');

  try {
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('No authorization code received from LinkedIn');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('Exchanging code for LinkedIn access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from LinkedIn:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('Successfully obtained LinkedIn access token');

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    const profileData = await profileResponse.json();

    if (!profileData.id) {
      console.error('Failed to get LinkedIn profile data:', profileData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    const firstName = profileData.firstName?.localized?.en_US || '';
    const lastName = profileData.lastName?.localized?.en_US || '';
    const displayName = `${firstName} ${lastName}`.trim();

    console.log('Successfully fetched LinkedIn profile for user:', displayName);

    // Save to database
    const accountData = {
      platform: 'linkedin',
      username: displayName.toLowerCase().replace(/\s+/g, ''),
      displayName,
      platformUserId: profileData.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: profileData.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier || '',
      followers: 0 // LinkedIn doesn't provide follower count in basic profile
    };

    await SocialAccountService.create(userId, accountData);
    console.log('LinkedIn account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=linkedin_connected`);
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// YouTube OAuth callback
router.get('/youtube/callback', async (req, res) => {
  console.log('YouTube OAuth callback received');

  try {
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('No authorization code received from YouTube');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('Exchanging code for YouTube access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/youtube/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from YouTube:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('Successfully obtained YouTube access token');

    // Get channel info with enhanced debugging
    console.log('🎬 Fetching YouTube channel information...');
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    console.log('🎬 YouTube API response status:', channelResponse.status);
    console.log('🎬 YouTube API response headers:', Object.fromEntries(channelResponse.headers.entries()));

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error('🚨 YouTube API request failed:', {
        status: channelResponse.status,
        statusText: channelResponse.statusText,
        body: errorText
      });
      return res.redirect(`${process.env.CLIENT_URL}?error=youtube_api_failed`);
    }

    const channelData = await channelResponse.json();
    console.log('🎬 YouTube API response data:', JSON.stringify(channelData, null, 2));

    if (!channelData.items || channelData.items.length === 0) {
      console.error('🚨 No YouTube channel found for user. Response details:', {
        totalResults: channelData.pageInfo?.totalResults || 0,
        resultsPerPage: channelData.pageInfo?.resultsPerPage || 0,
        itemsLength: channelData.items?.length || 0,
        fullResponse: channelData
      });
      
      // Check if there's an error in the response
      if (channelData.error) {
        console.error('🚨 YouTube API returned error:', channelData.error);
        return res.redirect(`${process.env.CLIENT_URL}?error=youtube_api_error&details=${encodeURIComponent(channelData.error.message)}`);
      }
      
      return res.redirect(`${process.env.CLIENT_URL}?error=no_youtube_channel`);
    }

    const channel = channelData.items[0];
    console.log('✅ Successfully fetched YouTube channel:', {
      id: channel.id,
      title: channel.snippet?.title,
      customUrl: channel.snippet?.customUrl,
      subscriberCount: channel.statistics?.subscriberCount
    });

    // Save to database
    const accountData = {
      platform: 'youtube',
      username: channel.snippet.customUrl || channel.snippet.title.toLowerCase().replace(/\s+/g, ''),
      displayName: channel.snippet.title,
      platformUserId: channel.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: channel.snippet.thumbnails?.default?.url || '',
      followers: parseInt(channel.statistics?.subscriberCount) || 0
    };

    await SocialAccountService.create(userId, accountData);
    console.log('✅ YouTube account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=youtube_connected`);
  } catch (error) {
    console.error('🚨 YouTube OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// TikTok OAuth callback
router.get('/tiktok/callback', async (req, res) => {
  console.log('TikTok OAuth callback received');

  try {
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('No authorization code received from TikTok');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('Exchanging code for TikTok access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_ID,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BASE_URL}/api/oauth/tiktok/callback`
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.data?.access_token) {
      console.error('Failed to get access token from TikTok:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('Successfully obtained TikTok access token');

    // Get user info
    const userResponse = await fetch('https://open-api.tiktok.com/user/info/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: tokenData.data.access_token,
        open_id: tokenData.data.open_id,
        fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'follower_count']
      })
    });

    const userData = await userResponse.json();

    if (!userData.data?.user) {
      console.error('Failed to get TikTok user data:', userData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    const user = userData.data.user;
    console.log('Successfully fetched TikTok profile for user:', user.display_name);

    // Save to database
    const accountData = {
      platform: 'tiktok',
      username: user.display_name.toLowerCase().replace(/\s+/g, ''),
      displayName: user.display_name,
      platformUserId: user.open_id,
      accessToken: tokenData.data.access_token,
      refreshToken: tokenData.data.refresh_token,
      profileImage: user.avatar_url || '',
      followers: user.follower_count || 0
    };

    await SocialAccountService.create(userId, accountData);
    console.log('TikTok account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=tiktok_connected`);
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

module.exports = router;