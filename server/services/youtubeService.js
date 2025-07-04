const FormData = require('form-data');

class YouTubeService {
  
  // Upload a video to YouTube
  static async uploadVideo(accessToken, videoBuffer, metadata) {
    try {
      console.log('📺 Starting YouTube video upload...');
      console.log('📺 Video size:', videoBuffer.length, 'bytes');
      console.log('📺 Metadata:', JSON.stringify(metadata, null, 2));
      
      const videoData = {
        snippet: {
          title: metadata.title.substring(0, 100), // YouTube title limit
          description: metadata.description.substring(0, 5000), // YouTube description limit
          categoryId: metadata.categoryId || '22', // Default to People & Blogs
          tags: metadata.tags || ['NexSocial', 'SocialMedia'],
          defaultLanguage: 'en'
        },
        status: {
          privacyStatus: metadata.privacyStatus || 'public',
          embeddable: true,
          publicStatsViewable: true,
          selfDeclaredMadeForKids: false
        }
      };

      // Detect if it's a YouTube Short (under 60 seconds)
      if (metadata.isShort || metadata.duration < 60) {
        console.log('📺 Detected YouTube Short - adding #Shorts to title');
        videoData.snippet.title += ' #Shorts';
        videoData.snippet.tags.push('Shorts', 'YouTubeShorts');
      }

      console.log('📺 Final video metadata:', JSON.stringify(videoData, null, 2));

      // Step 1: Initialize resumable upload
      const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': metadata.mimeType || 'video/mp4',
          'X-Upload-Content-Length': videoBuffer.length
        },
        body: JSON.stringify(videoData)
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('📺 YouTube upload initialization failed:', errorText);
        throw new Error(`Failed to initialize YouTube upload: ${errorText}`);
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('No upload URL received from YouTube');
      }

      console.log('📺 Upload URL received, starting video upload...');

      // Step 2: Upload video content
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': metadata.mimeType || 'video/mp4'
        },
        body: videoBuffer
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('📺 YouTube video upload failed:', errorText);
        throw new Error(`Failed to upload video to YouTube: ${errorText}`);
      }

      const result = await uploadResponse.json();
      console.log('✅ YouTube video uploaded successfully!');
      console.log('📺 Video ID:', result.id);
      console.log('📺 Video URL:', `https://www.youtube.com/watch?v=${result.id}`);

      return {
        success: true,
        videoId: result.id,
        videoUrl: `https://www.youtube.com/watch?v=${result.id}`,
        title: result.snippet.title,
        description: result.snippet.description,
        isShort: metadata.isShort || metadata.duration < 60,
        data: result
      };

    } catch (error) {
      console.error('📺 YouTube video upload error:', error);
      throw error;
    }
  }

  // Upload YouTube Short (videos under 60 seconds)
  static async uploadShort(accessToken, videoBuffer, metadata) {
    try {
      console.log('📺 Uploading YouTube Short...');
      
      // Mark as Short and add Short-specific metadata
      const shortMetadata = {
        ...metadata,
        isShort: true,
        tags: [...(metadata.tags || []), 'Shorts', 'YouTubeShorts', 'Short'],
        title: metadata.title.includes('#Shorts') ? metadata.title : `${metadata.title} #Shorts`
      };

      return await this.uploadVideo(accessToken, videoBuffer, shortMetadata);
    } catch (error) {
      console.error('📺 YouTube Short upload error:', error);
      throw error;
    }
  }

  // Get video upload progress (for large files)
  static async getUploadProgress(uploadUrl, accessToken) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Range': 'bytes */*'
        }
      });

      const range = response.headers.get('Range');
      if (range) {
        const match = range.match(/bytes=0-(\d+)/);
        return match ? parseInt(match[1]) + 1 : 0;
      }

      return 0;
    } catch (error) {
      console.error('📺 Failed to get upload progress:', error);
      return 0;
    }
  }

  // Get channel information
  static async getChannelInfo(accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get channel info');
      }

      const data = await response.json();
      return data.items[0];
    } catch (error) {
      console.error('📺 Failed to get YouTube channel info:', error);
      throw error;
    }
  }

  // Check if video is processing
  static async checkVideoStatus(accessToken, videoId) {
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=${videoId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to check video status');
      }

      const data = await response.json();
      return data.items[0];
    } catch (error) {
      console.error('📺 Failed to check video status:', error);
      throw error;
    }
  }

  // Create a comment on a video (alternative engagement method)
  static async createComment(accessToken, videoId, text) {
    try {
      console.log('📺 Creating YouTube comment...');
      
      const commentData = {
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: {
              textOriginal: text.substring(0, 10000) // YouTube comment limit
            }
          }
        }
      };

      const response = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create comment');
      }

      const data = await response.json();
      return {
        success: true,
        commentId: data.id,
        data: data
      };
    } catch (error) {
      console.error('📺 YouTube comment creation error:', error);
      throw error;
    }
  }

  // Helper: Determine video duration from metadata
  static getVideoDuration(videoBuffer) {
    // This is a simplified version - in production, you'd use ffprobe or similar
    // For now, we'll check file size as a rough indicator
    const sizeInMB = videoBuffer.length / (1024 * 1024);
    
    // Rough estimation: < 10MB likely a short video
    return sizeInMB < 10 ? 30 : 120; // seconds
  }

  // Helper: Get video metadata from buffer
  static async getVideoMetadata(videoBuffer, filename) {
    const mimeType = this.getMimeTypeFromFilename(filename);
    const duration = this.getVideoDuration(videoBuffer);
    
    return {
      mimeType,
      duration,
      isShort: duration < 60,
      filename,
      size: videoBuffer.length
    };
  }

  // Helper: Get MIME type from filename
  static getMimeTypeFromFilename(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      '3gp': 'video/3gpp'
    };
    
    return mimeTypes[ext] || 'video/mp4';
  }
}

module.exports = YouTubeService; 