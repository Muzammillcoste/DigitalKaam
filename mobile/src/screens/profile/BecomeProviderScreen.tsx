import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useTranslation, useLocalizedInputProps } from '@/i18n';
import { api } from '../../../utils/api';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';
import { PillInput } from '@/components/ui/PillInput';
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

// Must match backend VALID_SERVICE_TYPES (provider.routes.ts) exactly.
const SERVICE_TYPES = [
  'AC Technician',
  'Electrician',
  'Plumber',
  'Mechanic',
  'Tutor',
  'Beautician',
  'Driver',
];

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

export function BecomeProviderScreen({
  navigation,
}: ProfileScreenProps<'BecomeProvider'>) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, isRTL } = useTranslation();
  const langInput = useLocalizedInputProps();
  const { userId, profile, setProviderProfile, setProviderMode } =
    useAuthStore();
  const { showToast } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [travelRadius, setTravelRadius] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!serviceType) e.serviceType = t('provider.serviceTypePlaceholder');
    if (!specialization.trim())
      e.specialization = t('provider.specializationRequired');
    const exp = parseInt(experienceYears, 10);
    if (isNaN(exp) || exp < 0) e.experience = t('provider.experienceInvalid');
    const rate = parseInt(hourlyRate, 10);
    if (isNaN(rate) || rate < 100 || rate > 50000)
      e.hourlyRate = t('provider.rateInvalid');
    if (!area) e.area = t('provider.serviceAreaPlaceholder');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !userId || !profile || !serviceType || !area) return;
    setLoading(true);
    try {
      const radius = parseInt(travelRadius, 10);
      const { provider } = await api.provider.onboard({
        service_type: serviceType,
        specialization: specialization.trim(),
        experience_years: parseInt(experienceYears, 10),
        hourly_rate: parseInt(hourlyRate, 10),
        area,
        skills,
        ...(isNaN(radius) ? {} : { travel_radius: radius }),
      });

      setProviderProfile(provider);
      showToast(t('provider.success'), 'success');
      setProviderMode(true);
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('409') || /already.*provider/i.test(msg)) {
        showToast(t('provider.alreadyProvider'), 'error');
      } else {
        showToast(t('provider.failed'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const align = isRTL ? 'right' : 'left';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing['5xl'] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[c.primary, c.primaryDark]}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="briefcase" size={28} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>{t('provider.registerTitle')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('provider.registerSubtitle')}
          </Text>
        </LinearGradient>

        <View style={styles.form}>
          <View style={[styles.card, Shadow.sm]}>
            <Dropdown
              label={t('provider.serviceType')}
              placeholder={t('provider.serviceTypePlaceholder')}
              value={serviceType}
              options={toOptions(SERVICE_TYPES)}
              onSelect={setServiceType}
              error={errors.serviceType}
            />

            <Text style={[styles.label, { textAlign: align }]}>
              {t('provider.specialization')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { textAlign: align },
                !!errors.specialization && styles.inputError,
              ]}
              placeholder={t('provider.specializationPlaceholder')}
              value={specialization}
              onChangeText={setSpecialization}
              placeholderTextColor={c.textDisabled}
              textAlign={langInput.textAlign}
              keyboardType={langInput.keyboardType}
            />
            {!!errors.specialization && (
              <Text style={styles.errorText}>{errors.specialization}</Text>
            )}

            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.flexHalf}>
                <Text style={[styles.label, { textAlign: align }]}>
                  {t('provider.experience')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !!errors.experience && styles.inputError,
                  ]}
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
                  style={[
                    styles.input,
                    !!errors.hourlyRate && styles.inputError,
                  ]}
                  placeholder={t('provider.hourlyRatePlaceholder')}
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  keyboardType="number-pad"
                  placeholderTextColor={c.textDisabled}
                />
              </View>
            </View>
            {(!!errors.experience || !!errors.hourlyRate) && (
              <Text style={styles.errorText}>
                {errors.experience || errors.hourlyRate}
              </Text>
            )}

            <Dropdown
              label={t('provider.serviceArea')}
              placeholder={t('provider.serviceAreaPlaceholder')}
              value={area}
              options={toOptions(AREAS)}
              onSelect={setArea}
              error={errors.area}
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
          </View>

          <Pressable
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitText}>{t('provider.submit')}</Text>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={18}
                  color="#fff"
                />
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    hero: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing['2xl'],
      alignItems: 'center',
      gap: Spacing.xs,
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    heroTitle: { ...Typography.h2, color: '#fff', textAlign: 'center' },
    heroSubtitle: {
      ...Typography.body,
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
    },
    form: {
      padding: Spacing.base,
      marginTop: -Spacing.lg,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
    },
    label: {
      ...Typography.label,
      color: c.text,
      marginBottom: Spacing.xs,
    },
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
    inputError: { borderColor: c.error },
    errorText: {
      ...Typography.caption,
      color: c.error,
      marginTop: -Spacing.sm,
      marginBottom: Spacing.base,
    },
    row: { gap: Spacing.base },
    flexHalf: { flex: 1 },
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
