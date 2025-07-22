const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');
const TwitterOAuthService = require('../services/twitterOAuthService.js');
const { generatePKCE, storePKCE, retrievePKCE } = require('../utils/pkce.js');
const { getSupabase } = require('../config/database.js');

const router = express.Router();

// Database functions for storing Telegram connection codes
async function storeTelegramConnectionCode(connectionCode, userId) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return false;
    }
    
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    const { data, error } = await supabase
      .from('telegram_connection_codes')
      .insert([
        {
          code: connectionCode,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) {
      console.error('❌ Failed to store connection code:', error);
      console.error('💡 Please create the telegram_connection_codes table manually in Supabase:');
      console.error(`
CREATE TABLE IF NOT EXISTS telegram_connection_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
      `);
      return false;
    }
    
    console.log(`✅ Stored connection code in database: ${connectionCode}`);
    return true;
  } catch (err) {
    console.error('❌ Error storing connection code:', err);
    return false;
  }
}

async function getTelegramConnectionCode(connectionCode) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return null;
    }
    
    const { data, error } = await supabase
      .from('telegram_connection_codes')
      .select('*')
      .eq('code', connectionCode)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('❌ Error retrieving connection code:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('❌ Error getting connection code:', err);
    return null;
  }
}

async function deleteTelegramConnectionCode(connectionCode) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return false;
    }
    
    const { error } = await supabase
      .from('telegram_connection_codes')
      .delete()
      .eq('code', connectionCode);
    
    if (error) {
      console.error('❌ Error deleting connection code:', error);
      return false;
    }
    
    console.log(`🗑️ Deleted connection code: ${connectionCode}`);
    return true;
  } catch (err) {
    console.error('❌ Error deleting connection code:', err);
    return false;
  }
}

async function getAllTelegramConnectionCodes() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return [];
    }
    
    const { data, error } = await supabase
      .from('telegram_connection_codes')
      .select('code')
      .gt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('❌ Error getting all connection codes:', error);
      return [];
    }
    
    return data ? data.map(row => row.code) : [];
  } catch (err) {
    console.error('❌ Error getting all connection codes:', err);
    return [];
  }
}

