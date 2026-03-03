/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Đồng bộ với trang Login:
 * - background: #dcfce7 (mint pastel)
 * - accent: #16a34a, #22c55e (green gradient)
 */
const tintColorLight = '#16a34a';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#101828',
    textSecondary: '#4a5565',
    muted: '#6a7282',
    background: '#dcfce7',
    card: '#ffffff',
    border: '#e5e7eb',
    successBorder: '#22c55e',
    success2: '#22c55e',
    tint: tintColorLight,
    icon: '#6a7282',
    tabIconDefault: '#6a7282',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    muted: '#9BA1A6',
    background: '#0F1729',
    card: '#1A2332',
    border: '#2d3748',
    successBorder: '#22c55e',
    success2: '#22c55e',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
