import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DrawerScreenProps } from '@react-navigation/drawer';

// ── Auth Stack ────────────────────────────────────────────────
export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

// ── Customer Drawer (Claude-style sidebar) ────────────────────
export type DrawerParamList = {
  ChatHome: undefined;
  Bookings: undefined;
  SettingsRoot: undefined;
};

// ── Chat Stack ────────────────────────────────────────────────
export type ChatStackParamList = {
  Chat: undefined;
  BookingConfirm: { bookingData: Record<string, any> };
};

// ── Bookings Stack ────────────────────────────────────────────
export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetail: { bookingId: string };
  Feedback: { bookingId: string; providerId: string; userId: string };
  Dispute: { bookingId: string; providerId: string; userId: string };
};

// ── Settings Stack (Profile now nested here) ──────────────────
export type SettingsStackParamList = {
  Settings: undefined;
  Profile: undefined;
  EditProfile: undefined;
  BecomeProvider: undefined;
  ProviderEdit: undefined;
  Permissions: undefined;
  ProviderJobDetail: { bookingId: string };
};

// ── Provider mode (kept on tabs) ──────────────────────────────
export type ProviderTabParamList = {
  JobsTab: undefined;
  SettingsTab: undefined;
};

// ── Typed screen-prop helpers ─────────────────────────────────
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type DrawerNavScreenProps<T extends keyof DrawerParamList> =
  DrawerScreenProps<DrawerParamList, T>;

export type ChatScreenProps<T extends keyof ChatStackParamList> =
  NativeStackScreenProps<ChatStackParamList, T>;

export type BookingsScreenProps<T extends keyof BookingsStackParamList> =
  NativeStackScreenProps<BookingsStackParamList, T>;

export type SettingsScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;

/**
 * Back-compat alias: several profile screens still import `ProfileScreenProps`.
 * Profile lives inside the Settings stack now.
 */
export type ProfileScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;
