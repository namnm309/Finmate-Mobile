import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

const SPACING = 18;

/**
 * Nền caro: các đường sọc chéo đan xen nhau tạo ô vuông.
 * Render trực tiếp (không dùng Pattern) để hoạt động ổn định trên web & native.
 */
export function CaroPatternBackground() {
  const theme = useColorScheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  // Độ tương phản vừa phải, hài hòa với nền
  const lineColor = isDark
    ? 'rgba(255,255,255,0.06)'           // Dark: nền #0F1729, sọc trắng nhẹ
    : 'rgba(74,85,101,0.07)';            // Light: nền #dcfce7 mint, sọc xám xanh mờ

  const { width, height } = useMemo(() => {
    const { width: w, height: h } = Dimensions.get('window');
    return { width: w, height: h };
  }, []);

  const maxLen = Math.max(width, height) * 1.2;

  const linesSlash = useMemo(() => {
    const arr = [];
    for (let i = -maxLen; i < width + maxLen; i += SPACING) {
      arr.push(
        <Line
          key={`s-${i}`}
          x1={i - maxLen}
          y1={-maxLen}
          x2={i + maxLen}
          y2={maxLen}
          stroke={lineColor}
          strokeWidth={1}
        />
      );
    }
    return arr;
  }, [width, maxLen, lineColor]);

  const linesBackslash = useMemo(() => {
    const arr = [];
    for (let i = -maxLen; i < width + maxLen; i += SPACING) {
      arr.push(
        <Line
          key={`b-${i}`}
          x1={i - maxLen}
          y1={maxLen}
          x2={i + maxLen}
          y2={-maxLen}
          stroke={lineColor}
          strokeWidth={1}
        />
      );
    }
    return arr;
  }, [width, maxLen, lineColor]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} pointerEvents="none" collapsable={false}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        {linesSlash}
        {linesBackslash}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
