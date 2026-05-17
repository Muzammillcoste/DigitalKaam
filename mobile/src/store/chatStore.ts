import { create } from 'zustand';
import { chatApi } from '../../utils/api';

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

  sendMessage: (text: string) => Promise<void>;
  addMessage: (role: MessageRole, text: string) => void;
  clearChat: () => void;
  newSession: () => void;
}

const generateId = () => Math.random().toString(36).slice(2, 11);
const generateSessionId = () => `session-${Date.now()}-${generateId()}`;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: generateSessionId(),
  isTyping: false,

  addMessage: (role, text) => {
    const msg: ChatMessage = {
      id: generateId(),
      role,
      text,
      timestamp: new Date(),
    };
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
      addMessage('ai', 'Sorry, I could not connect to the service. Please try again.');
    } finally {
      set({ isTyping: false });
    }
  },

  clearChat: () => set({ messages: [] }),

  newSession: () =>
    set({ messages: [], sessionId: generateSessionId(), isTyping: false }),
}));
