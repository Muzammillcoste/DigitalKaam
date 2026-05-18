import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function patch<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────
export const authApi = {
  register: (body: {
    full_name: string;
    phone: string;
    email: string;
    password: string;
    home_area?: string;
  }) => post<{ access_token: string; userId: string; email: string }>('/api/auth/register', body),
};

// ── Chat ────────────────────────────────────────────────────
export const chatApi = {
  send: (sessionId: string, message: string) =>
    post<{ response: string; userId: string }>('/api/chat', { sessionId, message }),
};

// ── Service (Orchestrator Pipeline) ─────────────────────────
export const api = {
  service: {
    request: (body: {
      userInput: string;
      userId: string;
      requestedDate?: string;
      requestedTime?: string;
      location?: string;
    }) => post('/api/service/request', body),
  },

  booking: {
    get: (bookingId: string) => get(`/api/booking/${bookingId}`),
    listByUser: (userId: string) => get<any[]>(`/api/booking/user/${userId}`),
    listByProvider: (providerId: string) => get<any[]>(`/api/booking/provider/${providerId}`),
    updateStatus: (
      bookingId: string,
      status: string,
      completionPhotoUrl?: string,
      sessionId?: string,
    ) => patch(`/api/booking/${bookingId}/status`, { status, completionPhotoUrl, sessionId }),
    submitFeedback: (
      bookingId: string,
      body: {
        userId: string;
        providerId: string;
        rating: number;
        reviewText?: string;
        sessionId?: string;
      },
    ) => post(`/api/booking/${bookingId}/feedback`, body),
  },

  dispute: {
    open: (body: {
      bookingId: string;
      userId: string;
      providerId: string;
      disputeType: string;
      description?: string;
      sessionId?: string;
    }) => post('/api/dispute', body),
    get: (disputeId: string) => get(`/api/dispute/${disputeId}`),
    listByUser: (userId: string) => get<any[]>(`/api/dispute/user/${userId}`),
  },

  provider: {
    list: (serviceType?: string, area?: string) => {
      const params = new URLSearchParams();
      if (serviceType) params.set('serviceType', serviceType);
      if (area) params.set('area', area);
      return get<any[]>(`/api/provider?${params.toString()}`);
    },
    get: (providerId: string) => get(`/api/provider/${providerId}`),
    getByUserId: (userId: string) => get<any>(`/api/provider/user/${userId}`),
    create: (body: {
      user_id: string;
      name: string;
      phone: string;
      email: string;
      service_type: string;
      specialization: string;
      experience_years: number;
      hourly_rate: number;
      area: string;
      skills?: string[];
    }) => post<any>('/api/provider', body),
    update: (providerId: string, body: Partial<{
      specialization: string;
      experience_years: number;
      hourly_rate: number;
      area: string;
      status: 'active' | 'inactive';
      skills: string[];
    }>) => patch<any>(`/api/provider/${providerId}`, body),
    availability: (providerId: string, date?: string) =>
      get(`/api/provider/${providerId}/availability${date ? `?date=${date}` : ''}`),
    traces: (sessionId: string) => get(`/api/provider/traces/${sessionId}`),
  },

  users: {
    getProfile: (userId: string) => get(`/api/users/${userId}`),
    update: (userId: string, body: Partial<{ full_name: string; phone: string; home_area: string }>) =>
      patch(`/api/users/${userId}`, body),
  },
};
