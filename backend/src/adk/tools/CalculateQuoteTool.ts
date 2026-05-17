import { Tool } from '../Tool'
import { processPricing } from '../../controllers/pricingController'
import { Type } from '@google/genai'

export const CalculateQuoteTool = new Tool({
  name: 'calculate_dynamic_pricing',
  description: 'Calculates the dynamic price quote for a service based on complexity and the provider\'s base rate.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      bookingId: {
        type: Type.STRING,
        description: 'The UUID of the booking (or a temporary ID if not yet created)'
      },
      providerId: {
        type: Type.STRING,
        description: 'The UUID of the selected service provider'
      },
      userId: {
        type: Type.STRING,
        description: 'The UUID of the customer'
      },
      complexity: {
        type: Type.STRING,
        description: 'Complexity of the task: low, medium, or high. YOU MUST intelligently estimate this yourself based on the user\'s issue description. DO NOT ASK THE USER.'
      },
      estimatedHours: {
        type: Type.INTEGER,
        description: 'Estimated number of hours the job will take. YOU MUST intelligently estimate this yourself. DO NOT ASK THE USER.'
      },
      sessionId: {
        type: Type.STRING,
        description: 'Session ID for tracing'
      }
    },
    required: ['bookingId', 'providerId', 'userId', 'complexity', 'estimatedHours']
  },
  execute: async (args: any) => {
    try {
      const quote = await processPricing(
        { id: args.providerId, hourly_rate: 1000 } as any, // Mock provider
        {} as any, // Mock intent
        { complexity: args.complexity, multiplier: 1 } as any, // Mock complexity
        {} as any, // Mock context
        args.sessionId || 'adk-session'
      )
      return { success: true, quote }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
