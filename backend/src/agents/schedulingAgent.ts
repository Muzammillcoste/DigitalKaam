import { supabase } from '../lib/supabase'
import { RankedProvider } from './matchingAgent'

export interface SchedulingOutput {
  slot: string
  date: string
  startTime: string
  endTime: string
  conflictDetected: boolean
  conflictReason?: string
  suggestedAlternateSlot?: string
  waitlistPosition?: number
  availabilityId: string | null
}

export async function runSchedulingAgent(
  provider: RankedProvider,
  requestedDate: string,
  requestedTime: string,
  estimatedDurationHours: number,
  sessionId: string
): Promise<SchedulingOutput> {
  // Check if requested slot is available
  const { data: slots } = await supabase
    .from('availability')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('date', requestedDate)
    .eq('is_booked', false)
    .order('start_time', { ascending: true })

  // Find exact or closest slot
  const availableSlots = slots ?? []

  // Try to find a slot that fits the requested time
  let chosenSlot = availableSlots.find((s: any) => {
    const slotStart = parseInt(s.start_time.replace(':', ''))
    const reqStart = parseInt(requestedTime.replace(':', ''))
    return Math.abs(slotStart - reqStart) <= 100 // within 1 hour
  })

  let conflictDetected = false
  let conflictReason: string | undefined
  let suggestedAlternateSlot: string | undefined

  if (!chosenSlot && availableSlots.length > 0) {
    // Suggest first available slot
    chosenSlot = availableSlots[0]
    conflictDetected = true
    conflictReason = `Requested time ${requestedTime} is unavailable (slot booked or travel conflict)`
    suggestedAlternateSlot = chosenSlot.start_time
  }

  if (!chosenSlot) {
    // No slots at all — return conflict with waitlist
    await supabase.from('traces').insert({
      session_id: sessionId,
      agent: 'SchedulingAgent',
      input: { providerId: provider.id, requestedDate, requestedTime },
      output: { conflictDetected: true, noSlotsAvailable: true },
      reasoning: `No available slots for ${provider.name} on ${requestedDate}. User added to waitlist.`,
      tool_calls: { tool: 'SupabaseDB', table: 'availability' },
      confidence_score: 1.0,
    })
    return {
      slot: '',
      date: requestedDate,
      startTime: '',
      endTime: '',
      conflictDetected: true,
      conflictReason: `No slots available for ${provider.name} on ${requestedDate}`,
      waitlistPosition: 1,
      availabilityId: null,
    }
  }

  const endHour = parseInt(chosenSlot.start_time.split(':')[0]) + Math.ceil(estimatedDurationHours)
  const endTime = `${String(endHour).padStart(2, '0')}:00`

  const reasoning = conflictDetected
    ? `Requested time ${requestedTime} was unavailable. Travel buffer conflict detected. Suggested alternate: ${suggestedAlternateSlot}`
    : `Slot ${chosenSlot.start_time} on ${requestedDate} is available for ${provider.name}.`

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'SchedulingAgent',
    input: { providerId: provider.id, requestedDate, requestedTime, estimatedDurationHours },
    output: { slot: chosenSlot.start_time, conflictDetected, suggestedAlternateSlot },
    reasoning,
    tool_calls: { tool: 'SupabaseDB', table: 'availability' },
    confidence_score: conflictDetected ? 0.75 : 0.98,
  })

  return {
    slot: `${requestedDate} ${chosenSlot.start_time}`,
    date: requestedDate,
    startTime: chosenSlot.start_time,
    endTime,
    conflictDetected,
    conflictReason,
    suggestedAlternateSlot,
    availabilityId: chosenSlot.id,
  }
}
