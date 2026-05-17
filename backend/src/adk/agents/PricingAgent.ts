import { Agent } from '../Agent'
import { CalculateQuoteTool } from '../tools/CalculateQuoteTool'

export const PricingAgent = new Agent({
  name: 'PricingAgent',
  instructions: 'You are the Pricing Agent. Your job is to calculate dynamic pricing quotes for a service based on complexity and the provider base rate using the calculate_dynamic_pricing tool. Explain the price breakdown clearly.',
  tools: [CalculateQuoteTool]
})
