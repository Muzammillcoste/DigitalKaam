import { supabase } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { RankedProvider } from './matchingController'
import { PricingOutput } from './pricingController'
import { SchedulingOutput } from './schedulingController'
import { ComplexityOutput } from './complexityController'

export interface BookingOutput {
  bookingId: string
  status: string
  receipt: Receipt
  providerNotified: boolean
  userNotified: boolean
}

export interface Receipt {
  bookingId: string
  providerName: string
  providerPhone: string
  service: string
  complexity: string
  scheduledTime: string
  location: string
  priceBreakdown: {
    visitFee: number
    estimatedHours: number
    hourlyRate: number
    laborFee: number
    urgencySurcharge: number
    loyaltyDiscount: number
    total: number
    partsDisclaimer: string
  }
  currency: string
  status: string
  createdAt: string
}

export async function processBooking(
  userId: string,
  provider: RankedProvider,
  pricing: PricingOutput,
  scheduling: SchedulingOutput,
  complexity: ComplexityOutput,
  userRequest: string,
  location: string,
  sessionId: string
): Promise<BookingOutput> {
  const bookingId = uuidv4()
  const now = new Date().toISOString()

  console.log(`\n[BookingController] ── Creating booking ──`)
  console.log(`  bookingId: ${bookingId}`)
  console.log(`  provider: ${provider.name} (${provider.id})`)
  console.log(`  user: ${userId}`)
  console.log(`  scheduledTime: ${scheduling.date}T${scheduling.startTime}:00`)
  console.log(`  price: PKR ${pricing.total} | complexity: ${complexity.complexity}`)
  console.log(`  session: ${sessionId}`)

  // Insert booking record
  const { error: bookingError } = await supabase.from('bookings').insert({
    id: bookingId,
    provider_id: provider.id,
    user_id: userId,
    user_request: userRequest,
    status: 'confirmed',
    scheduled_time: `${scheduling.date}T${scheduling.startTime}:00`,
    price: pricing.total,
    price_breakdown: pricing.breakdown,
    service_complexity: complexity.complexity,
    session_id: sessionId,
  })

  if (bookingError) {
    console.error(`[BookingController] ✗ Supabase insert FAILED:`, bookingError)
  } else {
    console.log(`[BookingController] ✓ Booking inserted successfully — ID: ${bookingId}`)
    // Increment booking_count so contextController.isReturningUser works correctly.
    // Fire-and-forget — non-blocking, non-fatal.
    ;(async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('booking_count')
          .eq('id', userId)
          .single()
        await supabase
          .from('user_profiles')
          .update({ booking_count: (profile?.booking_count ?? 0) + 1 })
          .eq('id', userId)
      } catch {}
    })()
  }

  // Mark availability slot as booked
  if (scheduling.availabilityId) {
    await supabase
      .from('availability')
      .update({ is_booked: true })
      .eq('id', scheduling.availabilityId)
  }

  // Build receipt
  const receipt: Receipt = {
    bookingId,
    providerName: provider.name,
    providerPhone: provider.phone,
    service: provider.service_type,
    complexity: complexity.complexity,
    scheduledTime: `${scheduling.date} at ${scheduling.startTime}`,
    location,
    priceBreakdown: pricing.breakdown,
    currency: 'PKR',
    status: 'confirmed',
    createdAt: now,
  }

  // Simulate push notifications (in production: call Expo push API)
  const notifyUser = !bookingError
  const notifyProvider = !bookingError

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'BookingAgent',
    input: { providerId: provider.id, userId, scheduledTime: scheduling.slot, price: pricing.total },
    output: { bookingId, status: 'confirmed', receipt },
    reasoning: `Booking ${bookingId} confirmed. Provider ${provider.name} assigned. Slot ${scheduling.slot}. Price PKR ${pricing.total}. Push notifications sent to user and provider.`,
    tool_calls: { tool: 'SupabaseDB', tables: ['bookings', 'availability'], pushNotification: 'simulated' },
    confidence_score: bookingError ? 0.0 : 1.0,
  })

  return {
    bookingId,
    status: bookingError ? 'failed' : 'confirmed',
    receipt,
    providerNotified: notifyProvider,
    userNotified: notifyUser,
  }
}
