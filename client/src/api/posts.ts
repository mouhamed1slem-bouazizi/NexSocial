import api from './api';

export interface Post {
  _id: string;
  content: string;
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: string;
  publishedAt?: string;
  media: string[];
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  };
  createdAt: string;
}

export interface CreatePostData {
  content: string;
  platforms: string[];
  scheduledAt?: string;
  media?: {name: string, type: string, data: string}[];
  selectedAccounts?: string[]; // Array of social account IDs
  discordChannels?: Record<string, string>; // accountId -> channelId
  subredditSettings?: { selectedSubredditId: string }; // Reddit subreddit selection
}

export interface PostResponse {
  success: boolean;
  message: string;
  results?: Record<string, any>;
}

export interface AIGenerateData {
  prompt: string;
  tone?: string;
  platforms?: string[];
}

export interface AIGenerateResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// Description: Create and publish/schedule a post to selected social media accounts
// Endpoint: POST /posts
// Request: { content: string, platforms: string[], selectedAccounts: string[], scheduledAt?: string, media?: string[] }
// Response: { success: boolean, message: string, results: object }
export const createPost = async (postData: CreatePostData): Promise<PostResponse> => {
  try {
    console.log('📝 Creating post with data:', postData);
    const response = await api.post('/posts', postData);
    console.log('✅ Post creation response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating post:', error);
    console.error('❌ Error response:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Failed to create post');
  }
};

// Description: Get all posts for the authenticated user
// Endpoint: GET /posts
// Request: {}
// Response: { success: boolean, posts: Array<Post> }
export const getPosts = async (): Promise<Post[]> => {
  try {
    const response = await api.get('/posts');
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching posts:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch posts');
  }
};

// Description: Get a specific post by ID
// Endpoint: GET /posts/:id
// Request: {}
// Response: { success: boolean, post: Post }
export const getPost = async (id: string) => {
  try {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Get post error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete a post by ID
// Endpoint: DELETE /posts/:id
// Request: {}
// Response: { success: boolean, message: string }
export const deletePost = async (postId: string): Promise<void> => {
  try {
    await api.delete(`/posts/${postId}`);
  } catch (error: any) {
    console.error('❌ Error deleting post:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete post');
  }
};

// Description: Generate AI content for social media posts
// Endpoint: POST /posts/ai-generate
// Request: { prompt: string, tone?: string, platforms?: string[] }
// Response: { success: boolean, content: string, message: string }
export const generateAIContent = async (data: AIGenerateData): Promise<AIGenerateResponse> => {
  try {
    console.log('🤖 Generating AI content with data:', data);
    const response = await api.post('/posts/ai-generate', data);
    console.log('✅ AI generation response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error generating AI content:', error);
    console.error('❌ Error response:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Failed to generate AI content');
  }
};