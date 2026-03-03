import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AIChatbotModal } from '@/components/ai-chatbot-modal';

const FAB_SIZE = 56;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAP_THRESHOLD = 10;

/**
 * Icon AI Chatbot tròn, có thể kéo thả mượt mà đến vị trí khác.
 * Nhấn để mở modal chat.
 */
export function AIChatbotFab() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const bottomBarHeight = 70 + insets.bottom;
  const safeTop = insets.top + 8;
  const safeBottom = SCREEN_HEIGHT - bottomBarHeight - FAB_SIZE - 12;
  const safeLeft = 12;
  const safeRight = SCREEN_WIDTH - FAB_SIZE - 12;
  const initY = safeBottom - 12;

  const translateX = useSharedValue(safeLeft);
  const translateY = useSharedValue(initY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const totalDrag = useSharedValue(0);

  const openModal = useCallback(() => setModalVisible(true), []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startX.value = translateX.value;
          startY.value = translateY.value;
          totalDrag.value = 0;
        })
        .onUpdate((e) => {
          totalDrag.value += Math.abs(e.translationX) + Math.abs(e.translationY);
          translateX.value = Math.max(
            safeLeft,
            Math.min(safeRight, startX.value + e.translationX)
          );
          translateY.value = Math.max(
            safeTop,
            Math.min(safeBottom, startY.value + e.translationY)
          );
        })
        .onEnd((e) => {
          const x = Math.max(
            safeLeft,
            Math.min(safeRight, startX.value + e.translationX)
          );
          const y = Math.max(
            safeTop,
            Math.min(safeBottom, startY.value + e.translationY)
          );
          translateX.value = withSpring(x, { damping: 18, stiffness: 180 });
          translateY.value = withSpring(y, { damping: 18, stiffness: 180 });
          if (totalDrag.value < TAP_THRESHOLD) {
            runOnJS(openModal)();
          }
        }),
    [
      safeTop,
      safeBottom,
      safeLeft,
      safeRight,
      openModal,
      translateX,
      translateY,
      startX,
      startY,
      totalDrag,
    ]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.fabContainer, animatedStyle]}
          pointerEvents="box-none">
          <View style={styles.fabCircle}>
            <LinearGradient
              colors={['#16a34a', '#22c55e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}>
              <MaterialIcons name="chat-bubble-outline" size={26} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </Animated.View>
      </GestureDetector>
      <AIChatbotModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 100,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  fabCircle: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#16a34a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        }
      : {}),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
