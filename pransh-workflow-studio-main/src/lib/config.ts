// Centralized configuration for frontend
// This file should be used instead of hardcoding backend URLs

export const API_CONFIG = {
  baseUrl: (import.meta as any)?.env?.VITE_BACKEND_URL || 'http://localhost:3003',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

// Export for use in other files
export default API_CONFIG;

