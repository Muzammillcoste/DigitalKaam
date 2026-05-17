import { Tool } from '../Tool'
import { processDiscovery } from '../../controllers/discoveryController'
import { processMatching } from '../../controllers/matchingController'
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
      },
      requestedDate: {
        type: Type.STRING,
        description: 'The requested date in YYYY-MM-DD format. Deduce from user input.'
      },
      requestedTime: {
        type: Type.STRING,
        description: 'The requested time in strict 24-hour HH:mm format (e.g., 10:00). Deduce from user input.'
      }
    },
    required: ['serviceType', 'area', 'requestedDate', 'requestedTime']
  },
  execute: async (args: any) => {
    try {
      const intentMock = { service: args.serviceType, location: args.area } as any
      const discoveryOutput = await processDiscovery(
        intentMock,
        {} as any, // Mock complexity
        args.sessionId || 'adk-session'
      )

      const matchingOutput = await processMatching(
        discoveryOutput,
        intentMock,
        { preferredProviders: [], blacklistedProviders: [] } as any, // context
        args.requestedDate,
        args.requestedTime,
        args.sessionId || 'adk-session'
      )

      return { 
        success: true, 
        topProviders: matchingOutput.ranked.slice(0, 3), // Return top 3 so AI has fallbacks
        reasoning: matchingOutput.reasoning
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
