import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Expo Go (SDK 53+) removed remote push-notification support. Calling
 * `getExpoPushTokenAsync()` there throws/logs a hard error. Detect the Expo Go
 * runtime so we can skip push-token registration while still keeping local
 * notifications working everywhere.
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  // No remote push in Expo Go — bail out quietly (use a dev build for push).
  if (isExpoGo || !Device.isDevice) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DigitalKaam',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (err) {
    // Never let push registration crash app start-up.
    console.warn('[notifications] push registration skipped:', err);
    return null;
  }
};

export const addNotificationListener = (
  handler: (notification: Notifications.Notification) => void,
) => Notifications.addNotificationReceivedListener(handler);

export const addResponseListener = (
  handler: (response: Notifications.NotificationResponse) => void,
) => Notifications.addNotificationResponseReceivedListener(handler);
