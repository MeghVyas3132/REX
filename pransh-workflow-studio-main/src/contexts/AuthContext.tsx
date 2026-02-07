// Authentication context and route protection
// This provides authentication state management and route guards

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { ApiService, ErrorHandler } from '../lib/errorService';
import { logger } from '@/lib/logger';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: 'admin' | 'user';
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_CONFIG } from '../lib/config';

const API_BASE = API_CONFIG.baseUrl;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userStr = localStorage.getItem(USER_KEY);
        
        if (token && userStr) {
          const user = JSON.parse(userStr);
          
          // Verify token is still valid
          const isValid = await verifyToken(token);
          if (isValid) {
            setState({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // Token expired, try to refresh
            const refreshed = await refreshAuthToken();
            if (!refreshed) {
              clearAuth();
            }
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        logger.error('Auth initialization error:', error as Error);
        clearAuth();
      }
    };

    initializeAuth();
  }, []);

  // Verify token with backend
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Refresh authentication token
  const refreshAuthToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const result = await ApiService.post('/api/auth/refresh', 
        { refreshToken }, 
        { silent: true }
      );

      if (result && (result as any)?.data) {
        const { token: newToken, refreshToken: newRefreshToken, user } = (result as any).data;
        localStorage.setItem(TOKEN_KEY, newToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        setState({
          user,
          token: newToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Clear authentication state
  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('refresh_token');
    
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await ApiService.post('/api/auth/login', 
        { email, password }, 
        { toastTitle: 'Login' }
      );

      if (result && (result as any)?.data) {
        const { token, refreshToken, user } = (result as any).data;
        
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        ErrorHandler.showSuccessToast('Login Successful', 'Welcome back!');
        return true;
      }
      return false;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Login failed' 
      }));
      return false;
    }
  };

  // Register function
  const register = async (email: string, password: string, name?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await ApiService.post('/api/auth/register', 
        { email, password, name }, 
        { toastTitle: 'Registration' }
      );

      if (result && (result as any)?.data) {
        const { token, refreshToken, user } = (result as any).data;
        
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        ErrorHandler.showSuccessToast('Registration Successful', 'Welcome to Workflow Studio!');
        return true;
      }
      return false;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Registration failed' 
      }));
      return false;
    }
  };

  // Logout function
  const logout = () => {
    // Call logout endpoint
    ApiService.post('/api/auth/logout', {}, { silent: true }).catch(() => {
      // Ignore logout errors
    });

    clearAuth();
    ErrorHandler.showInfoToast('Logged Out', 'You have been logged out successfully');
  };

  // Update user profile
  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!state.user) return false;

    try {
      const result = await ApiService.put('/api/auth/profile', 
        updates, 
        { toastTitle: 'Update Profile' }
      );

      if (result && (result as any)?.data) {
        const updatedUser = { ...state.user, ...(result as any).data };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        
        setState(prev => ({
          ...prev,
          user: updatedUser,
        }));

        ErrorHandler.showSuccessToast('Profile Updated', 'Your profile has been updated');
        return true;
      }
      return false;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Profile update failed' 
      }));
      return false;
    }
  };

  // Clear error
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  // Refresh token function (exposed for manual refresh)
  const refreshToken = async (): Promise<boolean> => {
    return await refreshAuthToken();
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected route component
interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: 'admin' | 'user';
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  requireRole,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Login page component
export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await login(email, password);
      if (success) {
        // Navigate to home page after successful login
        navigate('/', { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-background flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your workflow studio
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
            <p className="text-sm text-red-500">{error}</p>
            <button 
              onClick={clearError}
              className="text-xs text-red-400 hover:text-red-300 mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <a href="/register" className="text-primary hover:text-primary/80">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Registration page component
export function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Basic validation
    if (password !== confirmPassword) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await register(email, password, name);
      if (success) {
        // Navigate to home page after successful registration
        navigate('/', { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  return (
    <div className="min-h-screen bg-canvas-background flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Create your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start building workflows today
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
            <p className="text-sm text-red-500">{error}</p>
            <button 
              onClick={clearError}
              className="text-xs text-red-400 hover:text-red-300 mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary ${
                confirmPassword.length > 0 && !passwordsMatch 
                  ? 'border-red-500' 
                  : 'border-border'
              }`}
              placeholder="Confirm your password"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-sm text-red-500">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading || !passwordsMatch}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Unauthorized page component
export function UnauthorizedPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Unauthorized</h2>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this resource.
        </p>
        <div className="space-x-4">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-surface"
          >
            Go Back
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
