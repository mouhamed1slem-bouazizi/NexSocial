# Snapchat Integration Setup Guide

This guide explains how to set up Snapchat integration for your social media application.

## Prerequisites

1. **Snapchat Developer Account**: You need access to Snapchat's developer platform
2. **Snapchat Public Profile**: Your account must have a Snapchat Public Profile set up
3. **App Approval**: Snapchat requires app approval for API access

## Step 1: Create Snapchat App

1. **Apply for Snapchat Developer Access**:
   - Visit [Snapchat Business](https://forbusiness.snapchat.com/)
   - Apply for developer access to the Snapchat API
   - Wait for approval (this can take several weeks)

2. **Create Your App**:
   - Once approved, access the Snapchat Developer Console
   - Create a new application
   - Note your `Client ID` and `Client Secret`

## Step 2: Configure OAuth Redirect URIs

In your Snapchat App settings, add these redirect URIs:
- Production: `https://yourdomain.com/api/oauth/snapchat/callback`
- Development: `http://localhost:3000/api/oauth/snapchat/callback`

## Step 3: Environment Variables

Add these environment variables to your `.env` file:

```env
# Snapchat API Credentials
SNAPCHAT_CLIENT_ID=your_snapchat_client_id
SNAPCHAT_CLIENT_SECRET=your_snapchat_client_secret
```

## Step 4: Set Up Snapchat Public Profile

**Important**: Users must have a Snapchat Public Profile to use the API.

### For Users:
1. Open Snapchat mobile app
2. Tap your profile icon (top left)
3. Tap "Public Profile"
4. Follow the setup instructions
5. Complete verification if required

### Profile Requirements:
- Must be a verified public profile
- Account must be in good standing
- Profile must be active and public

## Step 5: API Scopes and Permissions

The integration uses these Snapchat API scopes:
- `snapchat-profile-api`: Access to public profile and posting capabilities

## Step 6: Testing the Integration

### Connection Test:
1. Navigate to your app's dashboard
2. Click "Connect Account" 
3. Select "Snapchat"
4. Complete OAuth flow
5. Verify account appears in connected accounts

### Posting Test:
1. Create a new post
2. Select Snapchat as target platform
3. Add media (required for Snapchat)
4. Publish and verify it appears on your Snapchat story

## Media Requirements

### Supported Formats:
- **Images**: JPEG, PNG
- **Videos**: MP4

### Size Limits:
- **Images**: Max 20 MB
- **Videos**: Max 500 MB
- **Video Duration**: 5-60 seconds

### Recommended Specs:
- **Dimensions**: 1080 x 1920 px (9:16 aspect ratio)
- **Format**: Vertical orientation for best performance

## API Features

### Posting Options:
- **Stories**: 24-hour temporary posts
- **Saved Stories**: Permanent posts on profile
- **Spotlight**: Discovery feed posts (video only)

### Current Implementation:
- ✅ Story posting (images and videos)
- ✅ Media encryption (AES-256-CBC as required by Snapchat)
- ✅ OAuth 2.0 authentication
- ✅ Error handling and validation

### Future Enhancements:
- Saved Stories support
- Spotlight posting
- Analytics integration

## Troubleshooting

### Common Issues:

1. **"No Snapchat public profile found"**
   - User needs to set up a Snapchat Public Profile
   - Profile must be verified and active

2. **"App not approved"**
   - Your app needs Snapchat developer approval
   - Contact Snapchat developer support

3. **Media upload failures**
   - Check file size limits
   - Ensure proper format (JPEG/PNG for images, MP4 for videos)
   - Verify encryption is working correctly

4. **OAuth errors**
   - Verify redirect URIs match exactly
   - Check client credentials
   - Ensure app is approved for API access

### Debug Tips:
- Check server logs for detailed error messages
- Verify environment variables are set
- Test with small media files first
- Use Snapchat's developer tools

## Security Considerations

### Encryption:
- All media is encrypted with AES-256-CBC before upload
- Encryption keys are generated per upload
- No sensitive data is stored in plain text

### Token Management:
- Access tokens are stored securely
- Refresh tokens are used for long-term access
- Tokens are scoped to minimum required permissions

## Rate Limits

Snapchat enforces rate limits on API calls:
- Implement proper retry logic with exponential backoff
- Monitor API usage in your application
- Cache responses where appropriate

## Support

For issues with:
- **App Integration**: Check this documentation and server logs
- **Snapchat API**: Contact Snapchat developer support
- **Account Setup**: Follow Snapchat's official documentation

## Resources

- [Snapchat Business API Documentation](https://developers.snapchat.com/)
- [Snapchat Public Profile Setup](https://support.snapchat.com/en-US/a/public-profile)
- [OAuth 2.0 Specification](https://oauth.net/2/) 