import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import BottomNavigationBar from '@/components/bottom-navigation-bar';

export default function OtherPagesLayout() {
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Stack
        screenOptions={({ route }) => {
          const replaceType = (route.params as any)?.__replace as
            | 'push'
            | 'pop'
            | undefined;

          return {
            headerShown: false,
            contentStyle: { backgroundColor: themeColors.background },
            animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
            animationTypeForReplace: replaceType === 'pop' ? 'pop' : 'push',
          };
        }}
      />
      <BottomNavigationBar />
    </View>
  );
}
