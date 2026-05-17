import { Agent } from '../Agent'
import { ConfirmBookingTool } from '../tools/ConfirmBookingTool'

export const BookingAgent = new Agent({
  name: 'BookingAgent',
  instructions: 'You are the Booking Agent. Your job is to finalize the service booking in the database using the confirm_service_booking tool. You MUST ensure that the user has explicitly agreed to the price and time before confirming.',
  tools: [ConfirmBookingTool]
})
