import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';

// Custom button cho tab Add ở giữa
function AddTabButton(props: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      {...props}
      style={[props.style, styles.addButtonContainer]}
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

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#151a25' }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#51a2ff',
          tabBarInactiveTintColor: '#6a7282',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarLabelStyle: {
            fontSize: 10.9,
            fontFamily: 'Inter',
            marginTop: 0
          },
          tabBarStyle: {
            backgroundColor: '#151a25',
            borderTopColor: '#1e2939',
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },          
        }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={30} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="wallet" size={30} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: AddTabButton,
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Báo cáo',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" size={30} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="other"
        options={{
          title: 'Khác',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="grid-view" size={30} color={color} />
          ),
        }}
      />
      </Tabs>
    </View>
  );
}const styles = StyleSheet.create({
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
