import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import BottomNavigationBar from '@/components/bottom-navigation-bar';

export default function OtherPagesLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={({ route }) => {
          const replaceType = (route.params as any)?.__replace as
            | 'push'
            | 'pop'
            | undefined;

          return {
            headerShown: false,
            contentStyle: { backgroundColor: '#0F1729' },
            animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
            animationTypeForReplace: replaceType === 'pop' ? 'pop' : 'push',
          };
        }}
      />
      <BottomNavigationBar />
    </View>
  );
}
