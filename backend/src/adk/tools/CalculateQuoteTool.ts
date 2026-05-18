import { Tool } from '../Tool'
import { processPricing } from '../../controllers/pricingController'
import { supabase } from '../../lib/supabase'
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
      console.log(`\n[CalculateQuoteTool] ── Quote requested ──`)
      console.log(`  providerId=${args.providerId} | complexity=${args.complexity} | estimatedHours=${args.estimatedHours}`)

      // Fetch real provider data so we use the actual hourly_rate from DB
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select('id, name, hourly_rate')
        .eq('id', args.providerId)
        .single()

      if (providerError || !provider) {
        console.log(`[CalculateQuoteTool] ⚠ Provider not found (${args.providerId}), using fallback rate 800 PKR/hr`)
      } else {
        console.log(`  Provider: ${provider.name} | hourly_rate: PKR ${provider.hourly_rate}/hr`)
      }

      const mockProvider = {
        id: args.providerId,
        hourly_rate: provider?.hourly_rate ?? 800,
        name: provider?.name ?? 'Unknown',
      }

      const quote = await processPricing(
        mockProvider as any,
        { severity: 'medium' } as any,
        {
          complexity: args.complexity,
          estimatedDurationHours: args.estimatedHours,
          requiredCertifications: [],
          reason: '',
          confidence: 1,
        },
        { loyaltyPoints: 0 } as any,
        args.sessionId || 'adk-session'
      )
      console.log(`[CalculateQuoteTool] Quote calculated: PKR ${quote.total}`)
      return { success: true, quote }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})
