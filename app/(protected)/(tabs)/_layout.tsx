import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import { CaroPatternBackground } from '@/components/CaroPatternBackground';

export default function TabLayout() {
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <CaroPatternBackground />
      <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
        <Stack
          screenOptions={({ route }) => {
            const replaceType = (route.params as any)?.__replace as 'push' | 'pop' | undefined;
            return {
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent', flex: 1 },
              animation: 'slide_from_right',
              animationTypeForReplace: replaceType === 'pop' ? 'pop' : 'push',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            };
          }}
        />
      </View>
      <BottomNavigationBar />
    </View>
  );
}
