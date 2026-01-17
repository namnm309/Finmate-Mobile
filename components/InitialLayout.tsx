import { useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

// Này dùng để check authentication state khi app khởi động, khi restart app thì nó sẽ check lại trạng thái đăng nhập
export default function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthScreen = segments[0] === "(auth)";
    const inProtectedScreen = segments[0] === "(protected)";

    if (!isSignedIn && !inAuthScreen) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthScreen) {
      router.replace("/(protected)/(tabs)");
    } else if (isSignedIn && inProtectedScreen && segments.length === 1) {
      router.replace("/(protected)/(tabs)");
    }
  }, [isLoaded, isSignedIn, segments, router]);

  if (!isLoaded) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
