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

export interface ProviderProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string;
  specialization: string;
  experience_years: number;
  rating: number;
  hourly_rate: number;
  area: string;
  status: 'active' | 'inactive';
}

interface AuthState {
  userId: string | null;
  token: string | null;
  profile: UserProfile | null;
  providerProfile: ProviderProfile | null;
  isProviderMode: boolean;
  isReady: boolean;

  setSession: (userId: string, token: string) => void;
  setProfile: (profile: UserProfile) => void;
  setProviderProfile: (profile: ProviderProfile | null) => void;
  toggleProviderMode: () => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  token: null,
  profile: null,
  providerProfile: null,
  isProviderMode: false,
  isReady: false,

  setSession: (userId, token) => set({ userId, token }),

  setProfile: (profile) => set({ profile }),

  setProviderProfile: (providerProfile) => set({ providerProfile }),

  toggleProviderMode: () => set((state) => ({ isProviderMode: !state.isProviderMode })),

  logout: async () => {
    await supabase.auth.signOut();
    set({ userId: null, token: null, profile: null, providerProfile: null, isProviderMode: false });
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
        set({ userId: null, token: null, profile: null, providerProfile: null, isProviderMode: false });
      }
    });
  },
}));
