import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface DeleteMoneySourceDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteMoneySourceDialog({
  visible,
  onConfirm,
  onCancel,
}: DeleteMoneySourceDialogProps) {
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const textOnTint = resolvedTheme === 'dark' ? themeColors.background : '#FFFFFF';

  const borderColor = resolvedTheme === 'dark' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(22, 163, 74, 0.25)';
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.dialog,
            {
              backgroundColor: themeColors.card,
              borderWidth: 2,
              borderColor,
            },
          ]}>
          <View style={[styles.iconContainer, { backgroundColor: resolvedTheme === 'dark' ? 'rgba(239, 68, 68, 0.9)' : '#EF4444' }]}>
            <MaterialIcons name="error-outline" size={40} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: themeColors.text }]}>Xóa tài khoản</Text>
          <Text style={[styles.message, { color: themeColors.textSecondary }]}>
            Nếu bạn xóa tài khoản này, tất cả các ghi chép liên quan cũng sẽ bị xóa. Dữ liệu bị xóa sẽ không thể khôi phục lại được. Bạn có thực sự muốn xóa không?
          </Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
              onPress={onCancel}
              activeOpacity={0.8}>
              <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Không</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: themeColors.tint }]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>Có</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
