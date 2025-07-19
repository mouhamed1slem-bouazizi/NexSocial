import api from './api';

export interface DiscordMessage {
  id: string;
  type: 'sent' | 'received';
  content: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
    discriminator?: string;
    avatar?: string;
  };
  isRead: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type?: string;
  }>;
  embeds?: boolean;
}

export interface DiscordConversation {
  id: string;
  name: string;
  type: 'dm' | 'channel';
  guild?: {
    name: string;
    id: string;
  };
  lastMessage?: DiscordMessage;
  unreadCount: number;
  messages: DiscordMessage[];
}

export interface DiscordStatus {
  success: boolean;
  connected: boolean;
  bot?: {
    username: string;
    discriminator?: string;
    id: string;
    avatar?: string;
  };
  guild?: {
    name: string;
    id: string;
    memberCount: number;
  };
  guilds?: number;
  error?: string;
  setup_required?: boolean;
  bot_token_required?: boolean;
}

export interface DiscordConversationsResponse {
  success: boolean;
  conversations: DiscordConversation[];
  error?: string;
}

export interface DiscordMessagesResponse {
  success: boolean;
  messages: DiscordMessage[];
  channel?: {
    id: string;
    name: string;
    type: 'dm' | 'channel';
  };
  error?: string;
}

export interface DiscordSendResponse {
  success: boolean;
  message?: DiscordMessage;
  error?: string;
}

// Get Discord bot connection status
export const getDiscordStatus = async (): Promise<DiscordStatus> => {
  try {
    console.log('🎮 Checking Discord bot status...');
    const response = await api.get('/discord-messaging/status');
    console.log('✅ Discord status fetched:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching Discord status:', error);
    throw new Error(error.response?.data?.error || 'Failed to check Discord status');
  }
};

// Get Discord conversations (channels and DMs)
export const getDiscordConversations = async (): Promise<DiscordConversationsResponse> => {
  try {
    console.log('💬 Fetching Discord conversations...');
    const response = await api.get('/discord-messaging/conversations');
    console.log('✅ Discord conversations fetched successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching Discord conversations:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch Discord conversations');
  }
};

// Get messages for a specific Discord channel/DM
export const getDiscordMessages = async (channelId: string, limit: number = 50): Promise<DiscordMessagesResponse> => {
  try {
    console.log(`📨 Fetching Discord messages for channel: ${channelId}`);
    const response = await api.get(`/discord-messaging/messages/${channelId}?limit=${limit}`);
    console.log('✅ Discord messages fetched successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching Discord messages:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch Discord messages');
  }
};

// Send a Discord message
export const sendDiscordMessage = async (
  channelId: string, 
  content: string, 
  replyTo?: string
): Promise<DiscordSendResponse> => {
  try {
    console.log(`📤 Sending Discord message to channel: ${channelId}`);
    
    // Check Discord character limit (2000 characters)
    if (content.length > 2000) {
      throw new Error('Message exceeds Discord character limit (2000 characters)');
    }
    
    const response = await api.post('/discord-messaging/send', {
      channelId,
      content,
      replyTo
    });
    console.log('✅ Discord message sent successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error sending Discord message:', error);
    throw new Error(error.response?.data?.error || 'Failed to send Discord message');
  }
};

// Mark Discord messages as read (local tracking only)
export const markDiscordMessagesAsRead = async (channelId: string, messageId?: string): Promise<{ success: boolean }> => {
  try {
    console.log(`👁️ Marking Discord messages as read for channel: ${channelId}`);
    const response = await api.post('/discord-messaging/mark-read', {
      channelId,
      messageId
    });
    console.log('✅ Discord messages marked as read successfully');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error marking Discord messages as read:', error);
    throw new Error(error.response?.data?.error || 'Failed to mark messages as read');
  }
};

// Get Discord bot information
export const getDiscordInfo = async (): Promise<{
  success: boolean;
  connected: boolean;
  info?: {
    bot: {
      username: string;
      discriminator?: string;
      id: string;
      avatar?: string;
    };
    guilds: Array<{
      id: string;
      name: string;
      memberCount: number;
      channels: number;
    }>;
    totalGuilds: number;
    totalChannels: number;
  };
  error?: string;
}> => {
  try {
    console.log('ℹ️ Fetching Discord bot info...');
    const response = await api.get('/discord-messaging/info');
    console.log('✅ Discord bot info fetched successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching Discord bot info:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch Discord bot info');
  }
}; 