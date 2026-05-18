import { Tool } from '../Tool'
import { processBooking } from '../../controllers/bookingController'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { Type } from '@google/genai'

export const ConfirmBookingTool = new Tool({
  name: 'confirm_service_booking',
  description: 'Finalizes and confirms the service booking. MUST ONLY BE CALLED AFTER EXPLICIT USER CONFIRMATION OF THE PRICE AND TIME.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      providerId: {
        type: Type.STRING,
        description: 'The UUID of the service provider'
      },
      userId: {
        type: Type.STRING,
        description: 'The UUID of the customer'
      },
      userRequest: {
        type: Type.STRING,
        description: 'The original request description'
      },
      finalPrice: {
        type: Type.INTEGER,
        description: 'The final agreed price'
      },
      requestedDate: {
        type: Type.STRING,
        description: 'The agreed date in YYYY-MM-DD format'
      },
      requestedTime: {
        type: Type.STRING,
        description: 'The agreed time in HH:mm format'
      },
      sessionId: {
        type: Type.STRING,
        description: 'Session ID for tracing'
      }
    },
    required: ['providerId', 'userId', 'userRequest', 'finalPrice', 'requestedDate', 'requestedTime']
  },
  execute: async (args: any) => {
    try {
      const sessionId = args.sessionId || 'adk-session'

      console.log(`[ConfirmBookingTool] Checking session guard for session: ${sessionId}`)

      console.log(`\n[ConfirmBookingTool] ── Booking request received ──`)
      console.log(`  sessionId: ${sessionId}`)
      console.log(`  providerId: ${args.providerId}`)
      console.log(`  userId: ${args.userId}`)
      console.log(`  finalPrice: PKR ${args.finalPrice}`)
      console.log(`  date: ${args.requestedDate} at ${args.requestedTime}`)
      console.log(`  userRequest: "${args.userRequest}"`)
      // Block ANY second booking within the same session, regardless of provider or time.
      // Prevents double-booking caused by:
      //   - LLM re-confirming after a generic acknowledgement ("صحیح ہے", "ok", "theek hai")
      //   - Context loss after server restart
      //   - Re-invocation 5–10 turns later when history window slides past the confirmation
      // For a new service, the user must start a new chat session.
      const { data: sessionBookings } = await supabase
        .from('bookings')
        .select('id, provider_id, scheduled_time, price, status')
        .eq('session_id', sessionId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: true })

      if (sessionBookings && sessionBookings.length > 0) {
        const ids = sessionBookings.map((b: any) => b.id).join(', ')
        console.log(`[ConfirmBookingTool] SESSION ALREADY BOOKED — Blocking duplicate. Existing ID(s): ${ids}`)
        return {
          success: false,
          alreadyBooked: true,
          existingBookings: sessionBookings.map((b: any) => ({
            bookingId: b.id,
            scheduledTime: b.scheduled_time,
            price: b.price,
          })),
          message: `This session already has a confirmed booking. Booking ID: ${ids}. ` +
            `Tell the user their existing booking ID and do NOT create a new booking. ` +
            `If they need a different service, ask them to start a new conversation.`,
        }
      }

      // ── PROCEED WITH NEW BOOKING ──────────────────────────────────────────
      console.log(`[ConfirmBookingTool] Session guard passed - proceeding with new booking`)

      // Fetch real provider data so the receipt has correct name/phone/service_type.
      // Previously this passed a mock { id } which caused null values in the receipt.
      const { data: realProvider, error: providerErr } = await supabase
        .from('providers')
        .select('id, name, phone, service_type, hourly_rate, area, lat, lng')
        .eq('id', args.providerId)
        .single()

      if (providerErr || !realProvider) {
        console.log(`[ConfirmBookingTool] Provider ${args.providerId} not found:`, providerErr?.message)
        return { success: false, error: `Provider not found: ${args.providerId}` }
      }
      console.log(`[ConfirmBookingTool] Fetched provider: ${realProvider.name} (${realProvider.service_type})`)

      // Calculate a sensible endTime — default 2h window, capped at 23:00
      const startHour = parseInt((args.requestedTime || '10:00').split(':')[0])
      const endHour = Math.min(23, startHour + 2)
      const endTime = `${String(endHour).padStart(2, '0')}:00`

      const result = await processBooking(
        args.userId,
        { ...realProvider, matchScore: 1, distanceKm: 0, scoreBreakdown: {}, selectionReason: '', isAvailable: true } as any,
        {
          total: args.finalPrice,
          currency: 'PKR',
          isBudgetFriendly: true,
          breakdown: {
            visitFee: 500,
            estimatedHours: 2,
            hourlyRate: realProvider.hourly_rate ?? 500,
            laborFee: Math.max(0, args.finalPrice - 500),
            urgencySurcharge: 0,
            loyaltyDiscount: 0,
            total: args.finalPrice,
            partsDisclaimer: 'Parts/materials not included. Final price may vary after inspection.',
          },
        } as any,
        {
          slot: `${args.requestedDate} ${args.requestedTime}`,
          date: args.requestedDate,
          startTime: args.requestedTime,
          endTime,
          conflictDetected: false,
          availabilityId: null,
        } as any,
        { complexity: 'intermediate', reason: 'Confirmed via chat', requiredCertifications: [], estimatedDurationHours: 2, confidence: 1 },
        args.userRequest || 'ADK Booking',
        realProvider.area || 'unknown',
        sessionId
      )

      // ── TRACK BOOKING ID ON SESSION ─────────────────────────────────────────
      // Append the new booking ID to the session's booking_ids array.
      // This is the restart-proof source of truth.
      if (result.bookingId) {
        try {
          // Fetch current booking_ids, then append
          const { data: sessionData } = await supabase
            .from('chat_sessions')
            .select('booking_ids')
            .eq('session_id', sessionId)
            .single()

          const currentIds: string[] = sessionData?.booking_ids || []
          currentIds.push(result.bookingId)

          await supabase
            .from('chat_sessions')
            .update({ booking_ids: currentIds })
            .eq('session_id', sessionId)

          console.log(`[ConfirmBookingTool] Tracked booking ${result.bookingId} on session ${sessionId}`)
        } catch (trackError) {
          console.error('[ConfirmBookingTool] Failed to track booking on session (non-fatal):', trackError)
        }
      }

      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
