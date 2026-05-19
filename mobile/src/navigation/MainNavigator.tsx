import React from 'react';
import { Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useColors, type ColorPalette } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import type {
  DrawerParamList,
  ChatStackParamList,
  BookingsStackParamList,
  SettingsStackParamList,
  ProviderTabParamList,
} from './types';
import { AppSidebar } from './AppSidebar';
import { HeaderMenuButton } from './HeaderMenuButton';

import { ChatScreen } from '@/screens/chat/ChatScreen';
import { BookingConfirmSheet } from '@/screens/chat/BookingConfirmSheet';
import { BookingsListScreen } from '@/screens/bookings/BookingsListScreen';
import { BookingDetailScreen } from '@/screens/bookings/BookingDetailScreen';
import { FeedbackScreen } from '@/screens/bookings/FeedbackScreen';
import { DisputeScreen } from '@/screens/bookings/DisputeScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { PermissionsScreen } from '@/screens/settings/PermissionsScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { BecomeProviderScreen } from '@/screens/profile/BecomeProviderScreen';
import { ProviderDashboardScreen } from '@/screens/provider/ProviderDashboardScreen';
import { ProviderJobDetailScreen } from '@/screens/provider/ProviderJobDetailScreen';

const Drawer = createDrawerNavigator<DrawerParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const ProviderTab = createBottomTabNavigator<ProviderTabParamList>();
const ProviderStack = createNativeStackNavigator<any>();

const headerOptions = (c: ColorPalette) => ({
  headerStyle: { backgroundColor: c.surface },
  headerTintColor: c.text,
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '600' as const },
});

// ── Chat (the only thing on the main screen) ──────────────────
function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="Chat" component={ChatScreen} />
      <ChatStack.Screen
        name="BookingConfirm"
        component={BookingConfirmSheet}
        options={{ presentation: 'modal' }}
      />
    </ChatStack.Navigator>
  );
}

// ── Bookings ──────────────────────────────────────────────────
function BookingsNavigator() {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <BookingsStack.Navigator screenOptions={headerOptions(c)}>
      <BookingsStack.Screen
        name="BookingsList"
        component={BookingsListScreen}
        options={{
          title: t('bookings.title'),
          headerLeft: () => <HeaderMenuButton />,
        }}
      />
      <BookingsStack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ title: 'Booking Details' }}
      />
      <BookingsStack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ title: 'Leave Feedback' }}
      />
      <BookingsStack.Screen
        name="Dispute"
        component={DisputeScreen}
        options={{ title: 'Open Dispute' }}
      />
    </BookingsStack.Navigator>
  );
}

// ── Settings (Profile now nested here) ────────────────────────
function SettingsNavigator({ withMenu = true }: { withMenu?: boolean }) {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <SettingsStack.Navigator screenOptions={headerOptions(c)}>
      <SettingsStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          headerLeft: withMenu ? () => <HeaderMenuButton /> : undefined,
        }}
      />
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
      <SettingsStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('profile.editProfile') }}
      />
      <SettingsStack.Screen
        name="BecomeProvider"
        component={BecomeProviderScreen}
        options={{ title: t('drawer.startEarning') }}
      />
      <SettingsStack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{ title: t('settings.permissions') }}
      />
      <SettingsStack.Screen
        name="ProviderJobDetail"
        component={ProviderJobDetailScreen}
        options={{ title: 'Job Details' }}
      />
    </SettingsStack.Navigator>
  );
}

// ── Customer experience: Claude-style drawer ──────────────────
function CustomerDrawer() {
  const c = useColors();
  const width = Math.min(Dimensions.get('window').width * 0.86, 360);
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppSidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width, backgroundColor: c.surface },
        sceneStyle: { backgroundColor: c.background },
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="ChatHome" component={ChatStackNavigator} />
      <Drawer.Screen name="Bookings" component={BookingsNavigator} />
      <Drawer.Screen name="SettingsRoot" component={SettingsNavigator} />
    </Drawer.Navigator>
  );
}

// ── Provider experience (unchanged structure, Settings reused) ─
function ProviderJobsStack() {
  const c = useColors();
  return (
    <ProviderStack.Navigator screenOptions={headerOptions(c)}>
      <ProviderStack.Screen
        name="ProviderDashboard"
        component={ProviderDashboardScreen}
        options={{ headerShown: false }}
      />
      <ProviderStack.Screen
        name="ProviderJobDetail"
        component={ProviderJobDetailScreen}
        options={{ title: 'Job Details' }}
      />
    </ProviderStack.Navigator>
  );
}

export function ProviderNavigator() {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <ProviderTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textDisabled,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<
            string,
            { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }
          > = {
            JobsTab: { focused: 'briefcase', outline: 'briefcase-outline' },
            SettingsTab: { focused: 'settings', outline: 'settings-outline' },
          };
          const icon = icons[route.name];
          return (
            <Ionicons
              name={focused ? icon.focused : icon.outline}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <ProviderTab.Screen
        name="JobsTab"
        component={ProviderJobsStack}
        options={{ title: 'My Jobs' }}
      />
      <ProviderTab.Screen
        name="SettingsTab"
        options={{ title: t('settings.title') }}
      >
        {() => <SettingsNavigator withMenu={false} />}
      </ProviderTab.Screen>
    </ProviderTab.Navigator>
  );
}

export function MainNavigator() {
  const { isProviderMode } = useAuthStore();
  return isProviderMode ? <ProviderNavigator /> : <CustomerDrawer />;
}
