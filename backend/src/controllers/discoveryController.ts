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
  PECHS: { lat: 24.8697, lng: 67.0490 },
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
  defence: 'DHA',
  'defence housing': 'DHA',
  pechs: 'PECHS',
  'p.e.c.h.s': 'PECHS',
  'pakistan employees': 'PECHS',
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

// Bidirectional alias map: any user/Gemini variation → exact DB service_type value
// Add new aliases here as new variants are discovered in production logs.
const SERVICE_ALIAS_MAP: Record<string, string> = {
  // ── AC Technician ─────────────────────────────────────────────────────────
  'ac technician':          'AC Technician',
  'ac tech':                'AC Technician',
  'ac repair':              'AC Technician',
  'ac service':             'AC Technician',
  'ac mechanic':            'AC Technician',
  'ac wala':                'AC Technician',
  'ac':                     'AC Technician',
  'air conditioner':        'AC Technician',
  'air conditioner repair': 'AC Technician',
  'air conditioning':       'AC Technician',
  'cooling':                'AC Technician',
  'hvac':                   'AC Technician',
  'ac installation':        'AC Technician',
  'ac gas':                 'AC Technician',
  'ac cleaning':            'AC Technician',
  'inverter ac':            'AC Technician',
  'split ac':               'AC Technician',
  'ac technicians':         'AC Technician',
  // ── Electrician ───────────────────────────────────────────────────────────
  'electrician':            'Electrician',
  'electricians':           'Electrician',
  'electric':               'Electrician',
  'electrical':             'Electrician',
  'bijli':                  'Electrician',
  'bijli wala':             'Electrician',
  'bijliwala':              'Electrician',
  'wiring':                 'Electrician',
  'fan repair':             'Electrician',
  'light repair':           'Electrician',
  'socket repair':          'Electrician',
  'short circuit':          'Electrician',
  'solar':                  'Electrician',
  // ── Plumber ───────────────────────────────────────────────────────────────
  'plumber':                'Plumber',
  'plumbers':               'Plumber',
  'plumbing':               'Plumber',
  'pipe':                   'Plumber',
  'pipe repair':            'Plumber',
  'pani':                   'Plumber',
  'pani wala':              'Plumber',
  'leak':                   'Plumber',
  'leak repair':            'Plumber',
  'drain':                  'Plumber',
  'drain cleaning':         'Plumber',
  'tap':                    'Plumber',
  'water tank':             'Plumber',
  'water pump':             'Plumber',
  // ── Mechanic (car, NOT AC) ─────────────────────────────────────────────────
  'mechanic':               'Mechanic',
  'mechanics':              'Mechanic',
  'car mechanic':           'Mechanic',
  'car repair':             'Mechanic',
  'auto':                   'Mechanic',
  'auto mechanic':          'Mechanic',
  'vehicle repair':         'Mechanic',
  'motorcycle repair':      'Mechanic',
  'bike repair':            'Mechanic',
  'gaari':                  'Mechanic',
  'gaari wala':             'Mechanic',
  'engine repair':          'Mechanic',
  // ── Tutor ─────────────────────────────────────────────────────────────────
  'tutor':                  'Tutor',
  'tutors':                 'Tutor',
  'teacher':                'Tutor',
  'ustaad':                 'Tutor',
  'tuition':                'Tutor',
  'home tuition':           'Tutor',
  'teaching':               'Tutor',
  // ── Beautician ────────────────────────────────────────────────────────────
  'beautician':             'Beautician',
  'beauty':                 'Beautician',
  'parlour':                'Beautician',
  'salon':                  'Beautician',
  'makeup':                 'Beautician',
  'mehndi':                 'Beautician',
  'hair stylist':           'Beautician',
  'bridal makeup':          'Beautician',
  // ── Driver ────────────────────────────────────────────────────────────────
  'driver':                 'Driver',
  'drivers':                'Driver',
  'chauffeur':              'Driver',
  'driving':                'Driver',
}

function serviceTypeCandidates(rawService: string): string[] {
  const normalized = (rawService || '').toLowerCase().trim()

  // 1. Direct alias lookup (exact match on normalized input)
  if (normalized in SERVICE_ALIAS_MAP) {
    return [SERVICE_ALIAS_MAP[normalized]]
  }

  // 2. Partial match — check if any alias is a substring of the input or vice versa
  //    Longest alias wins to avoid false matches (e.g. "ac" matching "car mechanic via 'ac'")
  const matches = Object.entries(SERVICE_ALIAS_MAP)
    .filter(([alias]) => normalized.includes(alias) || alias.includes(normalized))
    .sort((a, b) => b[0].length - a[0].length) // longest alias = most specific

  if (matches.length > 0) {
    return [matches[0][1]] // return the canonical DB value
  }

  // 3. No match: return raw input for a broad ILIKE fallback
  console.warn(`[DiscoveryController] ⚠ No alias match for service='${rawService}'. Add to SERVICE_ALIAS_MAP if this is a valid service.`)
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

  console.log(`[DiscoveryController] Input intent:`, intent)
  console.log(`[DiscoveryController] Canonicalized area: ${normalizedSearchArea} (coords: ${JSON.stringify(areaCoords)})`)
  console.log(`[DiscoveryController] Service candidates:`, serviceCandidates)
  console.log(`[DiscoveryController] DB query condition (OR):`, serviceLikeQuery)

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

  console.log(`[DiscoveryController] Raw candidates from DB: ${candidates.length}`)
  if (error) console.log(`[DiscoveryController] DB error:`, error)
  if (candidates.length === 0) {
    console.log(`[DiscoveryController] ⚠ ZERO results from DB. Possible causes: service_type column values don't match any of: [${serviceCandidates.join(', ')}], or no active providers.`)
  } else {
    console.log(`[DiscoveryController] Raw DB results (name | service_type | area | lat | lng):`) 
    candidates.forEach(p => console.log(`  • ${p.name} | service_type='${p.service_type}' | area='${p.area}' | lat=${p.lat} | lng=${p.lng} | radius=${p.travel_radius}km`))
  }

  // Filter by travel radius from search area, or exact area match if coords missing
  console.log(`[DiscoveryController] Applying radius filter. Search area coords: lat=${areaCoords?.lat} lng=${areaCoords?.lng}`)
  candidates = candidates.filter((p) => {
    if (normalizedSearchArea === 'unknown') {
      return true
    }

    if (p.lat == null || p.lng == null) {
      // If provider has no coordinates, include them if their area matches case-insensitively
      const match = p.area && p.area.toLowerCase() === normalizedSearchArea.toLowerCase()
      if (!match) console.log(`[DiscoveryController] Dropped ${p.name}: No coords and area '${p.area}' != '${normalizedSearchArea}'`)
      return match
    }

    const dist = haversineKm(areaCoords.lat, areaCoords.lng, p.lat, p.lng)
    const inRadius = dist <= (p.travel_radius ?? 15)
    console.log(`  [RadiusFilter] ${p.name}: dist=${dist.toFixed(2)}km, radius=${p.travel_radius ?? 15}km → ${inRadius ? '✓ KEPT' : '✗ DROPPED'}`)
    if (!inRadius) console.log(`[DiscoveryController] Dropped ${p.name}: Distance ${dist.toFixed(2)}km > radius ${p.travel_radius ?? 15}km`)
    return inRadius
  })
  
  console.log(`[DiscoveryController] Candidates after radius filter: ${candidates.length}`)

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
