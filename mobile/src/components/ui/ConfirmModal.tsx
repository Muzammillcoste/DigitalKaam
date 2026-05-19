import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
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

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Renders the confirm button in the error colour + a warning icon. */
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * App-themed confirmation dialog — replaces the bare OS `Alert.alert` so
 * destructive actions (logout, etc.) match the rest of the UI in both
 * light and dark mode.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const accent = destructive ? c.error : c.primary;
  const glyph = icon ?? (destructive ? 'alert-circle-outline' : 'help-circle-outline');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View
            style={[styles.iconWrap, { backgroundColor: `${accent}1A` }]}
          >
            <Ionicons name={glyph} size={28} color={accent} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: accent }]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      alignItems: 'center',
      ...Shadow.lg,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.base,
    },
    title: {
      ...Typography.h4,
      color: c.text,
      textAlign: 'center',
      marginBottom: Spacing.xs,
    },
    message: {
      ...Typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.base,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.base,
      width: '100%',
    },
    btn: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtn: {
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    cancelText: { ...Typography.button, color: c.text },
    confirmText: { ...Typography.button, color: c.textInverse },
  });
