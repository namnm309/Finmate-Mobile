import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

/** Màu accent thống nhất với UI chatbot mới (Finmate AI) */
export const AI_ACCENT = '#16a34a';
export const AI_ACCENT_BORDER = '#22c55e';

interface AIActionButtonProps {
  label: string;
  onPress: () => void;
  /** variant: primary (xanh đặc) hoặc chip (chip nhỏ, outline nhẹ) */
  variant?: 'primary' | 'chip';
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Nút hành động AI - đồng bộ giao diện với chatbot mới.
 * Dùng cho "Hỏi AI", "Tìm hiểu thêm", "Kiểm tra chi tiêu với AI"...
 */
export function AIActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: AIActionButtonProps) {
  const isChip = variant === 'chip';
  return (
    <TouchableOpacity
      style={[
        isChip ? styles.chip : styles.primary,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}>
      <MaterialIcons
        name="auto-awesome"
        size={isChip ? 16 : 18}
        color="#FFFFFF"
      />
      <Text style={[styles.text, isChip && styles.chipText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AI_ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AI_ACCENT_BORDER,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: AI_ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AI_ACCENT_BORDER,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  chipText: {
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});
