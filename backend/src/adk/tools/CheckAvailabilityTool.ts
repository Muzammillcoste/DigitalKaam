import { Tool } from '../Tool'
import { processScheduling } from '../../controllers/schedulingController'
import { Type } from '@google/genai'

export const CheckAvailabilityTool = new Tool({
  name: 'check_time_slots',
  description: 'Checks a provider\'s availability for a specific date and time slot.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      providerId: {
        type: Type.STRING,
        description: 'The UUID of the service provider'
      },
      requestedTime: {
        type: Type.STRING,
        description: 'The requested time (e.g., "Tomorrow Morning", "ASAP", or a specific ISO date)'
      },
      estimatedHours: {
        type: Type.INTEGER,
        description: 'How many hours the job will take'
      },
      sessionId: {
        type: Type.STRING,
        description: 'Session ID for tracing'
      }
    },
    required: ['providerId', 'requestedTime', 'estimatedHours']
  },
  execute: async (args: any) => {
    try {
      const result = await processScheduling(
        { id: args.providerId } as any, // Mock provider
        new Date().toISOString().split('T')[0], // Mock date
        args.requestedTime,
        args.estimatedHours,
        args.sessionId || 'adk-session'
      )
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
