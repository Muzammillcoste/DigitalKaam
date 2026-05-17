import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import type { ChatScreenProps } from '@/navigation/types';

export function BookingConfirmSheet({ route, navigation }: ChatScreenProps<'BookingConfirm'>) {
  const insets = useSafeAreaInsets();
  const { bookingData } = route.params;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.handle} />
      <Text style={styles.title}>Confirm Booking</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {Object.entries(bookingData).map(([key, value]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.key}>
              {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.base,
  },
  title: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.base },
  scroll: { flex: 1 },
  content: { gap: Spacing.sm, paddingBottom: Spacing.base },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  key: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  value: { ...Typography.body, color: Colors.text, fontWeight: '600', flex: 2, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
});
