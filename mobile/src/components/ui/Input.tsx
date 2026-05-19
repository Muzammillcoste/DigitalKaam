import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, useColors, useThemedStyles, type ColorPalette } from '@/theme';

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
  /** RTL support — pass from the i18n localizedInputProps helper. */
  textAlign?: TextInput['props']['textAlign'];
  writingDirection?: 'ltr' | 'rtl';
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
  textAlign,
  writingDirection,
}: InputProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
          style={[
            styles.input,
            multiline && styles.multilineInput,
            !!textAlign && { textAlign },
            !!writingDirection && { writingDirection },
          ]}
          placeholder={placeholder}
          placeholderTextColor={c.textDisabled}
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
              color={c.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    wrapper: { marginBottom: Spacing.base },
    label: { ...Typography.label, color: c.text, marginBottom: Spacing.xs },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.base,
    },
    multilineWrap: { alignItems: 'flex-start', paddingVertical: Spacing.sm },
    focused: { borderColor: c.primary },
    errored: { borderColor: c.error },
    disabled: { backgroundColor: c.background, opacity: 0.7 },
    input: {
      flex: 1,
      ...Typography.bodyLarge,
      color: c.text,
      paddingVertical: Spacing.md,
    },
    multilineInput: { minHeight: 80 },
    eyeBtn: { padding: Spacing.xs },
    errorText: { ...Typography.caption, color: c.error, marginTop: Spacing.xs },
  });
