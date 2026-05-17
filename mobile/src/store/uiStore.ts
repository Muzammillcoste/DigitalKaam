import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

interface UIState {
  toast: Toast | null;
  isGlobalLoading: boolean;

  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toast: null,
  isGlobalLoading: false,

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3500);
  },

  hideToast: () => set({ toast: null }),

  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
}));
