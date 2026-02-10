import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

interface InputMethodModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InputMethodModal({ visible, onClose }: InputMethodModalProps) {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];

  const handleSelectAI = () => {
    onClose();
    router.push('/(protected)/(tabs)/ai-assistant');
  };

  const handleSelectManual = () => {
    onClose();
    router.push('/(protected)/(tabs)/manual-input');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
              {/* Header */}
              <Text style={[styles.title, { color: themeColors.text }]}>Chọn cách nhập liệu</Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                Bạn muốn nhập giao dịch bằng cách nào?
              </Text>

              {/* Options */}
              <View style={styles.optionsContainer}>
                {/* AI Assistant Option */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={handleSelectAI}
                  activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#AD46FF', '#51A2FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiGradient}>
                    <View style={styles.iconContainer}>
                      <MaterialIcons name="bolt" size={32} color="#FFFFFF" />
                    </View>
                    <Text style={styles.optionTitle}>AI Assistant</Text>
                    <Text style={styles.optionDescription}>
                      Nhập tự động bằng chat hoặc giọng nói
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Manual Input Option */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={handleSelectManual}
                  activeOpacity={0.8}>
                  <View style={[styles.manualCard, { backgroundColor: themeColors.background }]}>
                    <View style={[styles.iconContainer, styles.manualIconContainer]}>
                      <MaterialIcons name="edit" size={32} color={themeColors.tint} />
                    </View>
                    <Text style={[styles.manualOptionTitle, { color: themeColors.text }]}>Nhập thủ công</Text>
                    <Text style={[styles.manualOptionDescription, { color: themeColors.textSecondary }]}>
                      Nhập chi tiết giao dịch theo form
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}>
                <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e2939',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#99a1af',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  manualCard: {
    backgroundColor: '#2a3441',
    padding: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  manualIconContainer: {
    backgroundColor: 'rgba(81, 162, 255, 0.15)',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  manualOptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  manualOptionDescription: {
    fontSize: 14,
    color: '#99a1af',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#99a1af',
    fontWeight: '500',
  },
});
