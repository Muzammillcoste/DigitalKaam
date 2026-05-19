import { supabase } from './supabase';

/**
 * API client for the DigitalKaam backend.
 *
 * Endpoint surface kept in sync with `backend/api-tests.http` and the
 * Express route files under `backend/src/routes/*`.
 *
 * Auth: the access token is read from the live Supabase session on every
 * request, so it always reflects the current (auto-refreshed) session.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const refresh = data.session?.refresh_token;
  return {
    'Content-Type': 'application/json',
    // Backend middleware can auto-refresh mid-conversation using this header.
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(refresh ? { 'X-Refresh-Token': refresh } : {}),
  };
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  // 204 No Content (DELETE routes) — nothing to parse.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: await authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return parse<T>(res);
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: object) => request<T>('POST', path, body);
const patch = <T>(path: string, body: object) => request<T>('PATCH', path, body);
const put = <T>(path: string, body: object) => request<T>('PUT', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

// ── Shared response shapes ──────────────────────────────────
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  userId: string;
  email: string;
  full_name?: string;
  isProvider?: boolean;
  providerId?: string | null;
  providerStatus?: string | null;
}

export interface ChatSessionSummary {
  session_id: string;
  summary: string;
  turn_count: number;
  last_active: string;
}

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ── Auth ────────────────────────────────────────────────────
// Mirrors backend/src/routes/auth.routes.ts
export const authApi = {
  /** POST /api/auth/signup — creates auth user + user_profiles row. Password must be >= 8 chars. */
  signup: (body: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    home_area?: string;
  }) => post<AuthTokens>('/api/auth/signup', body),

  /** POST /api/auth/login */
  login: (body: { email: string; password: string }) =>
    post<AuthTokens>('/api/auth/login', body),

  /** POST /api/auth/refresh — refresh_token is single-use; always store the returned one. */
  refresh: (refresh_token: string) =>
    post<Omit<AuthTokens, 'userId' | 'email'>>('/api/auth/refresh', { refresh_token }),

  /** POST /api/auth/logout — revokes the current session (requires Authorization). */
  logout: () => post<{ message: string }>('/api/auth/logout', {}),

  /** POST /api/auth/profile/sync — MUST be called after OAuth sign-in. Safe to call repeatedly. */
  syncProfile: (body: { full_name?: string; phone?: string; home_area?: string }) =>
    post<{ userId: string; email: string; full_name: string; isNewUser: boolean }>(
      '/api/auth/profile/sync',
      body,
    ),
};

