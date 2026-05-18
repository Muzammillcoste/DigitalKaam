import { Tool } from '../Tool'
import { createDisputeTicket } from '../../controllers/disputeController'
import { Type } from '@google/genai'

export const CreateTicketTool = new Tool({
  name: 'open_dispute_ticket',
  description: 'Opens a dispute ticket for an existing booking if the customer is dissatisfied.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      bookingId: {
        type: Type.STRING,
        description: 'The UUID of the booking'
      },
      userId: {
        type: Type.STRING,
        description: 'The UUID of the customer'
      },
      providerId: {
        type: Type.STRING,
        description: 'The UUID of the service provider'
      },
      disputeType: {
        type: Type.STRING,
        description: 'Type of dispute. Must be one of: no_show, quality, price, cancellation, overrun'
      },
      description: {
        type: Type.STRING,
        description: 'Detailed description of the issue'
      },
      sessionId: {
        type: Type.STRING,
        description: 'Session ID for tracing'
      }
    },
    required: ['bookingId', 'userId', 'providerId', 'disputeType', 'description']
  },
  execute: async (args: any) => {
    try {
      const result = await createDisputeTicket(
        args.bookingId,
        args.userId,
        args.providerId,
        args.disputeType,
        args.description,
        args.sessionId || 'adk-session'
      )
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
