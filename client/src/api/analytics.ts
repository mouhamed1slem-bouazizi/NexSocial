import api from './api';

export interface AnalyticsData {
  overview: {
    totalFollowers: number;
    totalEngagement: number;
    totalReach: number;
    totalPosts: number;
    followerGrowth: number;
    engagementRate: number;
  };
  platformStats: Array<{
    platform: string;
    followers: number;
    engagement: number;
    posts: number;
    growth: number;
  }>;
  engagementChart: Array<{
    date: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
  topPosts: Array<{
    _id: string;
    content: string;
    platform: string;
    engagement: number;
    reach: number;
  }>;
}

// Description: Get analytics data
// Endpoint: GET /api/analytics
// Request: { dateRange?: string }
// Response: { data: AnalyticsData }
export const getAnalytics = (dateRange?: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          overview: {
            totalFollowers: 29260,
            totalEngagement: 15420,
            totalReach: 125000,
            totalPosts: 156,
            followerGrowth: 12.5,
            engagementRate: 4.2
          },
          platformStats: [
            {
              platform: 'facebook',
              followers: 15420,
              engagement: 8500,
              posts: 45,
              growth: 8.2
            },
            {
              platform: 'instagram',
              followers: 8750,
              engagement: 4200,
              posts: 62,
              growth: 15.3
            },
            {
              platform: 'twitter',
              followers: 3240,
              engagement: 1850,
              posts: 38,
              growth: 5.7
            },
            {
              platform: 'linkedin',
              followers: 1850,
              engagement: 870,
              posts: 11,
              growth: 22.1
            }
          ],
          engagementChart: [
            { date: '2024-01-08', likes: 120, comments: 25, shares: 15 },
            { date: '2024-01-09', likes: 150, comments: 32, shares: 18 },
            { date: '2024-01-10', likes: 180, comments: 28, shares: 22 },
            { date: '2024-01-11', likes: 145, comments: 35, shares: 20 },
            { date: '2024-01-12', likes: 200, comments: 42, shares: 28 },
            { date: '2024-01-13', likes: 175, comments: 38, shares: 25 },
            { date: '2024-01-14', likes: 220, comments: 45, shares: 32 }
          ],
          topPosts: [
            {
              _id: '1',
              content: 'Excited to share our latest product update! 🚀',
              platform: 'facebook',
              engagement: 295,
              reach: 5420
            },
            {
              _id: '2',
              content: 'Behind the scenes at our office!',
              platform: 'instagram',
              engagement: 187,
              reach: 3200
            }
          ]
        }
      });
    }, 800);
  });
};