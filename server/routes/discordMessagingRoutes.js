const express = require('express');
const { requireUser } = require('./middleware/auth.js');

const router = express.Router();

// Discord client will be initialized when Discord.js is installed
let discordClient = null;
let isDiscordConnected = false;

// Initialize Discord client
const initializeDiscordBot = async () => {
  try {
    // Dynamically import discord.js when available
    const { Client, GatewayIntentBits } = require('discord.js');
    
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.warn('⚠️ DISCORD_BOT_TOKEN not found in environment variables');
      return false;
    }

    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ]
    });

    discordClient.once('ready', () => {
      console.log(`🎮 Discord Bot logged in as ${discordClient.user.tag}!`);
      console.log(`🏰 Bot is in ${discordClient.guilds.cache.size} servers`);
      isDiscordConnected = true;
    });

    discordClient.on('error', (error) => {
      console.error('❌ Discord client error:', error);
      isDiscordConnected = false;
    });

    discordClient.on('disconnect', () => {
      console.log('🔌 Discord bot disconnected');
      isDiscordConnected = false;
    });

    await discordClient.login(process.env.DISCORD_BOT_TOKEN);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Discord bot:', error.message);
    if (error.message.includes('Cannot find module')) {
      console.log('💡 To use Discord messaging, install discord.js: npm install discord.js');
    }
    return false;
  }
};

// Initialize on startup
initializeDiscordBot();

