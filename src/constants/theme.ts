/**
 * ExpFlow Design System
 * ---------------------
 * Token di design centralizzati: palette colori (light/dark), tipografia,
 * spacing e border radius. Le chiavi `text`, `background`, `backgroundElement`,
 * `backgroundSelected`, `textSecondary` sono mantenute compatibili con i
 * componenti `ThemedText`/`ThemedView` del template Expo.
 *
 * Palette di brand definita in EXPFLOW_PROMPT.md (Design System).
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Colori di brand indipendenti dal tema (usati come accenti). */
export const Brand = {
  /** Verde finanziario (trust) */
  primary: '#2E8B57',
  /** Giallo warning / highlight */
  accent: '#FFB800',
  success: '#00C853',
  error: '#D32F2F',
} as const;

export const Colors = {
  light: {
    text: '#1A1A1A',
    textSecondary: '#6C757D',
    background: '#F8F9FA',
    /** Superfici in rilievo: card, liste, input */
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7EFE9',
    border: '#E2E5E9',
    primary: Brand.primary,
    /** Testo/icone sopra il colore primario */
    onPrimary: '#FFFFFF',
    accent: Brand.accent,
    success: Brand.success,
    error: Brand.error,
    /** Tinta primaria tenue per sfondi (es. chip categoria) */
    primaryMuted: '#E3F1E9',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#A1A6B0',
    background: '#1A1A2E',
    backgroundElement: '#24243E',
    backgroundSelected: '#2E2E4E',
    border: '#33334D',
    /** Verde leggermente più chiaro per contrasto su sfondo scuro */
    primary: '#3AA76D',
    onPrimary: '#0E1F16',
    accent: Brand.accent,
    success: Brand.success,
    error: '#EF5350',
    primaryMuted: '#1F3A2C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Scala tipografica (EXPFLOW_PROMPT.md): Display 32, Heading 24,
 * Subheading 18, Body 16, Caption 14, Small 12. Font di sistema.
 */
export const Typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  heading: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  subheading: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
