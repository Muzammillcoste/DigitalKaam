import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import type { ProfileScreenProps } from '@/navigation/types';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export function ProfileScreen({ navigation }: ProfileScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  const { userId, profile, setProfile, logout } = useAuthStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (userId && !profile) {
      api.users.getProfile(userId)
        .then((p: any) => setProfile(p))
        .catch(() => {});
    }
  }, [userId]);

  const handleLogout = async () => {
    await logout();
    showToast('Signed out successfully', 'success');
  };

  const menuItems: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => showToast('Notifications settings coming soon', 'info'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy & Security',
      onPress: () => showToast('Privacy settings coming soon', 'info'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => showToast('Support coming soon', 'info'),
    },
    {
      icon: 'log-out-outline',
      label: 'Sign Out',
      onPress: handleLogout,
      danger: true,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + Spacing['2xl'] }}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + Spacing.base }]}
      >
        <Avatar name={profile?.full_name ?? 'User'} size={72} bgColor="rgba(255,255,255,0.3)" />
        <Text style={styles.name}>{profile?.full_name ?? 'Welcome'}</Text>
        <Text style={styles.email}>{profile?.email ?? ''}</Text>
        {profile?.home_area && (
          <View style={styles.areaRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.area}>{profile.home_area}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <Pressable key={item.label} style={styles.menuItem} onPress={item.onPress}>
            <View style={[styles.menuIcon, item.danger && styles.menuIconDanger]}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.danger ? Colors.error : Colors.primary}
              />
            </View>
            <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
              {item.label}
            </Text>
            {!item.danger && (
              <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
            )}
          </Pressable>
        ))}
      </View>

      <Text style={styles.version}>DigitalKaam v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    alignItems: 'center',
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  name: { ...Typography.h3, color: '#fff', marginTop: Spacing.sm },
  email: { ...Typography.body, color: 'rgba(255,255,255,0.8)' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  area: { ...Typography.caption, color: 'rgba(255,255,255,0.75)' },
  menu: {
    margin: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: Colors.errorLight },
  menuLabel: { ...Typography.bodyLarge, color: Colors.text, flex: 1 },
  menuLabelDanger: { color: Colors.error },
  version: { ...Typography.caption, color: Colors.textDisabled, textAlign: 'center', marginTop: Spacing.base },
});
