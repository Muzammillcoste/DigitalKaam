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
      requestedDate: {
        type: Type.STRING,
        description: 'The requested date in YYYY-MM-DD format. You must deduce this from user input (e.g. tomorrow = tomorrow\'s date).'
      },
      requestedTime: {
        type: Type.STRING,
        description: 'The requested time in strict 24-hour HH:mm format (e.g., 10:00, 14:00). Deduce from user input ("morning" = 10:00, "ASAP" = next hour).'
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
    required: ['providerId', 'requestedDate', 'requestedTime', 'estimatedHours']
  },
  execute: async (args: any) => {
    try {
      const result = await processScheduling(
        { id: args.providerId } as any, // Mock provider
        args.requestedDate,
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
