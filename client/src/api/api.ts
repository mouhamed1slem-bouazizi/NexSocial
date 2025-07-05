import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios';

// Configure API base URL for development and production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Use relative path in production since server serves the client
  : 'http://localhost:3001/api';

const localApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  transformResponse: [(data) => {
    // Handle empty responses
    if (!data || data.trim() === '') {
      return { success: false, error: 'Empty response from server' };
    }
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse JSON response:', data);
      return { success: false, error: 'Invalid JSON response from server' };
    }
  }]
});

let accessToken: string | null = null;

const getApiInstance = (url: string) => {
  return localApi;
};

const isAuthEndpoint = (url: string): boolean => {
  return url.includes("/api/auth");
};

// Check if the URL is for the refresh token endpoint to avoid infinite loops
const isRefreshTokenEndpoint = (url: string): boolean => {
  return url.includes("/api/auth/refresh");
};

// Helper function to validate JWT token format
const isValidJWT = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Each part should be base64 encoded (basic check)
  try {
    // Try to decode the header and payload
    atob(parts[0]);
    atob(parts[1]);
    return true;
  } catch (error) {
    return false;
  }
};

// Request interceptor to add auth token
const setupInterceptors = (apiInstance: any) => {
  // Request interceptor
  apiInstance.interceptors.request.use(
    (config: any) => {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Added auth token to request');
      }
      return config;
    },
    (error: any) => {
      console.log('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  apiInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    async (error: any) => {
      console.log('❌ API Response Error:', error.response?.status, error.response?.data);
      
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            console.log('🔄 Attempting to refresh token...');
            const response = await localApi.post(`/auth/refresh`, {
              refreshToken,
            });

            const { token: newToken } = response.data;
            localStorage.setItem('authToken', newToken);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return localApi(originalRequest);
          }
        } catch (refreshError) {
          console.log('❌ Token refresh failed:', refreshError);
          // Clear tokens and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );
};

setupInterceptors(localApi);

const api = {
  request: (config: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(config.url || '');
    return apiInstance.request(config);
  },
  get: (url: string, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.get(url, config);
  },
  post: (url: string, data?: any, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.post(url, data, config);
  },
  put: (url: string, data?: any, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.put(url, data, config);
  },
  delete: (url: string, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.delete(url, config);
  },
  patch: (url: string, data?: any, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.patch(url, data, config);
  },
};

export default api;