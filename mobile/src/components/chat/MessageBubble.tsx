import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/utils/format';
import type { ChatMessage } from '@/store/chatStore';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
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
          <Avatar name="DK" size={32} bgColor={Colors.primary} />
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

const styles = StyleSheet.create({
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
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
    ...Shadow.sm,
  },
  bubbleAI: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm,
    ...Shadow.sm,
  },
  text: { ...Typography.bodyLarge },
  textUser: { color: Colors.textInverse },
  textAI: { color: Colors.text },
  time: { ...Typography.caption, marginTop: 4 },
  timeUser: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  timeAI: { color: Colors.textDisabled },
});
