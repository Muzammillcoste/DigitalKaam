import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import { useUIStore } from './src/store/uiStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Toast } from './src/components/ui/Toast';
import {
  registerForPushNotifications,
  addNotificationListener,
  addResponseListener,
} from './src/utils/notifications';
import { useIsDark } from './src/theme';
import { api } from './utils/api';

export default function App() {
  const { initialize, userId, setProfile, setProviderProfile, setProviderMode } =
    useAuthStore();
  const { showToast } = useUIStore();
  const isDark = useIsDark();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;

    api.users.getProfile(userId)
      .then((p: any) => setProfile(p))
      .catch(() => {});

    // GET /api/provider/me — 404 simply means "not a provider yet" (swallowed).
    // If the signed-in user IS a provider, open straight into Provider mode.
    api.provider.me()
      .then((p: any) => {
        if (p) {
          setProviderProfile(p);
          setProviderMode(true);
        }
      })
      .catch(() => {});

    registerForPushNotifications().then((token) => {
      if (token) console.log('Push token:', token);
    });

    const notifSub = addNotificationListener((n) => {
      const title = n.request.content.title;
      if (title) showToast(title, 'info');
    });

    const respSub = addResponseListener((_r) => {});

    return () => {
      notifSub.remove();
      respSub.remove();
    };
  }, [userId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
