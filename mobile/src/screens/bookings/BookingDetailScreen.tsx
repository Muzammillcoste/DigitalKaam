import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { api } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { StatusTimeline } from '@/components/booking/StatusTimeline';
import { PriceBreakdown } from '@/components/booking/PriceBreakdown';
import {
  Typography,
  Spacing,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { formatDate } from '@/utils/format';
import type { BookingsScreenProps } from '@/navigation/types';

export function BookingDetailScreen({ route, navigation }: BookingsScreenProps<'BookingDetail'>) {
  const { bookingId } = route.params;
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useUIStore();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.booking.get(bookingId)
      .then((data: any) => { setBooking(data); setLoading(false); })
      .catch(() => { showToast('Failed to load booking', 'error'); setLoading(false); });
  }, [bookingId]);

  if (loading) return <Spinner fullScreen />;
  if (!booking) return null;

  const isActive = !['completed', 'cancelled'].includes(booking.status);
  const canFeedback = booking.status === 'completed';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.providerCard}>
        <View style={styles.providerRow}>
          <Avatar name={booking.provider?.name ?? 'Provider'} size={56} />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{booking.provider?.name ?? 'Provider'}</Text>
            <Text style={styles.serviceType}>{booking.provider?.service_type}</Text>
            {booking.provider?.phone && (
              <Text style={styles.phone}>{booking.provider.phone}</Text>
            )}
          </View>
          <Badge status={booking.status} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Service Request</Text>
        <Text style={styles.request}>{booking.user_request}</Text>
        <Text style={styles.meta}>Booked on {formatDate(booking.created_at)}</Text>
      </Card>

      {isActive && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <StatusTimeline currentStatus={booking.status} />
        </Card>
      )}

      <Card style={styles.section} padding={0}>
        <PriceBreakdown total={booking.price} />
      </Card>

      <View style={styles.actions}>
        {isActive && (
          <Button
            label="Open Dispute"
            variant="secondary"
            onPress={() =>
              navigation.navigate('Dispute', {
                bookingId: booking.id,
                providerId: booking.provider_id,
                userId: booking.user_id,
              })
            }
          />
        )}
        {canFeedback && (
          <Button
            label="Leave Feedback"
            onPress={() =>
              navigation.navigate('Feedback', {
                bookingId: booking.id,
                providerId: booking.provider_id,
                userId: booking.user_id,
              })
            }
          />
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: Spacing['3xl'] },
    providerCard: { marginBottom: 0 },
    providerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    providerInfo: { flex: 1 },
    providerName: { ...Typography.h4, color: c.text },
    serviceType: { ...Typography.bodySmall, color: c.primary, fontWeight: '600' },
    phone: { ...Typography.caption, color: c.textSecondary, marginTop: 2 },
    section: {},
    sectionTitle: { ...Typography.label, color: c.textSecondary, marginBottom: Spacing.sm },
    request: { ...Typography.bodyLarge, color: c.text },
    meta: { ...Typography.caption, color: c.textDisabled, marginTop: Spacing.xs },
    actions: { gap: Spacing.sm, marginTop: Spacing.sm },
  });
