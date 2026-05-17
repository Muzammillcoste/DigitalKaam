import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { formatStatus, statusColor } from '@/utils/format';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function Badge({ status, size = 'md' }: BadgeProps) {
  const color = statusColor(status);

  return (
    <View style={[styles.badge, size === 'sm' && styles.badgeSm, { backgroundColor: `${color}18` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color }]}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  badgeSm: { paddingHorizontal: Spacing.xs + 2, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...Typography.label, fontSize: 12 },
  labelSm: { fontSize: 10 },
});
