import { supabase } from '../lib/supabase'
import { IntentOutput } from './intentController'
import { ComplexityOutput } from './complexityController'

export interface Provider {
  id: string
  name: string
  phone: string
  service_type: string
  specialization: string
  experience_years: number
  rating: number
  review_count: number
  review_recency_score: number
  on_time_score: number
  reliability_score: number
  cancellation_rate: number
  hourly_rate: number
  capacity: number
  skills: string[]
  certifications: string[]
  travel_radius: number
  lat: number
  lng: number
  area: string
  expo_push_token: string | null
}

export interface DiscoveryOutput {
  candidates: Provider[]
  totalFound: number
  searchArea: string
  fallbackUsed: boolean
}

// Haversine formula to calculate km between two coordinates
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Area center coordinates for Karachi areas
const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Gulshan: { lat: 24.9217, lng: 67.0991 },
  DHA: { lat: 24.8142, lng: 67.0792 },
  Malir: { lat: 24.8957, lng: 67.1958 },
  Saddar: { lat: 24.8577, lng: 67.0105 },
  'North Nazimabad': { lat: 24.9369, lng: 67.0431 },
  Clifton: { lat: 24.8064, lng: 67.0311 },
  Korangi: { lat: 24.8322, lng: 67.1330 },
  Lyari: { lat: 24.8552, lng: 66.9944 },
  unknown: { lat: 24.8607, lng: 67.0105 }, // Karachi center
}

export async function processDiscovery(
  intent: IntentOutput,
  complexity: ComplexityOutput,
  sessionId: string
): Promise<DiscoveryOutput> {
  const searchArea = intent.location !== 'unknown' ? intent.location : 'unknown'
  
  // Case-insensitive lookup for area coords
  const areaKey = Object.keys(AREA_COORDS).find(k => k.toLowerCase() === searchArea.toLowerCase()) || 'unknown'
  const areaCoords = AREA_COORDS[areaKey]

  // Map service name to service_type column
  const serviceTypeMap: Record<string, string> = {
    'ac repair': 'AC Technician',
    'ac service': 'AC Technician',
    electrician: 'Electrician',
    plumber: 'Plumber',
    mechanic: 'Mechanic',
    tutor: 'Tutor',
    beautician: 'Beautician',
    driver: 'Driver',
  }
  const normalizedIntentService = (intent.service || '').toLowerCase()
  const serviceType = serviceTypeMap[normalizedIntentService] ?? intent.service

  const { data: providers, error } = await supabase
    .from('providers')
    .select('*')
    .ilike('service_type', serviceType)
    .eq('status', 'active')

  let candidates: Provider[] = providers ?? []
  const fallbackUsed = !!error || candidates.length === 0

  // Filter by travel radius from search area, or exact area match if coords missing
  candidates = candidates.filter((p) => {
    if (p.lat == null || p.lng == null) {
      // If provider has no coordinates, include them if their area matches case-insensitively
      return p.area && searchArea && p.area.toLowerCase() === searchArea.toLowerCase()
    }
    const dist = haversineKm(areaCoords.lat, areaCoords.lng, p.lat, p.lng)
    return dist <= (p.travel_radius ?? 15)
  })

  // Filter by complexity — complex jobs need certified providers
  if (complexity.complexity === 'complex' && complexity.requiredCertifications.length > 0) {
    const withCerts = candidates.filter((p) =>
      complexity.requiredCertifications.some((cert) =>
        (p.certifications ?? []).some((c: string) => c.toLowerCase().includes(cert.toLowerCase()))
      )
    )
    if (withCerts.length > 0) candidates = withCerts
  }

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'DiscoveryAgent',
    input: { serviceType, searchArea, complexity: complexity.complexity },
    output: { totalFound: candidates.length, fallbackUsed },
    reasoning: `Found ${candidates.length} providers for "${serviceType}" near ${searchArea}. Fallback used: ${fallbackUsed}. Complexity filter: ${complexity.complexity}.`,
    tool_calls: { tool: 'SupabaseDB', table: 'providers', fallbackUsed },
    confidence_score: fallbackUsed ? 0.6 : 0.95,
  })

  return { candidates, totalFound: candidates.length, searchArea, fallbackUsed }
}
