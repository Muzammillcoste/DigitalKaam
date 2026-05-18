import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../utils/api';
import { useUIStore } from '@/store/uiStore';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { formatDate, formatTime, formatPrice } from '@/utils/format';

type BookingStatus = 'confirmed' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

export function ProviderJobDetailScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const insets = useSafeAreaInsets();
  const { showToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [job, setJob] = useState<any>(null);

  const fetchJobDetails = async () => {
    try {
      const data = await api.booking.get(bookingId);
      setJob(data);
    } catch (err: any) {
      console.error('Failed to load job:', err);
      showToast('Failed to load job details', 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [bookingId]);

  const updateStatus = async (newStatus: BookingStatus) => {
    setUpdating(true);
    try {
      await api.booking.updateStatus(bookingId, newStatus);
      showToast(`Status updated to ${newStatus.replace('_', ' ')}!`, 'success');
      await fetchJobDetails();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showToast('Failed to update job status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const makeCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      showToast('Could not initiate call', 'error');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!job) return null;

  const getStatusLabel = (status: BookingStatus) => {
    const labels: Record<BookingStatus, string> = {
      confirmed: 'Job Confirmed',
      en_route: 'On the Way',
      arrived: 'Arrived at Location',
      in_progress: 'Job In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Spacing.base, paddingBottom: insets.bottom + Spacing['2xl'] }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.jobId}>Job #{job.id.slice(0, 8).toUpperCase()}</Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                job.status === 'completed'
                  ? `${Colors.success}14`
                  : job.status === 'cancelled'
                  ? `${Colors.error}14`
                  : `${Colors.primary}14`,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color:
                  job.status === 'completed'
                    ? Colors.success
                    : job.status === 'cancelled'
                    ? Colors.error
                    : Colors.primary,
              },
            ]}
          >
            {getStatusLabel(job.status)}
          </Text>
        </View>
      </View>

      {/* Customer Info Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <View style={styles.customerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{job.user_profiles?.full_name[0]}</Text>
          </View>
          <View style={styles.customerMeta}>
            <Text style={styles.customerName}>{job.user_profiles?.full_name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.locationText}>{job.user_profiles?.home_area || 'Gulshan'}</Text>
            </View>
          </View>
          {job.user_profiles?.phone && (
            <Pressable style={styles.callBtn} onPress={() => makeCall(job.user_profiles.phone)}>
              <Ionicons name="call" size={20} color={Colors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Booking Details Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Job Schedule</Text>
        <View style={styles.scheduleRow}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <View>
            <Text style={styles.scheduleVal}>{formatDate(job.scheduled_time)}</Text>
            <Text style={styles.scheduleLbl}>Scheduled Date</Text>
          </View>
        </View>
        <View style={[styles.scheduleRow, { marginTop: Spacing.base }]}>
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <View>
            <Text style={styles.scheduleVal}>{formatTime(job.scheduled_time)}</Text>
            <Text style={styles.scheduleLbl}>Scheduled Time</Text>
          </View>
        </View>
      </View>

      {/* Description Card */}
      {job.user_request && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.descText}>{job.user_request}</Text>
        </View>
      )}

      {/* Price breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Financial Breakdown</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLbl}>Service Rate</Text>
          <Text style={styles.priceVal}>{formatPrice(job.price)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.priceRow}>
          <Text style={styles.totalLbl}>Total Earnings</Text>
          <Text style={styles.totalVal}>{formatPrice(job.price)}</Text>
        </View>
      </View>

      {/* Lifecycle Actions */}
      <View style={styles.actionContainer}>
        {updating ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.base }} />
        ) : (
          <>
            {job.status === 'confirmed' && (
              <Pressable style={styles.primaryBtn} onPress={() => updateStatus('en_route')}>
                <Ionicons name="bicycle" size={20} color="#fff" />
                <Text style={styles.btnText}>Start Journey (En Route)</Text>
              </Pressable>
            )}

            {job.status === 'en_route' && (
              <Pressable style={[styles.primaryBtn, { backgroundColor: Colors.info }]} onPress={() => updateStatus('arrived')}>
                <Ionicons name="pin" size={20} color="#fff" />
                <Text style={styles.btnText}>Mark as Arrived</Text>
              </Pressable>
            )}

            {job.status === 'arrived' && (
              <Pressable style={[styles.primaryBtn, { backgroundColor: '#F97316' }]} onPress={() => updateStatus('in_progress')}>
                <Ionicons name="construct" size={20} color="#fff" />
                <Text style={styles.btnText}>Start Job Work</Text>
              </Pressable>
            )}

            {job.status === 'in_progress' && (
              <Pressable style={[styles.primaryBtn, { backgroundColor: Colors.success }]} onPress={() => updateStatus('completed')}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Mark Job Completed</Text>
              </Pressable>
            )}

            {['completed', 'cancelled'].includes(job.status) && (
              <View style={styles.completedMessage}>
                <Ionicons
                  name={job.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={job.status === 'completed' ? Colors.success : Colors.error}
                />
                <Text
                  style={[
                    styles.completedMessageText,
                    { color: job.status === 'completed' ? Colors.success : Colors.error },
                  ]}
                >
                  This job is {job.status}.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  jobId: { ...Typography.h3, color: Colors.text },
  badge: { paddingHorizontal: Spacing.base, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { ...Typography.caption, fontWeight: '700' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.base,
  },
  sectionTitle: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.base },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.h4, color: Colors.primary },
  customerMeta: { flex: 1, gap: 2 },
  customerName: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { ...Typography.body, color: Colors.textSecondary },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  scheduleVal: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text },
  scheduleLbl: { ...Typography.caption, color: Colors.textSecondary },

  descText: { ...Typography.bodyLarge, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic' },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLbl: { ...Typography.body, color: Colors.textSecondary },
  priceVal: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.base },
  totalLbl: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text },
  totalVal: { ...Typography.h3, color: Colors.primary },

  actionContainer: { marginTop: Spacing.base },
  primaryBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  btnText: { ...Typography.bodyLarge, fontWeight: '700', color: '#fff' },

  completedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.base,
  },
  completedMessageText: { ...Typography.bodyLarge, fontWeight: '600' },
});
