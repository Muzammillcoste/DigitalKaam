import { create } from 'zustand';
import { api } from '../../utils/api';

export interface Booking {
  id: string;
  user_id: string;
  provider_id: string;
  user_request: string;
  status: string;
  price: number;
  created_at: string;
  updated_at?: string;
  provider?: {
    id: string;
    name: string;
    service_type: string;
    area: string;
    phone: string;
  };
}

interface BookingState {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;

  fetchBookings: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
}

export const useBookingStore = create<BookingState>((set) => ({
  bookings: [],
  isLoading: false,
  error: null,

  fetchBookings: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const bookings = await api.booking.listByUser(userId);
      set({ bookings: bookings ?? [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  refresh: async (userId: string) => {
    try {
      const bookings = await api.booking.listByUser(userId);
      set({ bookings: bookings ?? [] });
    } catch {
      // silent refresh failure
    }
  },
}));
