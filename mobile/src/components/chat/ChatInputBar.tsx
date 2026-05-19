import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Typography,
  Spacing,
  Radius,
  Shadow,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { useLocation } from '@/hooks/useLocation';
import { useVoice } from '@/hooks/useVoice';
import { useTranslation, useLocalizedInputProps } from '@/i18n';
import { useUIStore } from '@/store/uiStore';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInputBar({ onSend, disabled }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const langInput = useLocalizedInputProps();
  const { showToast } = useUIStore();
  const { getCurrentArea, isLoading: locationLoading } = useLocation();

  const handleTranscript = (transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  };

  const { isRecording, isTranscribing, error, toggleRecording, clearError } =
    useVoice(handleTranscript);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleLocation = async () => {
    const area = await getCurrentArea();
    if (area) setText((prev) => (prev ? `${prev} ${area}` : area));
  };

  const canSend = text.trim().length > 0 && !disabled;

  // Tight, single source of bottom inset — fixes the large empty gap that
  // appeared when the bottom tab bar was replaced by the drawer.
  const bottomPad = Math.max(insets.bottom, Spacing.sm);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={[styles.bar, Shadow.sm]}>
        <TextInput
          style={[styles.input, { textAlign: langInput.textAlign }]}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={c.textDisabled}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          keyboardType={langInput.keyboardType}
          editable={!isTranscribing}
        />

        <View style={styles.actions}>
          <Pressable onPress={handleLocation} style={styles.iconBtn} disabled={locationLoading}>
            {locationLoading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Ionicons name="location-outline" size={22} color={c.textSecondary} />
            )}
          </Pressable>

          <Pressable
            onPress={toggleRecording}
            style={[styles.iconBtn, isRecording && styles.micActive]}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Ionicons
                name={isRecording ? 'mic' : 'mic-outline'}
                size={22}
                color={isRecording ? c.error : c.textSecondary}
              />
            )}
          </Pressable>

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendBtn, canSend && styles.sendBtnActive]}
          >
            <Ionicons name="send" size={18} color={canSend ? c.textInverse : c.textDisabled} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.background,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.sm,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: c.surface,
      borderRadius: Radius.xl,
      paddingLeft: Spacing.base,
      paddingRight: Spacing.xs,
      paddingVertical: Spacing.xs,
      borderWidth: 1,
      borderColor: c.border,
    },
    input: {
      flex: 1,
      ...Typography.bodyLarge,
      color: c.text,
      maxHeight: 100,
      paddingVertical: Spacing.sm,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
    },
    micActive: { backgroundColor: `${c.error}18` },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.border,
    },
    sendBtnActive: { backgroundColor: c.primary },
  });
