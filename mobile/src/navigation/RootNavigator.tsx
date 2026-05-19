import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { AuthStack } from './AuthStack';
import { MainNavigator } from './MainNavigator';

export function RootNavigator() {
  const { userId, isReady } = useAuthStore();
  // Wait for persisted language/color settings so the first paint is already
  // in the user's chosen language (no English → Urdu flash).
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  if (!isReady || !settingsHydrated) return null;

  return (
    <NavigationContainer>
      {userId ? <MainNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}
