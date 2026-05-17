import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/theme';
import { useLocation } from '@/hooks/useLocation';
import { useVoice } from '@/hooks/useVoice';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInputBar({ onSend, disabled }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const { getCurrentArea, isLoading: locationLoading } = useLocation();

  const handleTranscript = (transcript: string) => {
    setText((t) => (t ? `${t} ${transcript}` : transcript));
  };

  const { isRecording, toggleRecording } = useVoice(handleTranscript);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleLocation = async () => {
    const area = await getCurrentArea();
    if (area) setText((t) => (t ? `${t} ${area}` : area));
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.xs }]}>
      <View style={[styles.bar, Shadow.sm]}>
        <TextInput
          style={styles.input}
          placeholder="Type or speak your request..."
          placeholderTextColor={Colors.textDisabled}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        <View style={styles.actions}>
          <Pressable onPress={handleLocation} style={styles.iconBtn} disabled={locationLoading}>
            {locationLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="location-outline" size={22} color={Colors.textSecondary} />
            )}
          </Pressable>

          <Pressable
            onPress={toggleRecording}
            style={[styles.iconBtn, isRecording && styles.micActive]}
          >
            <Ionicons
              name={isRecording ? 'mic' : 'mic-outline'}
              size={22}
              color={isRecording ? Colors.error : Colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendBtn, canSend && styles.sendBtnActive]}
          >
            <Ionicons name="send" size={18} color={canSend ? Colors.textInverse : Colors.textDisabled} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingLeft: Spacing.base,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text,
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
  micActive: { backgroundColor: `${Colors.error}18` },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.border,
  },
  sendBtnActive: { backgroundColor: Colors.primary },
});