// ── Chat ────────────────────────────────────────────────────
// Mirrors backend/src/routes/chat.routes.ts
export const chatApi = {
  /** POST /api/chat — main conversational endpoint. */
  send: (sessionId: string, message: string) =>
    post<{ response: string; userId: string; turnCount: number; summarizedAt: number | null }>(
      '/api/chat',
      { sessionId, message },
    ),

  /** GET /api/chat/history?sessionId=… — full message history for one session. */
  session: (sessionId: string) =>
    get<{
      sessionId: string;
      messages: ChatHistoryMessage[];
      summary: string;
      turnCount: number;
      bookingIds: string[];
    }>(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`),

  /** GET /api/chat/history — all past sessions for the logged-in user. */
  history: () => get<{ sessions: ChatSessionSummary[] }>('/api/chat/history'),

  /** POST /api/chat/transcribe — audio → text only. */
  transcribe: (audio: string, mimeType: string) =>
    post<{ transcription: string }>('/api/chat/transcribe', { audio, mimeType }),

  /** POST /api/chat/voice — transcribe + run through orchestrator in one call. */
  voice: (audio: string, mimeType: string, sessionId: string) =>
    post<{ transcription: string; response: string; userId: string; turnCount: number }>(
      '/api/chat/voice',
      { audio, mimeType, sessionId },
    ),
};

// ── Everything else ─────────────────────────────────────────
export const api = {
  // service (legacy Antigravity pipeline)
  service: {
    request: (body: {
      userInput: string;
      userId: string;
      requestedDate?: string;
      requestedTime?: string;
      location?: string;
    }) => post('/api/service/request', body),
  },

  // bookings — mirrors backend/src/routes/booking.routes.ts (all require auth)
  booking: {
    get: (bookingId: string) => get<any>(`/api/booking/${bookingId}`),
    /** GET /api/booking/user/me — bookings for the authenticated user. */
    listByUser: (_userId?: string) => get<any[]>('/api/booking/user/me'),
    listByProvider: (providerId: string) =>
      get<any[]>(`/api/booking/provider/${providerId}`),
    create: (body: {
      user_id: string;
      provider_id: string;
      session_id?: string;
      user_request: string;
      status?: string;
      scheduled_time?: string;
      price?: number;
      duration_hours?: number;
    }) => post<any>('/api/booking', body),
    update: (bookingId: string, body: Record<string, any>) =>
      patch<any>(`/api/booking/${bookingId}`, body),
    remove: (bookingId: string) => del<void>(`/api/booking/${bookingId}`),
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

  // disputes — mirrors backend/src/routes/dispute.routes.ts
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
    update: (disputeId: string, body: { status?: string; resolution?: string }) =>
      patch(`/api/dispute/${disputeId}`, body),
    remove: (disputeId: string) => del<void>(`/api/dispute/${disputeId}`),
  },

  // providers — mirrors backend/src/routes/provider.routes.ts
  provider: {
    list: (serviceType?: string, area?: string) => {
      const params = new URLSearchParams();
      if (serviceType) params.set('serviceType', serviceType);
      if (area) params.set('area', area);
      const qs = params.toString();
      return get<any[]>(`/api/provider${qs ? `?${qs}` : ''}`);
    },
    get: (providerId: string) => get<any>(`/api/provider/${providerId}`),
    /** GET /api/provider/me — logged-in user's provider profile (404 if not a provider). */
    me: () => get<any>('/api/provider/me'),
    getByUserId: (userId: string) => get<any>(`/api/provider/user/${userId}`),
    /**
     * POST /api/provider/onboard — "Become a Provider".
     * Name/phone are pulled server-side from user_profiles when omitted.
     */
    onboard: (body: {
      service_type: string;
      specialization: string;
      experience_years: number;
      hourly_rate: number;
      area: string;
      phone?: string;
      skills?: string[];
      certifications?: string[];
      travel_radius?: number;
    }) =>
      post<{ message: string; providerId: string; provider: any }>(
        '/api/provider/onboard',
        body,
      ),
    /** PATCH /api/provider/me — update the logged-in user's own provider profile. */
    updateMe: (
      body: Partial<{
        specialization: string;
        experience_years: number;
        hourly_rate: number;
        area: string;
        status: 'active' | 'inactive';
        skills: string[];
        certifications: string[];
        travel_radius: number;
        phone: string;
        name: string;
      }>,
    ) => patch<any>('/api/provider/me', body),
    /** POST /api/provider — admin/seed create (bypasses auth on the backend). */
    create: (body: Record<string, any>) => post<any>('/api/provider', body),
    update: (providerId: string, body: Record<string, any>) =>
      patch<any>(`/api/provider/${providerId}`, body),
    remove: (providerId: string) => del<void>(`/api/provider/${providerId}`),
    availability: (providerId: string, date?: string) =>
      get(`/api/provider/${providerId}/availability${date ? `?date=${date}` : ''}`),
    traces: (sessionId: string) => get(`/api/provider/traces/${sessionId}`),
    tracesByProvider: (providerId: string) =>
      get(`/api/provider/${providerId}/traces`),
  },

  // availability — mirrors backend/src/routes/availability.routes.ts
  availability: {
    list: (providerId?: string, date?: string) => {
      const params = new URLSearchParams();
      if (providerId) params.set('providerId', providerId);
      if (date) params.set('date', date);
      const qs = params.toString();
      return get<any[]>(`/api/availability${qs ? `?${qs}` : ''}`);
    },
    get: (slotId: string) => get<any>(`/api/availability/${slotId}`),
    create: (body: {
      provider_id: string;
      date: string;
      start_time: string;
      end_time: string;
      is_booked?: boolean;
      travel_buffer?: number;
    }) => post<any>('/api/availability', body),
    update: (slotId: string, body: Record<string, any>) =>
      patch<any>(`/api/availability/${slotId}`, body),
    remove: (slotId: string) => del<void>(`/api/availability/${slotId}`),
  },

  // reputation — mirrors backend/src/routes/reputation.routes.ts
  reputation: {
    getByProvider: (providerId: string) =>
      get<any>(`/api/reputation?providerId=${providerId}`),
    get: (reputationId: string) => get<any>(`/api/reputation/${reputationId}`),
    create: (body: {
      provider_id: string;
      positive_reviews?: number;
      negative_reviews?: number;
      complaints?: number;
      disputes?: number;
    }) => post<any>('/api/reputation', body),
    update: (reputationId: string, body: Record<string, any>) =>
      patch<any>(`/api/reputation/${reputationId}`, body),
    remove: (reputationId: string) => del<void>(`/api/reputation/${reputationId}`),
  },

  // feedback — mirrors backend/src/routes/feedback.routes.ts
  feedback: {
    list: (providerId?: string) =>
      get<any[]>(`/api/feedback${providerId ? `?providerId=${providerId}` : ''}`),
    get: (feedbackId: string) => get<any>(`/api/feedback/${feedbackId}`),
    create: (body: {
      booking_id: string;
      user_id: string;
      provider_id: string;
      rating: number;
      review_text?: string;
    }) => post<any>('/api/feedback', body),
    update: (feedbackId: string, body: Record<string, any>) =>
      patch<any>(`/api/feedback/${feedbackId}`, body),
    remove: (feedbackId: string) => del<void>(`/api/feedback/${feedbackId}`),
  },

  // traces — mirrors backend/src/routes/traces.routes.ts
  traces: {
    list: (sessionId?: string) =>
      get<any[]>(`/api/traces${sessionId ? `?sessionId=${sessionId}` : ''}`),
    get: (sessionId: string) => get<any[]>(`/api/traces/${sessionId}`),
    create: (body: {
      session_id: string;
      agent: string;
      action: string;
      input: string;
      output: string;
    }) => post<any>('/api/traces', body),
    remove: (sessionId: string) => del<void>(`/api/traces/${sessionId}`),
  },

  // users — mirrors backend/src/routes/users.routes.ts
  users: {
    list: () => get<any[]>('/api/users'),
    getProfile: (userId: string) => get<any>(`/api/users/${userId}`),
    create: (body: {
      full_name: string;
      phone: string;
      email: string;
      home_area?: string;
    }) => post<any>('/api/users', body),
    update: (
      userId: string,
      body: Partial<{ full_name: string; phone: string; home_area: string }>,
    ) => patch<any>(`/api/users/${userId}`, body),
    remove: (userId: string) => del<void>(`/api/users/${userId}`),
  },

  // admin — mirrors backend/src/routes/admin.routes.ts (requires auth)
  admin: {
    getPlatformConfig: () => get<Record<string, string>>('/api/admin/platform-config'),
    updatePlatformConfig: (key: string, value: string) =>
      put<any>(`/api/admin/platform-config/${key}`, { value }),
  },
};
