import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography, Spacing, Radius, useThemedStyles, type ColorPalette } from '@/theme';
import { formatPrice } from '@/utils/format';

interface PriceItem {
  label: string;
  amount: number;
  isDiscount?: boolean;
}

interface PriceBreakdownProps {
  items?: PriceItem[];
  total: number;
}

export function PriceBreakdown({ items = [], total }: PriceBreakdownProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Price Breakdown</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.amount, item.isDiscount && styles.discount]}>
            {item.isDiscount ? '-' : ''}{formatPrice(item.amount)}
          </Text>
        </View>
      ))}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.surfaceAlt,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    heading: { ...Typography.label, color: c.textSecondary, marginBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { ...Typography.body, color: c.textSecondary },
    amount: { ...Typography.body, color: c.text },
    discount: { color: c.success },
    divider: { height: 1, backgroundColor: c.border },
    totalLabel: { ...Typography.h4, color: c.text },
    totalAmount: { ...Typography.h4, color: c.primary },
  });
