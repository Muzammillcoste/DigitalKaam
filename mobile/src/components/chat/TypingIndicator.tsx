import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
  Typography,
  Spacing,
  Radius,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useTranslation } from '@/i18n';

function Dot({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        transform: [{ translateY }],
      }}
    />
  );
}

/**
 * Streaming/ticking indicator — shown from the moment a message is sent
 * until the AI response arrives (driven by chatStore.isTyping).
 */
export function TypingIndicator() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Avatar name="DK" size={32} bgColor={c.primary} />
      <View style={styles.bubble}>
        <View style={styles.dots}>
          <Dot delay={0} color={c.primary} />
          <Dot delay={150} color={c.primary} />
          <Dot delay={300} color={c.primary} />
        </View>
        <Text style={styles.label}>{t('chat.typing')}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: Spacing.base,
      marginBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderBottomLeftRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    dots: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    label: { ...Typography.caption, color: c.textSecondary },
  });
