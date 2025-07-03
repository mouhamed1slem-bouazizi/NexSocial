import api from './api';

export interface SocialAccount {
  id: string; // Changed from _id to id for Supabase
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube';
  username: string;
  display_name: string; // Changed from displayName to display_name for Supabase
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
export const getSocialAccounts = async () => {
  try {
    const response = await api.get('/api/social-accounts');
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
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
export const disconnectSocialAccount = async (id: string) => {
  try {
    const response = await api.delete(`/api/social-accounts/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
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
// Response: { success: boolean, authUrl: string }
export const initiateOAuth = async (platform: string) => {
  try {
    console.log(`Initiating OAuth for platform: ${platform}`);
    const response = await api.post('/api/oauth/initiate', { platform });
    return response.data;
  } catch (error: any) {
    console.error(`OAuth initiation error for ${platform}:`, error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};