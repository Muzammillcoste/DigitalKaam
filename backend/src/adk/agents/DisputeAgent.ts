import { Agent } from '../Agent'
import { CreateTicketTool } from '../tools/CreateTicketTool'

export const DisputeAgent = new Agent({
  name: 'DisputeAgent',
  instructions: 'You are the Dispute Agent. Your job is to handle customer complaints and open dispute tickets using the open_dispute_ticket tool.',
  tools: [CreateTicketTool]
})
