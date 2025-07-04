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
  content: string;
  message: string;
}

// Description: Create and publish/schedule a post to selected social media accounts
// Endpoint: POST /api/posts
// Request: { content: string, platforms: string[], selectedAccounts: string[], scheduledAt?: string, media?: string[] }
// Response: { success: boolean, message: string, results: object }
export const createPost = async (data: CreatePostData): Promise<PostResponse> => {
  try {
    console.log('🔄 Creating post with data:', data);
    const response = await api.post('/api/posts', data);
    console.log('✅ Post creation response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Post creation error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all posts for the authenticated user
// Endpoint: GET /api/posts
// Request: {}
// Response: { success: boolean, posts: Array<Post> }
export const getPosts = async (): Promise<Post[]> => {
  const response = await api.get('/api/posts');
  return response.data.posts;
};

// Description: Get a specific post by ID
// Endpoint: GET /api/posts/:id
// Request: {}
// Response: { success: boolean, post: Post }
export const getPost = async (id: string) => {
  try {
    const response = await api.get(`/api/posts/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Get post error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete a post by ID
// Endpoint: DELETE /api/posts/:id
// Request: {}
// Response: { success: boolean, message: string }
export const deletePost = async (id: string) => {
  try {
    const response = await api.delete(`/api/posts/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Delete post error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Generate AI content for social media posts
// Endpoint: POST /api/posts/ai-generate
// Request: { prompt: string, tone?: string, platforms?: string[] }
// Response: { success: boolean, content: string, message: string }
export const generateAIContent = async (data: AIGenerateData): Promise<AIGenerateResponse> => {
  try {
    console.log('🤖 Generating AI content with data:', data);
    const response = await api.post('/api/posts/ai-generate', data);
    console.log('✅ AI content generation response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ AI content generation error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};