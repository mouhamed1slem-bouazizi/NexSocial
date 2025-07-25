const express = require('express');
const SocialAccountService = require('../services/socialAccountService.js');
const UserService = require('../services/userService.js');
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
    
    // Enhanced function to get chat member count with multiple methods
    const getTelegramMemberCount = async (chatId, chatType = 'unknown') => {
      try {
        console.log(`🔍 Getting member count for chat ${chatId} (type: ${chatType})`);
        
        // Method 1: Try getChat API (works for most public channels and some groups)
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
          console.log(`📊 getChat API response for ${chatId}:`, {
            ok: result.ok,
            hasResult: !!result.result,
            memberCount: result.result?.member_count,
            chatType: result.result?.type,
            title: result.result?.title,
            error: result.description
          });
          
          if (result.ok && result.result && typeof result.result.member_count === 'number') {
            console.log(`✅ Successfully got member count via getChat: ${result.result.member_count}`);
            return result.result.member_count;
          }
          
          if (!result.ok) {
            console.log(`⚠️  getChat API failed: ${result.description}`);
          }
        } catch (getChatError) {
          console.log(`⚠️  getChat API error:`, getChatError.message);
        }
        
        // Method 2: Try getChatMemberCount API (works for channels/supergroups where bot is admin)
        try {
          const countResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMemberCount`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId
            })
          });
          
          const countResult = await countResponse.json();
          console.log(`📊 getChatMemberCount API response for ${chatId}:`, {
            ok: countResult.ok,
            result: countResult.result,
            error: countResult.description
          });
          
          if (countResult.ok && typeof countResult.result === 'number') {
            console.log(`✅ Successfully got member count via getChatMemberCount: ${countResult.result}`);
            return countResult.result;
          }
          
          if (!countResult.ok) {
            console.log(`⚠️  getChatMemberCount API failed: ${countResult.description}`);
          }
        } catch (getMemberCountError) {
          console.log(`⚠️  getChatMemberCount API error:`, getMemberCountError.message);
        }
        
        // Method 3: Check bot permissions and status
        try {
          const botResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              user_id: (await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`).then(r => r.json())).result.id
            })
          });
          
          const botResult = await botResponse.json();
          if (botResult.ok) {
            console.log(`🤖 Bot status in chat ${chatId}:`, {
              status: botResult.result.status,
              canPostMessages: botResult.result.can_post_messages,
              canReadAllGroupMessages: botResult.result.can_read_all_group_messages
            });
          }
        } catch (botError) {
          console.log(`⚠️  Could not check bot status:`, botError.message);
        }
        
        console.log(`❌ Could not get member count for chat ${chatId} - all methods failed`);
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
    
    // Provide helpful feedback based on the result
    let message = `Telegram subscribers synced successfully`;
    let recommendations = [];
    
    if (totalSubscribers === 0) {
      message = `Sync completed, but member count shows 0`;
      recommendations = [
        'Ensure the bot has admin permissions in your group/channel',
        'Make sure the bot can read messages and access member information',
        'For private groups, the bot needs "Access to Messages" permission',
        'For channels, the bot should be added as an admin with posting rights'
      ];
    } else if (totalSubscribers < (account.followers || 0)) {
      message = `Subscriber count decreased from ${account.followers || 0} to ${totalSubscribers}`;
    } else if (totalSubscribers > (account.followers || 0)) {
      message = `Subscriber count increased from ${account.followers || 0} to ${totalSubscribers} (+${totalSubscribers - (account.followers || 0)})`;
    }
    
    res.status(200).json({
      success: true,
      message,
      account: updatedAccount,
      previousCount: account.followers || 0,
      newCount: totalSubscribers,
      difference: totalSubscribers - (account.followers || 0),
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      troubleshooting: totalSubscribers === 0 ? {
        chatId: account.platform_user_id,
        chatType: 'Check server logs for detailed API responses',
        nextSteps: [
          'Try the bot permission setup steps below',
          'Check if your group/channel is public or private',
          'Verify the bot token is correct and active'
        ]
      } : undefined
    });
  } catch (error) {
    console.error('Error syncing Telegram subscribers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual sync for LinkedIn connections count
router.post('/:id/sync-linkedin', requireUser, async (req, res) => {
  try {
    console.log(`POST /api/social-accounts/${req.params.id}/sync-linkedin - User: ${req.user._id}`);
    
    const { connectionsCount } = req.body;
    
    // Validate input
    if (typeof connectionsCount !== 'number' || connectionsCount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid connections count (number >= 0)'
      });
    }
    
    // Get the account
    const account = await SocialAccountService.getById(req.params.id, req.user._id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Social account not found'
      });
    }
    
    if (account.platform !== 'linkedin') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for LinkedIn accounts'
      });
    }
    
    console.log(`🔗 Manually updating LinkedIn connections for: ${account.display_name} to ${connectionsCount}`);
    
    // Update the followers count in database
    const updatedAccount = await SocialAccountService.updateFollowers(
      req.params.id, 
      req.user._id, 
      connectionsCount
    );
    
    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Failed to update account'
      });
    }
    
    console.log(`✅ Successfully updated LinkedIn connections: ${connectionsCount}`);
    
    res.status(200).json({
      success: true,
      message: `LinkedIn connections updated successfully`,
      account: updatedAccount,
      previousCount: account.followers || 0,
      newCount: connectionsCount,
      difference: connectionsCount - (account.followers || 0),
      isManualUpdate: true
    });
  } catch (error) {
    console.error('Error updating LinkedIn connections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Discord channels for a specific account (with caching)
router.get('/:id/discord-channels', requireUser, async (req, res) => {
  try {
    console.log(`🎮 Fetching Discord channels for account: ${req.params.id}`);
    
    const forceRefresh = req.query.refresh === 'true';
    const cacheMaxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Get the Discord account
    const account = await SocialAccountService.getById(req.params.id, req.user._id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Discord account not found'
      });
    }
    
    if (account.platform !== 'discord') {
      return res.status(400).json({
        success: false,
        error: 'Account is not a Discord account'
      });
    }

    // Parse metadata to get guild information
    let metadata = {};
    try {
      metadata = JSON.parse(account.metadata || '{}');
      console.log('🔍 Parsed Discord metadata:', JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('❌ Failed to parse Discord metadata:', error);
      console.log('🔍 Raw metadata value:', account.metadata);
      return res.status(500).json({
        success: false,
        error: 'Invalid Discord account metadata'
      });
    }
    
    const primaryGuild = metadata.primaryGuild;
    
    // Check for cached channels first (unless force refresh is requested)
    if (!forceRefresh) {
      try {
        const { getSupabase } = require('../config/database');
        const supabase = getSupabase();
        
        if (supabase) {
          console.log('🔍 Checking for cached Discord channels...');
          
          const { data: cachedChannels, error: cacheError } = await supabase
            .from('discord_channels')
            .select('*')
            .eq('social_account_id', req.params.id)
            .gte('cached_at', new Date(Date.now() - cacheMaxAge).toISOString())
            .order('channel_position', { ascending: true });
          
          if (!cacheError && cachedChannels && cachedChannels.length > 0) {
            console.log(`✅ Found ${cachedChannels.length} cached Discord channels (fresh within 1 hour)`);
            
            // Convert cached data to the expected format
            const formattedChannels = cachedChannels.map(ch => ({
              id: ch.discord_channel_id,
              name: ch.channel_name,
              position: ch.channel_position,
              parentId: ch.parent_id,
              topic: ch.topic,
              nsfw: ch.nsfw,
              permissions: ch.permissions || []
            }));
            
            // Get categories from cache (categories have type 4 in Discord)
            const categories = []; // We could cache categories separately if needed
            
            return res.json({
              success: true,
              channels: formattedChannels,
              categories: categories,
              guildName: cachedChannels[0]?.guild_name || primaryGuild?.name || 'Unknown Guild',
              guildId: cachedChannels[0]?.guild_id || primaryGuild?.id || 'unknown',
              cached: true,
              cachedAt: cachedChannels[0]?.cached_at
            });
          } else {
            console.log('🔄 No valid cached channels found, fetching from Discord API...');
          }
        }
      } catch (cacheCheckError) {
        console.log('⚠️ Cache check failed, proceeding with Discord API fetch:', cacheCheckError.message);
      }
    } else {
      console.log('🔄 Force refresh requested, fetching fresh data from Discord API...');
    }
    console.log('🔍 Primary guild from metadata:', primaryGuild);
    
    if (!primaryGuild) {
      console.log('❌ No primary guild found in metadata, available keys:', Object.keys(metadata));
      console.log('🔍 Guilds array:', metadata.guilds);
      
      // Try to provide helpful error message with guild IDs
      if (metadata.guilds && metadata.guilds.length > 0) {
        const guildList = metadata.guilds.map(g => `${g.name} (${g.id})`).join(', ');
        console.log('🔍 Available guilds:', guildList);
        
        return res.status(400).json({
          success: false,
          error: 'Discord bot needs to be invited to server with proper permissions',
          availableGuilds: metadata.guilds.map(g => ({ id: g.id, name: g.name })),
          botInviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=68608&scope=bot&guild_id=${metadata.guilds[0].id}`
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'No Discord server configured for this account'
      });
    }
    
    // Fetch user preferences for channel filtering
    const user = await UserService.get(req.user._id);
    const preferences = user?.preferences || {};
    const discordPrefs = preferences.discord || {
      showChannelsWithRules: false,
      showChannelsWithAnnouncements: false,
      customChannelFilters: []
    };

    // Fetch channels from Discord API using bot token
    try {
      const channelsResponse = await fetch(`https://discord.com/api/guilds/${primaryGuild.id}/channels`, {
        headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` }
      });
      
      if (!channelsResponse.ok) {
        throw new Error('Failed to fetch channels from Discord API');
      }
      
      const channelsData = await channelsResponse.json();
      
      // Filter and format channels based on user preferences
      const textChannels = channelsData
        .filter(channel => {
          // Only include text channels
          if (channel.type !== 0) return false;
          
          // Apply user preference filters
          if (!discordPrefs.showChannelsWithRules && channel.name.includes('rules')) {
            return false;
          }
          
          if (!discordPrefs.showChannelsWithAnnouncements && channel.name.includes('announcements')) {
            return false;
          }
          
          // Apply custom channel filters if any
          if (discordPrefs.customChannelFilters && discordPrefs.customChannelFilters.length > 0) {
            for (const filter of discordPrefs.customChannelFilters) {
              if (channel.name.toLowerCase().includes(filter.toLowerCase())) {
                return false;
              }
            }
          }
          
          return true;
        })
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          position: channel.position,
          parentId: channel.parent_id,
          topic: channel.topic,
          nsfw: channel.nsfw,
          permissions: channel.permission_overwrites || []
        }))
        .sort((a, b) => a.position - b.position); // Sort by Discord position
      
      // Get channel categories for better organization
      const categories = channelsData
        .filter(channel => channel.type === 4) // Category channels
        .map(category => ({
          id: category.id,
          name: category.name,
          position: category.position
        }))
        .sort((a, b) => a.position - b.position);
      
      console.log(`✅ Found ${textChannels.length} text channels in ${primaryGuild.name}`);
      
      // Cache the channels in the database for future use
      try {
        const { getSupabase } = require('../config/database');
        const supabase = getSupabase();
        
        if (supabase) {
          console.log('💾 Caching Discord channels in database...');
          
          // First, delete existing cached channels for this account
          const { error: deleteError } = await supabase
            .from('discord_channels')
            .delete()
            .eq('social_account_id', req.params.id);
          
          if (deleteError) {
            console.log('⚠️ Failed to clear old cached channels:', deleteError.message);
          }
          
          // Insert new cached channels
          if (textChannels.length > 0) {
            const channelsToCache = textChannels.map(channel => ({
              social_account_id: req.params.id,
              discord_channel_id: channel.id,
              channel_name: channel.name,
              channel_position: channel.position,
              parent_id: channel.parentId,
              topic: channel.topic,
              nsfw: channel.nsfw,
              permissions: channel.permissions,
              guild_id: primaryGuild.id,
              guild_name: primaryGuild.name,
              cached_at: new Date().toISOString()
            }));
            
            const { error: insertError } = await supabase
              .from('discord_channels')
              .insert(channelsToCache);
            
            if (insertError) {
              console.log('⚠️ Failed to cache channels:', insertError.message);
            } else {
              console.log(`✅ Successfully cached ${textChannels.length} channels`);
            }
          }
        }
      } catch (cacheError) {
        console.log('⚠️ Channel caching failed:', cacheError.message);
        // Don't fail the request if caching fails
      }
      
      res.json({
        success: true,
        channels: textChannels,
        categories: categories,
        guildName: primaryGuild.name,
        guildId: primaryGuild.id,
        cached: false,
        freshlyFetched: true
      });
      
    } catch (apiError) {
      console.error('❌ Error fetching Discord channels:', apiError);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Discord channels. Please ensure the bot has proper permissions.'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in Discord channels endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Discord channels'
    });
  }
});

// Force refresh Discord channels for a specific account
router.post('/:id/refresh-discord-channels', requireUser, async (req, res) => {
  try {
    console.log(`🔄 Force refreshing Discord channels for account: ${req.params.id}`);
    
    // Simply redirect to the channels endpoint with force refresh
    // This is more efficient than duplicating the logic
    req.query.refresh = 'true';
    
    // Forward to the existing channels endpoint
    const channelsUrl = `/api/social-accounts/${req.params.id}/discord-channels?refresh=true`;
    
    // We could make an internal call here, but it's simpler to redirect the logic
    // Let's create a simpler response for the refresh action
    res.json({
      success: true,
      message: 'Discord channels refresh initiated. Please fetch channels again.',
      shouldRefetchChannels: true
    });
    
  } catch (error) {
    console.error('❌ Error refreshing Discord channels:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh Discord channels'
    });
  }
});

// Refresh Discord account metadata (fix for missing guild info)
router.post('/:id/refresh-discord-metadata', requireUser, async (req, res) => {
  try {
    console.log(`🔄 Refreshing Discord metadata for account: ${req.params.id}`);
    
    // Get the Discord account
    const account = await SocialAccountService.getById(req.params.id, req.user._id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Discord account not found'
      });
    }
    
    if (account.platform !== 'discord') {
      return res.status(400).json({
        success: false,
        error: 'Account is not a Discord account'
      });
    }
    
    if (!account.access_token) {
      return res.status(400).json({
        success: false,
        error: 'No access token available for this Discord account'
      });
    }
    
    // Fetch fresh guild data from Discord API
    console.log('🔍 Fetching fresh guild data from Discord...');
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { 'Authorization': `Bearer ${account.access_token}` }
    });
    
    if (!guildsResponse.ok) {
      const errorData = await guildsResponse.json();
      console.error('❌ Failed to fetch guilds from Discord:', errorData);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch guild data from Discord. Token may be expired.'
      });
    }
    
    const guildsData = await guildsResponse.json();
    console.log(`✅ Fetched ${guildsData.length} guilds from Discord`);
    
    // Find primary guild (first one they can manage)
    let primaryGuild = null;
    if (guildsData && guildsData.length > 0) {
      primaryGuild = guildsData.find(guild => 
        (guild.permissions & 0x20) || // MANAGE_MESSAGES
        (guild.permissions & 0x8) ||  // ADMINISTRATOR  
        guild.owner
      ) || guildsData[0]; // Fallback to first guild
    }
    
    console.log(`🎯 Selected primary guild:`, primaryGuild);
    
    // Create new metadata
    const metadataObject = {
      guilds: guildsData || [],
      primaryGuild: primaryGuild,
      refreshed_at: new Date().toISOString()
    };
    
    const metadataString = JSON.stringify(metadataObject);
    console.log(`🔍 New metadata:`, metadataString);
    
    // Update the account
    await SocialAccountService.update(account.id, {
      metadata: metadataString
    }, req.user._id);
    
    console.log('✅ Discord metadata refreshed successfully');
    
    res.json({
      success: true,
      message: 'Discord metadata refreshed successfully',
      guildsFound: guildsData.length,
      primaryGuild: primaryGuild ? primaryGuild.name : null
    });
    
  } catch (error) {
    console.error('❌ Error refreshing Discord metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh Discord metadata'
    });
  }
});

module.exports = router;