import { useAuth } from '@clerk/clerk-expo';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

if (!API_BASE_URL) {
  console.warn(
    'Warning: EXPO_PUBLIC_API_BASE_URL is not set. Please add it to your .env.local file'
  );
}

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
}

export const useApiClient = () => {
  const { getToken } = useAuth();

  const apiCall = async <T = any>(
    url: string,
    options: ApiClientOptions = {}
  ): Promise<T> => {
    const { skipAuth = false, headers = {}, ...fetchOptions } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    // Add authentication token if not skipped
    if (!skipAuth) {
      try {
        const token = await getToken();
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get auth token:', error);
        throw new Error('Authentication failed');
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('Unauthorized - Please sign in again');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `API Error: ${response.status} ${response.statusText}`
        );
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  };

  // Convenience methods
  const get = <T = any>(url: string, options?: ApiClientOptions) =>
    apiCall<T>(url, { ...options, method: 'GET' });

  const post = <T = any>(url: string, body?: any, options?: ApiClientOptions) =>
    apiCall<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });

  const put = <T = any>(url: string, body?: any, options?: ApiClientOptions) =>
    apiCall<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });

  const del = <T = any>(url: string, options?: ApiClientOptions) =>
    apiCall<T>(url, { ...options, method: 'DELETE' });

  return {
    apiCall,
    get,
    post,
    put,
    delete: del,
  };
};
