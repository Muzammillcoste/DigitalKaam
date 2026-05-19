import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, useThemedStyles, type ColorPalette } from '@/theme';
import { Button } from '@/components/ui/Button';
import type { ChatScreenProps } from '@/navigation/types';

export function BookingConfirmSheet({ route, navigation }: ChatScreenProps<'BookingConfirm'>) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { bookingData } = route.params;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.handle} />
      <Text style={styles.title}>Confirm Booking</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {Object.entries(bookingData).map(([key, value]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.key}>
              {key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}
            </Text>
            <Text style={styles.value}>{String(value)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          fullWidth={false}
          style={{ flex: 1 }}
        />
        <Button
          label="Confirm Booking"
          onPress={() => navigation.goBack()}
          fullWidth={false}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: Spacing.base,
    },
    title: { ...Typography.h3, color: c.text, marginBottom: Spacing.base },
    scroll: { flex: 1 },
    content: { gap: Spacing.sm, paddingBottom: Spacing.base },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    key: { ...Typography.body, color: c.textSecondary, flex: 1 },
    value: { ...Typography.body, color: c.text, fontWeight: '600', flex: 2, textAlign: 'right' },
    actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  });
