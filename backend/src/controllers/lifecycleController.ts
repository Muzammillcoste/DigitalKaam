import { supabase } from '../lib/supabase'

export type LifecycleStatus =
  | 'confirmed'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'feedback_pending'
  | 'cancelled'
  | 'disputed'

export interface LifecycleOutput {
  bookingId: string
  previousStatus: string
  newStatus: LifecycleStatus
  completionPhotoUrl?: string
  message: string
  pushSentToUser: boolean
  pushSentToProvider: boolean
}

const STATUS_USER_MESSAGES: Record<string, string> = {
  en_route: 'Your provider is on the way to you!',
  arrived: 'Your provider has arrived at your location.',
  in_progress: 'Service has started.',
  completed: 'Your service is complete. Was everything satisfactory?',
  feedback_pending: 'Please rate your service experience.',
  cancelled: 'Your booking has been cancelled. We are finding you a new provider.',
}

const STATUS_PROVIDER_MESSAGES: Record<string, string> = {
  confirmed: 'New job assigned! Check your schedule.',
  en_route: 'You are marked as en route.',
  completed: 'Job marked as complete. Waiting for customer feedback.',
}

export async function updateLifecycleStatus(
  bookingId: string,
  newStatus: LifecycleStatus,
  completionPhotoUrl?: string,
  sessionId?: string
): Promise<LifecycleOutput> {
  // Fetch current booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('status, provider_id, user_id')
    .eq('id', bookingId)
    .single()

  const previousStatus = booking?.status ?? 'unknown'

  // Update fields
  const updateData: any = { status: newStatus }
  if (completionPhotoUrl) updateData.completion_photo_url = completionPhotoUrl

  await supabase.from('bookings').update(updateData).eq('id', bookingId)

  const userMessage = STATUS_USER_MESSAGES[newStatus] ?? `Status updated to ${newStatus}`
  const providerMessage = STATUS_PROVIDER_MESSAGES[newStatus] ?? ''

  // In production: send Expo push to user and provider push tokens
  // Simulated here

  if (sessionId) {
    await supabase.from('traces').insert({
      session_id: sessionId,
      agent: 'LifecycleAgent',
      input: { bookingId, requestedStatus: newStatus },
      output: { previousStatus, newStatus, completionPhotoUrl },
      reasoning: `Booking ${bookingId} status changed: ${previousStatus} → ${newStatus}. Push notifications triggered.`,
      tool_calls: { tool: 'SupabaseDB', table: 'bookings', pushNotification: 'simulated' },
      confidence_score: 1.0,
    })
  }

  return {
    bookingId,
    previousStatus,
    newStatus,
    completionPhotoUrl,
    message: userMessage,
    pushSentToUser: true,
    pushSentToProvider: !!providerMessage,
  }
}
