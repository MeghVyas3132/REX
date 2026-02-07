// Enhanced error handling service with retry logic and toast notifications
// This service provides consistent error handling across all API calls

import { toast } from '@/hooks/use-toast';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  details?: any;
  retryable: boolean;
}

export interface ApiCallOptions {
  retryConfig?: RetryConfig;
  showToast?: boolean;
  toastTitle?: string;
  silent?: boolean;
  timeout?: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
  maxDelay: 10000,
    backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, 5xx errors, and rate limits
    if (!error.statusCode) return true; // Network error
    if (error.statusCode >= 500) return true; // Server error
    if (error.statusCode === 429) return true; // Rate limit
    if (error.statusCode === 408) return true; // Timeout
    return false;
  }
};

export class ErrorHandler {
  private static retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;

  // Set global retry configuration
  static setRetryConfig(config: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  // Enhanced fetch with retry logic and error handling
  static async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    apiOptions: ApiCallOptions = {}
  ): Promise<Response> {
    const {
      retryConfig = this.retryConfig,
      showToast = true,
      toastTitle = 'API Error',
      silent = false,
      timeout = 30000
    } = apiOptions;

    let lastError: any;
    let attempt = 0;

    while (attempt <= retryConfig.maxRetries) {
      try {
        // Add timeout to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if response is ok
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          const apiError: ApiError = {
            message: errorData.message || `HTTP ${response.status}`,
            statusCode: response.status,
            code: errorData.code,
            details: errorData.details,
            retryable: retryConfig.retryCondition?.(errorData) ?? false
          };

          // If not retryable or max retries reached, throw error
          if (!apiError.retryable || attempt >= retryConfig.maxRetries) {
            throw apiError;
          }

          lastError = apiError;
        } else {
          return response;
        }
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        if (!retryConfig.retryCondition?.(error) || attempt >= retryConfig.maxRetries) {
          break;
        }
      }

      attempt++;
      
      // Calculate delay with exponential backoff
      if (attempt <= retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );
        
        await this.delay(delay);
      }
    }

    // Handle final error
    const finalError = this.normalizeError(lastError);
    
    if (!silent && showToast) {
      this.showErrorToast(finalError, toastTitle);
    }

    throw finalError;
  }

  // Parse error response from API
  private static async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        return { message: text || `HTTP ${response.status}` };
      }
    } catch {
      return { message: `HTTP ${response.status}` };
    }
  }

  // Normalize error to consistent format
  static normalizeError(error: any): ApiError {
    if (error.name === 'AbortError') {
      return {
        message: 'Request timeout',
        code: 'TIMEOUT',
        retryable: true
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
        retryable: true
      };
    }

    if (error.statusCode || error.code) {
      return {
        message: error.message || 'API error occurred',
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
        retryable: error.retryable ?? false
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      retryable: false
    };
  }

  // Show error toast notification
  static showErrorToast(error: ApiError, title: string) {
    let description = error.message;
    
    if (error.statusCode) {
      description += ` (${error.statusCode})`;
    }

    if (error.code) {
      description += ` [${error.code}]`;
    }

    toast({
      title,
      description,
      variant: "destructive",
      duration: error.retryable ? 5000 : 3000
    });
  }

  // Show success toast notification
  static showSuccessToast(title: string, description?: string) {
    toast({
      title,
      description,
      variant: "default",
      duration: 3000
    });
  }

  // Show warning toast notification
  static showWarningToast(title: string, description?: string) {
    toast({
      title,
      description,
      variant: "destructive",
      duration: 4000
    });
  }

  // Show info toast notification
  static showInfoToast(title: string, description?: string) {
    toast({
      title,
      description,
      variant: "default",
      duration: 3000
    });
  }

  // Utility delay function
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Handle specific error types
  static handleAuthError(error: ApiError) {
    if (error.statusCode === 401) {
      this.showWarningToast(
        'Authentication Required',
        'Please log in to continue'
      );
      // Redirect to login or refresh token
      return true;
    }
    return false;
  }

  static handleValidationError(error: ApiError) {
    if (error.statusCode === 400) {
      this.showWarningToast(
        'Validation Error',
        error.message || 'Please check your input and try again'
      );
      return true;
    }
    return false;
  }

  static handleRateLimitError(error: ApiError) {
    if (error.statusCode === 429) {
      this.showWarningToast(
        'Rate Limit Exceeded',
        'Please wait a moment before trying again'
      );
      return true;
    }
    return false;
  }

  static handleServerError(error: ApiError) {
    if (error.statusCode && error.statusCode >= 500) {
      this.showErrorToast(
        error,
        'Server Error'
      );
      return true;
    }
    return false;
  }

  // Generic error handler for API calls
  static async handleApiCall<T>(
    apiCall: () => Promise<T>,
    options: ApiCallOptions = {}
  ): Promise<T | null> {
    try {
      return await apiCall();
    } catch (error: any) {
      const normalizedError = this.normalizeError(error);
      
      // Handle specific error types
      if (this.handleAuthError(normalizedError)) return null;
      if (this.handleValidationError(normalizedError)) return null;
      if (this.handleRateLimitError(normalizedError)) return null;
      if (this.handleServerError(normalizedError)) return null;

      // Generic error handling
      if (!options.silent) {
        this.showErrorToast(normalizedError, options.toastTitle || 'Error');
      }

      return null;
    }
  }
}

