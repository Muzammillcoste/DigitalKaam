import { useMemo } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { lightColors, darkColors, type ColorPalette } from './colors';

/**
 * Resolve the active palette from the user's Color Mode setting.
 * `system` follows the OS appearance; `light`/`dark` force a palette.
 */
export function useColors(): ColorPalette {
  const colorMode = useSettingsStore((s) => s.colorMode);
  const systemScheme = useColorScheme();

  const resolved =
    colorMode === 'system' ? (systemScheme ?? 'light') : colorMode;

  return resolved === 'dark' ? darkColors : lightColors;
}

/** True when the dark palette is active (handy for StatusBar etc.). */
export function useIsDark(): boolean {
  const colorMode = useSettingsStore((s) => s.colorMode);
  const systemScheme = useColorScheme();
  const resolved =
    colorMode === 'system' ? (systemScheme ?? 'light') : colorMode;
  return resolved === 'dark';
}

/**
 * Build a themed StyleSheet. The `factory` (defined at module scope, e.g.
 * `const makeStyles = (c) => StyleSheet.create({...})`) receives the active
 * palette and its result is memoised per-palette, so styles update when
 * Color Mode changes without re-running on every render.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ColorPalette) => T,
): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
