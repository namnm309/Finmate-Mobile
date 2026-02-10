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

    // Nạp token vào header nếu không bỏ qua xác thực (từ Clerk, app không dùng token paste tay)
    if (!skipAuth) {
      try {
        const token = await getToken();
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
          if (__DEV__) console.log('[API] Auth: token có sẵn, đã gửi Bearer');
        } else {
          if (__DEV__) console.warn('[API] Auth: không có token (chưa đăng nhập hoặc hết phiên)');
        }
      } catch (error) {
        console.error('[API] Failed to get auth token:', error);
        throw new Error('Authentication failed');
      }
    }

    try {
      // Log request details (chỉ trong development)
      if (__DEV__) {
        console.log(`[API] ${fetchOptions.method || 'GET'} ${url}`);
        if (fetchOptions.body) {
          try {
            const bodyData = JSON.parse(fetchOptions.body as string);
            console.log('[API] Request body:', JSON.stringify(bodyData, null, 2));
          } catch (e) {
            console.log('[API] Request body:', fetchOptions.body);
          }
        }
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        console.error('[API] Unauthorized 401:', { url, hint: 'Token hết hạn, sai định dạng, hoặc backend không chấp nhận token này' });
        throw new Error('Unauthorized - Please sign in again');
      }

      // Handle other errors
      if (!response.ok) {
        let errorData: any = {};
        let errorText = '';
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorText = await response.text();
          }
        } catch (parseError) {
          console.error('[API] Failed to parse error response:', parseError);
        }

        // Log chi tiết lỗi từ server
        const serverMessage = errorData?.error ?? errorData?.message ?? errorText;
        const errorDetails = {
          url,
          status: response.status,
          statusText: response.statusText,
          error: serverMessage,
          errorData: errorData,
        };

        console.error('[API] Error response:', JSON.stringify(errorDetails, null, 2));
        
        // Tạo error message chi tiết hơn
        let errorMessage = serverMessage || `API Error: ${response.status} ${response.statusText}`;
        
        // Thêm thông tin chi tiết nếu có
        if (errorData?.message && errorData.message !== serverMessage) {
          errorMessage = `${errorMessage}\n\nChi tiết: ${errorData.message}`;
        }

        throw new Error(errorMessage);
      }

      // Parse JSON response
      const data = await response.json();
      
      // Log response trong development
      if (__DEV__) {
        console.log(`[API] Response ${response.status}:`, JSON.stringify(data, null, 2).substring(0, 500));
      }
      
      return data as T;
    } catch (error) {
      // Log chi tiết lỗi
      console.error('[API] Request failed:', {
        url,
        method: fetchOptions.method || 'GET',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
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
