import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import type { TabParamList, ChatStackParamList, BookingsStackParamList, ProfileStackParamList } from './types';

import { ChatScreen } from '@/screens/chat/ChatScreen';
import { BookingConfirmSheet } from '@/screens/chat/BookingConfirmSheet';
import { BookingsListScreen } from '@/screens/bookings/BookingsListScreen';
import { BookingDetailScreen } from '@/screens/bookings/BookingDetailScreen';
import { FeedbackScreen } from '@/screens/bookings/FeedbackScreen';
import { DisputeScreen } from '@/screens/bookings/DisputeScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { BecomeProviderScreen } from '@/screens/profile/BecomeProviderScreen';
import { ProviderDashboardScreen } from '@/screens/provider/ProviderDashboardScreen';
import { ProviderJobDetailScreen } from '@/screens/provider/ProviderJobDetailScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const ProviderTab = createBottomTabNavigator<any>();
const ProviderStack = createNativeStackNavigator<any>();

function ChatNavigator() {
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

function BookingsNavigator() {
  return (
    <BookingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <BookingsStack.Screen
        name="BookingsList"
        component={BookingsListScreen}
        options={{ title: 'My Bookings' }}
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

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <ProfileStack.Screen
        name="BecomeProfile"
        component={BecomeProviderScreen}
        options={{ title: 'Become a Provider' }}
      />
      <ProfileStack.Screen
        name="ProviderJobDetail"
        component={ProviderJobDetailScreen}
        options={{ title: 'Job Details' }}
      />
    </ProfileStack.Navigator>
  );
}

function ProviderJobsStack() {
  return (
    <ProviderStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
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
  return (
    <ProviderTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDisabled,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
            JobsTab: { focused: 'briefcase', outline: 'briefcase-outline' },
            ProfileTab: { focused: 'person', outline: 'person-outline' },
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
      <ProviderTab.Screen name="JobsTab" component={ProviderJobsStack} options={{ title: 'My Jobs' }} />
      <ProviderTab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile' }} />
    </ProviderTab.Navigator>
  );
}

export function MainNavigator() {
  const { isProviderMode } = useAuthStore();

  if (isProviderMode) {
    return <ProviderNavigator />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDisabled,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
            ChatTab: { focused: 'chatbubble-ellipses', outline: 'chatbubble-ellipses-outline' },
            BookingsTab: { focused: 'calendar', outline: 'calendar-outline' },
            ProfileTab: { focused: 'person', outline: 'person-outline' },
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
      <Tab.Screen name="ChatTab" component={ChatNavigator} options={{ title: 'Chat' }} />
      <Tab.Screen name="BookingsTab" component={BookingsNavigator} options={{ title: 'Bookings' }} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
