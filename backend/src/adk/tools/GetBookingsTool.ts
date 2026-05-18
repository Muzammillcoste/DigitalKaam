import { Tool } from '../Tool'
import { supabase } from '../../lib/supabase'
import { Type } from '@google/genai'

/**
 * GetBookingsTool — lets the agent reliably look up confirmed bookings for the
 * current session from the database instead of relying on (possibly stale) memory.
 *
 * Use this whenever the user asks for their booking ID, booking number, or wants
 * a summary of what was booked.
 */
export const GetBookingsTool = new Tool({
  name: 'get_session_bookings',
  description:
    'Retrieves all confirmed bookings for the current session from the database. ' +
    'Call this when the user asks for their booking ID, booking number, or wants to know what was booked.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sessionId: {
        type: Type.STRING,
        description: 'The current session ID (injected automatically — you do not need to supply it)',
      },
    },
    required: [],
  },
  execute: async (args: any) => {
    try {
      const sessionId: string = args.sessionId || 'adk-session'

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, provider_id, scheduled_time, price, status, user_request, created_at')
        .eq('session_id', sessionId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: true })

      if (error) return { success: false, error: error.message }

      if (!bookings || bookings.length === 0) {
        return {
          success: true,
          bookings: [],
          message: 'No confirmed bookings found for this session.',
        }
      }

      const providerIds = [...new Set(bookings.map((b: any) => b.provider_id))]
      const { data: providers } = await supabase
        .from('providers')
        .select('id, name, phone, service_type')
        .in('id', providerIds)

      const providerMap = new Map((providers || []).map((p: any) => [p.id, p]))

      const enriched = bookings.map((b: any) => {
        const provider = providerMap.get(b.provider_id)
        return {
          bookingId: b.id,
          providerName: provider?.name ?? 'Unknown',
          serviceType: provider?.service_type ?? 'Unknown',
          providerPhone: provider?.phone ?? 'N/A',
          scheduledTime: b.scheduled_time,
          price: b.price,
          status: b.status,
        }
      })

      return { success: true, bookings: enriched }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },
})
