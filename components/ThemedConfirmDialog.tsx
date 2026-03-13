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

export interface ConfirmButton {
  text: string;
  onPress: () => void;
  style?: 'cancel' | 'confirm' | 'danger';
}

interface ThemedConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'check-circle' | 'error' | 'info' | 'warning';
  buttons: ConfirmButton[];
  onRequestClose?: () => void;
}

export function ThemedConfirmDialog({
  visible,
  title,
  message,
  icon = 'info',
  buttons,
  onRequestClose,
}: ThemedConfirmDialogProps) {
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const borderColor = resolvedTheme === 'dark' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(22, 163, 74, 0.25)';

  const getIconConfig = () => {
    switch (icon) {
      case 'check-circle':
        return { name: 'check-circle' as const, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'error':
        return { name: 'error-outline' as const, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'warning':
        return { name: 'warning-amber' as const, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      default:
        return { name: 'info-outline' as const, color: themeColors.tint, bg: 'rgba(34, 197, 94, 0.15)' };
    }
  };

  const iconConfig = getIconConfig();

  const getButtonStyle = (btn: ConfirmButton) => {
    if (btn.style === 'danger') {
      return { backgroundColor: '#EF4444' };
    }
    if (btn.style === 'confirm') {
      return { backgroundColor: themeColors.tint };
    }
    return { backgroundColor: themeColors.background, borderWidth: 1, borderColor: themeColors.border };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onRequestClose}>
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
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
            <MaterialIcons name={iconConfig.name} size={36} color={iconConfig.color} />
          </View>
          <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>
          <View style={styles.buttonsRow}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.button, getButtonStyle(btn)]}
                onPress={btn.onPress}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.buttonText,
                    { color: btn.style === 'cancel' ? themeColors.text : '#FFFFFF' },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
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
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
