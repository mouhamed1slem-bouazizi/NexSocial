# Twitter Callback URL Troubleshooting

## Error: "Callback URL not approved for this client application"

This error occurs when your Twitter app doesn't have the correct callback URLs configured.

### Required Callback URLs

Your Twitter app must have these **exact** callback URLs:

```
http://localhost:3001/api/oauth/twitter/callback
http://localhost:3001/api/oauth/twitter/oauth2-callback
```

### Configuration Steps

1. **Go to Twitter Developer Portal**
   - Visit: https://developer.twitter.com/en/portal/dashboard
   - Select your app
   - Click "Settings" tab

2. **Find "User authentication settings"**
   - Look for the "Set up" button or "Edit" if already configured
   - Click to open the authentication settings

3. **Configure Settings**
   ```
   App permissions: Read and write and Direct message
   Type of App: Web App
   Callback URLs: 
     http://localhost:3001/api/oauth/twitter/callback
     http://localhost:3001/api/oauth/twitter/oauth2-callback
   Website URL: http://localhost:5173
   ```

4. **Save Changes**
   - Click "Save" button
   - Wait 2-3 minutes for propagation

### Common Mistakes

❌ **Wrong URLs:**
- `http://localhost:3001/api/oauth/twitter/` (missing callback)
- `https://localhost:3001/...` (using HTTPS instead of HTTP)
- `http://localhost:3000/...` (wrong port)

✅ **Correct URLs:**
- `http://localhost:3001/api/oauth/twitter/callback`
- `http://localhost:3001/api/oauth/twitter/oauth2-callback`

### Alternative: Use Different Ports

If you're using different ports, update the callback URLs accordingly:

**If your server runs on port 3000:**
```
http://localhost:3000/api/oauth/twitter/callback
http://localhost:3000/api/oauth/twitter/oauth2-callback
```

**If using different client port:**
Update the Website URL to match your client port (e.g., `http://localhost:5174`)

### Verification

After saving, try the connection again. You should see:
1. First redirect to Twitter for OAuth 1.0a authorization
2. After approval, redirect to second Twitter OAuth 2.0 authorization
3. After both approvals, redirect back to your app with success

### Still Having Issues?

1. **Check Environment Variables**
   ```bash
   BASE_URL=http://localhost:3001
   CLIENT_URL=http://localhost:5173
   TWITTER_CLIENT_ID=your_client_id
   TWITTER_CLIENT_SECRET=your_client_secret
   TWITTER_CONSUMER_KEY=your_consumer_key
   TWITTER_CONSUMER_SECRET=your_consumer_secret
   ```

2. **Verify App Permissions**
   - Make sure your app has "Read and write" permissions
   - Some features require "Direct message" permissions

3. **Clear Browser Cache**
   - Twitter sometimes caches OAuth states
   - Try in incognito/private browsing mode

4. **Check Server Logs**
   - Look for detailed error messages in the server console
   - OAuth errors usually provide specific error codes

### Production Setup

For production, update callback URLs to your production domain:
```
https://yourdomain.com/api/oauth/twitter/callback
https://yourdomain.com/api/oauth/twitter/oauth2-callback
``` 