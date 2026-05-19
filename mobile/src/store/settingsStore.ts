import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'ur';
export type ColorMode = 'light' | 'dark' | 'system';

interface SettingsState {
  language: Language;
  colorMode: ColorMode;
  /** True once persisted settings have been read back from storage. */
  hydrated: boolean;

  setLanguage: (language: Language) => void;
  setColorMode: (colorMode: ColorMode) => void;
  toggleLanguage: () => void;
  setHydrated: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'en',
      colorMode: 'system',
      hydrated: false,

      setLanguage: (language) => set({ language }),
      setColorMode: (colorMode) => set({ colorMode }),
      toggleLanguage: () =>
        set({ language: get().language === 'en' ? 'ur' : 'en' }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'digitalkaam-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the user's choices, never the transient hydration flag.
      partialize: (s) => ({ language: s.language, colorMode: s.colorMode }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
