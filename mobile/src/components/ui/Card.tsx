import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Spacing, Radius, Shadow, useThemedStyles, type ColorPalette } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  padding?: number;
  shadow?: 'sm' | 'md' | 'lg';
}

export function Card({ children, onPress, style, padding = Spacing.base, shadow = 'md' }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  if (onPress) {
    return (
      <Animated.View style={[styles.card, Shadow[shadow], { padding }, style, { transform: [{ scale }] }]}>
        <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.card, Shadow[shadow], { padding }, style]}>
      {children}
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
  });
