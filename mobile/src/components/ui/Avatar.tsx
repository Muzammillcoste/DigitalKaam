import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Typography, Radius } from '@/theme';
import { initials } from '@/utils/format';

interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
  bgColor?: string;
}

export function Avatar({ name, imageUri, size = 44, bgColor = Colors.primary }: AvatarProps) {
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
        { width: size, height: size, borderRadius: radius, backgroundColor: bgColor },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.border },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  text: { color: Colors.textInverse, fontWeight: '700' },
});
