import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo } from 'react';
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
import { useAIChatbot } from '@/contexts/ai-chatbot-context';
import { useNotificationBadge } from '@/contexts/notification-badge-context';

const FAB_SIZE = 58;
const SPRING_CONFIG = { damping: 22, stiffness: 140 };
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
/**
 * Nút AI Chatbot tròn, có thể kéo thả, hiển thị mọi màn.
 * Vị trí mặc định: góc dưới bên phải. Nhấn để mở modal chat.
 */
export function AIChatbotFab() {
  const insets = useSafeAreaInsets();
  const { openChatbot, closeChatbot, visible, initialMessage, autoSend, fabPosition, setFabPosition } = useAIChatbot();
  const { setHasMissingFieldsMessage } = useNotificationBadge();
  const bottomBarHeight = 70 + insets.bottom;
  const safeTop = insets.top + 8;
  const safeBottom = SCREEN_HEIGHT - bottomBarHeight - FAB_SIZE - 12;
  const safeLeft = 12;
  const safeRight = SCREEN_WIDTH - FAB_SIZE - 16;
  const initY = safeBottom - 12;
  const initX = safeRight;

  useEffect(() => {
    setFabPosition({ x: initX, y: initY });
  }, [initX, initY, setFabPosition]);

  const translateX = useSharedValue(initX);
  const translateY = useSharedValue(initY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const totalDrag = useSharedValue(0);

  const openModal = useCallback(() => openChatbot(), []);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .onEnd(() => {
          runOnJS(openModal)();
        }),
    [openModal]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(8)
        .onStart(() => {
          startX.value = translateX.value;
          startY.value = translateY.value;
          totalDrag.value = 0;
        })
        .onUpdate((e) => {
          totalDrag.value += Math.abs(e.translationX) + Math.abs(e.translationY);
          const x = Math.max(safeLeft, Math.min(safeRight, startX.value + e.translationX));
          const y = Math.max(safeTop, Math.min(safeBottom, startY.value + e.translationY));
          translateX.value = x;
          translateY.value = y;
          runOnJS(setFabPosition)({ x, y });
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
          translateX.value = withSpring(x, SPRING_CONFIG);
          translateY.value = withSpring(y, SPRING_CONFIG);
          runOnJS(setFabPosition)({ x, y });
          if (totalDrag.value < 10) {
            runOnJS(openModal)();
          }
        }),
    [
      safeTop,
      safeBottom,
      safeLeft,
      safeRight,
      openModal,
      setFabPosition,
      translateX,
      translateY,
      startX,
      startY,
      totalDrag,
    ]
  );

  const composedGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <>
      <AIChatbotModal
        visible={visible}
        onClose={closeChatbot}
        initialMessage={initialMessage}
        autoSend={autoSend}
        popoverMode
        fabPosition={fabPosition}
        onMissingFieldsShown={() => setHasMissingFieldsMessage(true)}
      />
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.fabContainer, styles.fabOnTop, animatedStyle]}>
          <View style={styles.fabCircle}>
            <LinearGradient
              colors={['#34d399', '#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}>
              <MaterialIcons name="auto-awesome" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  fabOnTop: {
    zIndex: 9999,
    elevation: 9999,
  },
  fabCircle: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#059669',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        }
      : { elevation: 8 }),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
