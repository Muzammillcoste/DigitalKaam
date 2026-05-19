import { create } from 'zustand';
import { chatApi, type ChatSessionSummary } from '../../utils/api';
import { useSettingsStore } from './settingsStore';
import { translate } from '@/i18n';

export type MessageRole = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
}

interface ChatState {
  messages: ChatMessage[];
  sessionId: string;
  isTyping: boolean;
  /** True while a previous conversation's history is being fetched. */
  isLoadingSession: boolean;

  /** Past conversations for the "Recent Chats" sidebar list. */
  sessions: ChatSessionSummary[];
  sessionsLoading: boolean;

  sendMessage: (text: string) => Promise<void>;
  addMessage: (role: MessageRole, text: string) => void;
  clearChat: () => void;
  newSession: () => void;
  fetchSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
}

const generateId = () => Math.random().toString(36).slice(2, 11);
const generateSessionId = () => `session-${Date.now()}-${generateId()}`;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: generateSessionId(),
  isTyping: false,
  isLoadingSession: false,
  sessions: [],
  sessionsLoading: false,

  addMessage: (role, text) => {
    const msg: ChatMessage = {
      id: generateId(),
      role,
      text,
      timestamp: new Date(),
    };
    // Newest first — the chat FlatList is `inverted`.
    set((state) => ({ messages: [msg, ...state.messages] }));
  },

  sendMessage: async (text: string) => {
    const { sessionId, addMessage } = get();
    addMessage('user', text);
    set({ isTyping: true });

    try {
      const res = await chatApi.send(sessionId, text);
      addMessage('ai', res.response);
    } catch (err: any) {
      const lang = useSettingsStore.getState().language;
      addMessage('ai', translate(lang, 'chat.connectionError'));
    } finally {
      set({ isTyping: false });
    }
  },

  clearChat: () => set({ messages: [] }),

  newSession: () =>
    set({
      messages: [],
      sessionId: generateSessionId(),
      isTyping: false,
      isLoadingSession: false,
    }),

  fetchSessions: async () => {
    set({ sessionsLoading: true });
    try {
      const { sessions } = await chatApi.history();
      set({ sessions: sessions ?? [], sessionsLoading: false });
    } catch {
      // Non-fatal — the sidebar simply shows no recent chats.
      set({ sessionsLoading: false });
    }
  },

  loadSession: async (sessionId: string) => {
    // Clear the old conversation immediately and show the skeleton while the
    // selected history is fetched (no stale messages flash).
    set({ sessionId, messages: [], isTyping: false, isLoadingSession: true });
    try {
      const { messages } = await chatApi.session(sessionId);
      // API returns chronological asc; store keeps newest-first for the
      // inverted list, so reverse before mapping.
      const mapped: ChatMessage[] = [...(messages ?? [])]
        .reverse()
        .map((m) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' : 'ai',
          text: m.content,
          timestamp: new Date(m.created_at),
        }));
      set({ sessionId, messages: mapped, isLoadingSession: false });
    } catch {
      // If history can't load, start the selected session fresh rather
      // than leaving the previous conversation on screen.
      set({ sessionId, messages: [], isLoadingSession: false });
    }
  },
}));
