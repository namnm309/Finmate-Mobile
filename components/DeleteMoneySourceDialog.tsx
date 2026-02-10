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
          style={[styles.dialog, { backgroundColor: themeColors.card }]}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="error-outline" size={48} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: themeColors.text }]}>Xóa tài khoản</Text>
          <Text style={[styles.message, { color: themeColors.textSecondary }]}>
            Nếu bạn xóa tài khoản này, tất cả các ghi chép liên quan cũng sẽ bị xóa. Dữ liệu bị xóa sẽ không thể khôi phục lại được. Bạn có thực sự muốn xóa không?
          </Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: themeColors.border }]}
              onPress={onCancel}
              activeOpacity={0.8}>
              <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Không</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: themeColors.tint }]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text style={styles.confirmButtonText}>Có</Text>
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
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
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
    backgroundColor: '#4B5563',
    borderRadius: 12,
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
    backgroundColor: '#51A2FF',
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
