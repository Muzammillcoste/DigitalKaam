import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Colors, Spacing } from '@/theme';

/**
 * Hamburger button that opens the Claude-style sidebar.
 * `DrawerActions.openDrawer()` bubbles up to the nearest drawer ancestor,
 * so this works from any screen nested inside the drawer.
 */
export function HeaderMenuButton({ color = Colors.text }: { color?: string }) {
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      hitSlop={10}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <Ionicons name="menu" size={26} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xs },
});
