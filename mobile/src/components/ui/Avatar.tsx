import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Typography, Radius, useColors, useThemedStyles, type ColorPalette } from '@/theme';
import { initials } from '@/utils/format';

interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
  bgColor?: string;
}

export function Avatar({ name, imageUri, size = 44, bgColor }: AvatarProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const radius = size / 2;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bgColor ?? c.primary,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    image: { backgroundColor: c.border },
    fallback: { alignItems: 'center', justifyContent: 'center' },
    text: { color: c.textInverse, fontWeight: '700' },
  });
