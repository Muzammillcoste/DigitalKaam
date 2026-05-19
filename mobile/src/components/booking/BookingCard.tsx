import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, useColors, useThemedStyles, type ColorPalette } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { formatPrice, formatDate } from '@/utils/format';
import type { Booking } from '@/store/bookingStore';

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Avatar name={booking.provider?.name ?? 'Provider'} size={44} />
        <View style={styles.headerInfo}>
          <Text style={styles.providerName} numberOfLines={1}>
            {booking.provider?.name ?? 'Service Provider'}
          </Text>
          <Text style={styles.serviceType} numberOfLines={1}>
            {booking.provider?.service_type ?? 'Service'}
          </Text>
        </View>
        <Badge status={booking.status} size="sm" />
      </View>

      <Text style={styles.request} numberOfLines={2}>
        {booking.user_request}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={c.textSecondary} />
          <Text style={styles.footerText}>{formatDate(booking.created_at)}</Text>
        </View>
        <Text style={styles.price}>{formatPrice(booking.price)}</Text>
      </View>
    </Card>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: { marginBottom: Spacing.sm },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    headerInfo: { flex: 1 },
    providerName: { ...Typography.h4, color: c.text },
    serviceType: { ...Typography.bodySmall, color: c.primary, fontWeight: '600' },
    request: {
      ...Typography.body,
      color: c.textSecondary,
      marginBottom: Spacing.sm,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { ...Typography.caption, color: c.textSecondary },
    price: { ...Typography.h4, color: c.text },
  });
