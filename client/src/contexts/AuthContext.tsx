import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string, userData?: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to validate JWT token format
const isValidJWT = (token: string): boolean => {
  console.log('🔍 JWT Validation - Token received:', token ? `${token.substring(0, 20)}...` : 'null/undefined');
  console.log('🔍 JWT Validation - Token type:', typeof token);
  console.log('🔍 JWT Validation - Token length:', token ? token.length : 0);

  if (!token || typeof token !== 'string') {
    console.log('❌ JWT Validation failed: Token is null, undefined, or not a string');
    return false;
  }

  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  console.log('🔍 JWT Validation - Parts count:', parts.length);
  console.log('🔍 JWT Validation - Parts lengths:', parts.map(p => p.length));

  if (parts.length !== 3) {
    console.log('❌ JWT Validation failed: Token does not have 3 parts');
    return false;
  }

  // Each part should be base64 encoded (basic check)
  try {
    // Try to decode the header and payload
    const header = atob(parts[0]);
    const payload = atob(parts[1]);
    console.log('✅ JWT Validation - Successfully decoded header and payload');
    console.log('🔍 JWT Validation - Header preview:', header.substring(0, 50));
    console.log('🔍 JWT Validation - Payload preview:', payload.substring(0, 50));
    return true;
  } catch (error) {
    console.log('❌ JWT Validation failed: Cannot decode base64 parts');
    console.error('❌ JWT Validation error:', error);
    return false;
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (accessToken: string, refreshToken?: string, userData?: User) => {
    console.log('🔐 Login called with tokens');
    console.log('🔐 Login - Access token preview:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null/undefined');
    console.log('🔐 Login - Refresh token preview:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null/undefined');

    // Validate tokens before storing
    if (!isValidJWT(accessToken)) {
      console.error('❌ Invalid access token format provided to login');
      console.error('❌ Access token full value (first 100 chars):', accessToken ? accessToken.substring(0, 100) : 'null/undefined');
      return;
    }

    console.log('✅ Access token validation passed');

    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      if (isValidJWT(refreshToken)) {
        localStorage.setItem('refreshToken', refreshToken);
        console.log('✅ Refresh token validation passed and stored');
      } else {
        console.error('❌ Invalid refresh token format provided to login');
        console.error('❌ Refresh token full value (first 100 chars):', refreshToken.substring(0, 100));
      }
    }

    // Set user data from the provided userData or extract from token
    if (userData) {
      setUser(userData);
      console.log('✅ User data set from provided userData:', userData);
    } else {
      // Try to extract user info from JWT payload
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        setUser({ id: payload.userId, email: payload.email || 'user@example.com' });
        console.log('✅ User data extracted from JWT payload');
      } catch (error) {
        console.error('❌ Failed to extract user data from JWT, using default');
        setUser({ id: 'user', email: 'user@example.com' });
      }
    }
  };

  const logout = () => {
    console.log('🚪 Logout called');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const checkAuth = async (): Promise<boolean> => {
    console.log('🔍 Checking authentication status...');
    setIsLoading(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      console.log('🔍 Token check - Access token exists:', !!accessToken);
      console.log('🔍 Token check - Refresh token exists:', !!refreshToken);

      if (accessToken) {
        console.log('🔍 Access token length:', accessToken.length);

        // Validate token format
        if (!isValidJWT(accessToken)) {
          console.error('❌ Invalid access token format detected, clearing tokens');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          return false;
        }

        // Also validate refresh token if it exists
        if (refreshToken && !isValidJWT(refreshToken)) {
          console.error('❌ Invalid refresh token format detected, clearing tokens');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          return false;
        }

        // Extract user data from JWT
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          setUser({ id: payload.userId, email: payload.email || 'user@example.com' });
          console.log('✅ Valid tokens found, user data extracted from JWT');
          return true;
        } catch (error) {
          console.error('❌ Failed to extract user data from JWT');
          setUser({ id: 'user', email: 'user@example.com' });
          return true;
        }
      } else {
        console.log('❌ No access token found');
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Clear potentially corrupted tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 AuthProvider useEffect triggered');
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth
  };

  console.log('🔒 AuthProvider rendering with state:', {
    isAuthenticated: !!user,
    isLoading,
    hasUser: !!user
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Default export for better compatibility
export default AuthProvider;