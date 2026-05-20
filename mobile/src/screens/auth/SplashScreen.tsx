import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, useColors } from '@/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';
import type { AuthScreenProps } from '@/navigation/types';

export function SplashScreen({ navigation }: AuthScreenProps<'Splash'>) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 400);

    const timer = setTimeout(() => navigation.replace('Login'), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[c.primaryDark, c.primary, c.primaryLight]}
      style={[styles.container, { paddingBottom: insets.bottom }]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      <Animated.View
        style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        <BrandLogo
          size={96}
          background="rgba(255,255,255,0.2)"
          borderColor="rgba(255,255,255,0.4)"
          style={styles.logoCircle}
        />
        <Text style={styles.appName}>DigitalKaam</Text>
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Service at your doorstep
      </Animated.Text>

      <Animated.Text style={[styles.subTagline, { opacity: taglineOpacity }]}>
        Plumbers · Electricians · Mechanics · More
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoWrap: { alignItems: 'center', gap: 16 },
  logoCircle: { borderRadius: 28, borderWidth: 2 },
  appName: { ...Typography.h1, color: '#fff', letterSpacing: 1 },
  tagline: { ...Typography.bodyLarge, color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  subTagline: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
});
