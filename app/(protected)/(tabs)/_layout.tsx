import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import BottomNavigationBar from '@/components/bottom-navigation-bar';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#151a25' }}>
      <Stack
        screenOptions={({ route }) => {
          const replaceType = (route.params as any)?.__replace as
            | 'push'
            | 'pop'
            | undefined;

          return {
            headerShown: false,
            contentStyle: { backgroundColor: '#151a25' },
            // Android: set rõ slide; iOS dùng default (đã tối ưu theo platform)
            animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
            // Cho các navigation dùng replace() có thể chọn push/pop theo param
            animationTypeForReplace: replaceType === 'pop' ? 'pop' : 'push',
          };
        }}
      />
      <BottomNavigationBar />
    </View>
  );
}
