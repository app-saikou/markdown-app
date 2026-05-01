import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import type { ColorScheme } from '../types';

export const LightColors = {
  primary: '#000000',
  primaryLight: '#F0F0F0',
  primaryDark: '#333333',

  accent: '#5E5CE6',       // AI構造化専用インディゴ
  accentLight: '#EEEEFF',

  statusDraft: '#A3A3A3',
  statusStructured: '#5E5CE6',
  statusExported: '#16A34A',

  background: '#F7F7F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F0F0',
  border: '#E8E8E8',

  textPrimary: '#0D0D0D',
  textSecondary: '#525252',
  textTertiary: '#A3A3A3',
  textOnPrimary: '#FFFFFF',

  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
} as const;

export const DarkColors = {
  primary: '#FFFFFF',
  primaryLight: '#252525',
  primaryDark: '#E0E0E0',

  accent: '#7B79F7',
  accentLight: '#1A1940',

  statusDraft: '#6B6B6B',
  statusStructured: '#7B79F7',
  statusExported: '#22C55E',

  background: '#0C0C0C',
  surface: '#1A1A1A',
  surfaceSecondary: '#222222',
  border: '#2C2C2C',

  textPrimary: '#F2F2F2',
  textSecondary: '#A3A3A3',
  textTertiary: '#555555',
  textOnPrimary: '#000000',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#F87171',
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
  xl: 20,
  full: 9999,
} as const;
