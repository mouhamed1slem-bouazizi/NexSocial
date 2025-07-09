# Reddit Posting Guide for NexSocial

## Overview

NexSocial now supports posting to Reddit! This guide explains how to connect your Reddit account and start posting content to Reddit through our platform.

## 🚀 Features

- ✅ **Text Posts**: Create text-based posts with full formatting
- ✅ **Media References**: Include media file references in posts
- ✅ **Smart Subreddit Selection**: Automatically posts to moderated subreddits or user profile
- ✅ **Error Handling**: Comprehensive error messages for common Reddit issues
- ✅ **Karma Tracking**: Display user karma information
- ✅ **Rate Limit Protection**: Handles Reddit's rate limiting gracefully

## 📋 Prerequisites

Before you can post to Reddit, you need:

1. **Reddit Account**: A valid Reddit account with posting permissions
2. **OAuth Setup**: Reddit OAuth application configured (see OAuth setup guide)
3. **Account Connection**: Connect your Reddit account through NexSocial

## 🔗 Connecting Your Reddit Account

1. Go to **Settings** → **Social Accounts**
2. Click **Connect Reddit Account**
3. Authorize NexSocial with the following permissions:
   - `identity` - Access your Reddit identity
   - `read` - Read Reddit content and comments
   - `submit` - Submit posts and comments

## 📝 Creating Reddit Posts

### Text Posts

1. Navigate to **Create Post**
2. Select **Reddit** from the platform list
3. Choose your connected Reddit account
4. Write your content (up to 40,000 characters)
5. Click **Post**

### Posts with Media

Reddit's OAuth API has limited media upload capabilities, so media files are referenced in the post text:

1. Upload your media files using the media upload tool
2. The system will automatically create media references in your post
3. Your post will include a **Media Attachments** section listing all files

## 🎯 Subreddit Selection

The system automatically determines where to post based on your account:

### Moderated Subreddits
- If you moderate any subreddits, posts will go to the first moderated subreddit
- This ensures you have posting permissions

### User Profile
- If you don't moderate any subreddits, posts go to your user profile (`r/u_yourusername`)
- Your profile is always available for posting

## ⚠️ Important Limitations

### Reddit API Constraints
- **Media Upload**: Direct media upload isn't supported via OAuth
- **Subreddit Selection**: Currently auto-selects target subreddit
- **Rate Limits**: Reddit enforces strict rate limits

### Content Guidelines
- **Empty Posts**: Cannot post empty content
- **Length Limits**: Title max 300 characters, text up to 40,000 characters
- **Reddit Rules**: All posts must comply with Reddit's content policy

## 🔧 Troubleshooting

### Common Errors

#### "Reddit authentication expired"
**Solution**: Reconnect your Reddit account in Settings

#### "Permission denied"
**Solution**: Ensure you have posting rights to the target subreddit

#### "Rate limit exceeded"
**Solution**: Wait before posting again (Reddit enforces rate limits)

#### "Post content cannot be empty"
**Solution**: Add text content to your post

### Account Issues

#### No Moderated Subreddits
- Posts will go to your user profile automatically
- Consider joining communities where you can post

#### Low Karma
- Some subreddits require minimum karma to post
- Build karma by participating in Reddit communities

## 📊 Reddit Account Information

NexSocial tracks the following Reddit account data:

- **Username**: Your Reddit username
- **Karma**: Total, link, and comment karma
- **Moderated Subreddits**: Subreddits you moderate
- **Account Status**: Connection and permission status

## 🎨 Best Practices

### Content Creation
1. **Engaging Titles**: Keep titles under 300 characters and engaging
2. **Quality Content**: Create valuable, relevant content for your audience
3. **Community Rules**: Follow specific subreddit rules and guidelines
4. **Regular Posting**: Maintain consistent posting schedule

### Media Usage
1. **File References**: Clearly describe attached media files
2. **Alternative Hosting**: Consider using external image hosting for better media display
3. **File Organization**: Use descriptive filenames for media references

## 🔒 Security & Privacy

- **OAuth Security**: Uses secure Reddit OAuth 2.0 authentication
- **Token Management**: Access tokens are securely stored and refreshed
- **Permission Scope**: Only requests necessary permissions
- **Data Protection**: Account data is encrypted and protected

## 📈 Analytics

Reddit posts are tracked in your NexSocial analytics:

- **Post Count**: Number of Reddit posts created
- **Success Rate**: Posting success/failure metrics
- **Engagement**: Basic engagement tracking
- **Performance**: Post performance across different subreddits

## 🆘 Support

If you encounter issues with Reddit posting:

1. **Check Connection**: Verify your Reddit account is connected
2. **Review Permissions**: Ensure OAuth permissions are granted
3. **Test with Profile**: Try posting to your profile first
4. **Contact Support**: Reach out to NexSocial support for assistance

## 🔄 Future Enhancements

Planned improvements for Reddit integration:

- **Manual Subreddit Selection**: Choose specific subreddits for posting
- **Direct Media Upload**: Enhanced media posting capabilities
- **Scheduled Posts**: Schedule Reddit posts for optimal timing
- **Advanced Analytics**: Detailed Reddit post analytics
- **Comment Management**: Manage comments on your Reddit posts

---

*Last updated: January 2025*
*NexSocial Reddit Integration v1.0* 