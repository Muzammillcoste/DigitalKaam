import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { api } from '../../../utils/api';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import type { ProfileScreenProps } from '@/navigation/types';

const AREAS = ['Gulshan', 'DHA', 'Malir', 'Saddar', 'North Nazimabad', 'Clifton', 'Korangi'];
const SERVICE_TYPES = ['Plumber', 'Electrician', 'AC Technician', 'Mechanic', 'Tutor', 'Beautician'];

export function BecomeProviderScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId, profile, setProviderProfile, toggleProviderMode } = useAuthStore();
  const { showToast } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [area, setArea] = useState(AREAS[0]);
  const [skills, setSkills] = useState('');

  const validate = () => {
    if (!specialization.trim()) {
      showToast('Specialization is required (e.g. Inverter AC Repair)', 'error');
      return false;
    }
    const exp = parseInt(experienceYears);
    if (isNaN(exp) || exp < 0) {
      showToast('Please enter a valid number for experience years', 'error');
      return false;
    }
    const rate = parseInt(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      showToast('Please enter a valid hourly rate (Rs.)', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !userId || !profile) return;
    setLoading(true);

    try {
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload = {
        user_id: userId,
        name: profile.full_name,
        phone: profile.phone,
        email: profile.email,
        service_type: serviceType,
        specialization: specialization.trim(),
        experience_years: parseInt(experienceYears),
        hourly_rate: parseInt(hourlyRate),
        area: area,
        skills: skillsArray,
      };

      const newProvider = await api.provider.create(payload);
      setProviderProfile(newProvider);
      
      showToast('Congratulations! You are now a Service Provider! 🎉', 'success');
      
      // Auto-toggle to provider mode and reset navigation
      toggleProviderMode();
    } catch (err: any) {
      console.error('Registration failed:', err);
      showToast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Spacing.base, paddingBottom: insets.bottom + Spacing['2xl'] }}
    >
      <Text style={styles.title}>Register as Provider</Text>
      <Text style={styles.subtitle}>
        Earn money by offering your professional services to customers in your area.
      </Text>

      {/* Service Type Selection */}
      <Text style={styles.label}>Select Service Type</Text>
      <View style={styles.pickerRow}>
        {SERVICE_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.pickerChip, serviceType === type && styles.pickerChipSelected]}
            onPress={() => setServiceType(type)}
          >
            <Text style={[styles.pickerChipText, serviceType === type && styles.pickerChipTextSelected]}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Specialization */}
      <Text style={styles.label}>Specialization</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Split AC Service & Installation, Engine Overhaul"
        value={specialization}
        onChangeText={setSpecialization}
        placeholderTextColor={Colors.textDisabled}
      />

      <View style={styles.formRow}>
        {/* Experience */}
        <View style={styles.flexHalf}>
          <Text style={styles.label}>Experience (Years)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5"
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textDisabled}
          />
        </View>

        {/* Hourly Rate */}
        <View style={styles.flexHalf}>
          <Text style={styles.label}>Hourly Rate (PKR)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 800"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textDisabled}
          />
        </View>
      </View>

      {/* Service Area Selection */}
      <Text style={styles.label}>Primary Service Area</Text>
      <View style={styles.pickerRow}>
        {AREAS.map((a) => (
          <Pressable
            key={a}
            style={[styles.pickerChip, area === a && styles.pickerChipSelected]}
            onPress={() => setArea(a)}
          >
            <Text style={[styles.pickerChipText, area === a && styles.pickerChipTextSelected]}>
              {a}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Skills */}
      <Text style={styles.label}>Skills (Comma-separated)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Split AC, Inverter AC, Gas leak detection"
        value={skills}
        onChangeText={setSkills}
        placeholderTextColor={Colors.textDisabled}
      />

      {/* Submit Button */}
      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.btnText}>Submit Registration</Text>
            <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { ...Typography.bodyLarge, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text, marginTop: Spacing.base, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
  },
  formRow: { flexDirection: 'row', gap: Spacing.base },
  flexHalf: { flex: 1 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginVertical: Spacing.xs },
  pickerChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pickerChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  pickerChipText: { ...Typography.body, color: Colors.textSecondary },
  pickerChipTextSelected: { color: Colors.primary, fontWeight: '600' },
  btn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
    marginTop: Spacing['2xl'],
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { ...Typography.bodyLarge, fontWeight: '600', color: '#fff' },
});
