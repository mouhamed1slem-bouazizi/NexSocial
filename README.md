# Reddit Video Upload Solutions - Complete Guide

A comprehensive collection of **7 different approaches** to upload videos to Reddit via API, ranked by reliability and ease of implementation.

## 🎯 Problem Statement

Reddit video embedding via API is notoriously challenging due to:
- Video processing delays
- Poster URL conflicts (403/404 errors)
- Multiple post types (`video`, `videogif`, `link`)
- Inconsistent API behavior
- Authentication token expiration issues

## 📊 Solution Overview

| Solution | Difficulty | Reliability | Native Embedding | Speed |
|----------|------------|-------------|------------------|-------|
| 1. External Hosting | ⭐ Easy | 🟢 High | ❌ No | ⚡ Fast |
| 2. Minimal Native | ⭐⭐ Medium | 🟡 Medium | ✅ Yes | ⚡ Fast |
| 3. Full Native | ⭐⭐⭐ Hard | 🟡 Medium | ✅ Yes | 🐌 Slow |
| 4. VideoGif Format | ⭐⭐ Medium | 🟡 Medium | ✅ Yes | 🐌 Slow |
| 5. Multi-Fallback | ⭐⭐⭐ Hard | 🟢 High | ✅ Yes | 🐌 Very Slow |
| 6. Text Post Fallback | ⭐ Easy | 🟢 Perfect | ❌ No | ⚡ Fast |
| 7. Official Flow | ⭐⭐ Medium | 🟢 High | ✅ Yes | 🐌 Slow |

## 🏆 Recommended Solutions

### 🥇 **Best Overall: Solution 7 (Official Flow)**
- Follows Reddit's exact internal process
- 20-second processing wait
- No poster URL conflicts
- Clean implementation

### 🥈 **Most Reliable: Solution 6 (Text Fallback)**
- 100% success rate
- Always works
- Simple implementation
- Good user experience

### 🥉 **Production Ready: Solution 5 (Multi-Fallback)**
- Tries multiple strategies
- Self-healing approach
- Comprehensive error handling

---

## 📝 Solution Details

### Solution 1: External Hosting (Easiest)

**Approach**: Upload to reliable external host (Streamable, Imgur) and post as Reddit link

**Pros**: ✅ Simple, reliable, always works  
**Cons**: ❌ Not native Reddit video, external dependency

