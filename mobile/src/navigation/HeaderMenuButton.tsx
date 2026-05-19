import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Spacing, useColors } from '@/theme';

/**
 * Hamburger button that opens the Claude-style sidebar.
 * `DrawerActions.openDrawer()` bubbles up to the nearest drawer ancestor,
 * so this works from any screen nested inside the drawer.
 */
export function HeaderMenuButton({ color }: { color?: string }) {
  const navigation = useNavigation();
  const c = useColors();
  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      hitSlop={10}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <Ionicons name="menu" size={26} color={color ?? c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xs },
});
