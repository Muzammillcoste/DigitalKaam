import { supabase } from '../lib/supabase'
import { Provider, DiscoveryOutput } from './discoveryController'
import { IntentOutput } from './intentController'
import { ContextOutput } from './contextController'

export interface RankedProvider extends Provider {
  matchScore: number
  distanceKm: number
  scoreBreakdown: Record<string, number>
  selectionReason: string
  isAvailable: boolean
}

export interface MatchingOutput {
  ranked: RankedProvider[]
  topProvider: RankedProvider | null
  reasoning: string
  noProvidersAvailable: boolean
}

const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Gulshan: { lat: 24.9217, lng: 67.0991 },
  DHA: { lat: 24.8142, lng: 67.0792 },
  Malir: { lat: 24.8957, lng: 67.1958 },
  Saddar: { lat: 24.8577, lng: 67.0105 },
  'North Nazimabad': { lat: 24.9369, lng: 67.0431 },
  Clifton: { lat: 24.8064, lng: 67.0311 },
  Korangi: { lat: 24.8322, lng: 67.1330 },
  Lyari: { lat: 24.8552, lng: 66.9944 },
  unknown: { lat: 24.8607, lng: 67.0105 },
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

export async function processMatching(
  discovery: DiscoveryOutput,
  intent: IntentOutput,
  context: ContextOutput,
  requestedDate: string,
  requestedTime: string,
  sessionId: string
): Promise<MatchingOutput> {
  const candidates = discovery.candidates
  if (candidates.length === 0) {
    await supabase.from('traces').insert({
      session_id: sessionId,
      agent: 'MatchingAgent',
      input: { totalCandidates: 0 },
      output: { noProvidersAvailable: true },
      reasoning: 'No candidates found in discovery phase.',
      tool_calls: {},
      confidence_score: 1.0,
    })
    return { ranked: [], topProvider: null, reasoning: 'No providers available in this area.', noProvidersAvailable: true }
  }

  const areaCoords = AREA_COORDS[intent.location] ?? AREA_COORDS['unknown']

  // Get availability for requested date
  const { data: availabilityRecords } = await supabase
    .from('availability')
    .select('*')
    .eq('date', requestedDate)
    .eq('is_booked', false)
    .in('provider_id', candidates.map((c) => c.id))

  const availableProviderIds = new Set((availabilityRecords ?? []).map((a: any) => a.provider_id))

  // Compute stats for normalization
  const maxRate = Math.max(...candidates.map((p) => p.hourly_rate))
  const minRate = Math.min(...candidates.map((p) => p.hourly_rate))
  const maxDist = 20

  const ranked: RankedProvider[] = candidates.map((p) => {
    const distKm = haversineKm(areaCoords.lat, areaCoords.lng, p.lat, p.lng)
    const isAvailable = availableProviderIds.has(p.id) || availabilityRecords === null

    // Normalize each factor to 0–1
    const distScore = 1 - normalize(distKm, 0, maxDist)         // closer = higher
    const availScore = isAvailable ? 1.0 : 0.0
    const ratingScore = normalize(p.rating, 0, 5)
    const recencyScore = p.review_recency_score ?? 0.5
    const reliabilityScore = normalize(p.reliability_score, 0, 100)
    const specializationScore = (p.skills ?? []).some((s: string) =>
      s.toLowerCase().includes(intent.service.toLowerCase().replace(' repair', ''))
    ) ? 1.0 : 0.5
    const priceScore = 1 - normalize(p.hourly_rate, minRate, maxRate) // lower price = higher score
    const capacityScore = normalize(p.capacity, 1, 8)
    const cancelScore = 1 - (p.cancellation_rate ?? 0)              // lower cancel = higher score
    const prefScore = context.preferredProviders.includes(p.id) ? 1.0 :
      context.blacklistedProviders.includes(p.id) ? 0.0 : 0.5

    // Weighted match score
    const matchScore =
      distScore         * 0.10 +
      availScore        * 0.20 +
      ratingScore       * 0.10 +
      recencyScore      * 0.10 +
      reliabilityScore  * 0.15 +
      specializationScore * 0.10 +
      priceScore        * 0.10 +
      capacityScore     * 0.05 +
      cancelScore       * 0.05 +
      prefScore         * 0.05

    const scoreBreakdown = {
      distance: Math.round(distScore * 100) / 100,
      availability: availScore,
      rating: Math.round(ratingScore * 100) / 100,
      reviewRecency: Math.round(recencyScore * 100) / 100,
      reliability: Math.round(reliabilityScore * 100) / 100,
      specialization: specializationScore,
      price: Math.round(priceScore * 100) / 100,
      capacity: Math.round(capacityScore * 100) / 100,
      cancellationRate: Math.round(cancelScore * 100) / 100,
      userPreference: prefScore,
    }

    const selectionReason = `Reliability ${p.reliability_score}/100, Rating ${p.rating}★, Distance ${distKm.toFixed(1)}km, ${isAvailable ? 'Available' : 'Unavailable'}`

    return { ...p, matchScore, distanceKm: distKm, scoreBreakdown, selectionReason, isAvailable }
  })

  // Sort by score descending
  ranked.sort((a, b) => b.matchScore - a.matchScore)

  const topProvider = ranked[0] ?? null
  const reasoning = topProvider
    ? `Selected "${topProvider.name}" (score: ${topProvider.matchScore.toFixed(2)}) over ${ranked.length - 1} other providers. ${topProvider.selectionReason}`
    : 'No provider selected.'

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'MatchingAgent',
    input: { totalCandidates: candidates.length, requestedDate, requestedTime },
    output: { topProvider: topProvider?.name, totalRanked: ranked.length, topScore: topProvider?.matchScore },
    reasoning,
    tool_calls: { tool: 'SupabaseDB', table: 'availability' },
    confidence_score: topProvider ? topProvider.matchScore : 0,
  })

  return { ranked, topProvider, reasoning, noProvidersAvailable: false }
}
