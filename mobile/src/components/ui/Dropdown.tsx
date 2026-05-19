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
import { Colors, Typography, Spacing, Radius, Shadow } from '@/theme';
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
          color={Colors.textSecondary}
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
            // Swallow taps so pressing the sheet doesn't close it.
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
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={Colors.primary}
                      />
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

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.base },
  label: { ...Typography.label, color: Colors.text, marginBottom: Spacing.xs },
  field: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  fieldOpen: { borderColor: Colors.primary },
  fieldError: { borderColor: Colors.error },
  fieldText: { ...Typography.bodyLarge, color: Colors.text, flex: 1 },
  placeholder: { color: Colors.textDisabled },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: Spacing.xs },

  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.border,
    marginBottom: Spacing.base,
  },
  sheetTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  list: { flexGrow: 0 },
  option: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  optionText: { ...Typography.bodyLarge, color: Colors.text },
  optionTextSelected: { color: Colors.primary, fontWeight: '600' },
});
