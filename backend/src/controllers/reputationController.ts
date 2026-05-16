import { supabase } from '../lib/supabase'

export interface ReputationOutput {
  providerId: string
  previousRating: number
  newRating: number
  newReviewRecencyScore: number
  matchingImpact: string
}

export async function updateReputation(
  bookingId: string,
  providerId: string,
  userId: string,
  rating: number,
  reviewText: string,
  sessionId: string
): Promise<ReputationOutput> {
  // Save feedback
  await supabase.from('feedback').insert({
    booking_id: bookingId,
    user_id: userId,
    provider_id: providerId,
    rating,
    review_text: reviewText,
  })

  // Mark booking feedback done
  await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId)

  // Fetch current provider stats
  const { data: provider } = await supabase
    .from('providers')
    .select('rating, review_count')
    .eq('id', providerId)
    .single()

  const prevRating = provider?.rating ?? 4.0
  const reviewCount = provider?.review_count ?? 0

  // Weighted moving average
  const newRating = Math.round(((prevRating * reviewCount + rating) / (reviewCount + 1)) * 10) / 10
  // Recent review resets recency score high
  const newReviewRecencyScore = 0.95

  // Update provider
  await supabase.from('providers').update({
    rating: newRating,
    review_count: reviewCount + 1,
    review_recency_score: newReviewRecencyScore,
  }).eq('id', providerId)

  // Update reputation table
  const { data: rep } = await supabase
    .from('reputation')
    .select('*')
    .eq('provider_id', providerId)
    .single()

  if (rep) {
    await supabase.from('reputation').update({
      positive_reviews: rating >= 4 ? rep.positive_reviews + 1 : rep.positive_reviews,
      negative_reviews: rating <= 2 ? rep.negative_reviews + 1 : rep.negative_reviews,
      last_updated: new Date().toISOString(),
    }).eq('provider_id', providerId)
  }

  const matchingImpact = rating >= 4
    ? 'Positive: this provider will rank higher in future matches'
    : rating <= 2
    ? 'Negative: this provider will rank lower in future matches'
    : 'Neutral: no significant change to ranking'

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'ReputationAgent',
    input: { providerId, rating, reviewText },
    output: { previousRating: prevRating, newRating, newReviewRecencyScore },
    reasoning: `Rating updated: ${prevRating} → ${newRating} (${reviewCount + 1} reviews). Review recency reset to 0.95. ${matchingImpact}`,
    tool_calls: { tool: 'SupabaseDB', tables: ['feedback', 'providers', 'reputation'] },
    confidence_score: 1.0,
  })

  return { providerId, previousRating: prevRating, newRating, newReviewRecencyScore, matchingImpact }
}
