# Telegram Integration Setup Guide

## 1. Create Telegram Bot via BotFather

### Step 1: Start BotFather
1. Open Telegram and search for `@BotFather`
2. Send `/start` to BotFather
3. Send `/newbot` to create a new bot

### Step 2: Configure Your Bot
1. Choose a name for your bot (e.g., "NexSocial Manager")
2. Choose a username ending with "bot" (e.g., "nexsocial_manager_bot")
3. BotFather will give you a **Bot Token** - SAVE THIS TOKEN!

### Step 3: Configure Bot Settings
```bash
# Set bot description
/setdescription
# Choose your bot
# Enter: "Social Media Management Bot for NexSocial Platform"

# Set bot about text
/setabouttext
# Choose your bot
# Enter: "Manage your Telegram groups and channels through NexSocial"

# Set bot profile photo (optional)
/setuserpic

# Set bot commands
/setcommands
# Choose your bot
# Enter:
start - Start using the bot
help - Show help information
connect - Connect to NexSocial platform
status - Check connection status
```

## 2. Environment Variables

Add these to your `.env` file in the `server` directory:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=nexsocial_manager_bot
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/oauth/telegram/webhook

# Required for production deployment
CLIENT_URL=https://your-frontend-domain.com
```

### Environment Variable Details:

- **TELEGRAM_BOT_TOKEN**: Get this from BotFather when you create your bot
- **TELEGRAM_BOT_USERNAME**: Your bot's username (without the @ symbol)
- **TELEGRAM_WEBHOOK_URL**: For production, set up a webhook URL (optional for development)
- **CLIENT_URL**: Your frontend URL for redirects after successful connection

## 3. Set Up Webhook (Production Only)

For production deployment, set up a webhook:

```bash
curl -X POST \
  "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/oauth/telegram/webhook",
    "allowed_updates": ["message"]
  }'
```

## 4. Required Permissions

Your bot needs these permissions to manage groups:
- ✅ Read messages
- ✅ Send messages
- ✅ Edit messages
- ✅ Delete messages
- ✅ Manage group/channel
- ✅ Post messages
- ✅ Edit channel info

## 5. Implementation Steps

### Backend Implementation:
1. ✅ Add Telegram OAuth route (`/api/oauth/telegram`)
2. ✅ Add Telegram posting function
3. ✅ Add webhook handler for bot events
4. ✅ Add group/channel management endpoints

### Frontend Integration:
1. ✅ Update UI to show Telegram groups/channels
2. ✅ Add group selection interface
3. ✅ Handle Telegram-specific posting options

## 6. How Users Will Connect

1. User clicks "Connect Telegram" in NexSocial
2. System generates unique connection code (expires in 10 minutes)
3. User adds bot to their Telegram group/channel
4. User makes bot an admin with posting permissions
5. User sends `/connect YOUR_CODE` to the bot
6. Bot verifies and connects the group to NexSocial account
7. User receives confirmation message

## 7. Features Implemented

### Basic Features:
- ✅ Connect multiple Telegram groups/channels
- ✅ Post text messages to groups/channels
- ✅ Post images and videos
- ✅ Post documents and files
- ✅ Send media groups (multiple images/videos)
- ✅ View group/channel info
- ✅ Connection status tracking

### Bot Commands:
- ✅ `/start` - Welcome message and instructions
- ✅ `/help` - Show available commands
- ✅ `/connect CODE` - Connect group to NexSocial
- ✅ `/status` - Check connection status

## 8. Testing Your Setup

### Step 1: Create Test Group
1. Create a test Telegram group
2. Add your bot to the group
3. Make the bot an admin with posting permissions

### Step 2: Test Connection
1. Go to NexSocial Dashboard
2. Click "Connect New Account" → "Telegram"
3. Copy the connection code from the instructions
4. Send `/connect YOUR_CODE` to your bot in the test group
5. Bot should confirm successful connection

### Step 3: Test Posting
1. Go to "Create Post" in NexSocial
2. Select your connected Telegram group
3. Write a test message
4. Click "Publish Post"
5. Check your Telegram group for the message

## 9. Security Considerations

- ✅ Store bot token securely in environment variables
- ✅ Validate all incoming webhooks
- ✅ Implement connection code expiration (10 minutes)
- ✅ Use HTTPS for webhook URL in production
- ✅ Validate group/channel ownership before posting

## 10. Troubleshooting

### Bot Not Responding
- Check if `TELEGRAM_BOT_TOKEN` is correct
- Ensure bot is added to the group as admin
- Verify bot has permission to read/send messages

### Connection Code Not Working
- Check if code has expired (10 minutes)
- Generate a new code from NexSocial dashboard
- Ensure you're sending `/connect CODE` (with space)

### Posting Fails
- Verify bot is still an admin in the group
- Check if bot has posting permissions
- Ensure group hasn't been deleted or bot removed

### Webhook Issues (Production)
- Verify webhook URL is accessible via HTTPS
- Check server logs for webhook errors
- Test webhook with `curl` command

## 11. Next Steps

After successful setup:
1. Connect your production Telegram groups/channels
2. Test posting different content types (text, images, videos)
3. Set up scheduled posting (coming soon)
4. Monitor posting analytics (coming soon)
5. Configure auto-reply functionality (coming soon) 