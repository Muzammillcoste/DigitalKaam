import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type Theme,
} from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useColors, useIsDark } from '@/theme';
import { AuthStack } from './AuthStack';
import { MainNavigator } from './MainNavigator';

export function RootNavigator() {
  const { userId, isReady } = useAuthStore();
  // Wait for persisted language/color settings so the first paint is already
  // in the user's chosen language/theme (no flash).
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const c = useColors();
  const isDark = useIsDark();

  if (!isReady || !settingsHydrated) return null;

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {userId ? <MainNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}
