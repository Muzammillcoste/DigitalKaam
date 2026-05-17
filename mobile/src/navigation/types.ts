import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

// ── Auth Stack ────────────────────────────────────────────────
export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

// ── Tab Navigator ─────────────────────────────────────────────
export type TabParamList = {
  ChatTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
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

// ── Profile Stack ─────────────────────────────────────────────
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
};

// ── Typed screen props helpers ────────────────────────────────
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type ChatScreenProps<T extends keyof ChatStackParamList> =
  NativeStackScreenProps<ChatStackParamList, T>;

export type BookingsScreenProps<T extends keyof BookingsStackParamList> =
  NativeStackScreenProps<BookingsStackParamList, T>;

export type ProfileScreenProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;
