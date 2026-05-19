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
  platformFee: number
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

// Hard-coded fallbacks used ONLY if platform_config table is missing/inaccessible.
const DEFAULTS = {
  visit_fee:            500,
  platform_fee_fixed:   50,
  platform_fee_percent: 5,
  urgency_fee_high:     250,
  urgency_fee_medium:   100,
  loyalty_discount_cap: 200,
}

async function loadPlatformConfig(): Promise<typeof DEFAULTS> {
  try {
    const { data, error } = await supabase
      .from('platform_config')
      .select('key, value')

    if (error || !data || data.length === 0) {
      console.warn('[PricingController] ⚠ platform_config unavailable, using hardcoded defaults')
      return DEFAULTS
    }

    const cfg = { ...DEFAULTS }
    for (const row of data) {
      const key = row.key as keyof typeof DEFAULTS
      if (key in cfg) cfg[key] = parseFloat(row.value) || cfg[key]
    }
    console.log('[PricingController] platform_config loaded from DB:', cfg)
    return cfg
  } catch {
    console.warn('[PricingController] ⚠ platform_config fetch threw, using hardcoded defaults')
    return DEFAULTS
  }
}

export async function processPricing(
  provider: RankedProvider,
  intent: IntentOutput,
  complexity: ComplexityOutput,
  context: ContextOutput,
  sessionId: string
): Promise<PricingOutput> {
  // ── Load all fee config from DB (falls back to hardcoded defaults) ───────────
  const cfg = await loadPlatformConfig()

  // ── Visit fee (flat callout fee) ─────────────────────────────────────────────
  const visitFee = cfg.visit_fee

  // ── Labor fee = provider's hourly rate × AI-estimated hours ──────────────────
  const estimatedHours = complexity.estimatedDurationHours ?? 1
  const hourlyRate = provider.hourly_rate ?? 500
  const laborFee = Math.round(hourlyRate * estimatedHours)

  // ── Urgency surcharge ─────────────────────────────────────────────────────────
  const urgencyMap: Record<string, number> = {
    low: 0,
    medium: cfg.urgency_fee_medium,
    high:   cfg.urgency_fee_high,
  }
  const urgencySurcharge = urgencyMap[intent.severity] ?? 0

  // ── Loyalty discount (capped by DB config) ────────────────────────────────────
  const loyaltyDiscount = Math.min(
    cfg.loyalty_discount_cap,
    Math.floor((context.loyaltyPoints ?? 0) / 100) * 50
  )

  // ── Platform fee (fixed + % of service subtotal) ──────────────────────────────
  const serviceSubtotal = visitFee + laborFee + urgencySurcharge - loyaltyDiscount
  const platformFee = Math.round(
    cfg.platform_fee_fixed + (serviceSubtotal * cfg.platform_fee_percent / 100)
  )

  // ── Total = service subtotal + platform fee, never below visit fee ────────────
  const total = Math.max(visitFee, serviceSubtotal + platformFee)

  console.log(`\n[PricingController] ── Calculating quote for ${provider.name} ──`)
  console.log(`  visitFee=${visitFee} | laborFee=${hourlyRate}×${estimatedHours}hr=${laborFee} | urgency=${urgencySurcharge} | loyalty=-${loyaltyDiscount}`)
  console.log(`  serviceSubtotal=${serviceSubtotal} | platformFee=${platformFee} (fixed=${cfg.platform_fee_fixed} + ${cfg.platform_fee_percent}%) | TOTAL=${total} PKR`)
  console.log(`  complexity=${complexity.complexity} | severity=${intent.severity} | loyaltyPoints=${context.loyaltyPoints ?? 0}`)

  const breakdown: PriceBreakdown = {
    visitFee,
    estimatedHours,
    hourlyRate,
    laborFee,
    urgencySurcharge,
    loyaltyDiscount,
    platformFee,
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
      ` + Urgency: PKR ${urgencySurcharge} - Loyalty: PKR ${loyaltyDiscount} + PlatformFee: PKR ${platformFee} = PKR ${total}`,
    tool_calls: { tool: 'PricingEngine' },
    confidence_score: 0.9,
  })

  return output
}
