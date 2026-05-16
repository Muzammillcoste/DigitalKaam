import { runIntentAgent } from '../agents/intentAgent'
import { runContextAgent } from '../agents/contextAgent'
import { runComplexityAgent } from '../agents/complexityAgent'
import { runDiscoveryAgent } from '../agents/discoveryAgent'
import { runMatchingAgent } from '../agents/matchingAgent'
import { runPricingAgent } from '../agents/pricingAgent'
import { runSchedulingAgent } from '../agents/schedulingAgent'
import { runBookingAgent } from '../agents/bookingAgent'
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
    const intent = await runIntentAgent(input.userInput, sessionId)
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
    const context = await runContextAgent(intent, input.userId, sessionId)
    console.log(`   Returning user: ${context.isReturningUser}, Loyalty pts: ${context.loyaltyPoints}`)

    // ── AGENT 3: Complexity ──────────────────────────
    console.log('→ [3/8] ComplexityAgent running...')
    const complexity = await runComplexityAgent(intent, sessionId)
    console.log(`   Complexity: ${complexity.complexity}, Duration: ${complexity.estimatedDurationHours}h`)

    // ── AGENT 4: Discovery ───────────────────────────
    console.log('→ [4/8] DiscoveryAgent running...')
    const discovery = await runDiscoveryAgent(intent, complexity, sessionId)
    console.log(`   Found ${discovery.totalFound} candidates in ${discovery.searchArea}`)

    // ── AGENT 5: Matching ────────────────────────────
    console.log('→ [5/8] MatchingAgent running...')
    const matching = await runMatchingAgent(
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
    const pricing = await runPricingAgent(matching.topProvider, intent, complexity, context, sessionId)
    console.log(`   Total: PKR ${pricing.total}`)

    // ── AGENT 7: Scheduling ──────────────────────────
    console.log('→ [7/8] SchedulingAgent running...')
    const scheduling = await runSchedulingAgent(
      matching.topProvider, input.requestedDate, input.requestedTime,
      complexity.estimatedDurationHours, sessionId
    )
    console.log(`   Slot: ${scheduling.slot}, Conflict: ${scheduling.conflictDetected}`)

    // ── AGENT 8: Booking ─────────────────────────────
    console.log('→ [8/8] BookingAgent running...')
    const booking = await runBookingAgent(
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
