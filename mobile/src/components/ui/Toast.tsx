import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Typography,
  Spacing,
  Radius,
  Shadow,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { useUIStore, type ToastType } from '@/store/uiStore';

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

export function Toast() {
  const { toast } = useUIStore();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [toast]);

  const colorMap: Record<ToastType, string> = {
    success: c.success,
    error: c.error,
    warning: c.warning,
    info: c.info,
  };
  const color = toast ? colorMap[toast.type] : c.info;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + Spacing.sm },
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents={toast ? 'auto' : 'none'}
    >
      <View style={[styles.toast, Shadow.md]}>
        <Ionicons
          name={toast ? ICON_MAP[toast.type] : 'information-circle'}
          size={20}
          color={color}
        />
        <Text style={styles.message} numberOfLines={2}>{toast?.message ?? ''}</Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: Spacing.base,
      right: Spacing.base,
      zIndex: 9999,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    message: { ...Typography.body, color: c.text, flex: 1 },
  });
