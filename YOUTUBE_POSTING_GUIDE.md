# YouTube Video Upload Guide

🎉 **YouTube video uploads are now fully implemented in NexSocial!** Upload regular videos and YouTube Shorts directly from your dashboard.

## ✅ What's Working Now

### **🎬 Video Uploads**
- ✅ **Regular YouTube Videos** - Upload videos of any length
- ✅ **YouTube Shorts** - Automatically detected for videos under 60 seconds
- ✅ **Multiple Formats** - Support for MP4, MOV, AVI, WMV, FLV, WebM, MKV, 3GP
- ✅ **Automatic Title & Description** - Uses your post content as video metadata
- ✅ **Hashtag Detection** - Automatically converts hashtags to YouTube tags
- ✅ **Smart Categorization** - Auto-assigns appropriate video categories

### **📊 Upload Features**
- ✅ **Resume Uploads** - Large video uploads can be resumed if interrupted
- ✅ **Progress Tracking** - Monitor upload progress for large files
- ✅ **Error Handling** - Comprehensive error messages and retry logic
- ✅ **Format Detection** - Automatically detects video format and optimizes

## 🚀 How to Upload Videos

### **Step 1: Prepare Your Video**
- **File Size**: Up to 256GB (YouTube limit)
- **Duration**: 
  - Under 60 seconds = Automatic YouTube Short
  - Over 60 seconds = Regular YouTube video
- **Formats**: MP4, MOV, AVI, WMV, FLV, WebM, MKV, 3GP

### **Step 2: Create Your Post**
1. Go to **"Create Post"** in NexSocial
2. **Write your content** - This becomes your video title and description
3. **Upload your video file** using the media upload button
4. **Select your YouTube account** in platform selection
5. Click **"Publish Now"**

### **Step 3: Watch the Magic**
- NexSocial automatically detects if it's a Short or regular video
- Uploads your video with optimized metadata
- Returns the YouTube video URL for sharing

## 🎯 YouTube Shorts vs Regular Videos

### **YouTube Shorts (Auto-detected)**
- ✅ Videos **under 60 seconds** automatically become Shorts
- ✅ **#Shorts** hashtag added automatically
- ✅ Optimized for mobile viewing
- ✅ Better discoverability in Shorts feed

### **Regular Videos**
- ✅ Videos **over 60 seconds** upload as regular videos
- ✅ Full description and metadata support
- ✅ Standard YouTube video features

## 📋 Video Requirements

### **Technical Specifications**
- **Maximum file size:** 256GB
- **Resolution:** Up to 8K (4320p)
- **Frame rate:** Up to 60fps
- **Duration:** Up to 12 hours (for verified channels)

### **Recommended Settings**
- **Format:** MP4 (best compatibility)
- **Resolution:** 1080p or higher
- **Frame rate:** 30fps or 60fps
- **Audio:** AAC or MP3

## 🛠️ How It Works

### **Video Processing Flow**
```
1. Video Upload → 2. Format Detection → 3. Duration Check → 4. Short/Regular Decision → 5. YouTube Upload → 6. URL Return
```

### **Automatic Features**
- **Short Detection**: Videos under 60 seconds → YouTube Shorts
- **Hashtag Extraction**: Text hashtags → YouTube video tags
- **Title Generation**: Post content → Video title (100 char limit)
- **Description**: Full post content → Video description (5000 char limit)

## 📝 Content Guidelines

### **Title Best Practices**
- Keep under 100 characters (YouTube limit)
- Include relevant keywords
- Make it engaging and descriptive

### **Description Tips**
- Use full post content as description
- Include relevant hashtags
- Add call-to-actions
- Include links if needed

### **Tags Strategy**
- Hashtags in your post automatically become YouTube tags
- Common tags added: `NexSocial`, `SocialMedia`
- Category-specific tags based on content

## 🚨 Common Issues & Solutions

### **"YouTube requires video content"**
**Problem**: Trying to post text-only to YouTube

**Solution**: 
- YouTube doesn't support text-only posts
- Upload a video file along with your text
- Consider creating a video with your text content

### **"YouTube supports one video per post"**
**Problem**: Multiple videos selected for YouTube

**Solution**:
- YouTube allows only one video per post
- Select a single video file
- Create separate posts for multiple videos

### **"YouTube API quota exceeded"**
**Problem**: Too many uploads in a short time

**Solution**:
- YouTube has daily upload quotas
- Wait for quota reset (daily)
- Check Google Cloud Console for quota limits

### **Upload Failed Errors**
**Common causes**:
- Video file too large (over 256GB)
- Unsupported format
- Internet connection issues
- YouTube API temporary issues

**Solutions**:
- Compress large videos
- Convert to MP4 format
- Check internet connection
- Retry upload after a few minutes

## 📊 API Usage & Limits

### **YouTube API Quotas**
- **Video Upload**: 1600 units per upload
- **Daily Quota**: 10,000 units (default, can be increased)
- **Rate Limits**: 100 requests/second/user

### **Upload Limits**
- **File Size**: 256GB maximum
- **Daily Uploads**: Varies by channel verification status
- **Processing Time**: Varies by video length and quality

## 🔧 Advanced Features

### **Video Privacy Settings**
- **Public**: Visible to everyone (default)
- **Unlisted**: Only accessible via direct link
- **Private**: Only visible to you

### **Video Categories**
- Auto-assigned based on content
- Default: "People & Blogs" (category 22)
- Can be customized in future updates

### **Upload Progress**
- Real-time progress tracking for large files
- Resume capability for interrupted uploads
- Detailed error reporting

## 🎊 Success Examples

### **YouTube Short Upload**
```
Input: 45-second video + "Check out this quick tip! #YouTubeShorts #Tips"
Output: YouTube Short with #Shorts hashtag, optimized for mobile
Result: https://www.youtube.com/watch?v=xyz123 (Short)
```

### **Regular Video Upload**
```
Input: 5-minute video + "Complete tutorial on social media marketing #Tutorial #Marketing"
Output: Regular YouTube video with full description and tags
Result: https://www.youtube.com/watch?v=abc456 (Regular video)
```

## 🔍 Troubleshooting Videos

### **Test Your Setup**
1. Start with a short test video (under 1MB)
2. Use simple MP4 format
3. Test with basic text content
4. Verify the video appears in YouTube Studio

### **Debug Upload Issues**
1. Check server console for detailed error logs
2. Verify video file format and size
3. Confirm YouTube channel permissions
4. Test with smaller video files first

## 📞 Support & Resources

### **NexSocial Support**
- Check server logs for detailed error messages
- Verify your YouTube account connection
- Test with different video formats

### **YouTube Resources**
- [YouTube Upload Requirements](https://support.google.com/youtube/answer/55744)
- [YouTube Shorts Guidelines](https://support.google.com/youtube/answer/10059070)
- [YouTube Creator Playbook](https://creatorplaybook.youtube.com/)

---

## 🎉 **YouTube Video Uploads Are Live!**

Your NexSocial installation now supports full YouTube video uploads including:
- ✅ Regular YouTube videos
- ✅ YouTube Shorts (auto-detected)
- ✅ Multiple video formats
- ✅ Automatic optimization
- ✅ Progress tracking
- ✅ Error handling

**Start uploading your videos to YouTube directly from NexSocial!** 🚀 