import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom button cho tab Add ở giữa
function AddTabButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.addButtonContainer}
      activeOpacity={0.8}>
      <LinearGradient
        colors={['#99a1af', '#d1d5dc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.addButtonGradient}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function BottomNavigationBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const isActive = (path: string) => {
    const currentPath = segments.join('/');
    return currentPath.includes(path);
  };

  const handleNavigate = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={[styles.tabBar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
      <TouchableOpacity
        onPress={() => handleNavigate('/(protected)/(tabs)')}
        style={styles.tabItem}
        activeOpacity={0.7}>
        <MaterialIcons
          name="home"
          size={30}
          color={isActive('(tabs)/index') ? '#51a2ff' : '#6a7282'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleNavigate('/(protected)/(tabs)/account')}
        style={styles.tabItem}
        activeOpacity={0.7}>
        <MaterialIcons
          name="wallet"
          size={30}
          color={isActive('(tabs)/account') ? '#51a2ff' : '#6a7282'}
        />
      </TouchableOpacity>

      <AddTabButton onPress={() => handleNavigate('/(protected)/(tabs)/add')} />

      <TouchableOpacity
        onPress={() => handleNavigate('/(protected)/(tabs)/report')}
        style={styles.tabItem}
        activeOpacity={0.7}>
        <MaterialIcons
          name="bar-chart"
          size={30}
          color={isActive('(tabs)/report') ? '#51a2ff' : '#6a7282'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleNavigate('/(protected)/(tabs)/other')}
        style={styles.tabItem}
        activeOpacity={0.7}>
        <MaterialIcons
          name="grid-view"
          size={30}
          color={isActive('(tabs)/other') || isActive('(other-pages)') ? '#51a2ff' : '#6a7282'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#151a25',
    borderTopColor: '#1e2939',
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabelContainer: {
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabelPlaceholder: {
    // Placeholder for label spacing
  },
  addButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
});
