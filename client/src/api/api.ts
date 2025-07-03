import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig, AxiosInstance } from 'axios';
import JSONbig from 'json-bigint';

const localApi = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  transformResponse: [(data) => {
    // Handle empty responses
    if (!data || data.trim() === '') {
      return { success: false, error: 'Empty response from server' };
    }
    try {
      return JSONbig.parse(data);
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

const setupInterceptors = (apiInstance: typeof axios) => {
  apiInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
      if (!accessToken) {
        accessToken = localStorage.getItem('accessToken');
      }
      
      // Validate token before using it
      if (accessToken) {
        if (isValidJWT(accessToken)) {
          if (config.headers) {
            config.headers.Authorization = `Bearer ${accessToken}`;
            console.log('🔑 Added auth token to request');
          }
        } else {
          console.error('❌ Invalid access token format detected in request interceptor');
          // Clear invalid token
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          accessToken = null;
          console.log('⚠️ Cleared invalid tokens, request will proceed without auth');
        }
      } else {
        console.log('⚠️ No auth token available for request');
      }
      return config;
    },
    (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
  );

  apiInstance.interceptors.response.use(
    (response) => {
      console.log('✅ API Response:', response.status, response.config.url);

      // Check for auth errors in successful responses (due to our custom validateStatus)
      if (response.status === 401 || response.status === 403) {
        console.log('🔄 Auth error detected in response, triggering token refresh');
        const error = new Error('Authentication required');
        (error as any).response = response;
        (error as any).config = response.config;
        throw error;
      }

      // Check if the response indicates a server error or service unavailable
      if (response.status >= 500 || response.status === 503) {
        console.error('Server error:', response.data);
        const error = new Error(response.data?.error || response.data?.message || 'Service unavailable');
        (error as any).response = response;
        throw error;
      }
      return response;
    },
    async (error: AxiosError): Promise<any> => {
      console.error('❌ API request failed:', error.message);
      console.error('❌ Request URL:', error.config?.url);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response data:', error.response?.data);

      // Handle network errors (server down)
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        console.error('Server is not accessible. Please check if the server is running.');
        return Promise.reject(new Error('Server is not accessible. Please check if the server is running.'));
      }

      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Only refresh token when we get a 401/403 error (token is invalid/expired)
      if (error.response?.status && [401, 403].includes(error.response.status) &&
          !originalRequest._retry &&
          originalRequest.url && !isRefreshTokenEndpoint(originalRequest.url)) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            console.log('❌ No refresh token available, redirecting to login');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            accessToken = null;
            window.location.href = '/login';
            throw new Error('No refresh token available');
          }

          // Validate refresh token format
          if (!isValidJWT(refreshToken)) {
            console.error('❌ Invalid refresh token format, redirecting to login');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            accessToken = null;
            window.location.href = '/login';
            throw new Error('Invalid refresh token format');
          }

          console.log('🔄 Attempting to refresh token...');
          const response = await localApi.post(`/api/auth/refresh`, {
            refreshToken,
          });

          console.log('🔄 Refresh token response:', response.status, response.data);

          if (response.status === 200 && response.data.success && response.data.data) {
            const newAccessToken = response.data.data.accessToken;
            const newRefreshToken = response.data.data.refreshToken;

            // Validate new tokens before storing
            if (!isValidJWT(newAccessToken)) {
              console.error('❌ Received invalid access token from refresh endpoint');
              throw new Error('Invalid access token received');
            }

            localStorage.setItem('accessToken', newAccessToken);
            if (newRefreshToken && isValidJWT(newRefreshToken)) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }
            accessToken = newAccessToken;

            console.log('✅ Token refreshed successfully');

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            console.log('🔄 Retrying original request with new token');
            return getApiInstance(originalRequest.url || '')(originalRequest);
          } else {
            console.error('❌ Invalid response from refresh token endpoint:', response.data);
            throw new Error('Invalid response from refresh token endpoint');
          }
        } catch (err) {
          console.log('❌ Token refresh failed, clearing tokens and redirecting to login');
          console.error('❌ Refresh error details:', err);
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('accessToken');
          accessToken = null;
          window.location.href = '/login';
          return Promise.reject(err);
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
    return apiInstance(config);
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