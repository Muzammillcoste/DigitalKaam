import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import { BookingCard } from '@/components/booking/BookingCard';
import { Spinner } from '@/components/ui/Spinner';
import {
  Typography,
  Spacing,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import type { BookingsScreenProps } from '@/navigation/types';

const TABS = [
  { label: 'Active', statuses: ['confirmed', 'en_route', 'arrived', 'in_progress'] },
  { label: 'Completed', statuses: ['completed'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
];

export function BookingsListScreen({ navigation }: BookingsScreenProps<'BookingsList'>) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { userId } = useAuthStore();
  const { bookings, isLoading, fetchBookings, refresh } = useBookingStore();
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) fetchBookings(userId);
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userId) await refresh(userId);
    setRefreshing(false);
  };

  const filtered = bookings.filter((b) =>
    TABS[activeTab].statuses.includes(b.status),
  );

  if (isLoading && bookings.length === 0) return <Spinner fullScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((tab, i) => (
          <Pressable key={tab.label} style={styles.tab} onPress={() => setActiveTab(i)}>
            <Text style={[styles.tabLabel, activeTab === i && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === i && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {TABS[activeTab].label.toLowerCase()} bookings</Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    tabs: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    tabLabel: { ...Typography.button, color: c.textSecondary },
    tabLabelActive: { color: c.primary },
    tabUnderline: {
      position: 'absolute',
      bottom: 0,
      left: 12,
      right: 12,
      height: 2,
      backgroundColor: c.primary,
      borderRadius: 1,
    },
    list: { padding: Spacing.base, gap: Spacing.sm },
    empty: { alignItems: 'center', marginTop: Spacing['3xl'] },
    emptyText: { ...Typography.body, color: c.textDisabled },
  });
