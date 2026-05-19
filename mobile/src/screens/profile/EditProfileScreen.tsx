import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../utils/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useTranslation, useLocalizedInputProps } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing } from '@/theme';
import type { ProfileScreenProps } from '@/navigation/types';

export function EditProfileScreen({ navigation }: ProfileScreenProps<'EditProfile'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const langInput = useLocalizedInputProps();
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
      showToast(t('profile.nameRequired'), 'warning');
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

      showToast(t('profile.updated'), 'success');
      navigation.goBack();
    } catch {
      showToast(t('profile.updateFailed'), 'error');
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
          label={t('profile.fullName')}
          placeholder={t('profile.fullName')}
          value={form.full_name}
          onChangeText={set('full_name')}
          autoCapitalize="words"
          textAlign={langInput.textAlign}
          writingDirection={langInput.writingDirection}
        />
        <Input
          label={t('profile.phone')}
          placeholder="03XX-XXXXXXX"
          value={form.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
        />
        <Input
          label={t('profile.homeArea')}
          placeholder="e.g. Gulshan, DHA, Clifton"
          value={form.home_area}
          onChangeText={set('home_area')}
          autoCapitalize="words"
          textAlign={langInput.textAlign}
          writingDirection={langInput.writingDirection}
        />
        <Button label={t('common.save')} onPress={handleSave} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: 4 },
});
