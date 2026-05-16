import { processIntent } from '../controllers/intentController'
import { processContext } from '../controllers/contextController'
import { processComplexity } from '../controllers/complexityController'
import { processDiscovery } from '../controllers/discoveryController'
import { processMatching } from '../controllers/matchingController'
import { processPricing } from '../controllers/pricingController'
import { processScheduling } from '../controllers/schedulingController'
import { processBooking } from '../controllers/bookingController'
import { v4 as uuidv4 } from 'uuid'

export interface OrchestratorInput {
  userInput: string
  userId: string
  requestedDate: string   // YYYY-MM-DD
  requestedTime: string   // HH:MM
  location?: string
}

export interface OrchestratorOutput {
  sessionId: string
  intent: any
  context: any
  complexity: any
  discovery: any
  matching: any
  pricing: any
  scheduling: any
  booking: any
  success: boolean
  errorMessage?: string
  clarificationNeeded: boolean
  clarificationQuestion?: string
}

export async function runAntigravityOrchestrator(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const sessionId = uuidv4()

  console.log(`\n🤖 [ANTIGRAVITY] Session ${sessionId} started`)
  console.log(`📝 Input: "${input.userInput}"`)

  try {
    // ── AGENT 1: Intent ──────────────────────────────
    console.log('→ [1/8] IntentAgent running...')
    const intent = await processIntent(input.userInput, sessionId)
    console.log(`   Language: ${intent.language}, Confidence: ${intent.confidence}, Service: ${intent.service}`)

    if (intent.clarificationNeeded) {
      return {
        sessionId, intent, context: null, complexity: null,
        discovery: null, matching: null, pricing: null,
        scheduling: null, booking: null,
        success: false,
        clarificationNeeded: true,
        clarificationQuestion: intent.clarificationQuestion,
      }
    }

    // ── AGENT 2: Context ─────────────────────────────
    console.log('→ [2/8] ContextAgent running...')
    const context = await processContext(intent, input.userId, sessionId)
    console.log(`   Returning user: ${context.isReturningUser}, Loyalty pts: ${context.loyaltyPoints}`)

    // ── AGENT 3: Complexity ──────────────────────────
    console.log('→ [3/8] ComplexityAgent running...')
    const complexity = await processComplexity(intent, sessionId)
    console.log(`   Complexity: ${complexity.complexity}, Duration: ${complexity.estimatedDurationHours}h`)

    // ── AGENT 4: Discovery ───────────────────────────
    console.log('→ [4/8] DiscoveryAgent running...')
    const discovery = await processDiscovery(intent, complexity, sessionId)
    console.log(`   Found ${discovery.totalFound} candidates in ${discovery.searchArea}`)

    // ── AGENT 5: Matching ────────────────────────────
    console.log('→ [5/8] MatchingAgent running...')
    const matching = await processMatching(
      discovery, intent, context,
      input.requestedDate, input.requestedTime, sessionId
    )

    if (matching.noProvidersAvailable || !matching.topProvider) {
      return {
        sessionId, intent, context, complexity, discovery, matching,
        pricing: null, scheduling: null, booking: null,
        success: false,
        errorMessage: 'No providers available in your area for the requested time.',
        clarificationNeeded: false,
      }
    }
    console.log(`   Top provider: ${matching.topProvider.name} (score: ${matching.topProvider.matchScore.toFixed(2)})`)

    // ── AGENT 6: Pricing ─────────────────────────────
    console.log('→ [6/8] PricingAgent running...')
    const pricing = await processPricing(matching.topProvider, intent, complexity, context, sessionId)
    console.log(`   Total: PKR ${pricing.total}`)

    // ── AGENT 7: Scheduling ──────────────────────────
    console.log('→ [7/8] SchedulingAgent running...')
    const scheduling = await processScheduling(
      matching.topProvider, input.requestedDate, input.requestedTime,
      complexity.estimatedDurationHours, sessionId
    )
    console.log(`   Slot: ${scheduling.slot}, Conflict: ${scheduling.conflictDetected}`)

    // ── AGENT 8: Booking ─────────────────────────────
    console.log('→ [8/8] BookingAgent running...')
    const booking = await processBooking(
      input.userId, matching.topProvider, pricing, scheduling,
      complexity, input.userInput,
      input.location ?? intent.location, sessionId
    )
    console.log(`   Booking ${booking.bookingId} → ${booking.status}`)
    console.log(`✅ [ANTIGRAVITY] Session ${sessionId} complete\n`)

    return {
      sessionId, intent, context, complexity, discovery, matching,
      pricing, scheduling, booking,
      success: booking.status === 'confirmed',
      clarificationNeeded: false,
    }
  } catch (err: any) {
    console.error(`❌ [ANTIGRAVITY] Error in session ${sessionId}:`, err.message)
    return {
      sessionId, intent: null, context: null, complexity: null,
      discovery: null, matching: null, pricing: null,
      scheduling: null, booking: null,
      success: false,
      errorMessage: `Orchestrator error: ${err.message}`,
      clarificationNeeded: false,
    }
  }
}
