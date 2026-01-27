import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useMemo } from 'react';

//Lấy url host của BE đã host để call api
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

if (!API_BASE_URL) {
  console.warn(
    'Warning: EXPO_PUBLIC_API_BASE_URL chưa được setup . Điền url vào file .env.local .Đây là địa chỉ host của backend server.'
  );
}

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
}

export const useApiClient = () => {
  const { getToken } = useAuth();

  const apiCall = useCallback(async <T = any>(
    url: string,
    options: ApiClientOptions = {}
  ): Promise<T> => {
    const { skipAuth = false, headers = {}, ...fetchOptions } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    // Nạp token vào header nếu không bỏ qua xác thực , nạp để be có thể xác thực người dùng
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
  }, [getToken]);

  // Convenience methods - memoize để đảm bảo stable
  const get = useCallback((url: string, options?: ApiClientOptions) =>
    apiCall(url, { ...options, method: 'GET' }), [apiCall]);

  const post = useCallback((url: string, body?: any, options?: ApiClientOptions) =>
    apiCall(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }), [apiCall]);

  const put = useCallback((url: string, body?: any, options?: ApiClientOptions) =>
    apiCall(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }), [apiCall]);

  const del = useCallback((url: string, options?: ApiClientOptions) =>
    apiCall(url, { ...options, method: 'DELETE' }), [apiCall]);

  return useMemo(() => ({
    apiCall,
    get,
    post,
    put,
    delete: del,
  }), [apiCall, get, post, put, del]);
};
