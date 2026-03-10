import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import type { ColorScheme } from '../types';

export const LightColors = {
  // iOS system blue
  primary: '#007AFF',
  primaryLight: '#E8F0FE',
  primaryDark: '#0056CC',

  accent: '#FF9500',
  accentLight: '#FFF3E0',

  statusDraft: '#8E8E93',
  statusStructured: '#007AFF',
  statusExported: '#34C759',

  // iOS grouped background
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  border: '#C6C6C8',

  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textOnPrimary: '#FFFFFF',

  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
} as const;

export const DarkColors = {
  primary: '#0A84FF',
  primaryLight: '#1C2F4A',
  primaryDark: '#409CFF',

  accent: '#FF9F0A',
  accentLight: '#3A2800',

  statusDraft: '#636366',
  statusStructured: '#0A84FF',
  statusExported: '#30D158',

  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  border: '#38383A',

  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#636366',
  textOnPrimary: '#FFFFFF',

  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
} as const;

export const Colors = LightColors;

export type AppColors = {
  readonly [K in keyof typeof LightColors]: string;
};

const ThemeContext = createContext<ColorScheme>('system');

export function ThemeProvider({
  scheme,
  children,
}: {
  scheme: ColorScheme;
  children: React.ReactNode;
}) {
  return React.createElement(ThemeContext.Provider, { value: scheme }, children);
}

export function useColors(): AppColors {
  const overrideScheme = useContext(ThemeContext);
  const systemScheme = useColorScheme();
  const effective = overrideScheme === 'system' ? systemScheme : overrideScheme;
  return effective === 'dark' ? DarkColors : LightColors;
}

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,

  lineHeightTight: 1.3,
  lineHeightBase: 1.5,
  lineHeightRelaxed: 1.7,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;
