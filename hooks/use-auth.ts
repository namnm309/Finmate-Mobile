import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

// Tùy chỉnh hook useAuth để phù hợp với nhu cầu của ứng dụng
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
