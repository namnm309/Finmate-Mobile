import { AIModalProvider } from '@/contexts/ai-modal-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import { CaroPatternBackground } from '@/components/CaroPatternBackground';

export default function OtherPagesLayout() {
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];

  return (
    <AIModalProvider>
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <CaroPatternBackground />
      <Stack
        screenOptions={({ route }) => {
          const replaceType = (route.params as any)?.__replace as
            | 'push'
            | 'pop'
            | undefined;

          return {
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
            animationTypeForReplace: replaceType === 'pop' ? 'pop' : 'push',
          };
        }}
      />
      <BottomNavigationBar />
    </View>
    </AIModalProvider>
  );
}
