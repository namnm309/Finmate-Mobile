import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

export const useAuth = () => {
  const {
    isLoaded,
    isSignedIn,
    userId,
    sessionId,
    user,
    getToken,
    signOut,
  } = useClerkAuth();

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId,
    sessionId,
    user,
    getToken,
    signOut,
    // Helper to check if user is authenticated
    isAuthenticated: isLoaded && isSignedIn === true,
  };
};
