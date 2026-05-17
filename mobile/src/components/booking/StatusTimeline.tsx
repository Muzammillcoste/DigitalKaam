import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/theme';
import { formatStatus, statusColor } from '@/utils/format';

const STEPS = [
  { key: 'confirmed', icon: 'checkmark-circle' },
  { key: 'en_route', icon: 'car' },
  { key: 'arrived', icon: 'pin' },
  { key: 'in_progress', icon: 'build' },
  { key: 'completed', icon: 'trophy' },
] as const;

interface StatusTimelineProps {
  currentStatus: string;
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const color = isCurrent
          ? statusColor(step.key)
          : isDone
          ? Colors.success
          : Colors.border;

        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.indicator}>
              <View style={[styles.dot, { borderColor: color, backgroundColor: isDone || isCurrent ? color : 'transparent' }]}>
                {(isDone || isCurrent) && (
                  <Ionicons
                    name={isDone ? 'checkmark' : step.icon}
                    size={14}
                    color="#fff"
                  />
                )}
              </View>
              {index < STEPS.length - 1 && (
                <View style={[styles.line, { backgroundColor: isDone ? Colors.success : Colors.border }]} />
              )}
            </View>
            <Text style={[styles.label, isCurrent && { color: statusColor(step.key), fontWeight: '700' }]}>
              {formatStatus(step.key)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    minHeight: 48,
  },
  indicator: { alignItems: 'center', width: 28 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 2, flex: 1, marginTop: 2 },
  label: { ...Typography.body, color: Colors.textSecondary, paddingTop: 4 },
});
