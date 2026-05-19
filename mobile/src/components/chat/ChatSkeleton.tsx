import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import {
  Spacing,
  Radius,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';

/** A single shimmering placeholder bubble (left = AI, right = user). */
function SkeletonBubble({
  side,
  width,
  pulse,
}: {
  side: 'left' | 'right';
  width: number;
  pulse: Animated.Value;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.row,
        side === 'right' ? styles.rowRight : styles.rowLeft,
      ]}
    >
      {side === 'left' && <Animated.View style={[styles.avatar, { opacity: pulse }]} />}
      <Animated.View
        style={[
          styles.bubble,
          side === 'right' ? styles.bubbleRight : styles.bubbleLeft,
          { width: `${width}%`, opacity: pulse },
        ]}
      />
    </View>
  );
}

/**
 * Loading placeholder shown while a previously-saved conversation is being
 * fetched — replaces the brief flash of the old chat's messages.
 */
export function ChatSkeleton() {
  const styles = useThemedStyles(makeStyles);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <SkeletonBubble side="left" width={62} pulse={pulse} />
      <SkeletonBubble side="right" width={48} pulse={pulse} />
      <SkeletonBubble side="left" width={72} pulse={pulse} />
      <SkeletonBubble side="right" width={40} pulse={pulse} />
      <SkeletonBubble side="left" width={56} pulse={pulse} />
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.lg,
      gap: Spacing.base,
    },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
    rowLeft: { justifyContent: 'flex-start' },
    rowRight: { justifyContent: 'flex-end' },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: c.border,
    },
    bubble: {
      height: 44,
      backgroundColor: c.border,
      borderRadius: Radius.lg,
    },
    bubbleLeft: { borderBottomLeftRadius: Radius.sm },
    bubbleRight: { borderBottomRightRadius: Radius.sm },
  });
