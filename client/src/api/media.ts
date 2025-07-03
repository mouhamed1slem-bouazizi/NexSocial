import api from './api';

export interface MediaFile {
  _id: string;
  filename: string;
  url: string;
  type: 'image' | 'video' | 'gif';
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  tags: string[];
  folder?: string;
  createdAt: string;
  usageCount: number;
}

// Description: Get media library files
// Endpoint: GET /api/media
// Request: { folder?: string, type?: string }
// Response: { files: Array<MediaFile> }
export const getMediaFiles = (params?: { folder?: string; type?: string }) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        files: [
          {
            _id: '1',
            filename: 'product-launch.jpg',
            url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
            type: 'image',
            size: 245000,
            dimensions: { width: 800, height: 600 },
            tags: ['product', 'launch', 'tech'],
            folder: 'campaigns',
            createdAt: '2024-01-15T08:00:00Z',
            usageCount: 3
          },
          {
            _id: '2',
            filename: 'team-meeting.jpg',
            url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
            type: 'image',
            size: 180000,
            dimensions: { width: 800, height: 600 },
            tags: ['team', 'office', 'collaboration'],
            folder: 'behind-scenes',
            createdAt: '2024-01-14T15:30:00Z',
            usageCount: 1
          },
          {
            _id: '3',
            filename: 'brand-logo.png',
            url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop',
            type: 'image',
            size: 85000,
            dimensions: { width: 400, height: 400 },
            tags: ['logo', 'brand'],
            folder: 'brand-assets',
            createdAt: '2024-01-10T10:00:00Z',
            usageCount: 15
          }
        ]
      });
    }, 600);
  });
};

// Description: Upload media file
// Endpoint: POST /api/media/upload
// Request: FormData with file and metadata
// Response: { success: boolean, file: MediaFile }
export const uploadMediaFile = (formData: FormData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        file: {
          _id: Date.now().toString(),
          filename: 'new-upload.jpg',
          url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
          type: 'image',
          size: 200000,
          dimensions: { width: 800, height: 600 },
          tags: [],
          createdAt: new Date().toISOString(),
          usageCount: 0
        }
      });
    }, 2000);
  });
};