import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, useColors, useThemedStyles, type ColorPalette } from '@/theme';
import { useTranslation, useLocalizedInputProps } from '@/i18n';

interface PillInputProps {
  label?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/**
 * Dynamic tag/pill input.
 * Type a value, tap "+" (or press return) → it renders as a removable pill.
 * Replaces the old comma-separated free-text Skills field.
 */
export function PillInput({ label, value, onChange, placeholder }: PillInputProps) {
  const [text, setText] = useState('');
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { isRTL } = useTranslation();
  const langInput = useLocalizedInputProps();

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const addPill = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Case-insensitive de-dupe so "Split AC" / "split ac" don't both appear.
    const exists = value.some(
      (v) => v.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!exists) onChange([...value, trimmed]);
    setText('');
  };

  const removePill = (pill: string) => {
    onChange(value.filter((v) => v !== pill));
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { textAlign: align }]}>{label}</Text>}

      <View style={[styles.inputRow, { flexDirection: rowDir }]}>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          placeholder={placeholder}
          placeholderTextColor={c.textDisabled}
          value={text}
          onChangeText={setText}
          onSubmitEditing={addPill}
          returnKeyType="done"
          blurOnSubmit={false}
          textAlign={langInput.textAlign}
          keyboardType={langInput.keyboardType}
        />
        <Pressable
          onPress={addPill}
          style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
          disabled={!text.trim()}
          hitSlop={6}
        >
          <Ionicons name="add" size={22} color={c.textInverse} />
        </Pressable>
      </View>

      {value.length > 0 && (
        <View style={[styles.pills, { flexDirection: rowDir }]}>
          {value.map((pill) => (
            <View
              key={pill}
              style={[styles.pill, { flexDirection: rowDir }]}
            >
              <Text style={styles.pillText}>{pill}</Text>
              <Pressable
                onPress={() => removePill(pill)}
                hitSlop={8}
                style={styles.pillRemove}
              >
                <Ionicons name="close" size={14} color={c.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    wrapper: { marginBottom: Spacing.base },
    label: { ...Typography.label, color: c.text, marginBottom: Spacing.xs },
    inputRow: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: Radius.lg,
      paddingLeft: Spacing.base,
      paddingRight: Spacing.xs,
      paddingVertical: Spacing.xs,
      gap: Spacing.sm,
    },
    input: {
      flex: 1,
      ...Typography.bodyLarge,
      color: c.text,
      paddingVertical: Spacing.sm,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnDisabled: { backgroundColor: c.textDisabled },
    pills: {
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
    },
    pill: {
      alignItems: 'center',
      backgroundColor: `${c.primary}14`,
      borderRadius: Radius.full,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
    },
    pillText: { ...Typography.body, color: c.primary, fontWeight: '600' },
    pillRemove: {
      width: 18,
      height: 18,
      borderRadius: Radius.full,
      backgroundColor: `${c.primary}22`,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
