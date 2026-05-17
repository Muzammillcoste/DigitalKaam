import { Tool } from '../Tool'
import { processBooking } from '../../controllers/bookingController'
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
      sessionId: {
        type: Type.STRING,
        description: 'Session ID for tracing'
      }
    },
    required: ['providerId', 'userId', 'userRequest', 'finalPrice']
  },
  execute: async (args: any) => {
    try {
      const result = await processBooking(
        args.userId,
        { id: args.providerId } as any, // Mock provider
        { total: args.finalPrice, currency: 'PKR', breakdown: {} } as any, // Mock pricing
        { slot: 'ASAP', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() } as any, // Mock scheduling
        {} as any, // Mock complexity
        args.userRequest || 'ADK Booking', // userRequest
        'unknown', // location
        args.sessionId || 'adk-session'
      )
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
