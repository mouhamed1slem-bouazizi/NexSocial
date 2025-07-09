const { getSupabase } = require('./config/database');

async function verifyAnalyticsData() {
  try {
    console.log('🔍 Verifying analytics data in production database...');
    
    const supabase = getSupabase();
    if (!supabase) {
      console.log('❌ Database connection not available');
      return;
    }
    
    // Check user_posts table
    console.log('\n📊 Checking user_posts table...');
    const { data: allPosts, error: postsError } = await supabase
      .from('user_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (postsError) {
      console.log('❌ Error fetching posts:', postsError.message);
      return;
    }
    
    console.log(`✅ Found ${allPosts?.length || 0} total posts in database`);
    
    if (allPosts && allPosts.length > 0) {
      console.log('\n📋 Recent posts:');
      allPosts.slice(0, 5).forEach((post, index) => {
        console.log(`   ${index + 1}. User: ${post.user_id}`);
        console.log(`      Content: ${post.content.substring(0, 50)}...`);
        console.log(`      Created: ${post.created_at}`);
        console.log(`      Platforms: ${JSON.stringify(post.platforms)}`);
        console.log(`      Successful: ${post.successful_accounts}/${post.total_accounts}`);
        console.log('');
      });
    }
    
    // Check specific user
    const testUserId = 'bef1bbcf-0cf9-4c6b-b486-2e6ce38d5693';
    console.log(`\n👤 Checking posts for specific user: ${testUserId}`);
    
    const { data: userPosts, error: userError } = await supabase
      .from('user_posts')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });
    
    if (userError) {
      console.log('❌ Error fetching user posts:', userError.message);
      return;
    }
    
    console.log(`✅ Found ${userPosts?.length || 0} posts for this user`);
    
    if (userPosts && userPosts.length > 0) {
      console.log('\n📊 User posts breakdown:');
      userPosts.forEach((post, index) => {
        console.log(`   ${index + 1}. ID: ${post.id}, Created: ${post.created_at}`);
        console.log(`      Platforms: ${JSON.stringify(post.platforms)}`);
        console.log(`      Success: ${post.successful_accounts}, Failed: ${post.failed_accounts}`);
      });
      
      // Check current month
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      console.log(`\n📅 Checking posts for current month (since ${currentMonthStart.toISOString()}):`);
      
      const currentMonthPosts = userPosts.filter(post => 
        new Date(post.created_at) >= currentMonthStart
      );
      
      console.log(`✅ Posts this month: ${currentMonthPosts.length}`);
    }
    
    console.log('\n✅ Analytics data verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

verifyAnalyticsData().then(() => {
  console.log('\n🏁 Verification completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}); 