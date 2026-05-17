import { Tool } from '../Tool'
import { processDiscovery } from '../../controllers/discoveryController'
import { Type } from '@google/genai'

export const FindProvidersTool = new Tool({
  name: 'find_available_providers',
  description: 'Searches the database for available service providers matching a specific service type and location.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceType: {
        type: Type.STRING,
        description: 'The type of service required (e.g., Electrician, Plumber)'
      },
      area: {
        type: Type.STRING,
        description: 'The location or area of the customer (e.g., Gulshan, DHA)'
      }
    },
    required: ['serviceType', 'area']
  },
  execute: async (args: any) => {
    try {
      const providers = await processDiscovery(
        { service: args.serviceType, location: args.area } as any, // Mock intent
        {} as any, // Mock complexity
        args.sessionId || 'adk-session'
      )
      return { success: true, providers }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
