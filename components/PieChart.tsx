import React from 'react';
import { View, StyleSheet } from 'react-native';

// Import react-native-svg với error handling
let Svg: any = null;
let Path: any = null;
let svgAvailable = false;

try {
  // Import theo cách ES6 - Expo thường hỗ trợ tốt
  const svgModule = require('react-native-svg');
  
  if (svgModule) {
    // Thử lấy Svg và Path từ module
    Svg = svgModule.default || svgModule.Svg || svgModule;
    Path = svgModule.Path;
    
    // Kiểm tra xem có phải là component không
    if (Svg && typeof Svg === 'function') {
      svgAvailable = true;
    } else if (Svg && Svg.Svg) {
      Svg = Svg.Svg;
      svgAvailable = true;
    }
  }
} catch (e) {
  console.warn('react-native-svg not available, using fallback');
  svgAvailable = false;
}

interface PieChartDataItem {
  percentage: number;
  color: string;
}

interface PieChartProps {
  data: PieChartDataItem[];
  size?: number;
  strokeWidth?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 100, strokeWidth = 16 }) => {
  const radiusOuter = size / 2;
  const radiusInner = Math.max(0, radiusOuter - strokeWidth);
  const cx = radiusOuter;
  const cy = radiusOuter;

  const total = data.reduce((sum, item) => sum + (Number.isFinite(item.percentage) ? item.percentage : 0), 0);
  const normalized =
    total > 0
      ? data.map((d) => ({ ...d, percentage: (d.percentage / total) * 100 }))
      : [];

  let currentAngle = 0;

  // Fallback nếu SVG không có - hiển thị circle đơn giản
  if (!svgAvailable || !Svg || !Path) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={[styles.emptyCircle, { width: size, height: size, borderRadius: size / 2 }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {normalized.length === 0 ? (
        <View style={[styles.emptyCircle, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <Svg width={size} height={size}>
          {normalized.map((slice, idx) => {
            const angle = (slice.percentage / 100) * 360;
            const start = currentAngle;
            const end = currentAngle + angle;
            currentAngle = end;

            // Bỏ lát quá nhỏ để tránh lỗi render
            if (angle <= 0.1) return null;

            return (
              <Path
                key={idx}
                d={arcPath(cx, cy, radiusOuter, radiusInner, start, end)}
                fill={slice.color || '#6B7280'}
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    backgroundColor: '#2A2A3E',
  },
});
