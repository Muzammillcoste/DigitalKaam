import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/theme';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  autoComplete?: TextInput['props']['autoComplete'];
  editable?: boolean;
  onBlur?: () => void;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  multiline,
  numberOfLines = 4,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  editable = true,
  onBlur,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          isFocused && styles.focused,
          !!error && styles.errored,
          !editable && styles.disabled,
          multiline && styles.multilineWrap,
        ]}
      >
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDisabled}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => { setIsFocused(false); onBlur?.(); }}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.base },
  label: { ...Typography.label, color: Colors.text, marginBottom: Spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
  },
  multilineWrap: { alignItems: 'flex-start', paddingVertical: Spacing.sm },
  focused: { borderColor: Colors.primary },
  errored: { borderColor: Colors.error },
  disabled: { backgroundColor: Colors.background, opacity: 0.7 },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  multilineInput: { minHeight: 80 },
  eyeBtn: { padding: Spacing.xs },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: Spacing.xs },
});
