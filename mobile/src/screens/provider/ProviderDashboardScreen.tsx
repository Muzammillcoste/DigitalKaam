import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { api } from '../../../utils/api';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { formatDateTime, formatPrice } from '@/utils/format';

type BookingStatus = 'confirmed' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

interface BookingItem {
  id: string;
  status: BookingStatus;
  scheduled_time: string;
  price: number;
  user_request: string;
  user_profiles: {
    full_name: string;
    phone: string;
    home_area: string;
  };
}

export function ProviderDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { providerProfile, toggleProviderMode } = useAuthStore();
  const { showToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'past'>('active');

  const fetchJobs = async () => {
    if (!providerProfile) return;
    try {
      const data = await api.booking.listByProvider(providerProfile.id);
      setBookings(data);
    } catch (err: any) {
      console.error('Failed to load jobs:', err);
      showToast('Failed to load assigned jobs', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [providerProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  // Filter bookings based on activeTab
  const getFilteredBookings = () => {
    return bookings.filter((item) => {
      if (activeTab === 'pending') {
        return item.status === 'confirmed';
      }
      if (activeTab === 'active') {
        return ['en_route', 'arrived', 'in_progress'].includes(item.status);
      }
      return ['completed', 'cancelled'].includes(item.status);
    });
  };

  const calculateStats = () => {
    const completed = bookings.filter((b) => b.status === 'completed');
    const earnings = completed.reduce((sum, b) => sum + (b.price || 0), 0);
    return {
      completedCount: completed.length,
      earnings,
    };
  };

  const getStatusDetails = (status: BookingStatus) => {
    const statusMap: Record<BookingStatus, { label: string; color: string; icon: string }> = {
      confirmed: { label: 'Assigned', color: Colors.primary, icon: 'calendar-outline' },
      en_route: { label: 'On The Way', color: Colors.warning, icon: 'bicycle-outline' },
      arrived: { label: 'Arrived', color: Colors.info, icon: 'pin-outline' },
      in_progress: { label: 'In Progress', color: '#F97316', icon: 'construct-outline' },
      completed: { label: 'Completed', color: Colors.success, icon: 'checkmark-circle-outline' },
      cancelled: { label: 'Cancelled', color: Colors.error, icon: 'close-circle-outline' },
    };
    return statusMap[status] || { label: status, color: Colors.textSecondary, icon: 'help-circle-outline' };
  };

  const stats = calculateStats();
  const filteredData = getFilteredBookings();

  return (
    <View style={styles.container}>
      {/* Header Profile Dashboard */}
      <LinearGradient
        colors={[Colors.primaryDark, '#1E1B4B']}
        style={[styles.header, { paddingTop: insets.top + Spacing.base }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.providerName}>{providerProfile?.name}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{providerProfile?.service_type}</Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.chipText}>{providerProfile?.rating || 'New'}</Text>
              </View>
            </View>
          </View>

          <Pressable style={styles.switchModeBtn} onPress={toggleProviderMode}>
            <Ionicons name="swap-horizontal" size={16} color="#fff" />
            <Text style={styles.switchModeBtnText}>Customer Mode</Text>
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.completedCount}</Text>
            <Text style={styles.statLbl}>Jobs Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{formatPrice(stats.earnings)}</Text>
            <Text style={styles.statLbl}>Total Earnings</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['pending', 'active', 'past'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.base }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={48} color={Colors.textDisabled} />
              <Text style={styles.emptyTitle}>No Jobs Found</Text>
              <Text style={styles.emptySubtitle}>
                You don't have any jobs in this tab right now. Keep your app active to receive new work!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusInfo = getStatusDetails(item.status);
            return (
              <Pressable
                style={styles.jobCard}
                onPress={() => navigation.navigate('ProviderJobDetail', { bookingId: item.id })}
              >
                <View style={styles.jobHeader}>
                  <View style={styles.jobUser}>
                    <Text style={styles.userName}>{item.user_profiles?.full_name}</Text>
                    <View style={styles.areaRow}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.areaText}>{item.user_profiles?.home_area}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}14` }]}>
                    <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                    <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.jobDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {formatDateTime(item.scheduled_time)}
                    </Text>
                  </View>
                  {item.user_request && (
                    <Text style={styles.descText} numberOfLines={2}>
                      {item.user_request}
                    </Text>
                  )}
                </View>

                <View style={styles.jobFooter}>
                  <Text style={styles.priceLbl}>Agreed Price</Text>
                  <Text style={styles.priceVal}>{formatPrice(item.price)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  providerName: { ...Typography.h3, color: '#fff' },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 4,
  },
  chipText: { ...Typography.caption, color: '#fff', fontWeight: '600' },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  switchModeBtnText: { ...Typography.caption, color: '#fff', fontWeight: '600' },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    paddingVertical: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statVal: { ...Typography.h3, color: Colors.primary },
  statLbl: { ...Typography.caption, color: Colors.textSecondary },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: Colors.primary },
  tabText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '700' },
  tabTextActive: { color: Colors.primary },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.base, gap: Spacing.base },
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobUser: { gap: 2 },
  userName: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  areaText: { ...Typography.caption, color: Colors.textSecondary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.md,
    gap: 4,
  },
  statusBadgeText: { ...Typography.caption, fontWeight: '700' },

  jobDetails: { gap: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  detailText: { ...Typography.body, color: Colors.textSecondary },
  descText: { ...Typography.body, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 2 },

  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    marginTop: 2,
  },
  priceLbl: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  priceVal: { ...Typography.bodyLarge, fontWeight: '800', color: Colors.text },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.sm, marginTop: Spacing['2xl'] },
  emptyTitle: { ...Typography.h4, color: Colors.text },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
