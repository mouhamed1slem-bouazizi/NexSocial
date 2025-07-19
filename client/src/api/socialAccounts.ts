import api from './api';

export interface SocialAccount {
  id: string; // Changed from _id to id for Supabase
  platform: 'facebook' | 'messenger' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest' | 'discord' | 'telegram' | 'whatsapp' | 'snapchat' | 'reddit' | 'vimeo' | 'threads' | 'twitch' | 'line' | 'tumblr' | 'vk';
  username: string;
  display_name: string; // Changed from displayName to display_name for Supabase
  platform_user_id: string;
  followers: number;
  is_connected: boolean; // Changed from isConnected to is_connected for Supabase
  profile_image: string; // Changed from profileImage to profile_image for Supabase
  last_sync: string; // Changed from lastSync to last_sync for Supabase
  connected_at: string; // Changed from connectedAt to connected_at for Supabase
  oauth1_access_token?: string; // OAuth 1.0a access token for Twitter media upload
  oauth1_access_token_secret?: string; // OAuth 1.0a access token secret for Twitter media upload
}

// Description: Get all connected social media accounts
// Endpoint: GET /api/social-accounts
// Request: {}
// Response: { success: boolean, accounts: Array<SocialAccount> }
export const getSocialAccounts = async (): Promise<SocialAccount[]> => {
  try {
    console.log('🔄 Fetching social accounts...');
    const response = await api.get('/social-accounts');
    console.log('✅ Social accounts response:', response.data);
    return response.data.accounts || [];
  } catch (error: any) {
    console.error('❌ Error fetching social accounts:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch social accounts');
  }
};

