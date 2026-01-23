import React from 'react';
import { View, StyleSheet } from 'react-native';

interface PieChartData {
  percentage: number;
  color: string;
}

interface SimplePieChartProps {
  data: PieChartData[];
  size?: number;
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({ 
  data, 
  size = 100
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={[styles.emptyCircle, { width: size, height: size, borderRadius: size / 2 }]} />
      </View>
    );
  }

  // Tính tổng phần trăm để đảm bảo đủ 100%
  const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0);
  const normalizedData = totalPercentage > 0 
    ? data.map(item => ({ ...item, percentage: (item.percentage / totalPercentage) * 100 }))
    : data;

  const radius = size / 2;
  let currentAngle = -90; // Bắt đầu từ trên cùng (12 giờ)

  // Tạo các phần của pie chart bằng cách vẽ các hình chữ nhật được rotate
  const slices = normalizedData.map((item, index) => {
    const angle = (item.percentage / 100) * 360;
    const rotation = currentAngle;
    
    currentAngle += angle;
    
    // Mỗi phần là một nửa hình tròn được rotate
    return (
      <View
        key={index}
        style={[
          styles.sliceContainer,
          {
            width: size,
            height: size,
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      >
        <View
          style={[
            styles.slice,
            {
              width: radius,
              height: size,
              backgroundColor: item.color,
              borderTopLeftRadius: radius,
              borderBottomLeftRadius: radius,
            },
          ]}
        />
      </View>
    );
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.chartContainer, { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }]}>
        {slices}
      </View>
      {/* Vòng tròn trong để tạo donut chart */}
      <View style={[
        styles.innerCircle, 
        { 
          width: size * 0.6, 
          height: size * 0.6, 
          borderRadius: size * 0.3,
          backgroundColor: '#111827'
        }
      ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chartContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  sliceContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  slice: {
    position: 'absolute',
    left: 0,
  },
  emptyCircle: {
    backgroundColor: '#2A2A3E',
  },
  innerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
});
