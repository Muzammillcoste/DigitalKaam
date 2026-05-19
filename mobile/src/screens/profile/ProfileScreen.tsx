import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useTranslation } from '@/i18n';
import { Avatar } from '@/components/ui/Avatar';
import {
  Typography,
  Spacing,
  Radius,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import type { ProfileScreenProps } from '@/navigation/types';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export function ProfileScreen({ navigation }: ProfileScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, isRTL } = useTranslation();
  const {
    userId,
    profile,
    setProfile,
    providerProfile,
    isProviderMode,
    toggleProviderMode,
  } = useAuthStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (userId && !profile) {
      api.users
        .getProfile(userId)
        .then((p: any) => setProfile(p))
        .catch(() => {});
    }
  }, [userId]);

  // Legacy "Notifications", "Privacy & Security" and "Help & Support" rows
  // were intentionally removed — settings now live in the Settings screen,
  // and "Become a Provider" moved to the sidebar ("Start Earning").
  const menuItems: MenuItem[] = [
    {
      icon: 'person-outline',
      label: t('profile.editProfile'),
      onPress: () => navigation.navigate('EditProfile'),
    },
    ...(providerProfile
      ? [
          {
            icon: 'swap-horizontal-outline' as const,
            label: isProviderMode
              ? t('profile.switchToCustomer')
              : t('profile.switchToProvider'),
            onPress: () => {
              toggleProviderMode();
              showToast(
                isProviderMode
                  ? t('profile.switchedToCustomer')
                  : t('profile.switchedToProvider'),
                'success',
              );
            },
          },
        ]
      : []),
  ];

  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const chevron = isRTL ? 'chevron-back' : 'chevron-forward';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing['2xl'] }}
    >
      <LinearGradient
        colors={[c.primary, c.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + Spacing.base }]}
      >
        <Avatar
          name={profile?.full_name ?? 'User'}
          size={72}
          bgColor="rgba(255,255,255,0.3)"
        />
        <Text style={styles.name}>
          {profile?.full_name ?? t('profile.welcome')}
        </Text>
        <Text style={styles.email}>{profile?.email ?? ''}</Text>
        {!!profile?.home_area && (
          <View style={[styles.areaRow, { flexDirection: rowDir }]}>
            <Ionicons
              name="location-outline"
              size={14}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.area}>{profile.home_area}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <Pressable
            key={item.label}
            style={[styles.menuItem, { flexDirection: rowDir }]}
            onPress={item.onPress}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={20} color={c.primary} />
            </View>
            <Text style={[styles.menuLabel, { textAlign: align }]}>
              {item.label}
            </Text>
            <Ionicons name={chevron} size={16} color={c.textDisabled} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      alignItems: 'center',
      paddingBottom: Spacing['2xl'],
      paddingHorizontal: Spacing.xl,
      gap: Spacing.xs,
    },
    name: { ...Typography.h3, color: '#fff', marginTop: Spacing.sm },
    email: { ...Typography.body, color: 'rgba(255,255,255,0.8)' },
    areaRow: { alignItems: 'center', gap: 4 },
    area: { ...Typography.caption, color: 'rgba(255,255,255,0.75)' },
    menu: {
      margin: Spacing.base,
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      overflow: 'hidden',
    },
    menuItem: {
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.base,
      gap: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${c.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: { ...Typography.bodyLarge, color: c.text, flex: 1 },
  });