async function cleanupExpiredConnectionCodes() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ Supabase client not available for cleanup');
      return;
    }
    
    const { error } = await supabase
      .from('telegram_connection_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('❌ Error cleaning up expired codes:', error);
    } else {
      console.log('🧹 Cleaned up expired connection codes');
    }
  } catch (err) {
    console.error('❌ Error cleaning up expired codes:', err);
  }
}

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
        scope = encodeURIComponent('pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish');

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
        scope = encodeURIComponent('openid profile w_member_social');

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

      case 'discord':
        clientId = process.env.DISCORD_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/discord/callback`);
        scope = encodeURIComponent('identify guilds bot');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Discord OAuth not configured. Please add DISCORD_CLIENT_ID to your .env file' });
        }

        // Include bot permissions in the URL 
        // 1024 = View Channels, 2048 = Send Messages, 65536 = Read Message History
        // Total: 68608 for proper channel access and posting
        authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${userId}&permissions=68608`;
        break;

      case 'reddit':
        clientId = process.env.REDDIT_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/reddit/callback`);
        scope = encodeURIComponent('identity read submit');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Reddit OAuth not configured. Please add REDDIT_CLIENT_ID to your .env file' });
        }

        // Generate a random state parameter for security
        const duration = 'permanent'; // Request permanent access
        authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${userId}&redirect_uri=${redirectUri}&duration=${duration}&scope=${scope}`;
        break;

      case 'vimeo':
        clientId = process.env.VIMEO_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/vimeo/callback`);
        scope = encodeURIComponent('public private');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Vimeo OAuth not configured. Please add VIMEO_CLIENT_ID to your .env file' });
        }

        authUrl = `https://api.vimeo.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${userId}`;
        break;

      case 'twitch':
        clientId = process.env.TWITCH_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/twitch/callback`);
        scope = encodeURIComponent('user:read:email channel:read:subscriptions');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Twitch OAuth not configured. Please add TWITCH_CLIENT_ID to your .env file' });
        }

        authUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${userId}`;
        break;

      case 'line':
        clientId = process.env.LINE_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/line/callback`);
        scope = encodeURIComponent('profile openid');

        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Line OAuth not configured. Please add LINE_CLIENT_ID to your .env file' });
        }

        authUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${userId}`;
        break;

      case 'snapchat':
        clientId = process.env.SNAPCHAT_CLIENT_ID;
        redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/snapchat/callback`);
        scope = encodeURIComponent('snapchat-profile-api');
        
        if (!clientId) {
          return res.status(500).json({ success: false, error: 'Snapchat OAuth not configured' });
        }
        
        authUrl = `https://accounts.snapchat.com/login/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${userId}`;
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

    // Exchange short-lived token for long-lived token
    console.log('Exchanging for long-lived user access token');
    const longLivedTokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`);
    const longLivedTokenData = await longLivedTokenResponse.json();

    const finalUserToken = longLivedTokenData.access_token || tokenData.access_token;
    console.log('Successfully obtained long-lived user access token');

    // Get user's managed pages - try multiple approaches
    console.log('🔍 Fetching Facebook pages...');
    
    // Approach 1: Standard /me/accounts
    let pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,picture,followers_count&access_token=${finalUserToken}`);
    let pagesData = await pagesResponse.json();
    
    console.log('📋 Facebook pages API response (approach 1):', JSON.stringify(pagesData, null, 2));
    
    // Approach 2: If no pages found, try with different scope
    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('🔄 Trying alternative approach to fetch pages...');
      
      // Try fetching with different fields
      const altPagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${finalUserToken}`);
      const altPagesData = await altPagesResponse.json();
      console.log('📋 Alternative pages response:', JSON.stringify(altPagesData, null, 2));
      
      // Try getting pages the user manages (not just owns)
      const managedPagesResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=accounts{id,name,access_token,picture,followers_count}&access_token=${finalUserToken}`);
      const managedPagesData = await managedPagesResponse.json();
      console.log('📋 Managed pages response:', JSON.stringify(managedPagesData, null, 2));
      
      // Use managed pages data if available
      if (managedPagesData.accounts && managedPagesData.accounts.data && managedPagesData.accounts.data.length > 0) {
        pagesData = managedPagesData.accounts;
        console.log('✅ Found pages using managed pages approach');
      }
    }

    console.log(`📊 Pages data type: ${typeof pagesData.data}, Pages count: ${pagesData.data?.length || 0}`);

    // Also try to get basic user info to debug
    console.log('🔍 Fetching user info for debugging...');
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${finalUserToken}`);
    const userData = await userResponse.json();
    console.log('👤 User data:', JSON.stringify(userData, null, 2));

    // Check for API errors first
    if (pagesData.error) {
      console.error('🚨 Facebook API Error:', pagesData.error);
      return res.redirect(`${process.env.CLIENT_URL}?error=facebook_api_error&details=${encodeURIComponent(pagesData.error.message)}`);
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('❌ User has no Facebook pages to connect.');
      console.log('💡 Note: You need to be an admin of a Facebook Page to connect it.');
      console.log('📋 Full API response:', JSON.stringify(pagesData, null, 2));
      
      // Provide more helpful error message
      console.log('🔍 Possible causes:');
      console.log('   - App may need additional permissions');
      console.log('   - Page admin role may not be sufficient');
      console.log('   - Business Manager restrictions');
      console.log('   - App is in Development Mode and needs App Review');
      
      // TEMPORARY WORKAROUND for development/testing
      console.log('🔧 Creating temporary mock Facebook page for testing...');
      
      // Create a mock page using user data
      const mockPageData = {
        platform: 'facebook',
        username: userData.name || 'Facebook User',
        displayName: userData.name || 'Facebook User',
        platformUserId: userData.id, // Use user ID as page ID for now
        accessToken: finalUserToken, // Use user token as page token for now
        profileImage: '', // No profile image for now
        followers: 0 // No followers count for now
      };
      
      console.log('💾 Saving mock Facebook page for testing:', mockPageData.username);
      
      try {
        await SocialAccountService.create(userId, mockPageData);
        console.log('✅ Mock Facebook page saved successfully');
        console.log('⚠️ NOTE: This is a temporary solution for testing. You will need proper Facebook App Review for production.');
        
        return res.redirect(`${process.env.CLIENT_URL}?success=facebook_connected&warning=mock_page_created`);
      } catch (error) {
        console.error('❌ Failed to save mock Facebook page:', error);
        return res.redirect(`${process.env.CLIENT_URL}?error=no_facebook_pages_found&details=API returned empty pages array`);
      }
    }

    console.log(`✅ Found ${pagesData.data.length} Facebook pages.`);
    console.log('📋 Pages found:', pagesData.data.map(page => ({ id: page.id, name: page.name })));

    // Save each page as a new social account with long-lived page tokens
    for (const page of pagesData.data) {
      console.log(`💾 Saving Facebook page: ${page.name} (${page.id})`);
      
      // Page access tokens from /me/accounts are already long-lived when obtained with a long-lived user token
      const accountData = {
        platform: 'facebook',
        username: page.name,
        displayName: page.name,
        platformUserId: page.id,
        accessToken: page.access_token, // This is the page-specific long-lived access token
        profileImage: page.picture?.data?.url || '',
        followers: page.followers_count || 0
      };
      
      await SocialAccountService.create(userId, accountData);
      console.log(`✅ Facebook page "${page.name}" successfully saved to database with long-lived token.`);
    }

    console.log('🎉 Facebook OAuth completed successfully!');
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

    // Get Instagram account info - try direct approach first
    console.log('🔍 Attempting direct Instagram account access...');
    try {
      const directIgResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,accounts{id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count}}&access_token=${tokenData.access_token}`);
      const directIgData = await directIgResponse.json();
      console.log('📋 Direct Instagram response:', JSON.stringify(directIgData, null, 2));
    } catch (error) {
      console.log('⚠️ Direct approach failed:', error.message);
    }

    // Get Instagram account info - original approach
    console.log('🔍 Getting Facebook accounts...');
    const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
    const accountsData = await accountsResponse.json();
    
    console.log('📋 Facebook accounts response:', JSON.stringify(accountsData, null, 2));
    console.log(`📊 Found ${accountsData.data?.length || 0} Facebook accounts`);

    // Find Instagram business account
    let instagramAccount = null;
    for (const account of accountsData.data || []) {
      console.log(`🔍 Checking account: ${account.name} (ID: ${account.id})`);
      
      const igResponse = await fetch(`https://graph.facebook.com/v18.0/${account.id}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${tokenData.access_token}`);
      const igData = await igResponse.json();
      
      console.log(`📋 Instagram check for ${account.name}:`, JSON.stringify(igData, null, 2));

      if (igData.instagram_business_account) {
        console.log(`✅ Found Instagram Business Account: ${igData.instagram_business_account.username}`);
        instagramAccount = {
          ...igData.instagram_business_account,
          pageAccessToken: account.access_token // Store the page access token
        };
        break;
      } else {
        console.log(`❌ No Instagram Business Account found for ${account.name}`);
      }
    }

    if (!instagramAccount) {
      console.error('❌ No Instagram business account found after checking all Facebook pages');
      console.error('💡 Make sure your Instagram Business Account is connected to one of your Facebook Pages');
      return res.redirect(`${process.env.CLIENT_URL}?error=no_instagram_account`);
    }

    console.log('✅ Found Instagram business account:', instagramAccount.username);

    // Save to database with the Instagram account details
    const accountData = {
      platform: 'instagram',
      username: instagramAccount.username,
      displayName: instagramAccount.name || instagramAccount.username,
      platformUserId: instagramAccount.id,
      accessToken: instagramAccount.pageAccessToken || tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: instagramAccount.profile_picture_url || '',
      followers: instagramAccount.followers_count || 0
    };

    console.log('💾 Saving Instagram account data:', {
      platform: accountData.platform,
      username: accountData.username,
      platformUserId: accountData.platformUserId,
      followers: accountData.followers
    });

    await SocialAccountService.create(userId, accountData);
    console.log('✅ Instagram account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=instagram_connected`);
  } catch (error) {
    console.error('❌ Instagram OAuth callback error:', error);
    console.error('📋 Error details:', error.stack);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Snapchat OAuth callback
router.get('/snapchat/callback', async (req, res) => {
  console.log('Snapchat OAuth callback received');

  try {
    const { code, state: userId } = req.query;

    if (!code) {
      console.error('No authorization code received from Snapchat');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('Exchanging code for Snapchat access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.SNAPCHAT_CLIENT_ID,
        client_secret: process.env.SNAPCHAT_CLIENT_SECRET,
        code: code,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/snapchat/callback`
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for token:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('Successfully obtained Snapchat access token');

    // Get user's Snapchat profile information
    console.log('🔍 Fetching Snapchat profile...');
    const profileResponse = await fetch('https://businessapi.snapchat.com/v1/public_profiles/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch Snapchat profile');
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    const profileData = await profileResponse.json();
    console.log('📋 Snapchat profile response:', JSON.stringify(profileData, null, 2));

    if (!profileData.public_profiles || profileData.public_profiles.length === 0) {
      console.log('❌ No Snapchat public profile found');
      console.log('💡 Note: You need a Snapchat Public Profile to connect.');
      return res.redirect(`${process.env.CLIENT_URL}?error=no_snapchat_profile`);
    }

    const profile = profileData.public_profiles[0];
    console.log(`📊 Found Snapchat profile: ${profile.name}`);

    // Create account data
    const accountData = {
      platform: 'snapchat',
      username: profile.username || profile.name,
      displayName: profile.name,
      platformUserId: profile.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: profile.profile_image_url || '',
      followers: profile.subscriber_count || 0
    };

    console.log('💾 Saving Snapchat account...');
    await SocialAccountService.create(userId, accountData);
    console.log('✅ Snapchat account saved successfully');

    res.redirect(`${process.env.CLIENT_URL}?success=snapchat_connected`);

  } catch (error) {
    console.error('Snapchat OAuth error:', error.message);
    res.redirect(`${process.env.CLIENT_URL}?error=oauth_failed`);
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
  console.log('🔍 LinkedIn callback query parameters:', req.query);

  try {
    const { code, state: userId, error, error_description } = req.query;

    // Check if user denied authorization
    if (error) {
      console.error('LinkedIn OAuth error:', error);
      console.error('LinkedIn OAuth error description:', error_description);
      return res.redirect(`${process.env.CLIENT_URL}?error=linkedin_${error}`);
    }

    if (!code) {
      console.error('No authorization code received from LinkedIn');
      console.error('Available query parameters:', Object.keys(req.query));
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

    // Try to get profile information even with limited scope
    let profileData = null;
    let displayName = 'LinkedIn Posting Account';
    let username = 'linkedinpostingaccount';
    let userId_linkedin = `linkedin_posting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let profileImage = '';
    let followers = 0;

    try {
      console.log('Attempting to retrieve profile information using OpenID Connect...');
      
      // Use the new OpenID Connect userinfo endpoint
      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      const profileResult = await profileResponse.json();
      console.log('LinkedIn userinfo API response:', profileResult);

      if (profileResponse.ok && profileResult.sub) {
        userId_linkedin = profileResult.sub;
        console.log('✅ Got LinkedIn user ID:', userId_linkedin);

        // The OpenID Connect 'sub' field contains the user identifier
        // This is always a valid LinkedIn identifier, no need to validate format
        
        // Extract profile information from OpenID Connect response
        const firstName = profileResult.given_name || '';
        const lastName = profileResult.family_name || '';
        const fullName = profileResult.name || '';
        
        // Build display name and username
        if (fullName) {
          displayName = fullName;
        } else if (firstName || lastName) {
          displayName = `${firstName} ${lastName}`.trim();
        } else {
          displayName = `LinkedIn User ${userId_linkedin.slice(-6)}`;
        }
        
        username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || `linkedinuser${userId_linkedin.slice(-6)}`;
        
        console.log('✅ Got LinkedIn name:', displayName);

        // Get profile picture if available
        if (profileResult.picture) {
          profileImage = profileResult.picture;
          console.log('✅ Got LinkedIn profile picture');
        }

        console.log('✅ LinkedIn profile setup complete with OpenID Connect');
      } else {
        console.error('❌ Failed to get LinkedIn user info from OpenID Connect API');
        console.error('Response status:', profileResponse.status);
        console.error('Response data:', profileResult);
        throw new Error('Failed to get LinkedIn user information');
      }
    } catch (error) {
      console.error('❌ Profile retrieval failed:', error.message);
      // If we can't get the LinkedIn ID, we should not create a posting account
      // as it won't work for posting anyway
      throw new Error('LinkedIn account setup failed: Unable to retrieve valid LinkedIn member ID. Please ensure your LinkedIn account has the necessary permissions.');
    }

    console.log('Successfully set up LinkedIn account for user:', displayName);

    // Save to database
    const accountData = {
      platform: 'linkedin',
      username: username,
      displayName,
      platformUserId: userId_linkedin,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: profileImage,
      followers: followers // Note: Set to 0 due to LinkedIn API privacy restrictions - users will need to manually update this
    };

    await SocialAccountService.create(userId, accountData);
    console.log('LinkedIn account successfully saved to database with posting permissions');
    console.log('📝 Note: LinkedIn connection count set to 0 due to API privacy restrictions - user can manually update via dashboard');

    res.redirect(`${process.env.CLIENT_URL}?success=linkedin_connected&manual_sync_required=true`);
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

// Discord OAuth callback
router.get('/discord/callback', async (req, res) => {
  console.log('🎮 Discord OAuth callback received');

  try {
    const { code, state: userId, guild_id } = req.query;

    if (!code) {
      console.error('No authorization code received from Discord');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('🔄 Exchanging code for Discord access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/discord/callback`
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from Discord:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('✅ Successfully obtained Discord access token');

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    const userData = await userResponse.json();

    if (!userData.id) {
      console.error('Failed to get Discord user data:', userData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    console.log('✅ Successfully fetched Discord profile for user:', userData.username);

    // Get user's guilds (servers) where they can manage or where our bot was added
    console.log('🔍 Fetching user guilds from Discord API...');
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    console.log(`🔍 Guilds response status: ${guildsResponse.status}`);
    const guildsData = await guildsResponse.json();
    
    if (!guildsResponse.ok) {
      console.error('❌ Failed to fetch guilds:', guildsData);
    }
    console.log(`📊 User has access to ${guildsData?.length || 0} Discord servers`);
    console.log(`🔍 Guilds data:`, JSON.stringify(guildsData, null, 2));

    // If specific guild was selected during OAuth, use that one
    let primaryGuild = null;
    if (guild_id && guildsData) {
      primaryGuild = guildsData.find(guild => guild.id === guild_id);
      console.log(`🎯 Guild ID ${guild_id} provided, found:`, primaryGuild);
    }
    
    // If no specific guild or not found, use the first one they can manage
    if (!primaryGuild && guildsData && guildsData.length > 0) {
      primaryGuild = guildsData.find(guild => 
        (guild.permissions & 0x20) || // MANAGE_MESSAGES
        (guild.permissions & 0x8) ||  // ADMINISTRATOR  
        guild.owner
      ) || guildsData[0]; // Fallback to first guild
      console.log(`🔍 Selected primary guild:`, primaryGuild);
    }

    // Determine follower count (server member count if available)
    let followerCount = 0;
    if (primaryGuild) {
      try {
        // Try to get guild member count using bot token if available
        if (process.env.DISCORD_BOT_TOKEN) {
          const guildResponse = await fetch(`https://discord.com/api/guilds/${primaryGuild.id}?with_counts=true`, {
            headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` }
          });
          
          if (guildResponse.ok) {
            const guildData = await guildResponse.json();
            followerCount = guildData.approximate_member_count || 0;
            console.log(`📊 Guild ${primaryGuild.name} has ${followerCount} members`);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not fetch guild member count:', error.message);
      }
    }

    // Prepare metadata
    const metadataObject = {
      discriminator: userData.discriminator,
      guilds: guildsData || [],
      primaryGuild: primaryGuild,
      bot_added: !!guild_id // Whether bot was added during OAuth
    };
    
    console.log(`🔍 Metadata object before stringify:`, JSON.stringify(metadataObject, null, 2));
    
    const metadataString = JSON.stringify(metadataObject);
    console.log(`🔍 Metadata string:`, metadataString);

    // Save to database
    const accountData = {
      platform: 'discord',
      username: userData.username,
      displayName: userData.global_name || userData.username,
      platformUserId: userData.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: userData.avatar ? 
        `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 
        '',
      followers: followerCount,
      // Store additional Discord-specific data
      metadata: metadataString
    };

    console.log(`🔍 Account data before save:`, JSON.stringify(accountData, null, 2));
    await SocialAccountService.create(userId, accountData);
    console.log('✅ Discord account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=discord_connected`);
  } catch (error) {
    console.error('❌ Discord OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Reddit OAuth callback
router.get('/reddit/callback', async (req, res) => {
  console.log('🔴 Reddit OAuth callback received');

  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      console.error('Reddit OAuth error:', error);
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    if (!code) {
      console.error('No authorization code received from Reddit');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('🔄 Exchanging code for Reddit access token');

    // Prepare Basic Auth header
    const credentials = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NexSocial/1.0 by YourUsername'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/reddit/callback`
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from Reddit:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('✅ Successfully obtained Reddit access token');

    // Get user profile
    const profileResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'NexSocial/1.0 by YourUsername'
      }
    });

    const profileData = await profileResponse.json();

    if (!profileData.id) {
      console.error('Failed to get Reddit profile data:', profileData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    console.log('✅ Successfully fetched Reddit profile for user:', profileData.name);

    // Get user's subreddits (moderated subreddits for posting)
    let moderatedSubreddits = [];
    try {
      const subredditsResponse = await fetch('https://oauth.reddit.com/subreddits/mine/moderator?limit=100', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'NexSocial/1.0 by YourUsername'
        }
      });

      if (subredditsResponse.ok) {
        const subredditsData = await subredditsResponse.json();
        moderatedSubreddits = subredditsData.data.children.map(child => ({
          name: child.data.display_name,
          id: child.data.id,
          subscribers: child.data.subscribers,
          title: child.data.title
        }));
        console.log(`📊 User moderates ${moderatedSubreddits.length} subreddits`);
      }
    } catch (error) {
      console.log('⚠️ Could not fetch moderated subreddits:', error.message);
    }

    // Calculate total karma as follower count
    const totalKarma = (profileData.link_karma || 0) + (profileData.comment_karma || 0);

    // Prepare metadata
    const metadataObject = {
      verified: profileData.verified || false,
      has_verified_email: profileData.has_verified_email || false,
      link_karma: profileData.link_karma || 0,
      comment_karma: profileData.comment_karma || 0,
      total_karma: totalKarma,
      account_created: profileData.created_utc,
      moderated_subreddits: moderatedSubreddits
    };

    // Save to database
    const accountData = {
      platform: 'reddit',
      username: profileData.name,
      displayName: profileData.name,
      platformUserId: profileData.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      profileImage: profileData.icon_img || '',
      followers: totalKarma, // Use total karma as follower count
      metadata: JSON.stringify(metadataObject)
    };

    await SocialAccountService.create(userId, accountData);
    console.log('✅ Reddit account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=reddit_connected`);
  } catch (error) {
    console.error('❌ Reddit OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Vimeo OAuth redirect endpoint - returns auth URL for frontend redirect
router.get('/vimeo/redirect', requireUser, async (req, res) => {
  try {
    console.log('🔗 Vimeo auth URL requested for user:', req.user._id);
    
    const { baseUrl } = getUrls();
    const clientId = process.env.VIMEO_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${baseUrl}/api/oauth/vimeo/callback`);
    const scope = encodeURIComponent('public private');
    const userId = req.user._id;

    if (!clientId) {
      return res.status(500).json({ success: false, error: 'Vimeo OAuth not configured. Please add VIMEO_CLIENT_ID to your .env file' });
    }

    const authUrl = `https://api.vimeo.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${userId}`;
    
    console.log('🔗 Vimeo OAuth Debug Info:');
    console.log('   Client ID:', clientId);
    console.log('   Redirect URI (encoded):', redirectUri);
    console.log('   Redirect URI (decoded):', decodeURIComponent(redirectUri));
    console.log('   Scope:', scope);
    console.log('   User ID:', userId);
    console.log('   Complete Auth URL:', authUrl);
    
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('❌ Vimeo auth URL generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate Vimeo OAuth URL' });
  }
});

// Vimeo OAuth callback
router.get('/vimeo/callback', async (req, res) => {
  console.log('📹 Vimeo OAuth callback received');

  try {
    const { code, state: userId, error, error_description } = req.query;

    // Check if user denied authorization
    if (error) {
      console.error('Vimeo OAuth error:', error);
      console.error('Vimeo OAuth error description:', error_description);
      return res.redirect(`${process.env.CLIENT_URL}?error=vimeo_${error}`);
    }

    if (!code) {
      console.error('No authorization code received from Vimeo');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('🔄 Exchanging code for Vimeo access token');

    // Prepare Basic Auth header for Vimeo
    const credentials = Buffer.from(`${process.env.VIMEO_CLIENT_ID}:${process.env.VIMEO_CLIENT_SECRET}`).toString('base64');

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.vimeo.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/vimeo/callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for Vimeo token:', tokenResponse.status, errorText);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from Vimeo:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('✅ Successfully obtained Vimeo access token');

    // Get user profile information
    const profileResponse = await fetch('https://api.vimeo.com/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Failed to get Vimeo profile:', profileResponse.status, errorText);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    const profileData = await profileResponse.json();

    if (!profileData.uri) {
      console.error('Failed to get Vimeo profile data:', profileData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    console.log('✅ Successfully fetched Vimeo profile for user:', profileData.name);

    // Extract user ID from URI (format: /users/123456)
    const vimeoUserId = profileData.uri.replace('/users/', '');

    // Save to database
    const accountData = {
      platform: 'vimeo',
      username: profileData.name || `vimeo_user_${vimeoUserId}`,
      displayName: profileData.name || 'Vimeo User',
      platformUserId: vimeoUserId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      profileImage: profileData.pictures?.sizes?.[0]?.link || '',
      followers: profileData.metadata?.connections?.followers?.total || 0
    };

    await SocialAccountService.create(userId, accountData);
    console.log('✅ Vimeo account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=vimeo_connected`);
  } catch (error) {
    console.error('❌ Vimeo OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Twitch OAuth callback
router.get('/twitch/callback', async (req, res) => {
  console.log('🎮 Twitch OAuth callback received');

  try {
    const { code, state: userId, error, error_description } = req.query;

    // Check if user denied authorization
    if (error) {
      console.error('Twitch OAuth error:', error);
      console.error('Twitch OAuth error description:', error_description);
      return res.redirect(`${process.env.CLIENT_URL}?error=twitch_${error}`);
    }

    if (!code) {
      console.error('No authorization code received from Twitch');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('🔄 Exchanging code for Twitch access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BASE_URL}/api/oauth/twitch/callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for Twitch token:', tokenResponse.status, errorText);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from Twitch:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('✅ Successfully obtained Twitch access token');

    // Get user profile information
    const profileResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
        'Accept': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Failed to get Twitch profile:', profileResponse.status, errorText);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    const profileData = await profileResponse.json();

    if (!profileData.data || !profileData.data[0]) {
      console.error('Failed to get Twitch profile data:', profileData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    const user = profileData.data[0];
    console.log('✅ Successfully fetched Twitch profile for user:', user.display_name);

    // Get follower count (this requires additional API call to followers endpoint)
    let followerCount = 0;
    try {
      const followersResponse = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
          'Accept': 'application/json'
        }
      });

      if (followersResponse.ok) {
        const followersData = await followersResponse.json();
        followerCount = followersData.total || 0;
        console.log(`📊 Twitch channel has ${followerCount} followers`);
      } else {
        console.log('⚠️ Could not fetch follower count (may require broadcaster permissions)');
      }
    } catch (error) {
      console.log('⚠️ Error fetching follower count:', error.message);
    }

    // Save to database
    const accountData = {
      platform: 'twitch',
      username: user.login,
      displayName: user.display_name,
      platformUserId: user.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      profileImage: user.profile_image_url || '',
      followers: followerCount
    };

    await SocialAccountService.create(userId, accountData);
    console.log('✅ Twitch account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=twitch_connected`);
  } catch (error) {
    console.error('❌ Twitch OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Line OAuth callback
router.get('/line/callback', async (req, res) => {
  console.log('📱 Line OAuth callback received');

  try {
    const { code, state: userId, error, error_description } = req.query;

    // Check if user denied authorization
    if (error) {
      console.error('Line OAuth error:', error);
      console.error('Line OAuth error description:', error_description);
      return res.redirect(`${process.env.CLIENT_URL}?error=line_${error}`);
    }

    if (!code) {
      console.error('No authorization code received from Line');
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    console.log('🔄 Exchanging code for Line access token');

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/line/callback`,
        client_id: process.env.LINE_CLIENT_ID,
        client_secret: process.env.LINE_CLIENT_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for Line token:', tokenResponse.status, errorText);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token from Line:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}?error=token_exchange_failed`);
    }

    console.log('✅ Successfully obtained Line access token');

    // Get user profile information
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Failed to get Line profile:', profileResponse.status, errorText);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    const profileData = await profileResponse.json();

    if (!profileData.userId) {
      console.error('Failed to get Line profile data:', profileData);
      return res.redirect(`${process.env.CLIENT_URL}?error=profile_fetch_failed`);
    }

    console.log('✅ Successfully fetched Line profile for user:', profileData.displayName);

    // Line doesn't provide follower count in basic profile API
    // We'll set it to 0 as it's primarily a messaging platform
    const followerCount = 0;

    // Save to database
    const accountData = {
      platform: 'line',
      username: profileData.displayName.toLowerCase().replace(/\s+/g, ''),
      displayName: profileData.displayName,
      platformUserId: profileData.userId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      profileImage: profileData.pictureUrl || '',
      followers: followerCount
    };

    await SocialAccountService.create(userId, accountData);
    console.log('✅ Line account successfully saved to database');

    res.redirect(`${process.env.CLIENT_URL}?success=line_connected`);
  } catch (error) {
    console.error('❌ Line OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=connection_failed`);
  }
});

// Telegram OAuth - Generate connection code
router.get('/telegram', requireUser, async (req, res) => {
  try {
    console.log('🔗 Initiating Telegram connection...');
    
    // Generate unique connection code
    const connectionCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store connection code in database
    const stored = await storeTelegramConnectionCode(connectionCode, req.user._id);
    if (!stored) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate connection code. Please try again.'
      });
    }
    
    // Clean up expired codes periodically
    cleanupExpiredConnectionCodes();
    
    // Get total stored codes for logging
    const allCodes = await getAllTelegramConnectionCodes();
    
    console.log(`✅ Generated Telegram connection code: ${connectionCode} for user: ${req.user._id}`);
    console.log(`📊 Total stored codes: ${allCodes.length}`);
    
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot_username';
    const instructions = `
To connect your Telegram group/channel:

1. Add our bot (@${botUsername}) to your group/channel
2. Make the bot an admin with posting permissions
3. Send this code to the bot: ${connectionCode}
4. You'll receive a confirmation message

Connection code: ${connectionCode}
(This code expires in 10 minutes)
    `;

    res.json({
      success: true,
      connectionCode,
      instructions,
      botUsername
    });
    
  } catch (error) {
    console.error('❌ Telegram connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate connection code'
    });
  }
});

// Telegram Database Fix Endpoint
router.post('/telegram/fix-database', requireUser, async (req, res) => {
  try {
    console.log('🔧 Attempting to fix Telegram database constraint...');
    
    // For Supabase, we'll try to run the SQL directly if possible
    if (process.env.DATABASE_URL) {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      try {
        // Drop existing constraint
        await pool.query('ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;');
        console.log('✅ Dropped existing constraint');

        // Add new constraint
        await pool.query(`
          ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check 
          CHECK (platform IN (
            'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube',
            'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit',
            'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'
          ));
        `);
        
        console.log('✅ Added updated constraint with Telegram support');
        await pool.end();
        
        res.json({
          success: true,
          message: 'Database constraint fixed successfully! Telegram connections are now enabled.',
          method: 'automatic'
        });
        
      } catch (dbError) {
        await pool.end();
        console.log('❌ Direct database fix failed:', dbError.message);
        
        // Provide manual instructions as fallback
        res.json({
          success: false,
          error: 'Automatic fix failed',
          message: 'Please run the SQL manually in Supabase',
          manual_sql: [
            'ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;',
            `ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check 
             CHECK (platform IN (
               'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube',
               'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit',
               'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'
             ));`
          ],
          instructions: 'Go to Supabase Dashboard > SQL Editor and run the provided SQL commands'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database URL not configured',
        message: 'Cannot perform automatic fix without direct database access'
      });
    }
    
  } catch (error) {
    console.error('❌ Telegram database fix error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix database constraint',
      message: error.message
    });
  }
});

// Telegram Webhook Setup Endpoint
router.post('/telegram/setup-webhook', requireUser, async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.status(500).json({
        success: false,
        error: 'Telegram bot token not configured'
      });
    }

    const { baseUrl } = getUrls();
    const finalWebhookUrl = webhookUrl || `${baseUrl}/api/oauth/telegram/webhook`;
    
    console.log('🔗 Setting up Telegram webhook via API...');
    console.log(`Bot Token: ${botToken.substring(0, 10)}...`);
    console.log(`Webhook URL: ${finalWebhookUrl}`);
    
    // Test bot first
    const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botResult = await botResponse.json();
    
    if (!botResult.ok) {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify bot token',
        details: botResult
      });
    }

    // Set webhook
    const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: finalWebhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: true
      })
    });
    
    const webhookResult = await webhookResponse.json();
    
    if (webhookResult.ok) {
      // Get webhook info to verify
      const infoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const infoResult = await infoResponse.json();
      
      console.log('✅ Telegram webhook setup successful');
      
      res.json({
        success: true,
        message: 'Webhook setup successfully',
        botInfo: {
          name: botResult.result.first_name,
          username: botResult.result.username,
          id: botResult.result.id
        },
        webhookInfo: infoResult.ok ? {
          url: infoResult.result.url,
          pendingUpdates: infoResult.result.pending_update_count,
          lastError: infoResult.result.last_error_message || 'None'
        } : null
      });
      
    } else {
      console.log('❌ Failed to set webhook:', webhookResult);
      res.status(500).json({
        success: false,
        error: 'Failed to set webhook',
        details: webhookResult
      });
    }
    
  } catch (error) {
    console.error('❌ Telegram webhook setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup webhook',
      message: error.message
    });
  }
});

// Telegram Webhook Handler
router.post('/telegram/webhook', async (req, res) => {
  try {
    console.log('📨 Telegram webhook received:', JSON.stringify(req.body, null, 2));
    
    const { message } = req.body;
    
    if (!message) {
      return res.status(200).json({ ok: true });
    }
    
    const chatId = message.chat.id;
    const messageText = message.text;
    const userId = message.from.id;
    const chatType = message.chat.type;
    const chatTitle = message.chat.title;
    
    console.log('🔍 Message details:');
    console.log(`   Chat ID: ${chatId}`);
    console.log(`   Chat Type: ${chatType}`);
    console.log(`   Chat Title: ${chatTitle || 'N/A'}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Message: ${messageText}`);
    console.log(`   Is Group/Channel: ${chatType !== 'private'}`);
    
    // For group messages, check if bot is admin
    if (chatType !== 'private' && messageText && messageText.startsWith('/connect')) {
      console.log('🏆 Group connection attempt detected');
      try {
        const chatInfo = await getTelegramChatInfo(chatId);
        console.log('📊 Chat info:', chatInfo);
        
        // Check bot permissions
        const botInfo = await getBotChatMember(chatId);
        console.log('🤖 Bot info in chat:', botInfo);
      } catch (infoError) {
        console.log('⚠️  Could not get chat/bot info:', infoError.message);
      }
    }
    
    // Handle connection code
    if (messageText && messageText.startsWith('/connect ')) {
      const connectionCode = messageText.replace('/connect ', '').trim();
      await handleTelegramConnection(connectionCode, chatId, message.chat, userId);
    }
    
    // Handle start command
    else if (messageText === '/start') {
      await sendTelegramMessage(chatId, 
        'Welcome to NexSocial Bot! 🚀\n\n' +
        'To connect your group/channel:\n' +
        '1. Get a connection code from your NexSocial dashboard\n' +
        '2. Send: /connect YOUR_CODE\n\n' +
        'Need help? Send /help'
      );
    }
    
    // Handle help command
    else if (messageText === '/help') {
      await sendTelegramMessage(chatId,
        'NexSocial Bot Commands:\n\n' +
        '/start - Welcome message\n' +
        '/connect CODE - Connect chat/group to NexSocial\n' +
        '/status - Check connection status\n' +
        '/help - Show this help message\n' +
        '/group - How to connect groups/channels\n' +
        '/debug - Show debug info\n\n' +
        'For support, visit: https://nexsocial.com/support'
      );
    }
    
    // Handle group connection instructions
    else if (messageText === '/group') {
      await sendTelegramMessage(chatId,
        '🏆 How to Connect Groups/Channels:\n\n' +
        '1. Add this bot to your group/channel\n' +
        '2. Make the bot an ADMIN with posting permissions\n' +
        '3. Get a connection code from NexSocial dashboard\n' +
        '4. In the GROUP (not here), send: /connect YOUR_CODE\n' +
        '5. Posts will then go to that group/channel\n\n' +
        '📝 Current chat type: ' + (message.chat.type || 'private') + '\n' +
        'Chat ID: ' + chatId
      );
    }
    
    // Handle status command
    else if (messageText === '/status') {
      const account = await SocialAccountService.findByPlatformUserId('telegram', chatId.toString());
      if (account) {
        await sendTelegramMessage(chatId,
          `✅ Connected to NexSocial!\n\n` +
          `Group: ${message.chat.title || 'Private Chat'}\n` +
          `Connected: ${new Date(account.connected_at).toLocaleDateString()}\n` +
          `Status: Active`
        );
      } else {
        await sendTelegramMessage(chatId,
          '❌ Not connected to NexSocial\n\n' +
          'To connect, get a connection code from your NexSocial dashboard and send:\n' +
          '/connect YOUR_CODE'
        );
      }
    }
    
    // Handle debug command (for troubleshooting)
    else if (messageText === '/debug') {
      try {
        const codes = await getAllTelegramConnectionCodes();
        const chatInfo = await getTelegramChatInfo(chatId);
        let botStatus = 'unknown';
        let linkedChannelInfo = null;
        
        // Check bot status if it's a group
        if (chatType !== 'private') {
          try {
            const botInfo = await getBotChatMember(chatId);
            botStatus = botInfo.status || 'unknown';
          } catch (e) {
            botStatus = 'error checking';
          }
          
          // Check for linked channel
          if (chatType === 'supergroup') {
            try {
              linkedChannelInfo = await getLinkedChannel(chatId);
            } catch (e) {
              // Ignore errors
            }
          }
        }
        
        let debugMessage = `🔧 Debug Info:\n\n` +
          `Chat Type: ${chatType}\n` +
          `Chat ID: ${chatId}\n` +
          `Chat Title: ${chatTitle || 'N/A'}\n` +
          `User ID: ${userId}\n` +
          `Bot Status: ${botStatus}\n` +
          `Member Count: ${chatInfo.member_count || 'N/A'}\n`;
        
        if (linkedChannelInfo) {
          debugMessage += `\n🔗 Linked Channel:\n` +
            `Channel ID: ${linkedChannelInfo.id}\n` +
            `Channel Title: ${linkedChannelInfo.title}\n` +
            `Channel Username: ${linkedChannelInfo.username || 'N/A'}\n` +
            `Channel Members: ${linkedChannelInfo.member_count || 'N/A'}\n`;
        }
        
        debugMessage += `\nConnection Codes:\n` +
          `Active codes: ${codes.length}\n` +
          `Codes: ${codes.join(', ') || 'none'}`;
        
        await sendTelegramMessage(chatId, debugMessage);
      } catch (debugError) {
        await sendTelegramMessage(chatId, '❌ Debug error: ' + debugError.message);
      }
    }
    
    res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('❌ Telegram webhook error:', error);
    res.status(200).json({ ok: true });
  }
});

// Handle Telegram connection
async function handleTelegramConnection(connectionCode, chatId, chat, userId) {
  try {
    console.log(`🔍 Looking up connection code: ${connectionCode}`);
    
    // Get all available codes for logging
    const allCodes = await getAllTelegramConnectionCodes();
    console.log(`📊 Available codes:`, allCodes.length > 0 ? allCodes : 'none');
    
    // Get the specific connection data
    const connectionData = await getTelegramConnectionCode(connectionCode);
    
    if (!connectionData) {
      console.log(`❌ Connection code ${connectionCode} not found in stored codes`);
      console.log(`📝 Stored codes:`, allCodes);
      await sendTelegramMessage(chatId, '❌ Invalid or expired connection code. Please generate a new one from your dashboard.');
      return;
    }
    
    console.log(`✅ Found connection data for ${connectionCode}:`, {
      userId: connectionData.user_id,
      expiresAt: connectionData.expires_at
    });
    
    // For groups, check if bot has admin permissions
    if (chat.type !== 'private') {
      console.log(`🏆 Connecting group/channel: ${chat.title || chat.username || chatId}`);
      try {
        const botInfo = await getBotChatMember(chatId);
        console.log(`🤖 Bot status in chat: ${botInfo.status}`);
        
        if (!botInfo.status || (botInfo.status !== 'administrator' && botInfo.status !== 'creator')) {
          await sendTelegramMessage(chatId, 
            '❌ Bot needs to be an ADMINISTRATOR to post messages.\n\n' +
            'Please:\n' +
            '1. Make this bot an admin\n' +
            '2. Give it permission to post messages\n' +
            '3. Try connecting again'
          );
      return;
        }
        
        console.log('✅ Bot has admin permissions in group');
      } catch (permError) {
        console.log('⚠️  Could not verify bot permissions:', permError.message);
        // Continue anyway - some chats might not allow checking permissions
      }
    }
    
    // Get chat info
    const chatInfo = await getTelegramChatInfo(chatId);
    
    // Check if this group has a linked channel
    let linkedChannelInfo = null;
    if (chat.type === 'supergroup') {
      try {
        linkedChannelInfo = await getLinkedChannel(chatId);
        if (linkedChannelInfo && linkedChannelInfo.id) {
          console.log(`🔗 Found linked channel: ${linkedChannelInfo.title} (${linkedChannelInfo.id})`);
        }
      } catch (error) {
        console.log('ℹ️  No linked channel found or error checking:', error.message);
      }
    }
    
    // Determine chat type and prepare account data
    const isGroup = chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel';
    const chatType = isGroup ? chat.type : 'private';
    
    console.log(`📱 Connecting ${chatType} chat: ${chat.title || chat.first_name || chatId}`);
    if (linkedChannelInfo) {
      console.log(`🔗 This group is linked to channel: ${linkedChannelInfo.title}`);
    }
    
    // Save to database
    const accountData = {
      platform: 'telegram',
      username: chat.username || chat.title || `chat_${chatId}`,
      displayName: linkedChannelInfo 
        ? `${chat.title} + ${linkedChannelInfo.title} (group+channel)` 
        : isGroup 
          ? `${chat.title} (${chatType})` 
          : `${chat.first_name || 'Private Chat'} (${chatType})`,
      platformUserId: chatId.toString(),
      accessToken: process.env.TELEGRAM_BOT_TOKEN, // Store bot token
      refreshToken: linkedChannelInfo ? JSON.stringify({
        groupId: chatId.toString(),
        channelId: linkedChannelInfo.id.toString(),
        channelTitle: linkedChannelInfo.title,
        channelUsername: linkedChannelInfo.username
      }) : null,
      profileImage: '', // Telegram doesn't provide group photos via bot API
      followers: (chatInfo.member_count || 0) + (linkedChannelInfo?.member_count || 0)
    };
    
    await SocialAccountService.create(connectionData.user_id, accountData);
    
    // Clean up connection code
    await deleteTelegramConnectionCode(connectionCode);
    
    const connectionMessage = linkedChannelInfo 
      ? `✅ Successfully connected to NexSocial!\n\n` +
        `📢 Group: ${chat.title}\n` +
        `📢 Linked Channel: ${linkedChannelInfo.title}\n` +
        `\n🎯 Smart Posting: Posts will be sent to the CHANNEL and automatically forwarded to the group!\n` +
        `This prevents duplicate messages in your group.\n\n` +
        `You can now manage both from your NexSocial dashboard.\n\n` +
      `Visit: ${process.env.CLIENT_URL}/dashboard`
      : `✅ Successfully connected to NexSocial!\n\n` +
        `${isGroup ? 'Group/Channel' : 'Chat'}: ${chat.title || chat.first_name || 'Private Chat'}\n` +
        `Type: ${chatType}\n` +
        `You can now post to this ${chatType} from your NexSocial dashboard.\n\n` +
        `Visit: ${process.env.CLIENT_URL}/dashboard`;

    await sendTelegramMessage(chatId, connectionMessage);
    
    console.log('✅ Telegram connection successful:', chatId);
    
  } catch (error) {
    console.error('❌ Telegram connection error:', error);
    await sendTelegramMessage(chatId, '❌ Failed to connect. Please try again.');
  }
}

// Send message to Telegram
async function sendTelegramMessage(chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
    
    const result = await response.json();
    if (!result.ok) {
      console.error('❌ Telegram send message error:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Telegram API error:', error);
    throw error;
  }
}

// Get chat info
async function getTelegramChatInfo(chatId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId
      })
    });
    
    const result = await response.json();
    return result.result || {};
  } catch (error) {
    console.error('❌ Get chat info error:', error);
    return {};
  }
}

// Get bot's own info
async function getBotInfo() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    const result = await response.json();
    return result.result || {};
  } catch (error) {
    console.error('❌ Get bot info error:', error);
    return {};
  }
}

// Get bot member info in chat
async function getBotChatMember(chatId) {
  try {
    // Get bot's ID first
    const botInfo = await getBotInfo();
    const botId = botInfo.id;
    
    if (!botId) {
      throw new Error('Could not get bot ID');
    }
    
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: botId
      })
    });
    
    const result = await response.json();
    return result.result || {};
  } catch (error) {
    console.error('❌ Get bot chat member error:', error);
    return {};
  }
}

// Get linked channel for a supergroup
async function getLinkedChannel(groupId) {
  try {
    // Get full chat info which includes linked channel
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: groupId
      })
    });
    
    const result = await response.json();
    
    if (result.ok && result.result && result.result.linked_chat_id) {
      const linkedChatId = result.result.linked_chat_id;
      
      // Get info about the linked channel
      const channelResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: linkedChatId
        })
      });
      
      const channelResult = await channelResponse.json();
      
      if (channelResult.ok && channelResult.result) {
        return {
          id: linkedChatId,
          title: channelResult.result.title,
          username: channelResult.result.username,
          type: channelResult.result.type,
          member_count: channelResult.result.member_count
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Get linked channel error:', error);
    return null;
  }
}

module.exports = router;