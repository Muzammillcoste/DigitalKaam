import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, useColors, useThemedStyles, type ColorPalette } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { formatPrice, formatArea } from '@/utils/format';

export interface Provider {
  id: string;
  name: string;
  service_type: string;
  specialization?: string;
  area: string;
  hourly_rate: number;
  experience_years?: number;
  rating?: number;
  total_reviews?: number;
}

interface ProviderCardProps {
  provider: Provider;
  onSelect?: (provider: Provider) => void;
  compact?: boolean;
}

export function ProviderCard({ provider, onSelect, compact }: ProviderCardProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Avatar name={provider.name} size={compact ? 40 : 52} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
        <Text style={styles.service}>{provider.service_type}</Text>
        {!compact && (
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={c.textSecondary} />
              <Text style={styles.metaText}>{formatArea(provider.area)}</Text>
            </View>
            {provider.rating != null && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color={c.accent} />
                <Text style={styles.metaText}>{provider.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.rate}>{formatPrice(provider.hourly_rate)}</Text>
        <Text style={styles.rateLabel}>/hr</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardCompact: { padding: Spacing.sm },
    info: { flex: 1 },
    name: { ...Typography.h4, color: c.text },
    service: { ...Typography.bodySmall, color: c.primary, fontWeight: '600', marginTop: 2 },
    meta: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { ...Typography.caption, color: c.textSecondary },
    right: { alignItems: 'flex-end' },
    rate: { ...Typography.h4, color: c.text },
    rateLabel: { ...Typography.caption, color: c.textSecondary },
  });
