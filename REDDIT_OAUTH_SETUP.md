# Reddit OAuth Setup Guide

## Overview

This guide will help you set up Reddit OAuth authentication for your NexSocial application, allowing users to connect their Reddit accounts and post content to Reddit.

## Prerequisites

- A Reddit account
- Access to Reddit's developer tools
- Your application's base URL (e.g., `http://localhost:3001` for development)

## Step 1: Create a Reddit Application

### 1.1 Go to Reddit App Preferences
1. Visit [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. Scroll to the bottom and click **"Create App"** or **"Create Another App"**

### 1.2 Fill Out Application Details
- **Name**: Choose a name for your app (e.g., "NexSocial")
- **App type**: Select **"web app"**
- **Description**: Brief description of your application (optional)
- **About URL**: Your website or GitHub repository (optional)
- **Redirect URI**: `http://localhost:3001/api/oauth/reddit/callback`
  - For production, use your actual domain: `https://yourdomain.com/api/oauth/reddit/callback`

### 1.3 Create the Application
Click **"Create app"** to create your Reddit application.

## Step 2: Get Your Credentials

After creating the app, you'll see your application listed. You'll need two pieces of information:

### 2.1 Client ID
- This is the string shown directly under your app name
- It's typically a 14-character string like: `abcdefghijk123`

### 2.2 Client Secret
- Click **"edit"** on your app
- The **secret** field contains your client secret
- It's typically a 27-character string like: `abcdefghijklmnopqrstuvwxyz1`

## Step 3: Configure Environment Variables

Add these variables to your `.env` file in the project root:

```bash
# Reddit API Configuration
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
```

### Example with actual values:
```bash
REDDIT_CLIENT_ID=abcdefghijk123
REDDIT_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz1
```

## Step 4: Reddit API Permissions

The NexSocial application requests these Reddit OAuth scopes:

- **`identity`**: Access to user's Reddit username and basic profile info
- **`read`**: Read access to user's subreddit subscriptions and posts
- **`submit`**: Permission to submit posts and comments

## Step 5: Testing Your Setup

### 5.1 Start Your Application
```bash
npm run dev
```

### 5.2 Test Reddit Connection
1. Navigate to your Dashboard (`http://localhost:5173`)
2. Click **"Connect New Account"** → **"Reddit"**
3. You should be redirected to Reddit for authorization
4. After granting permissions, you'll be redirected back to your dashboard
5. Your Reddit account should appear in the connected accounts list

## Step 6: Posting Capabilities

### Supported Post Types
- **Text Posts**: Full text content posted as self-posts
- **Media Posts**: Currently creates link posts with media references
  - Note: Reddit's OAuth API doesn't support direct media uploads
  - Media files are referenced in the post content

### Target Subreddits
- **Moderated Subreddits**: If you moderate any subreddits, posts will go to your first moderated subreddit
- **User Profile**: If you don't moderate any subreddits, posts will go to your user profile (`u/yourusername`)

## Step 7: Production Configuration

### For Production Deployment:

1. **Update Redirect URI** in your Reddit app settings:
   ```
   https://yourdomain.com/api/oauth/reddit/callback
   ```

2. **Update Environment Variables**:
   ```bash
   BASE_URL=https://yourdomain.com
   CLIENT_URL=https://yourdomain.com
   REDDIT_CLIENT_ID=your_reddit_client_id_here
   REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
   ```

## Troubleshooting

### Common Issues

#### 1. "Invalid redirect URI" Error
- Ensure the redirect URI in your Reddit app exactly matches the one in your application
- Check for trailing slashes or http vs https mismatches

#### 2. "Unauthorized Client" Error
- Verify your `REDDIT_CLIENT_ID` is correct
- Make sure you're using the Client ID, not the Client Secret

#### 3. "Invalid Client" Error
- Check that your `REDDIT_CLIENT_SECRET` is correct
- Ensure there are no extra spaces or characters

#### 4. "Access Denied" Error
- User declined authorization on Reddit
- Try the connection process again

#### 5. Posts Not Appearing
- Check if you have permission to post in the target subreddit
- Verify your account has sufficient karma for posting
- Some subreddits have minimum account age requirements

### Debug Mode

To enable detailed logging for Reddit operations, check the server console output when connecting or posting. Look for messages starting with 🔴 for Reddit-specific logs.

## Rate Limits

Reddit has API rate limits:
- **OAuth requests**: 60 requests per minute
- **API requests**: 100 requests per minute for OAuth apps
- Posts are subject to Reddit's spam filters and subreddit rules

## Security Considerations

1. **Keep Credentials Secret**: Never expose your Reddit client secret in client-side code
2. **Use HTTPS**: Always use HTTPS in production for secure OAuth flows
3. **Token Storage**: Access tokens are stored securely in your database
4. **User Permissions**: Only request the minimum scopes needed for your application

## Additional Resources

- [Reddit API Documentation](https://www.reddit.com/dev/api/)
- [Reddit OAuth2 Quick Start](https://github.com/reddit-archive/reddit/wiki/OAuth2-Quick-Start-Example)
- [Reddit API Terms of Service](https://www.redditinc.com/policies/developer-terms)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your Reddit app configuration
3. Check server logs for detailed error messages
4. Ensure all environment variables are set correctly 