import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../utils/supabase';
import { authApi } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography, Spacing, useThemedStyles, type ColorPalette } from '@/theme';
import type { AuthScreenProps } from '@/navigation/types';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { setSession } = useAuthStore();
  const { showToast } = useUIStore();

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    home_area: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Min 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Create the account via the backend (POST /api/auth/signup) — this
      // also creates the user_profiles row server-side.
      const res = await authApi.signup({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        home_area: form.home_area.trim() || undefined,
      });

      if (res.access_token && res.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
        });
        if (error) {
          showToast(error.message, 'error');
          return;
        }
        setSession(res.userId, res.access_token);
      } else {
        showToast('Account created! Please sign in.', 'success');
        navigation.navigate('Login');
      }
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      showToast(
        /already|exists|registered/i.test(msg)
          ? 'An account with this email already exists'
          : 'Registration failed. Please try again.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join DigitalKaam today</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="e.g. Ali Hassan"
            value={form.full_name}
            onChangeText={set('full_name')}
            error={errors.full_name}
            autoCapitalize="words"
          />
          <Input
            label="Phone Number"
            placeholder="03XX-XXXXXXX"
            value={form.phone}
            onChangeText={set('phone')}
            error={errors.phone}
            keyboardType="phone-pad"
          />
          <Input
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
            keyboardType="email-address"
          />
          <Input
            label="Password"
            placeholder="Min 8 characters"
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            secureTextEntry
          />
          <Input
            label="Area (Optional)"
            placeholder="e.g. Gulshan, DHA, Clifton"
            value={form.home_area}
            onChangeText={set('home_area')}
            autoCapitalize="words"
          />
          <Button label="Create Account" onPress={handleRegister} loading={loading} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: c.background,
      paddingHorizontal: Spacing.xl,
    },
    header: { marginBottom: Spacing['2xl'] },
    title: { ...Typography.h2, color: c.text, marginBottom: 4 },
    subtitle: { ...Typography.body, color: c.textSecondary },
    form: { gap: 4 },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: Spacing.xl,
    },
    footerText: { ...Typography.body, color: c.textSecondary },
    link: { ...Typography.body, color: c.primary, fontWeight: '600' },
  });
