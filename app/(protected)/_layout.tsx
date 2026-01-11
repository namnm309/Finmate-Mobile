import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

export default function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedGroup = segments[0] === '(protected)';

    if (!isSignedIn && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      // Redirect to protected routes if authenticated and trying to access auth
      router.replace('/(protected)/(tabs)');
    } else if (isSignedIn && inProtectedGroup && segments.length === 1) {
      // If in protected but no specific route, go to tabs
      router.replace('/(protected)/(tabs)');
    }
  }, [isSignedIn, isLoaded, segments]);

  // Show loading indicator while checking auth state
  if (!isLoaded) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  // Only render children if authenticated
  if (!isSignedIn) {
    return null;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
