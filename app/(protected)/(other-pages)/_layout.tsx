import { Stack } from 'expo-router';
import { View } from 'react-native';
import BottomNavigationBar from '@/components/bottom-navigation-bar';

export default function OtherPagesLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F1729' },
        }}
      />
      <BottomNavigationBar />
    </View>
  );
}
