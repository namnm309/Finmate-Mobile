import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { styles } from '@/styles/index.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ThemePreference = 'light' | 'dark' | 'system';

const options: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Sáng', icon: 'light-mode' },
  { value: 'dark', label: 'Tối', icon: 'dark-mode' },
  { value: 'system', label: 'Theo hệ thống', icon: 'settings-brightness' },
];

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { themePreference, setThemePreference, resolvedTheme } = useTheme();
  const bg = Colors[resolvedTheme].background;
  const card = Colors[resolvedTheme].card;
  const text = Colors[resolvedTheme].text;
  const textSecondary = Colors[resolvedTheme].textSecondary;
  const iconColor = Colors[resolvedTheme].icon;
  const border = Colors[resolvedTheme].border;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <View style={styles.statusBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.statusIconButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color={text} />
        </TouchableOpacity>
        <Text style={[styles.otherTitle, { color: text }]}>Giao diện</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}>
        {options.map((opt) => {
          const isSelected = themePreference === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setThemePreference(opt.value)}
              activeOpacity={0.7}
              style={[
                styles.otherMenuItem,
                {
                  backgroundColor: card,
                  borderWidth: 1,
                  borderColor: isSelected ? Colors[resolvedTheme].tint : border,
                },
              ]}>
              <View style={[styles.otherMenuItemIcon, { backgroundColor: iconColor }]}>
                <MaterialIcons name={opt.icon as any} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.otherMenuItemContent}>
                <Text style={[styles.otherMenuItemText, { color: text }]}>{opt.label}</Text>
              </View>
              {isSelected && (
                <MaterialIcons name="check-circle" size={24} color={Colors[resolvedTheme].tint} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
