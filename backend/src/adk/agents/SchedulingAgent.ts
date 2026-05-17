import { Agent } from '../Agent'
import { CheckAvailabilityTool } from '../tools/CheckAvailabilityTool'

export const SchedulingAgent = new Agent({
  name: 'SchedulingAgent',
  instructions: 'You are the Scheduling Agent. Your job is to check a provider\'s time slots and verify if they are available for the requested time using the check_time_slots tool.',
  tools: [CheckAvailabilityTool]
})
