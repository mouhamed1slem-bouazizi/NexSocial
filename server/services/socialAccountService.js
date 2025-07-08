const { getSupabase } = require('../config/database');

class SocialAccountService {
  static async getByUserId(userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`Fetching social accounts for user: ${userId}`);

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('connected_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`Found ${data.length} social accounts for user: ${userId}`);
      return data;
    } catch (error) {
      console.error(`Error fetching social accounts for user ${userId}:`, error);
      throw new Error(`Database error while fetching social accounts: ${error.message}`);
    }
  }

  static async create(userId, accountData) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`Creating social account for user: ${userId}, platform: ${accountData.platform}`);

      // Check if account already exists
      const { data: existingAccount, error: checkError } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', accountData.platform)
        .eq('platform_user_id', accountData.platformUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingAccount) {
        console.log(`Social account already exists for user: ${userId}, platform: ${accountData.platform}`);
        throw new Error(`Account for ${accountData.platform} is already connected`);
      }

      const { data, error } = await supabase
        .from('social_accounts')
        .insert([
          {
            user_id: userId,
            platform: accountData.platform,
            username: accountData.username,
            display_name: accountData.displayName,
            platform_user_id: accountData.platformUserId,
            access_token: accountData.accessToken,
            refresh_token: accountData.refreshToken || null,
            oauth1_access_token: accountData.oauth1AccessToken || null,
            oauth1_access_token_secret: accountData.oauth1AccessTokenSecret || null,
            followers: accountData.followers || 0,
            profile_image: accountData.profileImage || '',
            is_connected: accountData.isConnected !== undefined ? accountData.isConnected : true,
            last_sync: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`Social account created successfully: ${data.id}`);
      return data;
    } catch (error) {
      console.error(`Error creating social account for user ${userId}:`, error);
      throw new Error(`Database error while creating social account: ${error.message}`);
    }
  }

  static async getById(id, userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`Fetching social account: ${id} for user: ${userId}`);

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching social account ${id}:`, error);
      throw new Error(`Database error while fetching social account: ${error.message}`);
    }
  }

  static async delete(id, userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`Deleting social account: ${id} for user: ${userId}`);

      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Social account deleted successfully: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting social account ${id}:`, error);
      throw new Error(`Database error while deleting social account: ${error.message}`);
    }
  }

  static async updateLastSync(id, userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`Updating last sync for social account: ${id}`);

      const { data, error } = await supabase
        .from('social_accounts')
        .update({
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error updating last sync for social account ${id}:`, error);
      throw new Error(`Database error while updating social account: ${error.message}`);
    }
  }

  static async updateConnectionStatus(id, userId, isConnected) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`Updating connection status for social account: ${id} to ${isConnected}`);

      const { data, error } = await supabase
        .from('social_accounts')
        .update({
          is_connected: isConnected,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error updating connection status for social account ${id}:`, error);
      throw new Error(`Database error while updating social account: ${error.message}`);
    }
  }

  static async updateTokens(id, userId, accessToken, refreshToken) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`🔄 Updating tokens for social account: ${id}`);

      const updateData = {
        access_token: accessToken,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Only update refresh token if provided
      if (refreshToken) {
        updateData.refresh_token = refreshToken;
      }

      const { data, error } = await supabase
        .from('social_accounts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      console.log(`✅ Tokens updated successfully for social account: ${id}`);
      return data;
    } catch (error) {
      console.error(`❌ Error updating tokens for social account ${id}:`, error);
      throw new Error(`Database error while updating tokens: ${error.message}`);
    }
  }

  static async updateFollowers(id, userId, followers) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`🔄 Updating followers for social account: ${id} to ${followers}`);

      const { data, error } = await supabase
        .from('social_accounts')
        .update({
          followers: followers,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      console.log(`✅ Followers updated successfully for social account: ${id} (${followers} followers)`);
      return data;
    } catch (error) {
      console.error(`❌ Error updating followers for social account ${id}:`, error);
      throw new Error(`Database error while updating followers: ${error.message}`);
    }
  }

  static async findByPlatformUserId(platform, platformUserId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`Finding social account by platform: ${platform}, platformUserId: ${platformUserId}`);

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('platform', platform)
        .eq('platform_user_id', platformUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error finding social account by platform ${platform} and platformUserId ${platformUserId}:`, error);
      throw new Error(`Database error while finding social account: ${error.message}`);
    }
  }
}

module.exports = SocialAccountService;