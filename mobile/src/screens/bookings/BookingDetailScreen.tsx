import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useTranslation } from '@/i18n';
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
  Radius,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { formatDate } from '@/utils/format';
import type { BookingsScreenProps } from '@/navigation/types';

export function BookingDetailScreen({ route, navigation }: BookingsScreenProps<'BookingDetail'>) {
  const { bookingId } = route.params;
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const { userId } = useAuthStore();
  const { showToast } = useUIStore();
  const [booking, setBooking] = useState<any>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.booking.get(bookingId)
      .then((data: any) => { setBooking(data); setLoading(false); })
      .catch(() => { showToast('Failed to load booking', 'error'); setLoading(false); });
  }, [bookingId]);

  // Pull the user's reported issues so they can be viewed from the booking.
  useEffect(() => {
    if (!userId) return;
    api.dispute
      .listByUser(userId)
      .then((rows: any[]) =>
        setDisputes(
          (rows ?? []).filter((d) => d.booking_id === bookingId),
        ),
      )
      .catch(() => {/* non-fatal — section just stays empty */});
  }, [userId, bookingId]);

  if (loading) return <Spinner fullScreen />;
  if (!booking) return null;

  // Backend joins the related row as `providers` (table name); fall back to
  // `provider` for older payload shapes.
  const prov = booking.providers ?? booking.provider ?? null;
  const isActive = !['completed', 'cancelled'].includes(booking.status);
  const canFeedback = booking.status === 'completed';
  const bookingNo = String(booking.id).slice(0, 8).toUpperCase();

  const callProvider = () => {
    if (!prov?.phone) return;
    Linking.openURL(`tel:${prov.phone}`).catch(() =>
      showToast('Could not start the call', 'error'),
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Booking number + status */}
      <Card style={styles.section}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.bookingLabel}>{t('bookings.bookingNumber')}</Text>
            <Text style={styles.bookingNo}>#{bookingNo}</Text>
          </View>
          <Badge status={booking.status} />
        </View>
      </Card>

      {/* Service provider */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('bookings.serviceProvider')}</Text>
        <View style={styles.providerRow}>
          <Avatar name={prov?.name ?? t('bookings.serviceProvider')} size={52} />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>
              {prov?.name ?? t('bookings.serviceProvider')}
            </Text>
            {!!prov?.service_type && (
              <Text style={styles.serviceType}>{prov.service_type}</Text>
            )}
            {!!prov?.phone && <Text style={styles.phone}>{prov.phone}</Text>}
          </View>
          {!!prov?.phone && (
            <Pressable style={styles.callBtn} onPress={callProvider}>
              <Ionicons name="call" size={20} color={c.primary} />
            </Pressable>
          )}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('bookings.serviceRequest')}</Text>
        <Text style={styles.request}>{booking.user_request}</Text>
        <Text style={styles.meta}>
          {t('bookings.bookedOn', { date: formatDate(booking.created_at) })}
        </Text>
      </Card>

      {isActive && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('bookings.status')}</Text>
          <StatusTimeline currentStatus={booking.status} />
        </Card>
      )}

      <Card style={styles.section} padding={0}>
        <PriceBreakdown total={booking.price} />
      </Card>

      {/* Reported issues (view disputes) */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('bookings.reportedIssues')}</Text>
        {disputes.length === 0 ? (
          <Text style={styles.meta}>{t('bookings.noIssues')}</Text>
        ) : (
          disputes.map((d) => (
            <View key={d.id} style={styles.issueRow}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={c.warning}
              />
              <View style={styles.issueText}>
                <Text style={styles.issueType}>
                  {String(d.dispute_type ?? d.disputeType ?? 'issue')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (ch: string) => ch.toUpperCase())}
                </Text>
                {!!d.description && (
                  <Text style={styles.issueDesc} numberOfLines={2}>
                    {d.description}
                  </Text>
                )}
              </View>
              <Text style={styles.issueStatus}>
                {d.status ?? t('bookings.issueUnderReview')}
              </Text>
            </View>
          ))
        )}
      </Card>

      <View style={styles.actions}>
        {isActive && (
          <Button
            label={t('bookings.reportProblem')}
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
            label={t('bookings.rateService')}
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
    section: {},
    bookingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bookingLabel: {
      ...Typography.label,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bookingNo: { ...Typography.h3, color: c.text, marginTop: 2 },
    sectionTitle: { ...Typography.label, color: c.textSecondary, marginBottom: Spacing.sm },
    providerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    providerInfo: { flex: 1 },
    providerName: { ...Typography.h4, color: c.text },
    serviceType: { ...Typography.bodySmall, color: c.primary, fontWeight: '600' },
    phone: { ...Typography.caption, color: c.textSecondary, marginTop: 2 },
    callBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: `${c.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    request: { ...Typography.bodyLarge, color: c.text },
    meta: { ...Typography.caption, color: c.textDisabled, marginTop: Spacing.xs },
    issueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    issueText: { flex: 1 },
    issueType: { ...Typography.body, color: c.text, fontWeight: '600' },
    issueDesc: { ...Typography.caption, color: c.textSecondary, marginTop: 2 },
    issueStatus: {
      ...Typography.caption,
      color: c.warning,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    actions: { gap: Spacing.sm, marginTop: Spacing.sm },
  });
