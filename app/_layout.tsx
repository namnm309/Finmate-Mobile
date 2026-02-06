import InitialLayout from '@/components/InitialLayout';
import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { CLERK_PUBLISHABLE_KEY } from '@/lib/clerk';

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Thiếu key cho Clerk Auth. Hãy tạo file .env.local nếu chưa có và nạp key vào'
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['left', 'right']}>
            <InitialLayout />
          </SafeAreaView>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
