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
  normalizedSearchArea: string
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

const AREA_ALIASES: Record<string, string> = {
  gulshan: 'Gulshan',
  'gulshan iqbal': 'Gulshan',
  'gulshan e iqbal': 'Gulshan',
  'gulshan-e-iqbal': 'Gulshan',
  dha: 'DHA',
  malir: 'Malir',
  saddar: 'Saddar',
  clifton: 'Clifton',
  korangi: 'Korangi',
  lyari: 'Lyari',
  'north nazimabad': 'North Nazimabad',
  nazimabad: 'North Nazimabad',
}

function canonicalizeArea(area: string): string {
  if (!area) return 'unknown'
  const cleaned = area.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
  if (cleaned in AREA_ALIASES) return AREA_ALIASES[cleaned]
  const exactKey = Object.keys(AREA_COORDS).find((k) => k.toLowerCase() === cleaned)
  return exactKey ?? 'unknown'
}

function serviceTypeCandidates(rawService: string): string[] {
  const normalized = (rawService || '').toLowerCase().trim()
  const serviceMap: Record<string, string[]> = {
    'ac repair': ['AC Technician', 'AC tech', 'ac technician'],
    'ac service': ['AC Technician', 'AC tech', 'ac technician'],
    ac: ['AC Technician', 'AC tech', 'ac technician'],
    electrician: ['Electrician', 'electrician', 'electrical'],
    electricians: ['Electrician', 'electrician', 'electrical'],
    electric: ['Electrician', 'electrician', 'electrical'],
    plumber: ['Plumber', 'plumber', 'plumbing'],
    plumbers: ['Plumber', 'plumber', 'plumbing'],
    mechanic: ['Mechanic', 'mechanic'],
    mechanics: ['Mechanic', 'mechanic'],
    tutor: ['Tutor', 'tutor'],
    beautician: ['Beautician', 'beautician'],
    driver: ['Driver', 'driver'],
  }

  if (normalized in serviceMap) return serviceMap[normalized]
  if (!normalized) return []
  return [rawService, normalized]
}

export async function processDiscovery(
  intent: IntentOutput,
  complexity: ComplexityOutput,
  sessionId: string
): Promise<DiscoveryOutput> {
  const searchArea = intent.location !== 'unknown' ? intent.location : 'unknown'
  const normalizedSearchArea = canonicalizeArea(searchArea)
  const areaCoords = AREA_COORDS[normalizedSearchArea]

  const serviceCandidates = serviceTypeCandidates(intent.service)
  const serviceLikeQuery = serviceCandidates
    .map((s) => `service_type.ilike.%${s.replace(/[%_]/g, '').trim()}%`)
    .join(',')

  let query = supabase
    .from('providers')
    .select('*')
    .eq('status', 'active')

  if (serviceLikeQuery.length > 0) {
    query = query.or(serviceLikeQuery)
  }

  const { data: providers, error } = await query

  let candidates: Provider[] = providers ?? []
  const fallbackUsed = !!error || candidates.length === 0

  // Filter by travel radius from search area, or exact area match if coords missing
  candidates = candidates.filter((p) => {
    if (normalizedSearchArea === 'unknown') {
      return true
    }

    if (p.lat == null || p.lng == null) {
      // If provider has no coordinates, include them if their area matches case-insensitively
      return p.area && p.area.toLowerCase() === normalizedSearchArea.toLowerCase()
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
    input: { service: intent.service, serviceCandidates, searchArea, normalizedSearchArea, complexity: complexity.complexity },
    output: { totalFound: candidates.length, fallbackUsed },
    reasoning: `Found ${candidates.length} providers for "${intent.service}" near ${normalizedSearchArea} (raw: ${searchArea}). Fallback used: ${fallbackUsed}. Complexity filter: ${complexity.complexity}.`,
    tool_calls: { tool: 'SupabaseDB', table: 'providers', fallbackUsed },
    confidence_score: fallbackUsed ? 0.6 : 0.95,
  })

  return { candidates, totalFound: candidates.length, searchArea, normalizedSearchArea, fallbackUsed }
}
