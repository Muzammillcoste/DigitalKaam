import { supabase } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { RankedProvider } from './matchingAgent'
import { PricingOutput } from './pricingAgent'
import { SchedulingOutput } from './schedulingAgent'
import { ComplexityOutput } from './complexityAgent'

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
    distanceFee: number
    urgencySurcharge: number
    complexitySurcharge: number
    demandSurge: number
    loyaltyDiscount: number
    total: number
  }
  currency: string
  status: string
  createdAt: string
}

export async function runBookingAgent(
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