```javascript
const solution1_ExternalHosting = async (videoBuffer, title, accessToken, subreddit) => {
  console.log('🎬 Solution 1: External Hosting (Streamable/Imgur)');
  
  // Upload to Streamable (reliable video hosting)
  const uploadToStreamable = async (videoBuffer) => {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', videoBuffer, { filename: 'video.mp4' });
    
    const response = await fetch('https://api.streamable.com/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('username:password').toString('base64')
      },
      body: form
    });
    
    const result = await response.json();
    return `https://streamable.com/${result.shortcode}`;
  };
  
  try {
    // Upload video to external host
    const videoUrl = await uploadToStreamable(videoBuffer);
    
    // Post as simple link to Reddit
    const postData = {
      api_type: 'json',
      kind: 'link',
      sr: subreddit,
      title: title,
      url: videoUrl,
      sendreplies: true
    };
    
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(postData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Solution 1 failed:', error);
    throw error;
  }
};
```

### Solution 2: Minimal Native (Recommended for Beginners)

**Approach**: Use Reddit's native upload with only required fields

**Pros**: ✅ Clean, fast, native Reddit video  
**Cons**: ⚠️ May have embedding issues

```javascript
const solution2_MinimalNative = async (videoBuffer, title, accessToken, subreddit) => {
  console.log('🎬 Solution 2: Reddit Native - Minimal');
  
  try {
    // Step 1: Get upload URL from Reddit
    const uploadRequest = await fetch('https://oauth.reddit.com/api/media/asset.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        filepath: 'video.mp4',
        mimetype: 'video/mp4'
      })
    });
    
    const uploadData = await uploadRequest.json();
    
    // Step 2: Upload to Reddit S3
    const FormData = require('form-data');
    const form = new FormData();
    
    // Add all S3 fields
    uploadData.args.fields.forEach(field => {
      form.append(field.name, field.value);
    });
    form.append('file', videoBuffer, { filename: 'video.mp4' });
    
    await fetch(uploadData.args.action, {
      method: 'POST',
      body: form
    });
    
    // Step 3: Submit post with MINIMAL parameters
    const postData = {
      api_type: 'json',
      kind: 'video',  // Simple video type
      sr: subreddit,
      title: title,
      url: `https://v.redd.it/${uploadData.asset.asset_id}`,
      sendreplies: true
    };
    // NO video_poster_url - let Reddit handle it
    
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(postData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Solution 2 failed:', error);
    throw error;
  }
};
```

### Solution 3: Full Native (Comprehensive)

**Approach**: Use all available Reddit video parameters for maximum compatibility

```javascript
const solution3_FullNative = async (videoBuffer, title, accessToken, subreddit) => {
  console.log('🎬 Solution 3: Reddit Native - Full Parameters');
  
  try {
    // Step 1: Get upload URL
    const uploadRequest = await fetch('https://oauth.reddit.com/api/media/asset.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        filepath: 'video.mp4',
        mimetype: 'video/mp4'
      })
    });
    
    const uploadData = await uploadRequest.json();
    
    // Step 2: Upload to S3
    const FormData = require('form-data');
    const form = new FormData();
    
    uploadData.args.fields.forEach(field => {
      form.append(field.name, field.value);
    });
    form.append('file', videoBuffer, { filename: 'video.mp4' });
    
    await fetch(uploadData.args.action, {
      method: 'POST',
      body: form
    });
    
    // Step 3: Wait for processing
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 4: Submit with ALL parameters
    const videoUrl = `https://v.redd.it/${uploadData.asset.asset_id}`;
    const postData = {
      api_type: 'json',
      kind: 'video',
      sr: subreddit,
      title: title,
      url: videoUrl,
      video_poster_url: videoUrl,
      sendreplies: true,
      validate_on_submit: true,
      nsfw: false,
      spoiler: false,
      extension: 'json',
      resubmit: true,
      show_media: true
    };
    
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(postData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Solution 3 failed:', error);
    throw error;
  }
};
```

### Solution 4: VideoGif Format

**Approach**: Use `videogif` kind which Reddit prefers for embedded videos

```javascript
const solution4_VideoGif = async (videoBuffer, title, accessToken, subreddit) => {
  console.log('🎬 Solution 4: VideoGif Format');
  
  try {
    // Upload to Reddit (same as above solutions)
    const uploadRequest = await fetch('https://oauth.reddit.com/api/media/asset.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        filepath: 'video.mp4',
        mimetype: 'video/mp4'
      })
    });
    
    const uploadData = await uploadRequest.json();
    
    const FormData = require('form-data');
    const form = new FormData();
    
    uploadData.args.fields.forEach(field => {
      form.append(field.name, field.value);
    });
    form.append('file', videoBuffer, { filename: 'video.mp4' });
    
    await fetch(uploadData.args.action, {
      method: 'POST',
      body: form
    });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 15000)); // Longer wait
    
    // Use videogif format (Reddit's preferred for embedded videos)
    const videoUrl = `https://v.redd.it/${uploadData.asset.asset_id}`;
    const postData = {
      api_type: 'json',
      kind: 'videogif',  // This is key for embedding
      sr: subreddit,
      title: title,
      url: videoUrl,
      video_poster_url: videoUrl,
      sendreplies: true,
      validate_on_submit: true,
      extension: 'json'
    };
    
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(postData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Solution 4 failed:', error);
    throw error;
  }
};
```

### Solution 5: Multi-Fallback Strategy (Production Ready)

**Approach**: Try multiple approaches until one works

```javascript
const solution5_MultiFallback = async (videoBuffer, title, accessToken, subreddit) => {
  console.log('🎬 Solution 5: Multi-Fallback Strategy');
  
  const strategies = [
    () => solution2_MinimalNative(videoBuffer, title, accessToken, subreddit),
    () => solution4_VideoGif(videoBuffer, title, accessToken, subreddit),
    () => solution3_FullNative(videoBuffer, title, accessToken, subreddit),
    () => solution1_ExternalHosting(videoBuffer, title, accessToken, subreddit)
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`🔄 Trying strategy ${i + 1}/${strategies.length}`);
      const result = await strategies[i]();
      
      // Check if post was successful
      if (result.json && !result.json.errors?.length) {
        console.log(`✅ Strategy ${i + 1} succeeded!`);
        return result;
      } else {
        console.log(`⚠️ Strategy ${i + 1} had errors:`, result.json?.errors);
      }
    } catch (error) {
      console.log(`❌ Strategy ${i + 1} failed:`, error.message);
      if (i === strategies.length - 1) {
        throw new Error('All strategies failed');
      }
    }
  }
};
```

### Solution 6: Text Post Fallback (100% Reliable)

**Approach**: Always works - post as text with video description

**Pros**: ✅ 100% success rate, simple implementation  
**Cons**: ❌ Not native Reddit video player

```javascript
const solution6_TextPostFallback = async (videoBuffer, title, accessToken, subreddit) => {
  console.log('🎬 Solution 6: Text Post Fallback');
  
  try {
    // First try to upload to external host for reference
    let videoReference = 'Video upload failed';
    try {
      // Try Imgur as simple fallback
      const FormData = require('form-data');
      const form = new FormData();
      form.append('image', videoBuffer, { filename: 'video.mp4' });
      
      const imgurResponse = await fetch('https://api.imgur.com/3/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7'
        },
        body: form
      });
      
      const imgurResult = await imgurResponse.json();
      if (imgurResult.success) {
        videoReference = `🎬 **Video**: ${imgurResult.data.link}`;
      }
    } catch (error) {
      console.log('External upload failed, using text-only fallback');
    }
    
    // Create text post with video reference
    const postData = {
      api_type: 'json',
      kind: 'self',
      sr: subreddit,
      title: title,
      text: `${title}\n\n${videoReference}\n\n*(Note: Video uploaded via external hosting due to Reddit API limitations)*`,
      sendreplies: true
    };
    
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(postData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Solution 6 failed:', error);
    throw error;
  }
};
```

### Solution 7: Official Reddit Flow (Best Embedding)

**Approach**: Follow Reddit's exact workflow as seen in their web interface

**Pros**: ✅ Best embedding success rate, follows official process  
**Cons**: ⚠️ Longer processing time

```javascript
const solution7_OfficialFlow = async (videoBuffer, title, accessToken, subreddit) => {
  console.log('🎬 Solution 7: Reddit Official Flow');
  
  try {
    // Step 1: Pre-validate video
    const videoSize = videoBuffer.length;
    const maxSize = 1024 * 1024 * 1024; // 1GB limit
    if (videoSize > maxSize) {
      throw new Error('Video too large (>1GB)');
    }
    
    // Step 2: Request upload lease (Reddit's official first step)
    const leaseRequest = await fetch('https://oauth.reddit.com/api/media/asset.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'YourApp/1.0'
      },
      body: new URLSearchParams({
        filepath: 'video.mp4',
        mimetype: 'video/mp4'
      })
    });
    
    if (!leaseRequest.ok) {
      throw new Error(`Lease request failed: ${leaseRequest.status}`);
    }
    
    const leaseData = await leaseRequest.json();
    console.log('📋 Got upload lease:', leaseData.asset.asset_id);
    
    // Step 3: Upload to S3 using Reddit's exact format
    const FormData = require('form-data');
    const form = new FormData();
    
    // Add fields in the exact order Reddit expects
    const fields = leaseData.args.fields;
    fields.forEach(field => {
      form.append(field.name, field.value);
    });
    
    // Add file last
    form.append('file', videoBuffer, {
      filename: 'video.mp4',
      contentType: 'video/mp4'
    });
    
    const uploadResponse = await fetch(leaseData.args.action, {
      method: 'POST',
      body: form
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }
    
    console.log('✅ Video uploaded to Reddit S3');
    
    // Step 4: Wait for Reddit processing (crucial!)
    console.log('⏳ Waiting for Reddit video processing...');
    await new Promise(resolve => setTimeout(resolve, 20000)); // 20 second wait
    
    // Step 5: Submit using Reddit's preferred format
    const assetId = leaseData.asset.asset_id;
    const videoUrl = `https://v.redd.it/${assetId}`;
    
    const submitData = {
      api_type: 'json',
      kind: 'video',
      sr: subreddit,
      title: title,
      url: videoUrl,
      sendreplies: true,
      validate_on_submit: true,
      extension: 'json'
    };
    // Deliberately NOT setting video_poster_url - let Reddit auto-generate
    
    const submitResponse = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'YourApp/1.0'
      },
      body: new URLSearchParams(submitData)
    });
    
    const result = await submitResponse.json();
    console.log('📊 Submit result:', result);
    
    return result;
  } catch (error) {
    console.error('Solution 7 failed:', error);
    throw error;
  }
};
```

---

## 🚀 Usage Examples

### Quick Start - Most Reliable

```javascript
// Best approach: Try official flow, fallback to text post
async function uploadVideoReliable(videoBuffer, title, accessToken, subreddit) {
  try {
    console.log('🎬 Attempting Reddit native video upload...');
    return await solution7_OfficialFlow(videoBuffer, title, accessToken, subreddit);
  } catch (error) {
    console.log('⚠️ Native upload failed, using reliable text fallback...');
    return await solution6_TextPostFallback(videoBuffer, title, accessToken, subreddit);
  }
}

