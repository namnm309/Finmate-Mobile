import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InputMethodModal } from '@/components/input-method-modal';

const ADD_BUTTON_COLORS = {
  light: ['#009966', '#00a63e'] as const,
  dark: ['#99a1af', '#d1d5dc'] as const,
};

function AddTabButton({ onPress, isDark }: { onPress: () => void; isDark: boolean }) {
  const colors = isDark ? ADD_BUTTON_COLORS.dark : ADD_BUTTON_COLORS.light;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.addButtonContainer}
      activeOpacity={0.8}>
      <LinearGradient
        colors={colors}
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
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';

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
      <View
        style={[
          styles.tabBar,
          {
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: themeColors.card,
            borderTopColor: themeColors.border,
          },
        ]}>
        <TouchableOpacity
          onPress={() => handleNavigate('/(protected)/(tabs)')}
          style={styles.tabItem}
          activeOpacity={0.7}>
          <MaterialIcons
            name="home"
            size={30}
            color={isHomeActive ? themeColors.tabIconSelected : themeColors.tabIconDefault}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: themeColors.tabIconDefault },
              isHomeActive && { color: themeColors.tabIconSelected },
            ]}>
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
            color={isAccountActive ? themeColors.tabIconSelected : themeColors.tabIconDefault}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: themeColors.tabIconDefault },
              isAccountActive && { color: themeColors.tabIconSelected },
            ]}>
            Tài khoản
          </Text>
        </TouchableOpacity>

        <AddTabButton onPress={handleAddPress} isDark={isDark} />

        <TouchableOpacity
          onPress={() => handleNavigate('/(protected)/(tabs)/report')}
          style={styles.tabItem}
          activeOpacity={0.7}>
          <MaterialIcons
            name="bar-chart"
            size={30}
            color={isReportActive ? themeColors.tabIconSelected : themeColors.tabIconDefault}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: themeColors.tabIconDefault },
              isReportActive && { color: themeColors.tabIconSelected },
            ]}>
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
            color={isOtherActive ? themeColors.tabIconSelected : themeColors.tabIconDefault}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: themeColors.tabIconDefault },
              isOtherActive && { color: themeColors.tabIconSelected },
            ]}>
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
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    // Shadow nhẹ theo Figma (iOS); Android dùng elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10.9,
    fontFamily: 'Inter',
    marginTop: 4,
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
