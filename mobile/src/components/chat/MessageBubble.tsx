import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
  Typography,
  Spacing,
  Radius,
  Shadow,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/utils/format';
import type { ChatMessage } from '@/store/chatStore';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 30 }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAI,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {!isUser && (
        <View style={styles.avatarWrap}>
          <Avatar name="DK" size={32} bgColor={c.primary} />
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
          {message.text}
        </Text>
        <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAI]}>
          {formatRelativeTime(message.timestamp.toISOString())}
        </Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.base,
    },
    rowUser: { justifyContent: 'flex-end' },
    rowAI: { justifyContent: 'flex-start' },
    avatarWrap: { marginRight: Spacing.xs, marginBottom: 4 },
    bubble: {
      maxWidth: '78%',
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    bubbleUser: {
      backgroundColor: c.primary,
      borderBottomRightRadius: Radius.sm,
      ...Shadow.sm,
    },
    bubbleAI: {
      backgroundColor: c.surface,
      borderBottomLeftRadius: Radius.sm,
      ...Shadow.sm,
    },
    text: { ...Typography.bodyLarge },
    textUser: { color: c.textInverse },
    textAI: { color: c.text },
    time: { ...Typography.caption, marginTop: 4 },
    timeUser: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
    timeAI: { color: c.textDisabled },
  });