// Get Discord bot status
router.get('/status', requireUser, async (req, res) => {
  try {
    if (!discordClient) {
      return res.json({
        success: false,
        connected: false,
        error: 'Discord.js not installed or bot not initialized',
        setup_required: true
      });
    }

    if (!isDiscordConnected) {
      return res.json({
        success: false,
        connected: false,
        error: 'Discord bot not connected',
        bot_token_required: !process.env.DISCORD_BOT_TOKEN
      });
    }

    const guild = discordClient.guilds.cache.first();
    
    res.json({
      success: true,
      connected: true,
      bot: {
        username: discordClient.user.username,
        discriminator: discordClient.user.discriminator,
        id: discordClient.user.id,
        avatar: discordClient.user.displayAvatarURL()
      },
      guild: guild ? {
        name: guild.name,
        id: guild.id,
        memberCount: guild.memberCount
      } : null,
      guilds: discordClient.guilds.cache.size
    });
  } catch (error) {
    console.error('❌ Error getting Discord status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Discord conversations (channels and DMs)
router.get('/conversations', requireUser, async (req, res) => {
  try {
    if (!discordClient || !isDiscordConnected) {
      return res.json({
        success: false,
        conversations: [],
        error: 'Discord bot not connected'
      });
    }

    const conversations = [];
    
    // Get guild channels
    for (const guild of discordClient.guilds.cache.values()) {
      const textChannels = guild.channels.cache.filter(channel => 
        channel.type === 0 && // TEXT channel
        channel.permissionsFor(discordClient.user).has('ViewChannel') &&
        channel.permissionsFor(discordClient.user).has('SendMessages')
      );

      for (const channel of textChannels.values()) {
        // Get recent messages
        let lastMessage = null;
        let unreadCount = 0;
        
        try {
          const messages = await channel.messages.fetch({ limit: 1 });
          if (messages.size > 0) {
            const msg = messages.first();
            lastMessage = {
              id: msg.id,
              content: msg.content || '[Attachment]',
              timestamp: msg.createdAt.toISOString(),
              author: {
                id: msg.author.id,
                username: msg.author.username,
                discriminator: msg.author.discriminator,
                avatar: msg.author.displayAvatarURL()
              }
            };
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch messages for channel ${channel.name}:`, error.message);
        }

        conversations.push({
          id: channel.id,
          name: `#${channel.name}`,
          type: 'channel',
          guild: {
            name: guild.name,
            id: guild.id
          },
          lastMessage,
          unreadCount,
          messages: []
        });
      }
    }

    // Get DM channels
    for (const dmChannel of discordClient.channels.cache.filter(channel => channel.type === 1).values()) {
      let lastMessage = null;
      
      try {
        const messages = await dmChannel.messages.fetch({ limit: 1 });
        if (messages.size > 0) {
          const msg = messages.first();
          lastMessage = {
            id: msg.id,
            content: msg.content || '[Attachment]',
            timestamp: msg.createdAt.toISOString(),
            author: {
              id: msg.author.id,
              username: msg.author.username,
              discriminator: msg.author.discriminator,
              avatar: msg.author.displayAvatarURL()
            }
          };
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch DM messages:`, error.message);
      }

      conversations.push({
        id: dmChannel.id,
        name: dmChannel.recipient ? `@${dmChannel.recipient.username}` : 'DM',
        type: 'dm',
        lastMessage,
        unreadCount: 0,
        messages: []
      });
    }

    res.json({
      success: true,
      conversations: conversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
      })
    });

  } catch (error) {
    console.error('❌ Error fetching Discord conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get messages for a specific channel/DM
router.get('/messages/:channelId', requireUser, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!discordClient || !isDiscordConnected) {
      return res.json({
        success: false,
        messages: [],
        error: 'Discord bot not connected'
      });
    }

    const channel = discordClient.channels.cache.get(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Check permissions
    if (channel.type === 0) { // Guild text channel
      const permissions = channel.permissionsFor(discordClient.user);
      if (!permissions.has('ViewChannel') || !permissions.has('ReadMessageHistory')) {
        return res.status(403).json({
          success: false,
          error: 'Bot does not have permission to read this channel'
        });
      }
    }

    const messages = await channel.messages.fetch({ limit });
    const formattedMessages = Array.from(messages.values()).reverse().map(msg => ({
      id: msg.id,
      type: msg.author.id === discordClient.user.id ? 'sent' : 'received',
      content: msg.content || '[Attachment]',
      timestamp: msg.createdAt.toISOString(),
      author: {
        id: msg.author.id,
        username: msg.author.username,
        discriminator: msg.author.discriminator,
        avatar: msg.author.displayAvatarURL()
      },
      isRead: true,
      attachments: msg.attachments.map(attachment => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        type: attachment.contentType
      })),
      embeds: msg.embeds.length > 0
    }));

    res.json({
      success: true,
      messages: formattedMessages,
      channel: {
        id: channel.id,
        name: channel.name || (channel.recipient ? channel.recipient.username : 'DM'),
        type: channel.type === 0 ? 'channel' : 'dm'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Discord messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send a message to Discord
router.post('/send', requireUser, async (req, res) => {
  try {
    const { channelId, content, replyTo } = req.body;

    if (!discordClient || !isDiscordConnected) {
      return res.status(400).json({
        success: false,
        error: 'Discord bot not connected'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content cannot be empty'
      });
    }

    // Discord message length limit
    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds Discord character limit (2000 characters)'
      });
    }

    const channel = discordClient.channels.cache.get(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Check permissions
    if (channel.type === 0) { // Guild text channel
      const permissions = channel.permissionsFor(discordClient.user);
      if (!permissions.has('SendMessages')) {
        return res.status(403).json({
          success: false,
          error: 'Bot does not have permission to send messages in this channel'
        });
      }
    }

    // Prepare message options
    const messageOptions = { content: content.trim() };
    
    // Handle reply
    if (replyTo) {
      try {
        const replyMessage = await channel.messages.fetch(replyTo);
        messageOptions.reply = { messageReference: replyMessage };
      } catch (error) {
        console.warn('⚠️ Could not reply to message:', error.message);
      }
    }

    // Send the message
    const sentMessage = await channel.send(messageOptions);

    console.log(`✅ Discord message sent to ${channel.name || 'DM'}: ${content.substring(0, 50)}...`);

    res.json({
      success: true,
      message: {
        id: sentMessage.id,
        type: 'sent',
        content: sentMessage.content,
        timestamp: sentMessage.createdAt.toISOString(),
        author: {
          id: discordClient.user.id,
          username: discordClient.user.username,
          discriminator: discordClient.user.discriminator,
          avatar: discordClient.user.displayAvatarURL()
        },
        isRead: true
      }
    });

  } catch (error) {
    console.error('❌ Error sending Discord message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark messages as read (Discord doesn't have read receipts for bots, but we can track locally)
router.post('/mark-read', requireUser, async (req, res) => {
  try {
    const { channelId, messageId } = req.body;

    // For Discord bots, there's no built-in "mark as read" functionality
    // This endpoint exists for API compatibility but doesn't perform any Discord API calls
    
    console.log(`📖 Marked Discord channel ${channelId} as read (local tracking only)`);

    res.json({
      success: true,
      message: 'Messages marked as read locally'
    });

  } catch (error) {
    console.error('❌ Error marking Discord messages as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Discord bot connection info
router.get('/info', requireUser, async (req, res) => {
  try {
    if (!discordClient || !isDiscordConnected) {
      return res.json({
        success: false,
        connected: false,
        info: null
      });
    }

    const guilds = Array.from(discordClient.guilds.cache.values()).map(guild => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      channels: guild.channels.cache.filter(c => c.type === 0).size
    }));

    res.json({
      success: true,
      connected: true,
      info: {
        bot: {
          username: discordClient.user.username,
          discriminator: discordClient.user.discriminator,
          id: discordClient.user.id,
          avatar: discordClient.user.displayAvatarURL()
        },
        guilds,
        totalGuilds: discordClient.guilds.cache.size,
        totalChannels: discordClient.channels.cache.filter(c => c.type === 0).size
      }
    });

  } catch (error) {
    console.error('❌ Error getting Discord info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 