import { supabase } from '../lib/supabase'
import { IntentOutput } from './intentAgent'
import { ComplexityOutput } from './complexityAgent'
import { RankedProvider } from './matchingAgent'
import { ContextOutput } from './contextAgent'

export interface PriceBreakdown {
  visitFee: number
  distanceFee: number
  urgencySurcharge: number
  complexitySurcharge: number
  demandSurge: number
  loyaltyDiscount: number
  total: number
}

export interface PricingOutput {
  breakdown: PriceBreakdown
  total: number
  currency: string
  isBudgetFriendly: boolean
  alternativeBudgetNote?: string
}

export async function runPricingAgent(
  provider: RankedProvider,
  intent: IntentOutput,
  complexity: ComplexityOutput,
  context: ContextOutput,
  sessionId: string
): Promise<PricingOutput> {
  const visitFee = 500

  // Distance fee: PKR 30 per km
  const distanceFee = Math.round(provider.distanceKm * 30)

  // Urgency surcharge
  const urgencyMap = { low: 0, medium: 100, high: 250 }
  const urgencySurcharge = intent.severity === 'high' ? urgencyMap.high :
    intent.severity === 'medium' ? urgencyMap.medium : urgencyMap.low

  // Complexity surcharge
  const complexityMap = { basic: 0, intermediate: 200, complex: 400 }
  const complexitySurcharge = complexityMap[complexity.complexity]

  // Demand surge (mock: high severity = surge)
  const demandSurge = intent.severity === 'high' ? 100 : 0

  // Loyalty discount: 50 PKR per 100 points, max 200
  const loyaltyDiscount = Math.min(200, Math.floor(context.loyaltyPoints / 100) * 50)

  const subtotal = visitFee + distanceFee + urgencySurcharge + complexitySurcharge + demandSurge
  const total = Math.max(0, subtotal - loyaltyDiscount)

  const isBudgetFriendly = intent.budgetSensitivity === 'high' && total > 1500

  const breakdown: PriceBreakdown = {
    visitFee,
    distanceFee,
    urgencySurcharge,
    complexitySurcharge,
    demandSurge,
    loyaltyDiscount,
    total,
  }

  const output: PricingOutput = {
    breakdown,
    total,
    currency: 'PKR',
    isBudgetFriendly: !isBudgetFriendly,
    alternativeBudgetNote: isBudgetFriendly
      ? 'Budget tip: Scheduling for a non-urgent time could reduce cost by PKR 250–350.'
      : undefined,
  }

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'PricingAgent',
    input: {
      provider: provider.name,
      distanceKm: provider.distanceKm,
      severity: intent.severity,
      complexity: complexity.complexity,
      loyaltyPoints: context.loyaltyPoints,
    },
    output: breakdown,
    reasoning: `Visit: ${visitFee} + Distance: ${distanceFee} + Urgency: ${urgencySurcharge} + Complexity: ${complexitySurcharge} + Surge: ${demandSurge} - Discount: ${loyaltyDiscount} = PKR ${total}`,
    tool_calls: { tool: 'PricingEngine' },
    confidence_score: 0.95,
  })

  return output
}
