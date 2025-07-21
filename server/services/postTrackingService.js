const { getSupabase } = require('../config/database');

const platformColors = {
  facebook: '#1877F2',
  messenger: '#0084FF',
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  tiktok: '#000000',
  pinterest: '#BD081C',
  discord: '#5865F2',
  telegram: '#26A5E4',
  whatsapp: '#25D366',
  snapchat: '#FFFC00',
  reddit: '#FF4500',
  vimeo: '#1AB7EA',
  threads: '#000000',
  twitch: '#9146FF',
  line: '#00B900',
  tumblr: '#36465D',
  vk: '#4680C2',
};

class PostTrackingService {
  
  // Create a new post record
  static async createPost(userId, postData) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`📊 Creating post record for user: ${userId}`);
      
      // Determine content type based on media
      let contentType = 'text';
      const mediaCount = postData.mediaCount || 0;
      
      if (mediaCount > 0) {
        // You could enhance this by checking actual media types
        contentType = mediaCount === 1 ? 'image' : 'mixed';
      }
      
      // Extract platform information from results
      const platforms = Object.keys(postData.results || {});
      const successfulPlatforms = [];
      const failedPlatforms = [];
      
      let successfulAccounts = 0;
      let failedAccounts = 0;
      
      // Analyze results
      Object.entries(postData.results || {}).forEach(([accountId, result]) => {
        if (result.success) {
          successfulPlatforms.push(result.platform);
          successfulAccounts++;
        } else {
          failedPlatforms.push(result.platform);
          failedAccounts++;
        }
      });
      
      const postRecord = {
        user_id: userId,
        content: postData.content || '',
        content_type: contentType,
        media_count: mediaCount,
        platforms: JSON.stringify(platforms),
        successful_platforms: JSON.stringify(successfulPlatforms),
        failed_platforms: JSON.stringify(failedPlatforms),
        total_accounts: platforms.length,
        successful_accounts: successfulAccounts,
        failed_accounts: failedAccounts,
        post_results: JSON.stringify(postData.results || {})
      };

      const { data, error } = await supabase
        .from('user_posts')
        .insert([postRecord])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`✅ Post record created successfully: ${data.id}`);
      return data;
    } catch (error) {
      console.error(`❌ Error creating post record:`, error);
      throw new Error(`Failed to create post record: ${error.message}`);
    }
  }

  // Get posts statistics for a user
  static async getPostsStats(userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`📊 Fetching posts stats for user: ${userId}`);

      // First, get ALL posts for this user to debug
      const { data: allUserPosts, error: allError } = await supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (allError) {
        console.error('❌ Error fetching all posts:', allError);
        throw allError;
      }

      console.log(`📈 Total posts found for user: ${allUserPosts?.length || 0}`);
      
      if (allUserPosts && allUserPosts.length > 0) {
        console.log('📅 Post dates:');
        allUserPosts.forEach((post, index) => {
          console.log(`   ${index + 1}. ${post.created_at} (ID: ${post.id})`);
        });
      }

      // Get current month start and end dates
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Get last month dates
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      
      console.log(`📅 Date ranges:`);
      console.log(`   Current month: ${currentMonthStart.toISOString()} to ${currentMonthEnd.toISOString()}`);
      console.log(`   Last month: ${lastMonthStart.toISOString()} to ${lastMonthEnd.toISOString()}`);
      
      // Get posts this month
      const { count: currentMonthCount, error: currentError } = await supabase
        .from('user_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      if (currentError) {
        console.error('❌ Error fetching current month posts:', currentError);
        throw currentError;
      }

      // Get posts last month
      const { count: lastMonthCount, error: lastError } = await supabase
        .from('user_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      if (lastError) {
        console.error('❌ Error fetching last month posts:', lastError);
        throw lastError;
      }

      const difference = (currentMonthCount || 0) - (lastMonthCount || 0);

      console.log(`📊 Posts stats: Current month: ${currentMonthCount || 0}, Last month: ${lastMonthCount || 0}, Difference: ${difference}`);
      
      return {
        currentMonth: currentMonthCount || 0,
        lastMonth: lastMonthCount || 0,
        difference,
        posts: [], // Posts array not used on dashboard, return empty
      };
    } catch (error) {
      console.error(`❌ Error fetching posts stats:`, error);
      throw new Error(`Failed to fetch posts stats: ${error.message}`);
    }
  }

  // Get engagement data (7 days)
  static async getEngagementData(userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log(`📊 Fetching engagement data for user: ${userId}`);

      // Get last 7 days of posts
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: posts, error } = await supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Group posts by day and calculate metrics
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const engagementData = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = dayNames[date.getDay()];
        
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        
        const dayPosts = posts?.filter(post => {
          const postDate = new Date(post.created_at);
          return postDate >= dayStart && postDate <= dayEnd;
        }) || [];

        // Calculate metrics (simplified - in real app you'd have actual engagement data)
        const postsCount = dayPosts.length;
        const successfulPosts = dayPosts.filter(p => p.successful_accounts > 0).length;
        
        engagementData.push({
          name: dayName,
          posts: postsCount,
          successful: successfulPosts,
          // Simulate likes/comments/shares based on successful posts
          likes: successfulPosts * Math.floor(Math.random() * 20) + 10,
          comments: successfulPosts * Math.floor(Math.random() * 8) + 2,
          shares: successfulPosts * Math.floor(Math.random() * 5) + 1
        });
      }

      return engagementData;
    } catch (error) {
      console.error(`❌ Error fetching engagement data:`, error);
      throw new Error(`Failed to fetch engagement data: ${error.message}`);
    }
  }

  // Get platform distribution for a user
  static async getPlatformDistribution(userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      // Get posts from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentPosts, error } = await supabase
        .from('user_posts')
        .select('successful_platforms')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        throw error;
      }

      // Count platform usage
      const platformCounts = {};
      recentPosts?.forEach(post => {
        // The successful_platforms field is a JSONB type, so it's already an array.
        const platforms = post.successful_platforms || [];
        platforms.forEach(p => {
          if (platformCounts.hasOwnProperty(p)) {
            platformCounts[p]++;
          } else {
            platformCounts[p] = 1;
          }
        });
      });

      // Format for recharts
      return Object.keys(platformCounts).map(platform => ({
        name: platform.charAt(0).toUpperCase() + platform.slice(1),
        value: platformCounts[platform],
        color: platformColors[platform] || '#888888'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 platforms
    } catch (error) {
      console.error(`❌ Error fetching platform distribution:`, error);
      throw new Error(`Failed to fetch platform distribution: ${error.message}`);
    }
  }

  // Get total posts count
  static async getTotalPosts(userId) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { count, error } = await supabase
        .from('user_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error(`❌ Error fetching total posts count:`, error);
      return 0;
    }
  }
}

module.exports = PostTrackingService;