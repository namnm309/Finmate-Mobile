import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

/**
 * Hook xác thực duy nhất - toàn bộ mobile dùng Clerk qua hook này.
 * Không dùng trực tiếp @clerk/clerk-expo useAuth, luôn dùng useAuth từ đây.
 */
export const useAuth = () => {
  const {
    isLoaded,
    isSignedIn,
    userId,
    sessionId,
    getToken, //Lấy token để gọi api
    signOut,
  } = useClerkAuth();

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId,
    sessionId,
    getToken,
    signOut,
    // Helper to check if user is authenticated
    isAuthenticated: isLoaded && isSignedIn === true,
  };
};
