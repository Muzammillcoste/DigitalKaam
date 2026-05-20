import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Renders the DigitalKaam app logo (assets/icon.png) — the single source of
 * truth for every in-app logo placement (splash, auth, chat header, AI
 * avatars). Use this anywhere the brand needs to appear so we never fall
 * back to text initials again.
 */
interface BrandLogoProps {
  size?: number;
  rounded?: boolean;
  background?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

const LOGO_SOURCE = require('../../../assets/icon.png');

export function BrandLogo({
  size = 40,
  rounded = true,
  background,
  borderColor,
  style,
  imageStyle,
  accessibilityLabel = 'DigitalKaam',
}: BrandLogoProps) {
  const borderRadius = rounded ? size * 0.28 : 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: background,
          borderWidth: borderColor ? 1 : 0,
          borderColor,
        },
        style,
      ]}
    >
      <Image
        source={LOGO_SOURCE}
        style={[
          { width: size, height: size, borderRadius },
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
        accessible
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
