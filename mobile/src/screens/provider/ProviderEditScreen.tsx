import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useTranslation, useLocalizedInputProps } from '@/i18n';
import { api } from '../../../utils/api';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';
import { PillInput } from '@/components/ui/PillInput';
import { Spinner } from '@/components/ui/Spinner';
import {
  Typography,
  Spacing,
  Radius,
  Shadow,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import type { ProfileScreenProps } from '@/navigation/types';

const AREAS = [
  'Gulshan',
  'DHA',
  'Malir',
  'Saddar',
  'North Nazimabad',
  'Clifton',
  'Korangi',
];

const toOptions = (items: string[]): DropdownOption[] =>
  items.map((i) => ({ label: i, value: i }));

export function ProviderEditScreen({
  navigation,
}: ProfileScreenProps<'ProviderEdit'>) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, isRTL } = useTranslation();
  const langInput = useLocalizedInputProps();
  const { providerProfile, setProviderProfile } = useAuthStore();
  const { showToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [serviceType, setServiceType] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [travelRadius, setTravelRadius] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.provider
      .me()
      .then((p: any) => {
        if (!mounted || !p) return;
        setServiceType(p.service_type ?? '');
        setSpecialization(p.specialization ?? '');
        setExperienceYears(String(p.experience_years ?? ''));
        setHourlyRate(String(p.hourly_rate ?? ''));
        setArea(p.area ?? null);
        setTravelRadius(p.travel_radius != null ? String(p.travel_radius) : '');
        setSkills(Array.isArray(p.skills) ? p.skills : []);
        setIsActive((p.status ?? 'active') === 'active');
      })
      .catch(() => showToast(t('provider.loadFailed'), 'error'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    const exp = parseInt(experienceYears, 10);
    const rate = parseInt(hourlyRate, 10);
    if (!specialization.trim()) {
      showToast(t('provider.specializationRequired'), 'warning');
      return;
    }
    if (isNaN(exp) || exp < 0) {
      showToast(t('provider.experienceInvalid'), 'warning');
      return;
    }
    if (isNaN(rate) || rate < 100 || rate > 50000) {
      showToast(t('provider.rateInvalid'), 'warning');
      return;
    }
    setSaving(true);
    try {
      const radius = parseInt(travelRadius, 10);
      const updated = await api.provider.updateMe({
        specialization: specialization.trim(),
        experience_years: exp,
        hourly_rate: rate,
        ...(area ? { area } : {}),
        skills,
        status: isActive ? 'active' : 'inactive',
        ...(isNaN(radius) ? {} : { travel_radius: radius }),
      });
      setProviderProfile(updated);
      showToast(t('provider.saveSuccess'), 'success');
      navigation.goBack();
    } catch {
      showToast(t('provider.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner fullScreen />;

  const align = isRTL ? 'right' : 'left';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          padding: Spacing.base,
          paddingBottom: insets.bottom + Spacing['5xl'],
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { textAlign: align }]}>
          {t('provider.editTitle')}
        </Text>
        <Text style={[styles.subtitle, { textAlign: align }]}>
          {t('provider.editSubtitle')}
        </Text>

        <View style={[styles.card, Shadow.sm]}>
          {!!serviceType && (
            <>
              <Text style={[styles.label, { textAlign: align }]}>
                {t('provider.serviceType')}
              </Text>
              <View style={styles.readonly}>
                <Text style={styles.readonlyText}>{serviceType}</Text>
                <Ionicons name="lock-closed" size={14} color={c.textDisabled} />
              </View>
            </>
          )}

          <Text style={[styles.label, { textAlign: align }]}>
            {t('provider.specialization')}
          </Text>
          <TextInput
            style={[styles.input, { textAlign: align }]}
            placeholder={t('provider.specializationPlaceholder')}
            value={specialization}
            onChangeText={setSpecialization}
            placeholderTextColor={c.textDisabled}
            textAlign={langInput.textAlign}
            keyboardType={langInput.keyboardType}
          />

          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.flexHalf}>
              <Text style={[styles.label, { textAlign: align }]}>
                {t('provider.experience')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('provider.experiencePlaceholder')}
                value={experienceYears}
                onChangeText={setExperienceYears}
                keyboardType="number-pad"
                placeholderTextColor={c.textDisabled}
              />
            </View>
            <View style={styles.flexHalf}>
              <Text style={[styles.label, { textAlign: align }]}>
                {t('provider.hourlyRate')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('provider.hourlyRatePlaceholder')}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="number-pad"
                placeholderTextColor={c.textDisabled}
              />
            </View>
          </View>

          <Dropdown
            label={t('provider.serviceArea')}
            placeholder={t('provider.serviceAreaPlaceholder')}
            value={area}
            options={toOptions(AREAS)}
            onSelect={setArea}
          />

          <Text style={[styles.label, { textAlign: align }]}>
            {t('provider.travelRadius')}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('provider.travelRadiusPlaceholder')}
            value={travelRadius}
            onChangeText={setTravelRadius}
            keyboardType="number-pad"
            placeholderTextColor={c.textDisabled}
          />

          <View style={{ height: Spacing.base }} />

          <PillInput
            label={t('provider.skills')}
            placeholder={t('provider.skillsPlaceholder')}
            value={skills}
            onChange={setSkills}
          />

          <View style={{ height: Spacing.base }} />

          <Text style={[styles.label, { textAlign: align }]}>
            {t('provider.statusLabel')}
          </Text>
          <Pressable
            style={[styles.statusToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setIsActive((v) => !v)}
          >
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'pause-circle'}
              size={22}
              color={isActive ? c.success : c.textSecondary}
            />
            <Text style={[styles.statusText, { textAlign: align }]}>
              {isActive
                ? t('provider.statusActive')
                : t('provider.statusInactive')}
            </Text>
            <View
              style={[
                styles.switch,
                { backgroundColor: isActive ? c.success : c.border },
              ]}
            >
              <View
                style={[
                  styles.knob,
                  isActive ? styles.knobOn : styles.knobOff,
                ]}
              />
            </View>
          </Pressable>
        </View>

        <Pressable
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>{t('common.save')}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    title: { ...Typography.h3, color: c.text },
    subtitle: {
      ...Typography.body,
      color: c.textSecondary,
      marginBottom: Spacing.base,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
    },
    label: { ...Typography.label, color: c.text, marginBottom: Spacing.xs },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      ...Typography.bodyLarge,
      color: c.text,
      marginBottom: Spacing.base,
    },
    readonly: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceAlt,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      marginBottom: Spacing.base,
    },
    readonlyText: { ...Typography.bodyLarge, color: c.textSecondary },
    row: { gap: Spacing.base },
    flexHalf: { flex: 1 },
    statusToggle: {
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.surfaceAlt,
      borderRadius: Radius.lg,
      padding: Spacing.base,
    },
    statusText: { ...Typography.body, color: c.text, flex: 1 },
    switch: {
      width: 44,
      height: 26,
      borderRadius: Radius.full,
      padding: 3,
      justifyContent: 'center',
    },
    knob: {
      width: 20,
      height: 20,
      borderRadius: Radius.full,
      backgroundColor: '#fff',
    },
    knobOn: { alignSelf: 'flex-end' },
    knobOff: { alignSelf: 'flex-start' },
    submitBtn: {
      backgroundColor: c.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.base,
      borderRadius: Radius.lg,
      gap: Spacing.sm,
      marginTop: Spacing.xl,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitText: { ...Typography.button, color: '#fff', fontSize: 16 },
  });
