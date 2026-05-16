const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

async function patch<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── Service ─────────────────────────────────────────────
export const api = {
  service: {
    request: (body: {
      userInput: string
      userId: string
      requestedDate?: string
      requestedTime?: string
      location?: string
    }) => post('/api/service/request', body),
  },

  booking: {
    get: (bookingId: string) => get(`/api/booking/${bookingId}`),
    listByUser: (userId: string) => get(`/api/booking/user/${userId}`),
    updateStatus: (bookingId: string, status: string, completionPhotoUrl?: string, sessionId?: string) =>
      patch(`/api/booking/${bookingId}/status`, { status, completionPhotoUrl, sessionId }),
    submitFeedback: (bookingId: string, body: {
      userId: string; providerId: string; rating: number; reviewText?: string; sessionId?: string
    }) => post(`/api/booking/${bookingId}/feedback`, body),
  },

  dispute: {
    open: (body: {
      bookingId: string; userId: string; providerId: string
      disputeType: string; description?: string; sessionId?: string
    }) => post('/api/dispute', body),
    get: (disputeId: string) => get(`/api/dispute/${disputeId}`),
    listByUser: (userId: string) => get(`/api/dispute/user/${userId}`),
  },

  provider: {
    list: (serviceType?: string, area?: string) => {
      const params = new URLSearchParams()
      if (serviceType) params.set('serviceType', serviceType)
      if (area) params.set('area', area)
      return get(`/api/provider?${params.toString()}`)
    },
    get: (providerId: string) => get(`/api/provider/${providerId}`),
    availability: (providerId: string, date?: string) =>
      get(`/api/provider/${providerId}/availability${date ? `?date=${date}` : ''}`),
    traces: (sessionId: string) => get(`/api/provider/traces/${sessionId}`),
  },
}
