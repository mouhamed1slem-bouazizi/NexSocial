import api from './api';

// Analytics data interfaces
export interface PostsStats {
  currentMonth: number;
  lastMonth: number;
  difference: number;
  posts: any[];
}

export interface EngagementData {
  name: string;
  posts: number;
  successful: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PlatformDistribution {
  name: string;
  value: number;
  color: string;
}

export interface DashboardAnalytics {
  postsStats: PostsStats;
  engagementData: EngagementData[];
  platformDistribution: PlatformDistribution[];
}

// Get all dashboard analytics data
export const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  try {
    const response = await api.get('/api/analytics/dashboard');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch dashboard analytics:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch analytics data');
  }
};

// Get posts statistics only
export const getPostsStats = async (): Promise<PostsStats> => {
  try {
    const response = await api.get('/api/analytics/posts-stats');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch posts stats:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch posts statistics');
  }
};

// Get engagement data only
export const getEngagementData = async (): Promise<EngagementData[]> => {
  try {
    const response = await api.get('/api/analytics/engagement');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch engagement data:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch engagement data');
  }
};

// Get platform distribution only
export const getPlatformDistribution = async (): Promise<PlatformDistribution[]> => {
  try {
    const response = await api.get('/api/analytics/platform-distribution');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch platform distribution:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch platform distribution');
  }
};