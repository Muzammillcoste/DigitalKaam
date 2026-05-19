import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useTranslation } from '@/i18n';
import {
  Typography,
  Spacing,
  Radius,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';

type Status = 'granted' | 'denied' | 'unknown';

interface PermissionRow {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  status: Status;
}

export function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, isRTL } = useTranslation();

  const [location, setLocation] = useState<Status>('unknown');
  const [microphone, setMicrophone] = useState<Status>('unknown');
  const [notifications, setNotifications] = useState<Status>('unknown');

  const refresh = useCallback(async () => {
    const toStatus = (granted: boolean): Status =>
      granted ? 'granted' : 'denied';

    try {
      const loc = await Location.getForegroundPermissionsAsync();
      setLocation(toStatus(loc.granted));
    } catch {
      setLocation('unknown');
    }
    try {
      const mic = await Audio.getPermissionsAsync();
      setMicrophone(toStatus(mic.granted));
    } catch {
      setMicrophone('unknown');
    }
    try {
      const notif = await Notifications.getPermissionsAsync();
      setNotifications(toStatus(notif.granted));
    } catch {
      setNotifications('unknown');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const rows: PermissionRow[] = [
    {
      key: 'location',
      icon: 'location-outline',
      title: t('settings.permissions.location'),
      desc: t('settings.permissions.locationDesc'),
      status: location,
    },
    {
      key: 'microphone',
      icon: 'mic-outline',
      title: t('settings.permissions.microphone'),
      desc: t('settings.permissions.microphoneDesc'),
      status: microphone,
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      title: t('settings.permissions.notifications'),
      desc: t('settings.permissions.notificationsDesc'),
      status: notifications,
    },
  ];

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const statusColor = (s: Status) =>
    s === 'granted' ? c.success : s === 'denied' ? c.error : c.textDisabled;
  const statusText = (s: Status) =>
    s === 'granted'
      ? t('settings.permissions.granted')
      : s === 'denied'
      ? t('settings.permissions.denied')
      : '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: Spacing.base,
        paddingBottom: insets.bottom + Spacing['2xl'],
      }}
    >
      <View style={styles.group}>
        {rows.map((r) => (
          <View key={r.key} style={[styles.row, { flexDirection: rowDir }]}>
            <View style={styles.rowIcon}>
              <Ionicons name={r.icon} size={20} color={c.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { textAlign: align }]}>
                {r.title}
              </Text>
              <Text style={[styles.rowDesc, { textAlign: align }]}>
                {r.desc}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: `${statusColor(r.status)}1A` },
              ]}
            >
              <Text style={[styles.badgeText, { color: statusColor(r.status) }]}>
                {statusText(r.status)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.settingsBtn, { flexDirection: rowDir }]}
        onPress={() => Linking.openSettings()}
      >
        <Ionicons name="open-outline" size={18} color={c.primary} />
        <Text style={styles.settingsBtnText}>
          {t('settings.permissions.openSettings')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    group: {
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      overflow: 'hidden',
    },
    row: {
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.base,
      gap: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: `${c.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    rowTitle: { ...Typography.bodyLarge, color: c.text },
    rowDesc: { ...Typography.caption, color: c.textSecondary, marginTop: 2 },
    badge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.full,
    },
    badgeText: { ...Typography.caption, fontWeight: '700' },
    settingsBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    settingsBtnText: { ...Typography.button, color: c.primary },
  });
