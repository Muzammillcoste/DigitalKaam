import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, Animated } from 'react-native';
import { Typography, Spacing, Radius, useColors, useThemedStyles, type ColorPalette } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: object;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  style,
}: ButtonProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, style, { transform: [{ scale }] }]}>
      <Pressable
        style={[
          styles.base,
          styles[variant],
          styles[`size_${size}`],
          isDisabled && styles.disabled,
        ]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? c.textInverse : c.primary}
          />
        ) : (
          <View style={styles.row}>
            {icon && <View style={styles.iconWrap}>{icon}</View>}
            <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    fullWidth: { width: '100%' },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconWrap: { marginRight: Spacing.sm },

    base: {
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    primary: { backgroundColor: c.primary },
    secondary: {
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: c.error },

    size_sm: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md },
    size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
    size_lg: { paddingVertical: Spacing.base, paddingHorizontal: Spacing['2xl'] },

    label: { ...Typography.button, textAlign: 'center' },
    label_primary: { color: c.textInverse },
    label_secondary: { color: c.text },
    label_ghost: { color: c.primary },
    label_danger: { color: c.textInverse },

    labelSize_sm: { ...Typography.buttonSmall },
    labelSize_md: { ...Typography.button },
    labelSize_lg: { ...Typography.button, fontSize: 16 },

    disabled: { opacity: 0.5 },
  });
