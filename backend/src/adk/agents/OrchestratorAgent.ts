import { Agent } from '../Agent'
import { FindProvidersTool } from '../tools/FindProvidersTool'
import { CalculateQuoteTool } from '../tools/CalculateQuoteTool'
import { CheckAvailabilityTool } from '../tools/CheckAvailabilityTool'
import { ConfirmBookingTool } from '../tools/ConfirmBookingTool'
import { CreateTicketTool } from '../tools/CreateTicketTool'

export const orchestratorAgent = new Agent({
  name: 'MainOrchestrator',
  instructions: `
You are the DigitalKaam Main Orchestrator Agent. Your goal is to help users find informal service providers (Electricians, Plumbers, Mechanics, etc.) in Pakistan.
You must communicate naturally, understanding Roman Urdu and English.
You have access to several specialized tools. Use them to fulfill the user's request.

Rules:
1. ALWAYS confirm the final price and time with the user BEFORE calling the 'confirm_service_booking' tool.
2. If the user asks for a provider, first use 'find_available_providers'.
3. Once a provider is found, use 'calculate_dynamic_pricing' to get a quote and 'check_time_slots' to see if they are available.
4. Explain the pricing breakdown clearly to the user.
5. Do not make up data. Always rely on the tools.
  `,
  tools: [
    FindProvidersTool,
    CalculateQuoteTool,
    CheckAvailabilityTool,
    ConfirmBookingTool,
    CreateTicketTool
  ]
})