// Description: Connect a new social media account
// Endpoint: POST /api/social-accounts
// Request: { platform: string, username: string, displayName: string, platformUserId: string, accessToken: string, refreshToken?: string, followers?: number, profileImage?: string }
// Response: { success: boolean, account: SocialAccount }
export const connectSocialAccount = async (data: {
  platform: string;
  username: string;
  displayName: string;
  platformUserId: string;
  accessToken: string;
  refreshToken?: string;
  followers?: number;
  profileImage?: string;
}) => {
  try {
    const response = await api.post('/api/social-accounts', data);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get a specific social media account
// Endpoint: GET /api/social-accounts/:id
// Request: {}
// Response: { success: boolean, account: SocialAccount }
export const getSocialAccount = async (id: string) => {
  try {
    const response = await api.get(`/api/social-accounts/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Remove a social media account connection
// Endpoint: DELETE /api/social-accounts/:id
// Request: {}
// Response: { success: boolean, message: string }
export const disconnectSocialAccount = async (accountId: string): Promise<void> => {
  try {
    console.log('🔄 Disconnecting social account:', accountId);
    await api.delete(`/social-accounts/${accountId}`);
    console.log('✅ Social account disconnected successfully');
  } catch (error: any) {
    console.error('❌ Error disconnecting social account:', error);
    throw new Error(error.response?.data?.message || 'Failed to disconnect social account');
  }
};

// Description: Update social account connection status
// Endpoint: PATCH /api/social-accounts/:id/status
// Request: { isConnected: boolean }
// Response: { success: boolean, account: SocialAccount }
export const updateSocialAccountStatus = async (id: string, isConnected: boolean) => {
  try {
    const response = await api.patch(`/api/social-accounts/${id}/status`, { isConnected });
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Initiate OAuth flow for a platform
// Endpoint: POST /api/oauth/initiate
// Request: { platform: string }
// Response: { success: boolean, authUrl?: string, connectionCode?: string, instructions?: string, botUsername?: string }
export const initiateOAuth = async (platform: string) => {
  try {
    console.log(`Initiating OAuth for platform: ${platform}`);
    
    // Handle Telegram differently - it uses connection codes instead of OAuth
    if (platform === 'telegram') {
      const response = await api.get('/oauth/telegram');
      return response.data;
    }
    
    // Handle Vimeo differently to avoid API interceptor issues
    if (platform === 'vimeo') {
      // Make authenticated API call to get the auth URL
      const response = await api.get('/oauth/vimeo/redirect');
      if (response.data.success && response.data.authUrl) {
        // Redirect to Vimeo OAuth URL
        window.location.href = response.data.authUrl;
        return { success: true, authUrl: response.data.authUrl };
      } else {
        throw new Error(response.data.error || 'Failed to get Vimeo auth URL');
      }
    }
    
    // Standard OAuth flow for other platforms
    const response = await api.post('/oauth/initiate', { platform });
    return response.data;
  } catch (error: any) {
    console.error(`OAuth initiation error for ${platform}:`, error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Sync Telegram subscribers count
// Endpoint: POST /api/social-accounts/:id/sync-telegram
// Request: {}
// Response: { success: boolean, message: string, account: SocialAccount, previousCount: number, newCount: number, difference: number }
export const syncTelegramSubscribers = async (accountId: string) => {
  try {
    console.log(`🔄 Syncing Telegram subscribers for account: ${accountId}`);
    const response = await api.post(`/social-accounts/${accountId}/sync-telegram`);
    console.log('✅ Telegram subscribers synced successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error syncing Telegram subscribers:', error);
    throw new Error(error.response?.data?.error || 'Failed to sync Telegram subscribers');
  }
};

// Description: Manual sync for LinkedIn connections count
// Endpoint: POST /api/social-accounts/:id/sync-linkedin
// Request: { connectionsCount: number }
// Response: { success: boolean, message: string, account: SocialAccount, previousCount: number, newCount: number, difference: number, isManualUpdate: boolean }
export const syncLinkedInConnections = async (accountId: string, connectionsCount: number) => {
  try {
    console.log(`🔗 Manually updating LinkedIn connections for account: ${accountId} to ${connectionsCount}`);
    const response = await api.post(`/social-accounts/${accountId}/sync-linkedin`, {
      connectionsCount: connectionsCount
    });
    console.log('✅ LinkedIn connections updated successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating LinkedIn connections:', error);
    throw new Error(error.response?.data?.error || 'Failed to update LinkedIn connections');
  }
};

// Description: Get Discord channels for a specific account
// Endpoint: GET /api/social-accounts/:id/discord-channels
// Request: {}
// Response: { success: boolean, channels: DiscordChannel[], categories: DiscordCategory[], guildName: string, guildId: string }
export interface DiscordChannel {
  id: string;
  name: string;
  position: number;
  parentId?: string;
  topic?: string;
  nsfw: boolean;
  permissions: any[];
}

export interface DiscordCategory {
  id: string;
  name: string;
  position: number;
}

export interface DiscordChannelsResponse {
  success: boolean;
  channels: DiscordChannel[];
  categories: DiscordCategory[];
  guildName: string;
  guildId: string;
  cached?: boolean;
  cachedAt?: string;
  freshlyFetched?: boolean;
}

export const getDiscordChannels = async (accountId: string, forceRefresh: boolean = false): Promise<DiscordChannelsResponse> => {
  try {
    console.log(`🎮 Fetching Discord channels for account: ${accountId}${forceRefresh ? ' (force refresh)' : ''}`);
    const url = `/social-accounts/${accountId}/discord-channels${forceRefresh ? '?refresh=true' : ''}`;
    const response = await api.get(url);
    console.log('✅ Discord channels fetched successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching Discord channels:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch Discord channels');
  }
};

// Description: Force refresh Discord channels for a specific account
// Endpoint: POST /api/social-accounts/:id/refresh-discord-channels
// Request: {}
// Response: { success: boolean, message: string, shouldRefetchChannels: boolean }
export const refreshDiscordChannels = async (accountId: string): Promise<{ success: boolean; message: string; shouldRefetchChannels: boolean }> => {
  try {
    console.log(`🔄 Refreshing Discord channels for account: ${accountId}`);
    const response = await api.post(`/social-accounts/${accountId}/refresh-discord-channels`);
    console.log('✅ Discord channels refresh initiated:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error refreshing Discord channels:', error);
    throw new Error(error.response?.data?.error || 'Failed to refresh Discord channels');
  }
};

// Description: Refresh Discord account metadata to fix missing guild information
// Endpoint: POST /api/social-accounts/:id/refresh-discord-metadata
// Request: {}
// Response: { success: boolean, message: string, guildsFound: number, primaryGuild: string }
export interface RefreshDiscordMetadataResponse {
  success: boolean;
  message: string;
  guildsFound: number;
  primaryGuild: string | null;
}

export const refreshDiscordMetadata = async (accountId: string): Promise<RefreshDiscordMetadataResponse> => {
  try {
    console.log(`🔄 Refreshing Discord metadata for account: ${accountId}`);
    const response = await api.post(`/social-accounts/${accountId}/refresh-discord-metadata`);
    console.log('✅ Discord metadata refreshed successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error refreshing Discord metadata:', error);
    throw new Error(error.response?.data?.error || 'Failed to refresh Discord metadata');
  }
};