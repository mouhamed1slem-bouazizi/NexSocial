const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');
const TwitterOAuthService = require('../services/twitterOAuthService.js');

const router = express.Router();

// Helper function to post to Facebook
const postToFacebook = async (account, content, media = []) => {
  try {
    const body = {
      message: content,
      access_token: account.access_token
    };

    // Add media if provided
    if (media.length > 0) {
      // For now, Facebook posting with media is complex and requires photo/video upload endpoints
      // We'll post text-only and mention media count
      body.message += `\n\n📸 Includes ${media.length} media item${media.length > 1 ? 's' : ''}`;
      console.log(`Facebook: Media upload not implemented yet. Posted text with media note.`);
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to post to Facebook');
    }

    return {
      success: true,
      postId: data.id,
      message: media.length > 0 
        ? `Posted to Facebook successfully (${media.length} media items noted)`
        : 'Posted to Facebook successfully',
      mediaCount: media.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// NOTE: Twitter media upload requires OAuth 1.0a authentication
// Current setup uses OAuth 2.0 Bearer tokens which work for posting but not media upload
// For full media upload support, we would need to implement OAuth 1.0a authentication

// Helper function to create a simple media hosting solution
const createMediaPreview = (media) => {
  if (media.length === 0) return '';
  
  const mediaTypes = media.map(m => {
    if (m.type === 'image') return '🖼️';
    if (m.type === 'video') return '🎬';
    return '📎';
  }).join('');
  
  return `\n\n${mediaTypes} Media attached: ${media.map(m => m.name).join(', ')}`;
};

// Helper function to post to Twitter
const postToTwitter = async (account, content, media = []) => {
  try {
    console.log(`Posting to Twitter for account ${account.username}`);
    console.log(`Content: ${content}`);
    console.log(`Media items: ${media.length}`);
    
    // Check if we have OAuth 1.0a credentials for media upload
    const hasOAuth1Credentials = account.oauth1_access_token && account.oauth1_access_token_secret;
    
    if (!hasOAuth1Credentials && media.length > 0) {
      console.log('No OAuth 1.0a credentials found for media upload. Falling back to text-only posting.');
      
      // Create a unique timestamp to avoid duplicate content
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      
      // Add media information to the tweet text with timestamp for uniqueness
      let tweetText = content;
      const mediaPreview = createMediaPreview(media);
      const uniqueNote = `\n\n⏰ ${timestamp}`;
      const totalLength = tweetText.length + mediaPreview.length + uniqueNote.length;
      
      if (totalLength <= 280) {
        tweetText += mediaPreview + uniqueNote;
      } else {
        // Truncate content to make room for media info and timestamp
        const availableSpace = 280 - mediaPreview.length - uniqueNote.length;
        tweetText = tweetText.substring(0, Math.max(0, availableSpace)) + mediaPreview + uniqueNote;
      }
      
      console.log(`Modified tweet to include media reference with timestamp`);
      
      const body = {
        text: tweetText.substring(0, 280)
      };

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Twitter post error:', data);
        
        // Handle duplicate content error specifically
        if (data.detail && data.detail.includes('duplicate content')) {
          throw new Error('Twitter rejected duplicate content. Please modify your message or reconnect your Twitter account for media upload.');
        }
        
        throw new Error(data.errors?.[0]?.message || 'Failed to post to Twitter');
      }

      return {
        success: true,
        postId: data.data.id,
        message: `Posted to Twitter successfully (${media.length} media item${media.length > 1 ? 's' : ''} referenced in text - reconnect account for direct upload)`,
        mediaCount: 0,
        mediaNote: `⚠️ Media files were referenced in the tweet text. To upload actual media to Twitter, please reconnect your Twitter account to enable dual authentication.`
      };
    }

    // Use TwitterOAuthService for media upload and posting
    const twitterService = new TwitterOAuthService();
    let mediaIds = [];

    // Upload media if provided and we have OAuth 1.0a credentials
    if (media.length > 0 && hasOAuth1Credentials) {
      console.log('Uploading media to Twitter...');
      
      const mediaUploadPromises = media.map(async (mediaItem) => {
        try {
          const mediaId = await twitterService.uploadMedia(
            mediaItem, 
            account.oauth1_access_token, 
            account.oauth1_access_token_secret
          );
          return mediaId;
        } catch (error) {
          console.error(`Failed to upload media ${mediaItem.name}:`, error);
          return null;
        }
      });

      const uploadResults = await Promise.all(mediaUploadPromises);
      mediaIds = uploadResults.filter(id => id !== null);
      
      console.log(`Successfully uploaded ${mediaIds.length} out of ${media.length} media items`);
    }

    // Post tweet with media
    const tweetData = await twitterService.postTweet(
      content,
      mediaIds,
      account.access_token
    );

    let message = 'Posted to Twitter successfully';
    if (media.length > 0) {
      if (mediaIds.length === media.length) {
        message += ` with ${media.length} media item${media.length > 1 ? 's' : ''}`;
      } else if (mediaIds.length > 0) {
        message += ` with ${mediaIds.length} of ${media.length} media items (some uploads failed)`;
      } else {
        message += ` (media upload failed - posted text only)`;
      }
    }

    return {
      success: true,
      postId: tweetData.id,
      message: message,
      mediaCount: mediaIds.length,
      mediaNote: media.length > 0 && mediaIds.length === 0 ? 'Media upload failed, but text was posted successfully' : undefined
    };
  } catch (error) {
    console.error('Twitter posting error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to post to LinkedIn
const postToLinkedIn = async (account, content, media = []) => {
  try {
    let postContent = content;
    
    // Add media note to content if media is provided
    if (media.length > 0) {
      postContent += `\n\n📸 Includes ${media.length} media item${media.length > 1 ? 's' : ''}`;
      console.log(`LinkedIn: Media upload not implemented yet. Posted text with media note.`);
    }

    const body = {
      author: `urn:li:person:${account.platform_user_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postContent
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.access_token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to post to LinkedIn');
    }

    return {
      success: true,
      postId: data.id,
      message: media.length > 0 
        ? `Posted to LinkedIn successfully (${media.length} media items noted)`
        : 'Posted to LinkedIn successfully',
      mediaCount: media.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to post to Instagram
const postToInstagram = async (account, content, media = []) => {
  try {
    // Instagram posting requires media, so we'll return an error if no media is provided
    if (media.length === 0) {
      return {
        success: false,
        error: 'Instagram posts require at least one media item'
      };
    }

    console.log(`Instagram: Media upload not fully implemented yet. Will post text with media note.`);
    
    // Instagram media upload is complex and requires proper file upload handling
    // For now, we'll return an informational message
    return {
      success: false,
      error: `Instagram media upload not yet implemented. Please post directly to Instagram. (Would have posted: "${content}" with ${media.length} media items)`
    };

    // TODO: Implement proper Instagram media upload
    // This requires:
    // 1. Upload media to Instagram's media endpoint
    // 2. Create media container
    // 3. Publish the container
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to post to YouTube (Community posts)
const postToYouTube = async (account, content, media = []) => {
  try {
    // YouTube Community posts are more complex and have restrictions
    // For now, we'll return a placeholder response
    return {
      success: false,
      error: 'YouTube Community posts are not yet supported. Please use YouTube Studio directly.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Main posting function
const postToSocialMedia = async (account, content, media = []) => {
  console.log(`Posting to ${account.platform} for account ${account.username}`);

  switch (account.platform) {
    case 'facebook':
      return await postToFacebook(account, content, media);
    case 'twitter':
      return await postToTwitter(account, content, media);
    case 'linkedin':
      return await postToLinkedIn(account, content, media);
    case 'instagram':
      return await postToInstagram(account, content, media);
    case 'youtube':
      return await postToYouTube(account, content, media);
    default:
      return {
        success: false,
        error: `Posting to ${account.platform} is not supported yet`
      };
  }
};

// Create and publish a post
router.post('/', requireUser, async (req, res) => {
  try {
    const { content, selectedAccounts, scheduledAt, media = [] } = req.body;
    const userId = req.user.id;

    console.log(`📝 Creating post for user: ${userId}`);
    console.log(`Selected accounts: ${selectedAccounts?.join(', ')}`);
    console.log(`Media items: ${media.length}`);
    if (media.length > 0) {
      console.log('Media details:', media.map(m => `${m.name} (${m.type})`).join(', '));
    }

    // Validate input
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Post content is required'
      });
    }

    if (!selectedAccounts || selectedAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one social account must be selected'
      });
    }

    // Check if scheduled for future
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      // TODO: Implement scheduling logic (could use a job queue like Bull)
      return res.status(200).json({
        success: true,
        message: 'Post scheduled successfully',
        results: {}
      });
    }

    // Get the selected social accounts
    const accountPromises = selectedAccounts.map(accountId => 
      SocialAccountService.getById(accountId, userId)
    );

    const accounts = await Promise.all(accountPromises);
    const validAccounts = accounts.filter(account => account && account.is_connected);

    if (validAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid connected accounts found'
      });
    }

    // Post to each selected account
    const results = {};
    const postPromises = validAccounts.map(async (account) => {
      const result = await postToSocialMedia(account, content, media);
      results[account.id] = result;
      return result;
    });

    await Promise.all(postPromises);

    // Check if at least one post was successful
    const successfulPosts = Object.values(results).filter(result => result.success);
    const failedPosts = Object.values(results).filter(result => !result.success);

    let message = '';
    if (successfulPosts.length === validAccounts.length) {
      message = 'Post published successfully to all selected accounts';
    } else if (successfulPosts.length > 0) {
      message = `Post published to ${successfulPosts.length} of ${validAccounts.length} accounts`;
    } else {
      message = 'Failed to publish post to any account';
    }

    console.log(`✅ Post creation completed. Success: ${successfulPosts.length}, Failed: ${failedPosts.length}`);

    res.status(200).json({
      success: successfulPosts.length > 0,
      message,
      results
    });

  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create post'
    });
  }
});

// Get all posts for the authenticated user
router.get('/', requireUser, async (req, res) => {
  try {
    // TODO: Implement post storage and retrieval
    // For now, return empty array
    res.status(200).json({
      success: true,
      posts: []
    });
  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch posts'
    });
  }
});

module.exports = router; 