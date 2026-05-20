import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useChatStore } from '@/store/chatStore';
import { useTranslation } from '@/i18n';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatSkeleton } from '@/components/chat/ChatSkeleton';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  Typography,
  Spacing,
  useColors,
  useThemedStyles,
  type ColorPalette,
} from '@/theme';

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, isRTL } = useTranslation();
  const { messages, isTyping, isLoadingSession, sendMessage, newSession } =
    useChatStore();

  const headerDir = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LinearGradient
        colors={[c.primary, c.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top, flexDirection: headerDir }]}
      >
        <View style={[styles.headerLeft, { flexDirection: headerDir }]}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            hitSlop={10}
            style={styles.menuBtn}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </Pressable>
          <BrandLogo
            size={40}
            background="rgba(255,255,255,0.2)"
            borderColor="rgba(255,255,255,0.3)"
            style={styles.aiAvatar}
          />
          <View>
            <Text style={styles.headerTitle}>{t('chat.title')}</Text>
            {/* <Text style={styles.headerSubtitle}>{t('chat.subtitle')}</Text> */}
          </View>
        </View>
        <Pressable onPress={newSession} style={styles.newChatBtn} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.9)" />
        </Pressable>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoadingSession ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListFooterComponent={
              messages.length === 0 ? (
                <View style={styles.welcome}>
                  <View style={styles.welcomeCard}>
                    <Text
                      style={[
                        styles.welcomeText,
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {t('chat.welcome')}
                    </Text>
                  </View>
                </View>
              ) : null
            }
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
          />
        )}

        <ChatInputBar onSend={sendMessage} disabled={isTyping} />
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.base,
      paddingBottom: Spacing.md,
    },
    headerLeft: { alignItems: 'center', gap: Spacing.sm, flex: 1 },
    menuBtn: { paddingRight: Spacing.xs },
    aiAvatar: { borderRadius: 12 },
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
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: Spacing.xl,
      maxWidth: 320,
      borderWidth: 1,
      borderColor: c.border,
    },
    welcomeText: {
      ...Typography.bodyLarge,
      color: c.text,
      lineHeight: 24,
    },
  });
