const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const { getSupabase } = require('../config/database.js');
const axios = require('axios');

const router = express.Router();

// 🔍 VALIDATE SUBREDDIT - Check if subreddit exists and get details
router.get('/validate/:name', requireUser, async (req, res) => {
  try {
    const subredditName = req.params.name.toLowerCase().trim();
    const supabase = getSupabase();
    
    console.log(`🔍 Validating subreddit: r/${subredditName}`);
    
    // Input validation
    if (!subredditName || subredditName.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Subreddit name must be at least 2 characters long'
      });
    }
    
    // Check for invalid characters
    if (!/^[a-zA-Z0-9_]+$/.test(subredditName)) {
      return res.status(400).json({
        success: false,
        error: 'Subreddit name can only contain letters, numbers, and underscores'
      });
    }
    
    // Get user's Reddit account to use for validation
    const { data: redditAccounts } = await supabase
      .from('social_accounts')
      .select('access_token')
      .eq('user_id', req.user._id)
      .eq('platform', 'reddit')
      .eq('is_connected', true)
      .limit(1);
    
    if (!redditAccounts || redditAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No connected Reddit account found. Please connect a Reddit account first.'
      });
    }
    
    const accessToken = redditAccounts[0].access_token;
    
    // Check if subreddit exists using Reddit API
    try {
      const response = await axios.get(`https://oauth.reddit.com/r/${subredditName}/about`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'NexSocial/1.0'
        }
      });
      
      if (response.status === 200 && response.data && response.data.data) {
        const subredditData = response.data.data;
        
        console.log(`✅ Subreddit r/${subredditName} validated successfully`);
        
        res.json({
          success: true,
          exists: true,
          subreddit: {
            name: subredditData.display_name,
            display_name: subredditData.display_name_prefixed,
            title: subredditData.title,
            description: subredditData.public_description || subredditData.description,
            subscriber_count: subredditData.subscribers,
            submission_type: subredditData.submission_type,
            over18: subredditData.over18,
            quarantined: subredditData.quarantine,
            public_traffic: subredditData.public_traffic,
            subreddit_type: subredditData.subreddit_type,
            lang: subredditData.lang,
            created_utc: subredditData.created_utc
          }
        });
      } else {
        res.json({
          success: true,
          exists: false,
          error: 'Subreddit not found'
        });
      }
      
    } catch (redditError) {
      console.log(`❌ Reddit API error for r/${subredditName}:`, redditError.response?.status);
      
      if (redditError.response?.status === 403) {
        res.json({
          success: true,
          exists: true,
          restricted: true,
          error: 'Subreddit exists but is private or restricted'
        });
      } else if (redditError.response?.status === 404) {
        res.json({
          success: true,
          exists: false,
          error: 'Subreddit not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to validate subreddit'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error validating subreddit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 📋 GET USER'S SUBREDDITS - Retrieve all user's saved subreddits
router.get('/', requireUser, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { verified, favorites } = req.query;
    
    console.log(`📋 Getting subreddits for user: ${req.user._id}`);
    
    let query = supabase
      .from('user_subreddits')
      .select('*')
      .eq('user_id', req.user._id)
      .order('is_favorite', { ascending: false })
      .order('subscriber_count', { ascending: false });
    
    // Apply filters
    if (verified === 'true') {
      query = query.eq('is_verified', true);
    }
    
    if (favorites === 'true') {
      query = query.eq('is_favorite', true);
    }
    
    const { data: subreddits, error } = await query;
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve subreddits'
      });
    }
    
    console.log(`✅ Retrieved ${subreddits?.length || 0} subreddits`);
    
    res.json({
      success: true,
      subreddits: subreddits || [],
      count: subreddits?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error getting subreddits:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ➕ ADD SUBREDDIT - Add a new subreddit to user's list
router.post('/', requireUser, async (req, res) => {
  try {
    const { subreddit_name, auto_validate = true } = req.body;
    const supabase = getSupabase();
    
    console.log(`➕ Adding subreddit: r/${subreddit_name}`);
    
    if (!subreddit_name) {
      return res.status(400).json({
        success: false,
        error: 'Subreddit name is required'
      });
    }
    
    const cleanName = subreddit_name.toLowerCase().trim();
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('user_subreddits')
      .select('id')
      .eq('user_id', req.user._id)
      .eq('subreddit_name', cleanName)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Subreddit already in your list'
      });
    }
    
    let subredditData = {
      user_id: req.user._id,
      subreddit_name: cleanName,
      display_name: cleanName,
      is_verified: false
    };
    
    // Auto-validate if requested
    if (auto_validate) {
      try {
        const validateResponse = await axios.get(`${req.protocol}://${req.get('host')}/api/subreddits/validate/${cleanName}`, {
          headers: {
            'Authorization': req.headers.authorization
          }
        });
        
        if (validateResponse.data.success && validateResponse.data.exists) {
          const reddit = validateResponse.data.subreddit;
          subredditData = {
            ...subredditData,
            display_name: reddit.display_name,
            description: reddit.description,
            subscriber_count: reddit.subscriber_count,
            submission_type: reddit.submission_type,
            over18: reddit.over18,
            quarantined: reddit.quarantined,
            public_traffic: reddit.public_traffic,
            is_verified: true,
            last_validated: new Date().toISOString()
          };
        }
      } catch (validationError) {
        console.log('⚠️  Auto-validation failed, adding unverified');
      }
    }
    
    // Insert the subreddit
    const { data: newSubreddit, error } = await supabase
      .from('user_subreddits')
      .insert(subredditData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add subreddit'
      });
    }
    
    console.log(`✅ Subreddit r/${cleanName} added successfully`);
    
    res.status(201).json({
      success: true,
      subreddit: newSubreddit,
      message: `Subreddit r/${cleanName} added successfully`
    });
    
  } catch (error) {
    console.error('❌ Error adding subreddit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ⭐ TOGGLE FAVORITE - Mark/unmark subreddit as favorite
router.patch('/:id/favorite', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_favorite } = req.body;
    const supabase = getSupabase();
    
    console.log(`⭐ Toggling favorite for subreddit: ${id}`);
    
    const { data, error } = await supabase
      .from('user_subreddits')
      .update({ 
        is_favorite: is_favorite,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user._id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update favorite status'
      });
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Subreddit not found'
      });
    }
    
    console.log(`✅ Favorite status updated for r/${data.subreddit_name}`);
    
    res.json({
      success: true,
      subreddit: data,
      message: `Subreddit ${is_favorite ? 'added to' : 'removed from'} favorites`
    });
    
  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 🔄 REVALIDATE SUBREDDIT - Re-check subreddit details
