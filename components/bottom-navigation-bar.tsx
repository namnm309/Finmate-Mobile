import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InputMethodModal } from '@/components/input-method-modal';

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
  const [modalVisible, setModalVisible] = useState(false);

  const TAB_ORDER = [
    '/(protected)/(tabs)', // Tổng quan (index)
    '/(protected)/(tabs)/account',
    '/(protected)/(tabs)/report',
    '/(protected)/(tabs)/other',
  ] as const;

  const getCurrentTabIndex = (): number | null => {
    const currentPath = segments.join('/');
    // Thứ tự: account, report, other phải check trước vì path có thể chứa nhiều segment
    if (currentPath.includes('(tabs)/account')) return 1;
    if (currentPath.includes('(tabs)/report')) return 2;
    if (currentPath.includes('(tabs)/other') || currentPath.includes('(other-pages)')) return 3;
    // Tổng quan: đang ở (tabs) và không phải account/report/other => index (route gốc (tabs) có thể không có "index" trong path)
    if (currentPath.includes('(tabs)')) return 0;
    return null;
  };

  const currentTabIndex = getCurrentTabIndex();
  const isHomeActive = currentTabIndex === 0;
  const isAccountActive = currentTabIndex === 1;
  const isReportActive = currentTabIndex === 2;
  const isOtherActive = currentTabIndex === 3;

  const handleNavigate = (path: string) => {
    const currentIndex = getCurrentTabIndex();
    const targetIndex = TAB_ORDER.indexOf(path as any);

    // Nếu không phải route tab, fallback hành vi cũ (push)
    if (targetIndex === -1) {
      router.push(path as any);
      return;
    }

    // Nếu đang ở đúng tab rồi thì thôi
    if (currentIndex !== null && currentIndex === targetIndex) return;

    // Quy ước: tab bên phải = "push", tab bên trái = "pop"
    const replaceType: 'push' | 'pop' =
      currentIndex === null || targetIndex > currentIndex ? 'push' : 'pop';

    router.replace(
      {
        pathname: path,
        params: { __replace: replaceType },
      } as any
    );
  };

  const handleAddPress = () => {
    setModalVisible(true);
  };

  return (
    <>
      <View style={[styles.tabBar, { height: 70 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          onPress={() => handleNavigate('/(protected)/(tabs)')}
          style={styles.tabItem}
          activeOpacity={0.7}>
          <MaterialIcons
            name="home"
            size={30}
            color={isHomeActive ? '#51a2ff' : '#6a7282'}
          />
          <Text style={[styles.tabLabel, isHomeActive && styles.tabLabelActive]}>
            Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleNavigate('/(protected)/(tabs)/account')}
          style={styles.tabItem}
          activeOpacity={0.7}>
          <MaterialIcons
            name="wallet"
            size={30}
            color={isAccountActive ? '#51a2ff' : '#6a7282'}
          />
          <Text style={[styles.tabLabel, isAccountActive && styles.tabLabelActive]}>
            Tài khoản
          </Text>
        </TouchableOpacity>

        <AddTabButton onPress={handleAddPress} />

        <TouchableOpacity
          onPress={() => handleNavigate('/(protected)/(tabs)/report')}
          style={styles.tabItem}
          activeOpacity={0.7}>
          <MaterialIcons
            name="bar-chart"
            size={30}
            color={isReportActive ? '#51a2ff' : '#6a7282'}
          />
          <Text style={[styles.tabLabel, isReportActive && styles.tabLabelActive]}>
            Báo cáo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleNavigate('/(protected)/(tabs)/other')}
          style={styles.tabItem}
          activeOpacity={0.7}>
          <MaterialIcons
            name="grid-view"
            size={30}
            color={isOtherActive ? '#51a2ff' : '#6a7282'}
          />
          <Text style={[styles.tabLabel, isOtherActive && styles.tabLabelActive]}>
            Khác
          </Text>
        </TouchableOpacity>
      </View>
      <InputMethodModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
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
  tabLabel: {
    fontSize: 10.9,
    fontFamily: 'Inter',
    color: '#6a7282',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#51a2ff',
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
