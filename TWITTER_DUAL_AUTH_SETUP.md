# Twitter Dual Authentication Setup

This guide explains how to set up Twitter's dual authentication system for NexSocial, which enables both posting tweets (OAuth 2.0) and uploading media (OAuth 1.0a).

## Overview

Twitter requires two different authentication methods:
- **OAuth 2.0** - For posting tweets using the v2 API
- **OAuth 1.0a** - For uploading media using the v1.1 API

## Prerequisites

1. A Twitter Developer Account
2. A Twitter App with both OAuth 1.0a and OAuth 2.0 enabled

## Twitter App Configuration

### 1. Create/Configure Your Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or select your existing app
3. Navigate to the "Keys and tokens" tab

### 2. OAuth 1.0a Setup

1. Under "Consumer Keys", you'll find:
   - **API Key** (Consumer Key)
   - **API Key Secret** (Consumer Secret)
2. Under "Authentication Tokens", generate:
   - **Access Token** 
   - **Access Token Secret**

### 3. OAuth 2.0 Setup

1. Under "OAuth 2.0 Client ID and Client Secret", you'll find:
   - **Client ID**
   - **Client Secret**

### 4. App Settings

1. Go to "Settings" tab
2. Configure "User authentication settings":
   - **App permissions**: Read and write and Direct message
   - **Type of App**: Web App
   - **Callback URLs**: 
     - `http://localhost:3001/api/oauth/twitter/callback` (for OAuth 1.0a)
     - `http://localhost:3001/api/oauth/twitter/oauth2-callback` (for OAuth 2.0)
   - **Website URL**: `http://localhost:5174`

## Environment Variables

Add the following to your `.env` file:

```bash
# OAuth 2.0 Credentials (for posting tweets)
TWITTER_CLIENT_ID=your_oauth2_client_id
TWITTER_CLIENT_SECRET=your_oauth2_client_secret

# OAuth 1.0a Credentials (for media upload)
TWITTER_CONSUMER_KEY=your_api_key
TWITTER_CONSUMER_SECRET=your_api_key_secret

# Base URLs
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5174
```

## How It Works

### Authentication Flow

1. **User clicks "Connect Twitter"**
2. **OAuth 1.0a Flow (Phase 1)**:
   - System generates OAuth 1.0a request token
   - User is redirected to Twitter authorization
   - User authorizes the app
   - System receives OAuth 1.0a access token
3. **OAuth 2.0 Flow (Phase 2)**:
   - System initiates OAuth 2.0 authorization
   - User authorizes again for posting permissions
   - System receives OAuth 2.0 access token
4. **Both tokens are stored** in the database

### Posting Process

1. **Media Upload** (if media present):
   - Uses OAuth 1.0a credentials
   - Uploads images/videos to Twitter's media endpoint
   - Receives media IDs
2. **Tweet Posting**:
   - Uses OAuth 2.0 credentials
   - Posts tweet with text and media IDs
   - Returns tweet ID

## Database Schema

The `social_accounts` table includes:
- `access_token` - OAuth 2.0 Bearer Token
- `refresh_token` - OAuth 2.0 Refresh Token
- `oauth1_access_token` - OAuth 1.0a Access Token
- `oauth1_access_token_secret` - OAuth 1.0a Access Token Secret

## Testing

1. Start the server: `npm run dev` (from server directory)
2. Start the client: `npm run dev` (from client directory)
3. Register/login to the app
4. Go to Settings and connect Twitter
5. Complete both authentication flows
6. Try posting with media on the Create Post page

## Troubleshooting

### Common Issues

1. **"OAuth 1.0a credentials not found"**
   - User needs to reconnect their Twitter account
   - The account was connected before dual auth implementation

2. **"Media upload failed"**
   - Check OAuth 1.0a credentials are correct
   - Verify media file size (max 50MB)
   - Check file format is supported

3. **"Tweet posting failed"**
   - Check OAuth 2.0 credentials are correct
   - Verify tweet length (max 280 characters)
   - Check API rate limits

### Debug Mode

Enable debug logging by adding to your `.env`:
```bash
DEBUG=twitter:*
```

This will show detailed logs for Twitter operations.

## Security Notes

- Never commit your API keys to version control
- Use environment variables for all credentials
- Consider using different credentials for development and production
- Regularly rotate your API keys

## API Rate Limits

Twitter has rate limits for both APIs:
- **Media Upload**: 300 requests per 15 minutes
- **Tweet Posting**: 300 requests per 15 minutes
- **User Authentication**: 300 requests per 15 minutes

The app handles rate limiting gracefully and will show appropriate error messages. 