router.patch('/:id/revalidate', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    
    console.log(`🔄 Revalidating subreddit: ${id}`);
    
    // Get the subreddit
    const { data: subreddit } = await supabase
      .from('user_subreddits')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user._id)
      .single();
    
    if (!subreddit) {
      return res.status(404).json({
        success: false,
        error: 'Subreddit not found'
      });
    }
    
    // Validate using our validation endpoint
    try {
      const validateResponse = await axios.get(`${req.protocol}://${req.get('host')}/api/subreddits/validate/${subreddit.subreddit_name}`, {
        headers: {
          'Authorization': req.headers.authorization
        }
      });
      
      let updateData = {
        last_validated: new Date().toISOString(),
        validation_error: null,
        updated_at: new Date().toISOString()
      };
      
      if (validateResponse.data.success && validateResponse.data.exists) {
        const reddit = validateResponse.data.subreddit;
        updateData = {
          ...updateData,
          display_name: reddit.display_name,
          description: reddit.description,
          subscriber_count: reddit.subscriber_count,
          submission_type: reddit.submission_type,
          over18: reddit.over18,
          quarantined: reddit.quarantined,
          public_traffic: reddit.public_traffic,
          is_verified: true
        };
      } else {
        updateData.is_verified = false;
        updateData.validation_error = validateResponse.data.error || 'Subreddit not found';
      }
      
      // Update the subreddit
      const { data: updatedSubreddit, error } = await supabase
        .from('user_subreddits')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.user._id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Database update error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update subreddit'
        });
      }
      
      console.log(`✅ Subreddit r/${subreddit.subreddit_name} revalidated`);
      
      res.json({
        success: true,
        subreddit: updatedSubreddit,
        message: 'Subreddit revalidated successfully'
      });
      
    } catch (validationError) {
      console.error('❌ Validation error:', validationError);
      
      // Update with error
      await supabase
        .from('user_subreddits')
        .update({
          is_verified: false,
          validation_error: 'Validation failed',
          last_validated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.user._id);
      
      res.status(400).json({
        success: false,
        error: 'Failed to validate subreddit'
      });
    }
    
  } catch (error) {
    console.error('❌ Error revalidating subreddit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 🗑️ DELETE SUBREDDIT - Remove subreddit from user's list
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    
    console.log(`🗑️ Deleting subreddit: ${id}`);
    
    const { data, error } = await supabase
      .from('user_subreddits')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user._id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete subreddit'
      });
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Subreddit not found'
      });
    }
    
    console.log(`✅ Subreddit r/${data.subreddit_name} deleted`);
    
    res.json({
      success: true,
      message: `Subreddit r/${data.subreddit_name} removed from your list`
    });
    
  } catch (error) {
    console.error('❌ Error deleting subreddit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 📊 UPDATE POSTING STATS - Track posting success/failure
router.patch('/:id/stats', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { success } = req.body;
    const supabase = getSupabase();
    
    console.log(`📊 Updating posting stats for subreddit: ${id}, success: ${success}`);
    
    // Get current stats
    const { data: subreddit } = await supabase
      .from('user_subreddits')
      .select('posting_success_count, posting_failure_count')
      .eq('id', id)
      .eq('user_id', req.user._id)
      .single();
    
    if (!subreddit) {
      return res.status(404).json({
        success: false,
        error: 'Subreddit not found'
      });
    }
    
    // Update stats
    const updateData = {
      last_posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (success) {
      updateData.posting_success_count = (subreddit.posting_success_count || 0) + 1;
    } else {
      updateData.posting_failure_count = (subreddit.posting_failure_count || 0) + 1;
    }
    
    const { data, error } = await supabase
      .from('user_subreddits')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user._id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update posting stats'
      });
    }
    
    console.log(`✅ Posting stats updated for r/${data.subreddit_name}`);
    
    res.json({
      success: true,
      subreddit: data,
      message: 'Posting stats updated'
    });
    
  } catch (error) {
    console.error('❌ Error updating posting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 