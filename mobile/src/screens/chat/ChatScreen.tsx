import React, { useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { Colors, Typography, Spacing } from '@/theme';

const WELCOME_TEXT =
  'Assalam-o-Alaikum! 👋\n\nI\'m your DigitalKaam assistant. Tell me what service you need — for example:\n\n"Mera AC kharab hai, Gulshan mein kal subah mistri chahiye"\n\nor\n\n"I need a plumber in DHA today afternoon"';

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { messages, isTyping, sendMessage, newSession } = useChatStore();
  const { profile } = useAuthStore();
  const listRef = useRef<FlatList>(null);

  const handleSend = (text: string) => {
    sendMessage(text);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>DK</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>DigitalKaam AI</Text>
            <Text style={styles.headerSubtitle}>Always ready to help</Text>
          </View>
        </View>
        <Pressable onPress={newSession} style={styles.newChatBtn} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.9)" />
        </Pressable>
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        inverted
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          messages.length === 0 ? (
            <View style={styles.welcome}>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeText}>{WELCOME_TEXT}</Text>
              </View>
            </View>
          ) : null
        }
        ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
      />

      {/* Input */}
      <ChatInputBar onSend={handleSend} disabled={isTyping} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  aiAvatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  headerTitle: { ...Typography.h4, color: '#fff' },
  headerSubtitle: { ...Typography.caption, color: 'rgba(255,255,255,0.75)' },
  newChatBtn: { padding: Spacing.xs },

  listContent: { paddingTop: Spacing.base, paddingBottom: Spacing.sm },

  welcome: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
  },
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  welcomeText: {
    ...Typography.bodyLarge,
    color: Colors.text,
    lineHeight: 24,
  },
});
