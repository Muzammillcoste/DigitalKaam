import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { AuthStack } from './AuthStack';
import { MainNavigator } from './MainNavigator';

export function RootNavigator() {
  const { userId, isReady } = useAuthStore();

  if (!isReady) return null;

  return (
    <NavigationContainer>
      {userId ? <MainNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}