// Enhanced API service with error handling
import { API_CONFIG } from './config';

export class ApiService {
  private static baseUrl = API_CONFIG.baseUrl;

  // Get auth token from localStorage
  private static getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Generic API call with error handling
  static async call<T>(
    endpoint: string,
    options: RequestInit = {},
    apiOptions: ApiCallOptions = {}
  ): Promise<T | null> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Add auth header if token exists
    const token = this.getAuthToken();
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    return ErrorHandler.handleApiCall(async () => {
      const response = await ErrorHandler.fetchWithRetry(url, options, apiOptions);
      return await response.json();
    }, apiOptions);
  }

  // GET request
  static async get<T>(
    endpoint: string,
    apiOptions: ApiCallOptions = {}
  ): Promise<T | null> {
    return this.call<T>(endpoint, { method: 'GET' }, apiOptions);
  }

  // POST request
  static async post<T>(
    endpoint: string,
    data?: any,
    apiOptions: ApiCallOptions = {}
  ): Promise<T | null> {
    return this.call<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    }, apiOptions);
  }

  // PUT request
  static async put<T>(
    endpoint: string,
    data?: any,
    apiOptions: ApiCallOptions = {}
  ): Promise<T | null> {
    return this.call<T>(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    }, apiOptions);
  }

  // DELETE request
  static async delete<T>(
    endpoint: string,
    apiOptions: ApiCallOptions = {}
  ): Promise<T | null> {
    return this.call<T>(endpoint, { method: 'DELETE' }, apiOptions);
  }

  // PATCH request
  static async patch<T>(
    endpoint: string,
    data?: any,
    apiOptions: ApiCallOptions = {}
  ): Promise<T | null> {
    return this.call<T>(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    }, apiOptions);
  }
}

// React hook for error handling
export function useErrorHandler() {
  const handleError = (error: any, title?: string) => {
    const normalizedError = ErrorHandler.normalizeError(error);
    ErrorHandler.showErrorToast(normalizedError, title || 'Error');
  };

  const handleSuccess = (title: string, description?: string) => {
    ErrorHandler.showSuccessToast(title, description);
  };

  const handleWarning = (title: string, description?: string) => {
    ErrorHandler.showWarningToast(title, description);
  };

  const handleInfo = (title: string, description?: string) => {
    ErrorHandler.showInfoToast(title, description);
  };

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    ErrorHandler
  };
}