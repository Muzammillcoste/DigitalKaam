import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  type DrawerContentComponentProps,
  useDrawerStatus,
} from '@react-navigation/drawer';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useTranslation } from '@/i18n';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { initials, formatRelativeTime } from '@/utils/format';

/**
 * Claude-style sidebar:
 *   • "New Chat" + "Bookings" at the top
 *   • a scrollable "Recent Chats" list in the middle
 *   • a profile strip pinned to the very bottom (avatar · name · ⚙️)
 */
export function AppSidebar({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const { profile } = useAuthStore();
  const {
    sessions,
    sessionsLoading,
    sessionId,
    fetchSessions,
    newSession,
    loadSession,
  } = useChatStore();

  // Refresh the recent-chats list every time the sidebar is opened so
  // newly-started conversations appear without a restart.
  const drawerStatus = useDrawerStatus();
  useEffect(() => {
    if (drawerStatus === 'open') fetchSessions();
  }, [drawerStatus]);

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';
  const name = profile?.full_name ?? t('profile.welcome');

  const goChat = () => {
    navigation.navigate('ChatHome');
    navigation.closeDrawer();
  };

  const handleNewChat = () => {
    newSession();
    goChat();
  };

  const handleSelectSession = (id: string) => {
    if (id !== sessionId) loadSession(id);
    goChat();
  };

  const handleBookings = () => {
    navigation.navigate('Bookings');
    navigation.closeDrawer();
  };

  const handleSettings = () => {
    navigation.navigate('SettingsRoot');
    navigation.closeDrawer();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.base }]}>
      {/* Brand */}
      <View style={[styles.brandRow, { flexDirection: rowDir }]}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>DK</Text>
        </View>
        <Text style={styles.brandText}>{t('common.appName')}</Text>
      </View>

      {/* Primary actions */}
      <Pressable style={[styles.action, { flexDirection: rowDir }]} onPress={handleNewChat}>
        <Ionicons name="create-outline" size={20} color={Colors.text} />
        <Text style={[styles.actionText, { textAlign: align }]}>
          {t('drawer.newChat')}
        </Text>
      </Pressable>

      <Pressable style={[styles.action, { flexDirection: rowDir }]} onPress={handleBookings}>
        <Ionicons name="calendar-outline" size={20} color={Colors.text} />
        <Text style={[styles.actionText, { textAlign: align }]}>
          {t('drawer.bookings')}
        </Text>
      </Pressable>

      {/* Recent chats */}
      <Text style={[styles.sectionLabel, { textAlign: align }]}>
        {t('drawer.recentChats')}
      </Text>

      <ScrollView
        style={styles.recentList}
        contentContainerStyle={styles.recentContent}
        showsVerticalScrollIndicator={false}
      >
        {sessionsLoading && sessions.length === 0 ? (
          <ActivityIndicator
            color={Colors.primary}
            style={{ marginTop: Spacing.base }}
          />
        ) : sessions.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign: align }]}>
            {t('drawer.noRecentChats')}
          </Text>
        ) : (
          sessions.map((s) => {
            const isActive = s.session_id === sessionId;
            const title =
              s.summary?.trim()?.split('\n')[0] || t('drawer.untitledChat');
            return (
              <Pressable
                key={s.session_id}
                style={[
                  styles.recentItem,
                  { flexDirection: rowDir },
                  isActive && styles.recentItemActive,
                ]}
                onPress={() => handleSelectSession(s.session_id)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={isActive ? Colors.primary : Colors.textSecondary}
                />
                <View style={styles.recentTextWrap}>
                  <Text
                    style={[
                      styles.recentTitle,
                      { textAlign: align },
                      isActive && styles.recentTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {!!s.last_active && (
                    <Text style={[styles.recentMeta, { textAlign: align }]}>
                      {formatRelativeTime(s.last_active)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Profile strip — pinned to the bottom (Claude pattern) */}
      <Pressable
        style={[
          styles.profileStrip,
          { flexDirection: rowDir, paddingBottom: insets.bottom + Spacing.sm },
        ]}
        onPress={handleSettings}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <View style={styles.profileTextWrap}>
          <Text style={[styles.profileName, { textAlign: align }]} numberOfLines={1}>
            {name}
          </Text>
          {!!profile?.email && (
            <Text style={[styles.profileEmail, { textAlign: align }]} numberOfLines={1}>
              {profile.email}
            </Text>
          )}
        </View>
        <Pressable onPress={handleSettings} hitSlop={10} style={styles.gearBtn}>
          <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  brandRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: Colors.textInverse, fontWeight: '800', fontSize: 13 },
  brandText: { ...Typography.h4, color: Colors.text },

  action: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  actionText: { ...Typography.bodyLarge, color: Colors.text, flex: 1 },

  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  recentList: { flex: 1 },
  recentContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.base },
  emptyText: {
    ...Typography.body,
    color: Colors.textDisabled,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.base,
  },
  recentItem: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  recentItemActive: { backgroundColor: `${Colors.primary}12` },
  recentTextWrap: { flex: 1 },
  recentTitle: { ...Typography.body, color: Colors.text },
  recentTitleActive: { color: Colors.primary, fontWeight: '600' },
  recentMeta: { ...Typography.caption, color: Colors.textDisabled, marginTop: 1 },

  profileStrip: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.textInverse, fontWeight: '700', fontSize: 14 },
  profileTextWrap: { flex: 1 },
  profileName: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text },
  profileEmail: { ...Typography.caption, color: Colors.textSecondary },
  gearBtn: { padding: Spacing.xs },
});
