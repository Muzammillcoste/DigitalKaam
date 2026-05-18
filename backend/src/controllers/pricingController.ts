import { supabase } from '../lib/supabase'
import { IntentOutput } from './intentController'
import { ComplexityOutput } from './complexityController'
import { RankedProvider } from './matchingController'
import { ContextOutput } from './contextController'

export interface PriceBreakdown {
  visitFee: number
  estimatedHours: number
  hourlyRate: number
  laborFee: number
  urgencySurcharge: number
  loyaltyDiscount: number
  total: number
  partsDisclaimer: string
}

export interface PricingOutput {
  breakdown: PriceBreakdown
  total: number
  currency: string
  isBudgetFriendly: boolean
  alternativeBudgetNote?: string
}

export async function processPricing(
  provider: RankedProvider,
  intent: IntentOutput,
  complexity: ComplexityOutput,
  context: ContextOutput,
  sessionId: string
): Promise<PricingOutput> {
  // ── Visit fee ────────────────────────────────────────────────────────────────
  // Flat diagnostic/travel fee the provider charges on arrival.
  const visitFee = 500

  // ── Labor fee = provider's actual hourly rate × Gemini-estimated hours ───────
  // estimatedDurationHours comes from ComplexityAgent (Gemini AI).
  // hourly_rate is the provider's real rate stored in the DB.
  const estimatedHours = complexity.estimatedDurationHours ?? 1
  const hourlyRate = provider.hourly_rate ?? 500
  const laborFee = Math.round(hourlyRate * estimatedHours)

  // ── Urgency surcharge ────────────────────────────────────────────────────────
  // High urgency (same-day / emergency) adds a flat surcharge.
  const urgencyMap: Record<string, number> = { low: 0, medium: 100, high: 250 }
  const urgencySurcharge = urgencyMap[intent.severity] ?? 0

  // ── Loyalty discount: PKR 50 per 100 points, capped at PKR 200 ──────────────
  const loyaltyDiscount = Math.min(200, Math.floor((context.loyaltyPoints ?? 0) / 100) * 50)

  const subtotal = visitFee + laborFee + urgencySurcharge
  const total = Math.max(visitFee, subtotal - loyaltyDiscount) // never below visit fee

  console.log(`\n[PricingController] ── Calculating quote for ${provider.name} ──`)
  console.log(`  hourly_rate=${hourlyRate} PKR/hr × estimatedHours=${estimatedHours}hr = laborFee=${laborFee} PKR`)
  console.log(`  visitFee=${visitFee} + laborFee=${laborFee} + urgency=${urgencySurcharge} - loyalty=${loyaltyDiscount} = PKR ${total}`)
  console.log(`  complexity=${complexity.complexity} | severity=${intent.severity} | loyaltyPoints=${context.loyaltyPoints ?? 0}`)

  const breakdown: PriceBreakdown = {
    visitFee,
    estimatedHours,
    hourlyRate,
    laborFee,
    urgencySurcharge,
    loyaltyDiscount,
    total,
    partsDisclaimer:
      'Parts/materials not included. Final price may vary after technician inspects the job.',
  }

  const isBudgetFriendly = intent.budgetSensitivity === 'high' && total > 1500

  const output: PricingOutput = {
    breakdown,
    total,
    currency: 'PKR',
    isBudgetFriendly: !isBudgetFriendly,
    alternativeBudgetNote: isBudgetFriendly
      ? 'Budget tip: Scheduling for a non-urgent slot could save PKR 100–250.'
      : undefined,
  }

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'PricingAgent',
    input: {
      provider: provider.name,
      hourlyRate,
      estimatedHours,
      severity: intent.severity,
      complexity: complexity.complexity,
      loyaltyPoints: context.loyaltyPoints,
    },
    output: breakdown,
    reasoning:
      `Visit: PKR ${visitFee} + Labor: ${hourlyRate}/hr × ${estimatedHours}hr = PKR ${laborFee}` +
      ` + Urgency: PKR ${urgencySurcharge} - Loyalty: PKR ${loyaltyDiscount} = PKR ${total}` +
      ` | Complexity: ${complexity.complexity}, Reason: ${complexity.reason}`,
    tool_calls: { tool: 'PricingEngine' },
    confidence_score: 0.9,
  })

  return output
}
