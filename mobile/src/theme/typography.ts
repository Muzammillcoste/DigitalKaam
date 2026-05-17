import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
})!;

export const Typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, fontFamily: fontFamily.bold },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, fontFamily: fontFamily.bold },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, fontFamily: fontFamily.semibold },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, fontFamily: fontFamily.semibold },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, fontFamily: fontFamily.regular },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, fontFamily: fontFamily.regular },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, fontFamily: fontFamily.regular },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, fontFamily: fontFamily.regular },
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, fontFamily: fontFamily.semibold },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20, fontFamily: fontFamily.semibold },
  buttonSmall: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18, fontFamily: fontFamily.semibold },
};
