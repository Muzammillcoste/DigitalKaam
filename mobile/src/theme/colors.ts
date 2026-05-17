export const Colors = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  accent: '#F59E0B',
  accentLight: '#FDE68A',

  background: '#F8FAFC',
  surface: '#FFFFFF',
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

  // Booking status colours
  statusConfirmed: '#4F46E5',
  statusEnRoute: '#F59E0B',
  statusArrived: '#3B82F6',
  statusInProgress: '#F97316',
  statusCompleted: '#10B981',
  statusCancelled: '#EF4444',
};

export type ColorKey = keyof typeof Colors;
