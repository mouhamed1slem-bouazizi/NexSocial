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

// Full analytics data interface for Analytics page
export interface AnalyticsData {
  overview: {
    totalFollowers: number;
    followerGrowth: number;
    totalEngagement: number;
    engagementRate: number;
    totalReach: number;
    totalPosts: number;
  };
  engagementChart: {
    date: string;
    likes: number;
    comments: number;
    shares: number;
  }[];
  platformStats: {
    platform: string;
    followers: number;
    engagement: number;
    growth: number;
    posts: number;
  }[];
  topPosts: {
    _id: string;
    platform: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    date: string;
  }[];
}

// Get all dashboard analytics data
export const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  try {
    const response = await api.get('/analytics/dashboard');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch dashboard analytics:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch analytics data');
  }
};

// Get posts statistics only
export const getPostsStats = async (): Promise<PostsStats> => {
  try {
    const response = await api.get('/analytics/posts-stats');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch posts stats:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch posts statistics');
  }
};

// Get engagement data only
export const getEngagementData = async (): Promise<EngagementData[]> => {
  try {
    const response = await api.get('/analytics/engagement');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch engagement data:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch engagement data');
  }
};

// Get platform distribution only
export const getPlatformDistribution = async (): Promise<PlatformDistribution[]> => {
  try {
    const response = await api.get('/analytics/platform-distribution');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch platform distribution:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch platform distribution');
  }
};

// Get comprehensive analytics data for Analytics page
export const getAnalytics = async (dateRange: string = '7d'): Promise<{ data: AnalyticsData }> => {
  try {
    // For now, we'll return mock data that matches the expected structure
    // until we implement the full analytics backend endpoints
    const mockAnalyticsData: AnalyticsData = {
      overview: {
        totalFollowers: 15420,
        followerGrowth: 12.5,
        totalEngagement: 8900,
        engagementRate: 4.2,
        totalReach: 125000,
        totalPosts: 48
      },
      engagementChart: [
        { date: '2025-01-01', likes: 120, comments: 45, shares: 23 },
        { date: '2025-01-02', likes: 150, comments: 62, shares: 31 },
        { date: '2025-01-03', likes: 135, comments: 38, shares: 19 },
        { date: '2025-01-04', likes: 180, comments: 71, shares: 42 },
        { date: '2025-01-05', likes: 165, comments: 55, shares: 28 },
        { date: '2025-01-06', likes: 198, comments: 82, shares: 35 },
        { date: '2025-01-07', likes: 210, comments: 95, shares: 48 }
      ],
      platformStats: [
        { platform: 'facebook', followers: 5200, engagement: 3100, growth: 8.2, posts: 15 },
        { platform: 'instagram', followers: 4800, engagement: 2800, growth: 15.1, posts: 12 },
        { platform: 'twitter', followers: 3100, engagement: 1900, growth: -2.3, posts: 18 },
        { platform: 'linkedin', followers: 2320, engagement: 1100, growth: 6.7, posts: 8 }
      ],
      topPosts: [
        {
          _id: '1',
          platform: 'instagram',
          content: 'Check out our latest product launch! 🚀 Amazing response from the community.',
          likes: 245,
          comments: 32,
          shares: 18,
          date: '2025-01-06'
        },
        {
          _id: '2',
          platform: 'facebook',
          content: 'Behind the scenes of our new campaign. What do you think?',
          likes: 198,
          comments: 41,
          shares: 25,
          date: '2025-01-05'
        },
        {
          _id: '3',
          platform: 'twitter',
          content: 'Quick tip: How to improve your social media engagement in 3 simple steps...',
          likes: 167,
          comments: 28,
          shares: 31,
          date: '2025-01-04'
        }
      ]
    };

    // Return in the expected format
    return { data: mockAnalyticsData };
    
  } catch (error: any) {
    console.error('Failed to fetch analytics:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch analytics data');
  }
};