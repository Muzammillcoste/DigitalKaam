import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useColors, useThemedStyles, type ColorPalette } from '@/theme';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function Spinner({ size = 'large', color, fullScreen }: SpinnerProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const resolved = color ?? c.primary;

  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={resolved} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={resolved} />;
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    fullScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
  });
