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
const tintColorDark = '#22c55e';

/** Màu nút primary: luôn có contrast tốt (nền xanh + chữ trắng) */
export const PrimaryButtonColors = {
  light: { bg: '#16a34a', text: '#FFFFFF' },
  dark: { bg: '#22c55e', text: '#FFFFFF' },
};

/** Glass card style - xanh lá trong suốt (apply toàn app) */
export const GlassCardColors = {
  bg: 'rgba(34, 197, 94, 0.1)',
  border: 'rgba(34, 197, 94, 0.2)',
  inner: 'rgba(34, 197, 94, 0.08)',
  innerAlt: 'rgba(34, 197, 94, 0.12)',
};

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#475569',
    muted: '#64748b',
    background: '#dcfce7',
    card: '#ffffff',
    cardGlass: 'rgba(34, 197, 94, 0.04)',
    border: '#e2e8f0',
    successBorder: '#22c55e',
    success2: '#22c55e',
    tint: tintColorLight,
    primaryButtonBg: PrimaryButtonColors.light.bg,
    primaryButtonText: PrimaryButtonColors.light.text,
    icon: '#475569',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F1F5F9',
    textSecondary: '#B8BDC4',
    muted: '#94a3b8',
    background: '#0F1729',
    card: '#1A2332',
    cardGlass: 'rgba(34, 197, 94, 0.06)',
    border: 'rgba(255, 255, 255, 0.1)',
    successBorder: '#22c55e',
    success2: '#22c55e',
    tint: tintColorDark,
    primaryButtonBg: PrimaryButtonColors.dark.bg,
    primaryButtonText: PrimaryButtonColors.dark.text,
    icon: '#94a3b8',
    tabIconDefault: '#94a3b8',
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
