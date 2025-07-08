const express = require('express');
const SocialAccountService = require('../services/socialAccountService.js');
const { requireUser } = require('./middleware/auth.js');

const router = express.Router();

// Get all social accounts for the authenticated user
router.get('/', requireUser, async (req, res) => {
  try {
    console.log(`GET /api/social-accounts - User: ${req.user._id}`);
    const accounts = await SocialAccountService.getByUserId(req.user._id);

    res.status(200).json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Connect a new social account
router.post('/', requireUser, async (req, res) => {
  try {
    console.log(`POST /api/social-accounts - User: ${req.user._id}`);
    const { platform, username, displayName, platformUserId, accessToken, refreshToken, followers, profileImage } = req.body;

    // Validate required fields
    if (!platform || !username || !displayName || !platformUserId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: platform, username, displayName, platformUserId, accessToken'
      });
    }

    // Validate platform
    const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit', 'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
      });
    }

    const accountData = {
      platform,
      username,
      displayName,
      platformUserId,
      accessToken,
      refreshToken: refreshToken || null,
      followers: followers || 0,
      profileImage: profileImage || '',
      isConnected: true
    };

    const account = await SocialAccountService.create(req.user._id, accountData);

    res.status(201).json({
      success: true,
      account
    });
  } catch (error) {
    console.error('Error creating social account:', error);

    if (error.message.includes('already connected')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a specific social account
router.get('/:id', requireUser, async (req, res) => {
  try {
    console.log(`GET /api/social-accounts/${req.params.id} - User: ${req.user._id}`);
    const account = await SocialAccountService.getById(req.params.id, req.user._id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Social account not found'
      });
    }

    res.status(200).json({
      success: true,
      account
    });
  } catch (error) {
    console.error('Error fetching social account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a social account connection
router.delete('/:id', requireUser, async (req, res) => {
  try {
    console.log(`DELETE /api/social-accounts/${req.params.id} - User: ${req.user._id}`);
    const deleted = await SocialAccountService.delete(req.params.id, req.user._id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Social account not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Social account disconnected successfully'
    });
  } catch (error) {
    console.error('Error deleting social account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update connection status
router.patch('/:id/status', requireUser, async (req, res) => {
  try {
    console.log(`PATCH /api/social-accounts/${req.params.id}/status - User: ${req.user._id}`);
    const { isConnected } = req.body;

    if (typeof isConnected !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isConnected must be a boolean value'
      });
    }

    const account = await SocialAccountService.updateConnectionStatus(req.params.id, req.user._id, isConnected);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Social account not found'
      });
    }

    res.status(200).json({
      success: true,
      account
    });
  } catch (error) {
    console.error('Error updating social account status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sync/Refresh Telegram subscribers count
router.post('/:id/sync-telegram', requireUser, async (req, res) => {
  try {
    console.log(`POST /api/social-accounts/${req.params.id}/sync-telegram - User: ${req.user._id}`);
    
    // Get the account
    const account = await SocialAccountService.getById(req.params.id, req.user._id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Social account not found'
      });
    }
    
    if (account.platform !== 'telegram') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for Telegram accounts'
      });
    }
    
    console.log(`🔄 Syncing Telegram subscribers for: ${account.display_name}`);
    
    // Function to get chat member count
    const getTelegramMemberCount = async (chatId) => {
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
        if (result.ok && result.result) {
          return result.result.member_count || 0;
        }
        return 0;
      } catch (error) {
        console.error(`❌ Error getting member count for chat ${chatId}:`, error);
        return 0;
      }
    };
    
    let totalSubscribers = 0;
    
    // Get subscriber count from main chat
    const mainChatId = account.platform_user_id;
    const mainMemberCount = await getTelegramMemberCount(mainChatId);
    totalSubscribers += mainMemberCount;
    
    console.log(`📊 Main chat ${mainChatId} has ${mainMemberCount} members`);
    
    // Check if there's a linked channel (stored in refresh_token)
    if (account.refresh_token) {
      try {
        const linkedChannelInfo = JSON.parse(account.refresh_token);
        if (linkedChannelInfo.channelId) {
          const channelMemberCount = await getTelegramMemberCount(linkedChannelInfo.channelId);
          totalSubscribers += channelMemberCount;
          console.log(`📊 Linked channel ${linkedChannelInfo.channelId} has ${channelMemberCount} members`);
        }
      } catch (parseError) {
        console.log('📝 No linked channel info found in refresh_token');
      }
    }
    
    // Update the followers count in database
    const updatedAccount = await SocialAccountService.updateFollowers(
      req.params.id, 
      req.user._id, 
      totalSubscribers
    );
    
    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Failed to update account'
      });
    }
    
    console.log(`✅ Successfully synced Telegram subscribers: ${totalSubscribers}`);
    
    res.status(200).json({
      success: true,
      message: `Telegram subscribers synced successfully`,
      account: updatedAccount,
      previousCount: account.followers || 0,
      newCount: totalSubscribers,
      difference: totalSubscribers - (account.followers || 0)
    });
  } catch (error) {
    console.error('Error syncing Telegram subscribers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;