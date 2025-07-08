# Discord Integration Setup Guide

## Overview

This guide will help you set up Discord integration for NexSocial, allowing users to:
- Connect their Discord accounts
- Post messages to Discord servers/channels where they have permissions
- View server member counts
- Manage Discord bot interactions

## Prerequisites

- Discord account
- Access to Discord servers where you want to enable posting
- NexSocial application running

## Step 1: Create Discord Application

### 1.1 Go to Discord Developer Portal
1. Visit: https://discord.com/developers/applications
2. Log in with your Discord account
3. Click **"New Application"**
4. Enter application name: `NexSocial` (or your preferred name)
5. Click **"Create"**

### 1.2 Configure Basic Information
1. In the **General Information** tab:
   - Add a description: "Social Media Management Platform"
   - Upload an app icon (optional)
   - Add tags if desired

### 1.3 Get Application Credentials
1. In the **General Information** tab, copy:
   - **Application ID** (this is your CLIENT_ID)
   - **Public Key** (optional, for verification)

2. Go to the **Bot** tab:
   - Click **"Add Bot"** if not already created
   - Copy the **Token** (this is your BOT_TOKEN)
   - ⚠️ **Never share your bot token publicly!**

3. Go to **OAuth2** → **General**:
   - Copy **Client Secret** (this is your CLIENT_SECRET)

## Step 2: Configure OAuth2 Settings

### 2.1 Set Redirect URIs
1. Go to **OAuth2** → **General**
2. In **Redirects** section, add:
   ```
   http://localhost:3001/api/oauth/discord/callback
   ```
   For production, replace with your domain:
   ```
   https://yourdomain.com/api/oauth/discord/callback
   ```

### 2.2 Configure OAuth2 Scopes
The following scopes will be requested during OAuth:
- `identify` - Basic user information
- `guilds` - Access to user's Discord servers
- `bot` - Add bot to servers (for posting)
- `guilds.members.read` - Read server member information

## Step 3: Environment Variables

Add these variables to your `.env` file:

```env
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_REDIRECT_URI=http://localhost:3001/api/oauth/discord/callback

# For production, use your domain:
# DISCORD_REDIRECT_URI=https://yourdomain.com/api/oauth/discord/callback
```

## Step 4: Bot Permissions Setup

### 4.1 Configure Bot Permissions
1. Go to **Bot** tab in Discord Developer Portal
2. Under **Privileged Gateway Intents**:
   - Enable **Server Members Intent** (to read member counts)
   - Enable **Message Content Intent** (if needed for advanced features)

### 4.2 Generate Bot Invite Link
1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands` (for slash commands, optional)

3. Select bot permissions:
   - ✅ `Send Messages`
   - ✅ `Read Message History`
   - ✅ `View Channels`
   - ✅ `Embed Links`
   - ✅ `Attach Files`
   - ✅ `Read Messages/View Channels`

4. Copy the generated URL - you'll use this to add the bot to Discord servers

## Step 5: How Discord Integration Works

### 5.1 OAuth Flow
1. User clicks "Connect Discord" in NexSocial dashboard
2. User is redirected to Discord OAuth page
3. User authorizes the application and selects servers
4. Discord redirects back with authorization code
5. NexSocial exchanges code for access token
6. User info and guild info is fetched and stored

### 5.2 Posting Mechanism
1. User creates a post in NexSocial
2. Selects Discord as target platform
3. Chooses server and channel (from authorized guilds)
4. NexSocial bot posts message to selected channel
5. Post appears in Discord server

### 5.3 Server Management
- Users can connect multiple Discord servers
- Each server appears as a separate "account" in dashboard
- Member counts are fetched for each connected server
- Bot must be added to servers for posting functionality

## Step 6: Testing the Integration

### 6.1 Test OAuth Connection
1. Start your NexSocial application
2. Go to Dashboard → Connected Accounts
3. Click "Add Account" → Select Discord
4. Complete OAuth flow
5. Verify Discord account appears in dashboard

### 6.2 Test Bot Functionality
1. Use the generated bot invite URL to add bot to a test server
2. Make sure bot has appropriate permissions in the server
3. Try posting a test message from NexSocial
4. Verify message appears in Discord channel

## Step 7: Production Deployment

### 7.1 Update Environment Variables
```env
DISCORD_REDIRECT_URI=https://yourdomain.com/api/oauth/discord/callback
```

### 7.2 Update Discord Application
1. Go to Discord Developer Portal
2. Update OAuth2 redirect URI with production URL
3. Update application description if needed

## Troubleshooting

### Common Issues

**1. "Invalid Redirect URI" Error**
- Ensure redirect URI in Discord app matches exactly with .env file
- Check for trailing slashes or typos

**2. "Bot Missing Permissions" Error**  
- Verify bot has required permissions in target Discord server
- Check if bot was added to server with correct permissions

**3. "Guild Not Found" Error**
- Ensure user has authorized the `guilds` scope
- Verify user has admin/manage permissions in target server

**4. "Cannot Send Messages" Error**
- Check bot permissions in specific channel
- Verify bot role is above target channel restrictions

### Debug Steps
1. Check server logs for detailed error messages
2. Verify environment variables are loaded correctly
3. Test Discord API endpoints directly
4. Check Discord server audit log for bot actions

## Security Notes

- Never expose bot token in client-side code
- Store tokens securely in environment variables
- Use HTTPS in production for OAuth callbacks
- Regularly rotate bot tokens if compromised
- Limit bot permissions to minimum required

## API Rate Limits

Discord has rate limits:
- 50 requests per second per bot
- 5 requests per second per channel
- Global rate limit of 50 requests per second

NexSocial handles these automatically with retry logic.

## Support

- Discord Developer Documentation: https://discord.com/developers/docs
- Discord API Server: https://discord.gg/discord-developers
- NexSocial Issues: Create GitHub issue with detailed error logs 