import { Router, Request, Response } from 'express'
import { orchestratorAgent } from '../adk/agents/OrchestratorAgent'
import { summarizeConversation, MessageTurn } from '../adk/agents/SummarizerAgent'
import { Agent } from '../adk/Agent'
import { requireAuth } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = Router()

// Constants for context management
const WINDOW_SIZE = 6       // Keep last N messages verbatim in context
const SUMMARIZE_EVERY = 8  // Trigger summarization every N turns

// In-memory agent cache: sessionId -> Agent instance (for the current server run)
// This avoids rebuilding the Agent on every single request within the same run.
// On restart, the Agent is rebuilt from DB history (see below).
const agentCache = new Map<string, Agent>()

// Apply JWT auth to all /api/chat routes
router.use(requireAuth)

/**
 * Loads confirmed bookings from the DB for a session and builds
 * a factual context block that the AI cannot hallucinate away.
 * This is the restart-proof source of truth for booking state.
 */
async function buildBookingFactsBlock(sessionId: string): Promise<string> {
  try {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, provider_id, user_request, status, scheduled_time, price, created_at')
      .eq('session_id', sessionId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: true })

    if (!bookings || bookings.length === 0) return ''

    // Enrich with provider names
    const providerIds = [...new Set(bookings.map((b: any) => b.provider_id))]
    const { data: providers } = await supabase
      .from('providers')
      .select('id, name, phone, service_type')
      .in('id', providerIds)

    const providerMap = new Map((providers || []).map((p: any) => [p.id, p]))

    const bookingLines = bookings.map((b: any) => {
      const provider = providerMap.get(b.provider_id)
      const providerName = provider?.name || 'Unknown'
      const serviceType = provider?.service_type || 'Unknown'
      const scheduledTime = b.scheduled_time
        ? new Date(b.scheduled_time).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Unknown'
      return `  - Booking ID: ${b.id} | Provider: ${providerName} (${serviceType}) | Time: ${scheduledTime} | Price: ${b.price} PKR | Status: ${b.status}`
    })

    return `\n=== CONFIRMED BOOKINGS IN THIS SESSION (FROM DATABASE — DO NOT CONTRADICT) ===\n${bookingLines.join('\n')}\n=== END BOOKINGS ===\nIMPORTANT: The above bookings are ALREADY CONFIRMED in the database. Do NOT re-book them. If the user asks for their booking number, provide it from the list above. Do NOT say "booking is not confirmed" when it clearly is.\n`
  } catch (error) {
    console.error('[BookingFacts] Failed to load booking facts (non-fatal):', error)
    return ''
  }
}

/**
 * POST /api/chat
 * Main conversational endpoint. Authenticated users only.
 */
