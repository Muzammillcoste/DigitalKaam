import { create } from 'zustand';
import { supabase } from '../../utils/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  home_area?: string;
  push_token?: string;
}

interface AuthState {
  userId: string | null;
  token: string | null;
  profile: UserProfile | null;
  isReady: boolean;

  setSession: (userId: string, token: string) => void;
  setProfile: (profile: UserProfile) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  token: null,
  profile: null,
  isReady: false,

  setSession: (userId, token) => set({ userId, token }),

  setProfile: (profile) => set({ profile }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ userId: null, token: null, profile: null });
  },

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      set({
        userId: data.session.user.id,
        token: data.session.access_token,
        isReady: true,
      });
    } else {
      set({ isReady: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({ userId: session.user.id, token: session.access_token });
      } else {
        set({ userId: null, token: null, profile: null });
      }
    });
  },
}));
