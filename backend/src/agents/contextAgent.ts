import { supabase } from '../lib/supabase'
import { IntentOutput } from './intentAgent'

export interface ContextOutput {
  userId: string
  loyaltyPoints: number
  preferredProviders: string[]
  blacklistedProviders: string[]
  pastServiceTypes: string[]
  homeArea: string
  isReturningUser: boolean
}

export async function runContextAgent(intent: IntentOutput, userId: string, sessionId: string): Promise<ContextOutput> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const output: ContextOutput = {
    userId,
    loyaltyPoints: profile?.loyalty_points ?? 0,
    preferredProviders: profile?.preferred_providers ?? [],
    blacklistedProviders: profile?.blacklisted_providers ?? [],
    pastServiceTypes: profile?.past_service_types ?? [],
    homeArea: profile?.home_area ?? intent.location,
    isReturningUser: (profile?.booking_count ?? 0) > 0,
  }

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'ContextAgent',
    input: { userId, intent },
    output,
    reasoning: `Retrieved user profile. Returning user: ${output.isReturningUser}. Loyalty points: ${output.loyaltyPoints}. Blacklisted providers: ${output.blacklistedProviders.length}.`,
    tool_calls: { tool: 'SupabaseDB', table: 'user_profiles' },
    confidence_score: 1.0,
  })

  return output
}
