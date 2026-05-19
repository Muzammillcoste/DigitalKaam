import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../utils/api';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Typography,
  Spacing,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import type { BookingsScreenProps } from '@/navigation/types';

export function FeedbackScreen({ route, navigation }: BookingsScreenProps<'Feedback'>) {
  const { bookingId, providerId, userId } = route.params;
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useUIStore();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast('Please select a rating', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.booking.submitFeedback(bookingId, {
        userId,
        providerId,
        rating,
        reviewText: review.trim() || undefined,
      });
      showToast('Feedback submitted! Thank you.', 'success');
      navigation.goBack();
    } catch {
      showToast('Failed to submit feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>How was the service?</Text>
      <Text style={styles.sub}>Your feedback helps improve our platform</Text>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)} hitSlop={8}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? c.accent : c.border}
            />
          </Pressable>
        ))}
      </View>

      {rating > 0 && (
        <Text style={styles.ratingLabel}>
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
        </Text>
      )}

      <Input
        label="Review (Optional)"
        placeholder="Tell us about your experience..."
        value={review}
        onChangeText={setReview}
        multiline
        numberOfLines={4}
        autoCapitalize="sentences"
      />

      <Button label="Submit Feedback" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.xl, gap: Spacing.base },
    heading: { ...Typography.h3, color: c.text },
    sub: { ...Typography.body, color: c.textSecondary },
    stars: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingVertical: Spacing.base,
      justifyContent: 'center',
    },
    ratingLabel: {
      ...Typography.h4,
      color: c.accent,
      textAlign: 'center',
      marginTop: -Spacing.sm,
      marginBottom: Spacing.sm,
    },
  });
