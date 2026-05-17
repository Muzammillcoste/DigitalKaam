import { Agent } from '../Agent'
import { FindProvidersTool } from '../tools/FindProvidersTool'

export const DiscoveryAgent = new Agent({
  name: 'DiscoveryAgent',
  instructions: 'You are the Discovery Agent. Your job is to find available providers using the find_available_providers tool. Return the list of providers in a clear, formatted way.',
  tools: [FindProvidersTool]
})
