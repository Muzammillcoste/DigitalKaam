import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing } from '@/theme';
import type { ProfileScreenProps } from '@/navigation/types';

export function EditProfileScreen({ navigation }: ProfileScreenProps<'EditProfile'>) {
  const insets = useSafeAreaInsets();
  const { userId, profile, setProfile, providerProfile, setProviderProfile } = useAuthStore();
  const { showToast } = useUIStore();

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    home_area: profile?.home_area ?? '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      showToast('Name is required', 'warning');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      await api.users.update(userId, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        home_area: form.home_area.trim() || undefined,
      });
      setProfile({ ...profile!, ...form });

      if (providerProfile) {
        try {
          const updatedProv = await api.provider.update(providerProfile.id, {
            name: form.full_name.trim(),
          } as any);
          setProviderProfile(updatedProv);
        } catch (err) {
          console.error('Failed to sync provider name:', err);
        }
      }

      showToast('Profile updated!', 'success');
      navigation.goBack();
    } catch {
      showToast('Failed to update profile', 'error');
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
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing['2xl'] }]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Full Name"
          placeholder="Your full name"
          value={form.full_name}
          onChangeText={set('full_name')}
          autoCapitalize="words"
        />
        <Input
          label="Phone Number"
          placeholder="03XX-XXXXXXX"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
        />
        <Input
          label="Home Area"
          placeholder="e.g. Gulshan, DHA, Clifton"
          value={form.home_area}
          onChangeText={set('home_area')}
          autoCapitalize="words"
        />
        <Button label="Save Changes" onPress={handleSave} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: 4 },
});