router.post('/', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body
  const userId = req.user!.id

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' })
  }

  try {
    // ── 1. Load or initialize session state from DB ──────────────────────────
    let { data: sessionData } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!sessionData) {
      // First message in this session — create the session record
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({ session_id: sessionId, user_id: userId, summary: '', turn_count: 0, booking_ids: [] })
        .select()
        .single()
      sessionData = newSession
    }

    const currentTurnCount: number = sessionData?.turn_count || 0
    const existingSummary: string = sessionData?.summary || ''

    // ── 2. Load recent messages from DB (LAST N, not first N) ────────────────
    // FIX: Query descending to get the most recent messages, then reverse
    const { data: recentMessagesDesc } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(WINDOW_SIZE)

    // Reverse to chronological order for the agent's context
    const recentMessages = recentMessagesDesc ? [...recentMessagesDesc].reverse() : []

    // ── 3. Maybe trigger summarization ───────────────────────────────────────
    let activeSummary = existingSummary
    const shouldSummarize = currentTurnCount > 0 && currentTurnCount % SUMMARIZE_EVERY === 0

    if (shouldSummarize) {
      console.log(`[SummarizerAgent] Triggered at turn ${currentTurnCount} for session ${sessionId}`)
      try {
        // FIX: Get total message count first, then fetch everything EXCEPT the recent window
        const { count: totalMessageCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)

        const totalCount = totalMessageCount || 0
        const olderCount = Math.max(0, totalCount - WINDOW_SIZE)

        if (olderCount > 0) {
          const { data: olderMessages } = await supabase
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(olderCount)

          if (olderMessages && olderMessages.length > 0) {
            const turns: MessageTurn[] = olderMessages.map((m: any) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            }))
            activeSummary = await summarizeConversation(turns)

            // Persist updated summary
            await supabase
              .from('chat_sessions')
              .update({ summary: activeSummary })
              .eq('session_id', sessionId)

            console.log(`[SummarizerAgent] Summary updated for session ${sessionId}`)
          }
        }
      } catch (summaryError) {
        console.error('[SummarizerAgent] Summarization failed (non-fatal):', summaryError)
        // Non-fatal — continue with existing summary
      }
    }

    // ── 4. Get or build Agent for this session ───────────────────────────────
    let agent = agentCache.get(sessionId)

    // Static context: userId + sessionId + summary (stable per session, no booking state)
    const summaryBlock = activeSummary
      ? `\nConversation Summary So Far:\n${activeSummary}\n`
      : ''
    const staticUserContext =
      `\nIMPORTANT CONTEXT:` +
      `\n- The authenticated user's ID is '${userId}'. Use this as 'userId' in 'confirm_service_booking'. Do NOT use any other value.` +
      `\n- The current session ID is '${sessionId}'. It is injected automatically into every tool call — you do NOT need to pass it manually.` +
      `\n${summaryBlock}`

    if (!agent) {
      agent = new Agent({
        name: orchestratorAgent.name,
        instructions: orchestratorAgent.instructions + staticUserContext,
        tools: orchestratorAgent.tools
      })
      // baseInstructions is set by Agent constructor to match instructions.
      // We only need to update it here if staticUserContext needs re-baking.
      agent.baseInstructions = orchestratorAgent.instructions + staticUserContext

      // Replay recent verbatim history into the Agent's memory
      if (recentMessages && recentMessages.length > 0) {
        for (const msg of recentMessages) {
          agent.memory.addMessage(
            msg.role === 'user' ? 'user' : 'model',
            [{ text: msg.content }]
          )
        }
      }

      agentCache.set(sessionId, agent)
    }

    // ── Always inject sessionId + userId into every tool call (server-enforced). ──
    // This is the primary fix for bookings being stored as session_id='adk-session'
    // because the LLM forgot to pass sessionId to ConfirmBookingTool.
    agent.sessionMetadata = { sessionId, userId }

    // ── Always refresh booking facts in system instructions. ──────────────────
    // Fixes: (1) cached agent not seeing new bookings, (2) restart losing booking context.
    // Uses baseInstructions so we never lose the base prompt on repeated refreshes.
    const freshBookingFacts = await buildBookingFactsBlock(sessionId)
    agent.instructions = agent.baseInstructions + (freshBookingFacts ?? '')

    // ── 5. Persist the user's message ────────────────────────────────────────
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'user',
      content: message
    })

    // ── 6. Run the Orchestrator ───────────────────────────────────────────────
    const responseText = await agent.run(message)

    // ── 7. Persist the AI's response ─────────────────────────────────────────
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'assistant',
      content: responseText
    })

    // ── 8. Increment turn count & update last_active ──────────────────────────
    await supabase
      .from('chat_sessions')
      .update({
        turn_count: currentTurnCount + 1,
        last_active: new Date().toISOString()
      })
      .eq('session_id', sessionId)

    return res.json({
      response: responseText,
      userId,
      turnCount: currentTurnCount + 1,
      summarizedAt: shouldSummarize ? currentTurnCount : null
    })

  } catch (error: any) {
    console.error('Chat error:', error)
    return res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/chat/history?sessionId=xxx
 * Returns the full message history for a session (for the chat UI).
 * Optionally returns all sessions for the user if no sessionId is provided.
 */
router.get('/history', async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { sessionId } = req.query

  try {
    if (sessionId) {
      // Verify ownership via the session record first
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('summary, turn_count, last_active, booking_ids')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single()

      if (sessionError && sessionError.code !== 'PGRST116') {
        return res.status(500).json({ error: sessionError.message })
      }
      // If the session doesn't exist or belongs to another user, return 404
      if (!session) {
        return res.status(404).json({ error: 'Session not found or access denied.' })
      }

      // Fetch messages by session_id only — ownership already verified above
      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (msgError) return res.status(500).json({ error: msgError.message })

      return res.json({ sessionId, messages, summary: session.summary || '', turnCount: session.turn_count || 0, bookingIds: session.booking_ids || [] })
    } else {
      // Return all sessions for this user (for a "Past Conversations" screen)
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('session_id, summary, turn_count, last_active, booking_ids')
        .eq('user_id', userId)
        .order('last_active', { ascending: false })

      if (error) return res.status(500).json({ error: error.message })
      return res.json({ sessions })
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
})

export default router
