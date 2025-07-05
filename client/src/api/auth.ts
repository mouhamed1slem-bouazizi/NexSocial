import api from './api';

// Description: Login user with email and password
// Endpoint: POST /api/auth/login
// Request: { email: string, password: string }
// Response: { success: boolean, data: { accessToken: string, refreshToken: string, user: object } }
export const login = async (email: string, password: string) => {
  console.log('🔄 API Login request starting for:', email);
  
  try {
    const response = await api.post('/auth/login', { email, password });
    console.log('✅ API Login response received:', response.status);
    console.log('🔍 Login response data structure:', {
      success: response.data?.success,
      hasData: !!response.data?.data,
      hasAccessToken: !!response.data?.data?.accessToken,
      hasRefreshToken: !!response.data?.data?.refreshToken,
      accessTokenPreview: response.data?.data?.accessToken ? `${response.data.data.accessToken.substring(0, 20)}...` : 'missing',
      refreshTokenPreview: response.data?.data?.refreshToken ? `${response.data.data.refreshToken.substring(0, 20)}...` : 'missing'
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ API Login error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Register new user
// Endpoint: POST /api/auth/register
// Request: { email: string, password: string }
// Response: { success: boolean, data: { accessToken: string, user: object } }
export const register = async (email: string, password: string) => {
  console.log('🔄 API Register request starting for:', email);
  
  try {
    const response = await api.post('/auth/register', { email, password });
    console.log('✅ API Register response received:', response.status);
    console.log('🔍 Register response data structure:', {
      success: response.data?.success,
      hasData: !!response.data?.data,
      hasAccessToken: !!response.data?.data?.accessToken,
      accessTokenPreview: response.data?.data?.accessToken ? `${response.data.data.accessToken.substring(0, 20)}...` : 'missing'
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ API Register error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Logout user
// Endpoint: POST /api/auth/logout
// Request: {}
// Response: { success: boolean, message: string }
export const logout = async () => {
  console.log('🔄 API Logout request starting');
  
  try {
    const response = await api.post('/auth/logout');
    console.log('✅ API Logout response received:', response.status);
    return response.data;
  } catch (error: any) {
    console.error('❌ API Logout error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};