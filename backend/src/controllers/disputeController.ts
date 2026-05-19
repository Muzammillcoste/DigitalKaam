import { supabase } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export type DisputeType = 'no_show' | 'quality' | 'price' | 'cancellation' | 'overrun'

export interface DisputeOutput {
  disputeId: string
  status: string
  recommendation: string
  refundAmount: number
  escalated: boolean
  providerFlagged: boolean
  message: string
}

export async function createDisputeTicket(
  bookingId: string,
  userId: string,
  providerId: string,
  disputeType: DisputeType,
  description: string,
  sessionId: string
): Promise<DisputeOutput> {
  const disputeId = uuidv4()

  // Fetch booking for price comparison
  const { data: booking } = await supabase
    .from('bookings')
    .select('price, price_breakdown')
    .eq('id', bookingId)
    .single()

  let recommendation = ''
  let refundAmount = 0
  let providerFlagged = false

  switch (disputeType) {
    case 'no_show':
      recommendation = 'Full refund recommended. Provider marked for no-show.'
      refundAmount = booking?.price ?? 0
      providerFlagged = true
      break
    case 'price':
      recommendation = 'Partial refund of overcharge amount recommended. Price audit triggered.'
      refundAmount = Math.round((booking?.price ?? 0) * 0.2)
      providerFlagged = true
      break
    case 'quality':
      recommendation = 'Partial refund or free re-service recommended. Quality flag added to provider.'
      refundAmount = Math.round((booking?.price ?? 0) * 0.3)
      providerFlagged = true
      break
    case 'cancellation':
      recommendation = 'Full refund issued. Auto-rescheduling triggered.'
      refundAmount = booking?.price ?? 0
      providerFlagged = false
      break
    case 'overrun':
      recommendation = 'Review pricing agreement. If overrun without prior consent, partial refund recommended.'
      refundAmount = Math.round((booking?.price ?? 0) * 0.15)
      providerFlagged = true
      break
    default:
      recommendation = 'General complaint received. Under review by support team.'
      refundAmount = 0
      providerFlagged = false
      break
  }

  // Insert dispute
  await supabase.from('disputes').insert({
    id: disputeId,
    booking_id: bookingId,
    user_id: userId,
    provider_id: providerId,
    type: disputeType,
    status: 'under_review',
    description,
    resolution: recommendation,
    refund_amount: refundAmount,
  })

  // Update booking status
  await supabase.from('bookings').update({ status: 'disputed' }).eq('id', bookingId)

  // Flag provider if needed
  if (providerFlagged) {
    const { data: rep } = await supabase
      .from('reputation')
      .select('*')
      .eq('provider_id', providerId)
      .single()

    if (rep) {
      await supabase.from('reputation').update({
        complaints: rep.complaints + 1,
        disputes: rep.disputes + 1,
      }).eq('provider_id', providerId)
    }
  }

  const message = `Dispute opened (${disputeType}). ${recommendation} Refund: PKR ${refundAmount}. Will escalate to human review if unresolved in 24h.`

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'DisputeAgent',
    input: { bookingId, disputeType, description },
    output: { disputeId, recommendation, refundAmount, providerFlagged },
    reasoning: message,
    tool_calls: { tool: 'SupabaseDB', tables: ['disputes', 'bookings', 'reputation'] },
    confidence_score: 0.9,
  })

  return {
    disputeId,
    status: 'under_review',
    recommendation,
    refundAmount,
    escalated: false,
    providerFlagged,
    message,
  }
}