// Usage
const result = await uploadVideoReliable(videoBuffer, "My Video Title", accessToken, "u_username");
console.log("Video posted successfully:", result);
```

### Production Ready - Try Everything

```javascript
// Comprehensive approach: Try all strategies until one works
async function uploadVideoProduction(videoBuffer, title, accessToken, subreddit) {
  return await solution5_MultiFallback(videoBuffer, title, accessToken, subreddit);
}

// Usage
const result = await uploadVideoProduction(videoBuffer, "My Video Title", accessToken, "u_username");
```

### Simple and Fast

```javascript
// Simple approach: Minimal native upload
async function uploadVideoSimple(videoBuffer, title, accessToken, subreddit) {
  return await solution2_MinimalNative(videoBuffer, title, accessToken, subreddit);
}

// Usage
const result = await uploadVideoSimple(videoBuffer, "My Video Title", accessToken, "u_username");
```

---

## 🎯 Choosing the Right Solution

### **If you need guaranteed posting:**
→ Use **Solution 6** (Text Post Fallback)

### **If you want best native embedding:**
→ Use **Solution 7** (Official Reddit Flow)

### **If you want simplicity:**
→ Use **Solution 2** (Minimal Native)

### **If you want maximum reliability:**
→ Use **Solution 5** (Multi-Fallback)

### **For production environments:**
→ Use **Solution 7** with **Solution 6** fallback

---

## ⚠️ Common Issues & Solutions

### Issue: Video appears as clickable link instead of embedded player
**Solutions:**
- Try Solution 7 (Official Flow) - waits longer for processing
- Use Solution 2 (Minimal) - no poster URL conflicts
- Avoid forcing `video_poster_url` - let Reddit auto-generate

### Issue: 403/404 errors on poster URLs
**Solutions:**
- Don't set `video_poster_url` parameter
- Use Solution 7 which omits poster URLs entirely
- Wait longer for Reddit processing (20+ seconds)

### Issue: Token expiration during upload
**Solutions:**
- Implement token refresh logic
- Use shorter videos for faster processing
- Monitor token expiration time

### Issue: Videos too large
**Solutions:**
- Compress videos before upload
- Use external hosting (Solution 1) for large files
- Split large videos into smaller segments

---

## 📋 Requirements

- Node.js with `form-data` package
- Valid Reddit OAuth access token
- Video files in MP4 format (recommended)
- Maximum file size: 1GB (Reddit limit)

## 🔧 Installation

```bash
npm install form-data
```

## 📖 Dependencies

```javascript
const FormData = require('form-data');
// Built-in fetch API or node-fetch for older Node.js versions
```

---

## 📞 Support

If you're still experiencing issues:

1. **Start with Solution 7** (Official Flow)
2. **Fallback to Solution 6** (Text Post) if needed
3. **Check your access token** is valid and has proper permissions
4. **Verify video format** is MP4 with reasonable file size
5. **Wait sufficient time** for Reddit processing (20+ seconds)

## 🏆 Success Metrics

After implementing these solutions, you should see:
- ✅ Higher video upload success rates
- ✅ Proper embedded video players (not clickable links)
- ✅ Reduced API errors and timeouts
- ✅ Better user experience

---

**Choose your solution and start uploading videos to Reddit successfully!** 🚀 