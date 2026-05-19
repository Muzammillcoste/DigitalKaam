// ── Light palette (default) ───────────────────────────────────
export const lightColors = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  accent: '#F59E0B',
  accentLight: '#FDE68A',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  divider: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.1)',

  // Booking status colours (semantic — legible on both themes)
  statusConfirmed: '#4F46E5',
  statusEnRoute: '#F59E0B',
  statusArrived: '#3B82F6',
  statusInProgress: '#F97316',
  statusCompleted: '#10B981',
  statusCancelled: '#EF4444',
};

export type ColorPalette = typeof lightColors;

// ── Dark palette ──────────────────────────────────────────────
// Must declare every key in ColorPalette (enforced by the annotation).
export const darkColors: ColorPalette = {
  primary: '#818CF8',
  primaryLight: '#A5B4FC',
  primaryDark: '#6366F1',
  accent: '#FBBF24',
  accentLight: '#78350F',

  background: '#0B1120',
  surface: '#111827',
  surfaceAlt: '#1E293B',
  border: '#293548',
  divider: '#1E293B',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textDisabled: '#64748B',
  textInverse: '#0B1120',

  error: '#F87171',
  errorLight: '#3F1D1D',
  success: '#34D399',
  successLight: '#0E3A2F',
  warning: '#FBBF24',
  warningLight: '#3A2E0E',
  info: '#60A5FA',
  infoLight: '#1E2A45',

  overlay: 'rgba(0,0,0,0.65)',
  overlayLight: 'rgba(255,255,255,0.08)',

  statusConfirmed: '#818CF8',
  statusEnRoute: '#FBBF24',
  statusArrived: '#60A5FA',
  statusInProgress: '#FB923C',
  statusCompleted: '#34D399',
  statusCancelled: '#F87171',
};

/**
 * Static palette. Kept as the light theme for non-React modules that
 * cannot use hooks (e.g. `utils/format.ts` status colours). React
 * components must use `useColors()` / `useThemedStyles()` so they react
 * to the user's Color Mode setting.
 */
export const Colors = lightColors;

export type ColorKey = keyof ColorPalette;
