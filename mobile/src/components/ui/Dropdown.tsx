import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Typography,
  Spacing,
  Radius,
  Shadow,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { useTranslation } from '@/i18n';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label?: string;
  value: string | null;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
}

/**
 * Minimalist select control (Claude-style).
 * Renders a clean field that opens a bottom-sheet option list.
 * Replaces radio-button groups across the app.
 */
export function Dropdown({
  label,
  value,
  options,
  onSelect,
  placeholder,
  error,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { isRTL } = useTranslation();

  const selected = options.find((o) => o.value === value);
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { textAlign }]}>{label}</Text>}

      <Pressable
        style={[
          styles.field,
          { flexDirection: rowDir },
          open && styles.fieldOpen,
          !!error && styles.fieldError,
        ]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[
            styles.fieldText,
            { textAlign },
            !selected && styles.placeholder,
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder ?? ''}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={c.textSecondary}
        />
      </Pressable>

      {!!error && <Text style={[styles.errorText, { textAlign }]}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.base }]}
            onPress={() => {}}
          >
            <View style={styles.handle} />
            {label && (
              <Text style={[styles.sheetTitle, { textAlign }]}>{label}</Text>
            )}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    style={[styles.option, { flexDirection: rowDir }]}
                    onPress={() => {
                      onSelect(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { textAlign, flex: 1 },
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={c.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    wrapper: { marginBottom: Spacing.base },
    label: { ...Typography.label, color: c.text, marginBottom: Spacing.xs },
    field: {
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    fieldOpen: { borderColor: c.primary },
    fieldError: { borderColor: c.error },
    fieldText: { ...Typography.bodyLarge, color: c.text, flex: 1 },
    placeholder: { color: c.textDisabled },
    errorText: { ...Typography.caption, color: c.error, marginTop: Spacing.xs },

    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.base,
      maxHeight: '70%',
      ...Shadow.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: Radius.full,
      backgroundColor: c.border,
      marginBottom: Spacing.base,
    },
    sheetTitle: {
      ...Typography.h4,
      color: c.text,
      marginBottom: Spacing.sm,
    },
    list: { flexGrow: 0 },
    option: {
      alignItems: 'center',
      paddingVertical: Spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
      gap: Spacing.sm,
    },
    optionText: { ...Typography.bodyLarge, color: c.text },
    optionTextSelected: { color: c.primary, fontWeight: '600' },
  });
