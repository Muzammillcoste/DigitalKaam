import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { api } from '../../../utils/api';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import type { BookingsScreenProps } from '@/navigation/types';

const DISPUTE_TYPES = [
  { key: 'quality', label: 'Poor Quality', icon: '⭐' },
  { key: 'no_show', label: 'Provider No-Show', icon: '🚫' },
  { key: 'price', label: 'Price Dispute', icon: '💰' },
  { key: 'other', label: 'Other Issue', icon: '📝' },
];

export function DisputeScreen({ route, navigation }: BookingsScreenProps<'Dispute'>) {
  const { bookingId, providerId, userId } = route.params;
  const { showToast } = useUIStore();
  const [disputeType, setDisputeType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!disputeType) {
      showToast('Please select a dispute type', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.dispute.open({ bookingId, userId, providerId, disputeType, description: description.trim() || undefined });
      showToast('Dispute submitted. We will review it shortly.', 'success');
      navigation.goBack();
    } catch {
      showToast('Failed to submit dispute', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>What went wrong?</Text>
      <Text style={styles.sub}>Select the issue type to open a dispute ticket</Text>

      <View style={styles.types}>
        {DISPUTE_TYPES.map((type) => (
          <Pressable
            key={type.key}
            style={[styles.typeCard, disputeType === type.key && styles.typeCardSelected]}
            onPress={() => setDisputeType(type.key)}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <Text style={[styles.typeLabel, disputeType === type.key && styles.typeLabelSelected]}>
              {type.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Input
        label="Description (Optional)"
        placeholder="Describe the issue in detail..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        autoCapitalize="sentences"
      />

      <Button label="Submit Dispute" variant="danger" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: Spacing.base },
  heading: { ...Typography.h3, color: Colors.text },
  sub: { ...Typography.body, color: Colors.textSecondary },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeCard: {
    width: '47%',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  typeCardSelected: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  typeIcon: { fontSize: 28 },
  typeLabel: { ...Typography.body, color: Colors.text, textAlign: 'center' },
  typeLabelSelected: { color: Colors.error, fontWeight: '600' },
});
