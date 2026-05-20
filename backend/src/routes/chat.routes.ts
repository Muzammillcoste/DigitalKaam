import { Router, Request, Response } from 'express'
import { orchestratorAgent } from '../adk/agents/OrchestratorAgent'
import { summarizeConversation, MessageTurn } from '../adk/agents/SummarizerAgent'
import { Agent } from '../adk/Agent'
import { requireAuth } from '../middleware/auth'
import { supabase } from '../lib/supabase'
import { transcribeAudio, generateSpeech } from '../lib/gemini'

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

  console.log(`\n[CHAT] POST /api/chat — userId='${userId}' sessionId='${sessionId}'`)

  try {
    // ── 1. Load or initialize session state from DB ──────────────────────────
    console.log(`[CHAT] Step 1 — Looking up session '${sessionId}' in DB...`)
    let { data: sessionData, error: sessionLookupError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (sessionLookupError && sessionLookupError.code !== 'PGRST116') {
      console.error('[CHAT] Session lookup error:', sessionLookupError)
    }
    console.log(`[CHAT] Session lookup result: ${sessionData ? 'FOUND (turn_count=' + sessionData.turn_count + ')' : 'NOT FOUND'}`)

    if (!sessionData) {
      // First message in this session — create the session record
      console.log(`[CHAT] Step 1b — Creating new session record...`)
      const { data: newSession, error: insertError } = await supabase
        .from('chat_sessions')
        .insert({ session_id: sessionId, user_id: userId, summary: '', turn_count: 0 })
        .select()
        .single()
      if (insertError) {
        console.error('[CHAT] ❌ Session INSERT failed:', insertError.code, insertError.message)
        // If it failed due to booking_ids column, try without it
        if (insertError.code === '42703') {
          console.log('[CHAT] Retrying session insert without booking_ids...')
          const { data: retrySession, error: retryError } = await supabase
            .from('chat_sessions')
            .insert({ session_id: sessionId, user_id: userId, summary: '', turn_count: 0 })
            .select()
            .single()
          if (retryError) {
            console.error('[CHAT] ❌ Retry also failed:', retryError.message)
            return res.status(500).json({ error: `Session creation failed: ${retryError.message}` })
          }
          sessionData = retrySession
        } else if (insertError.code === '23503') {
          // FK violation — user_profiles row is truly missing
          console.error('[CHAT] ❌ FK violation: user_profiles row missing for userId:', userId)
          return res.status(500).json({ error: `User profile not found. Run seed or create profile for userId: ${userId}` })
        } else {
          return res.status(500).json({ error: `Session creation failed: ${insertError.message}` })
        }
      } else {
        sessionData = newSession
        console.log(`[CHAT] ✅ New session created: '${sessionId}'`)
      }
    }

    const currentTurnCount: number = sessionData?.turn_count || 0
    const existingSummary: string = sessionData?.summary || ''

    // ── 2. Load recent messages from DB (LAST N, not first N) ────────────────
    console.log(`[CHAT] Step 2 — Loading last ${WINDOW_SIZE} messages for session '${sessionId}'...`)
    // FIX: Query descending to get the most recent messages, then reverse
    const { data: recentMessagesDesc } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(WINDOW_SIZE)

    // Reverse to chronological order for the agent's context
    const recentMessages = recentMessagesDesc ? [...recentMessagesDesc].reverse() : []
    console.log(`[CHAT] Step 2 — Loaded ${recentMessages.length} recent messages`)

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
    console.log(`[CHAT] Step 6 — Running OrchestratorAgent for session '${sessionId}'...`)
    const responseText = await agent.run(message)
    console.log(`[CHAT] Step 6 — Agent response length: ${responseText.length} chars`)

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
    console.error('[CHAT] ❌ Unhandled error in POST /api/chat:', error)
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

  console.log(`[CHAT] GET /history — userId='${userId}' sessionId='${sessionId || '(all sessions)'}'`)

  try {
    if (sessionId) {
      // ── Step 1: Fetch session by session_id ONLY (avoid booking_ids issue & user_id mismatch in query)
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('user_id, summary, turn_count, last_active')
        .eq('session_id', sessionId as string)
        .single()

      console.log(`[CHAT] GET /history — DB lookup: session found=${!!session} dbUserId='${session?.user_id}' jwtUserId='${userId}' err=${sessionError?.code || 'none'} msg=${sessionError?.message || ''}`)

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          return res.status(404).json({ error: `Session '${sessionId}' not found in database. Start a conversation first via POST /api/chat.` })
        }
        return res.status(500).json({ error: sessionError.message })
      }

      // ── Step 2: Check ownership in code (not in DB query)
      if (session.user_id !== userId) {
        console.warn(`[CHAT] GET /history — OWNERSHIP MISMATCH: session belongs to '${session.user_id}', JWT is '${userId}'`)
        return res.status(403).json({ error: 'Access denied: this session belongs to a different user.' })
      }

      // ── Step 3: Fetch messages
      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId as string)
        .order('created_at', { ascending: true })

      if (msgError) {
        console.error('[CHAT] GET /history — messages fetch error:', msgError)
        return res.status(500).json({ error: msgError.message })
      }

      // ── Step 4: Try to fetch booking_ids (optional — column may not exist yet)
      let bookingIds: string[] = []
      try {
        const { data: sessionFull } = await supabase
          .from('chat_sessions')
          .select('booking_ids')
          .eq('session_id', sessionId as string)
          .single()
        bookingIds = sessionFull?.booking_ids || []
      } catch { /* booking_ids column may not exist — non-fatal */ }

      console.log(`[CHAT] GET /history — returning ${messages?.length || 0} messages`)
      return res.json({
        sessionId,
        messages: messages || [],
        summary: session.summary || '',
        turnCount: session.turn_count || 0,
        bookingIds
      })
    } else {
      // Return all sessions for this user (for a "Past Conversations" screen)
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('session_id, summary, turn_count, last_active')
        .eq('user_id', userId)
        .order('last_active', { ascending: false })

      if (error) {
        console.error('[CHAT] GET /history (all sessions) error:', error)
        return res.status(500).json({ error: error.message })
      }
      console.log(`[CHAT] GET /history — returning ${sessions?.length || 0} sessions for user`)
      return res.json({ sessions: sessions || [] })
    }
  } catch (error: any) {
    console.error('[CHAT] ❌ GET /history unhandled error:', error)
    return res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/chat/transcribe
 * Standalone audio-to-text using Gemini multimodal.
 * Mobile calls this to show the user what was heard before sending to /api/chat.
 *
 * Body: { audio: string (base64), mimeType: string }
 * Returns: { transcription: string }
 *
 * Supported mimeTypes: audio/m4a | audio/mp4 | audio/wav | audio/webm | audio/ogg
 * Audio size limit: 20MB (Gemini inline data cap — typical voice msg is <1MB)
 */
router.post('/transcribe', async (req: Request, res: Response) => {
  const { audio, mimeType } = req.body

  if (!audio || !mimeType) {
    return res.status(400).json({ error: 'audio (base64) and mimeType are required' })
  }

  const SUPPORTED_TYPES = ['audio/m4a', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mpeg']
  if (!SUPPORTED_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: `Unsupported mimeType. Use one of: ${SUPPORTED_TYPES.join(', ')}` })
  }

  // Rough size check: base64 is ~4/3 of raw bytes. 20MB raw ≈ 27MB base64
  if (audio.length > 27 * 1024 * 1024) {
    return res.status(400).json({ error: 'Audio too large. Max 20MB.' })
  }

  try {
    console.log(`[Chat/Transcribe] Transcribing audio — mimeType=${mimeType} size=${(audio.length / 1024).toFixed(1)}KB`)
    const transcription = await transcribeAudio(audio, mimeType)
    console.log(`[Chat/Transcribe] Result: "${transcription}"`)
    return res.json({ transcription })
  } catch (error: any) {
    console.error('[Chat/Transcribe] Error:', error.message)
    return res.status(500).json({ error: `Transcription failed: ${error.message}` })
  }
})

/**
 * POST /api/chat/voice
 * Full voice pipeline: Audio in → STT → Orchestrator AI → TTS → Audio out
 *
 * Body: { audio: string (base64), mimeType: string, sessionId: string, voice?: string }
 * Returns: { transcription, response, audioBase64, audioMimeType, userId, turnCount }
 *
 * transcription — what Gemini heard (show as user's chat bubble)
 * response      — AI text reply (show as AI chat bubble)
 * audioBase64   — base64 WAV of spoken response (play directly)
 * audioMimeType — always 'audio/wav'
 */
router.post('/voice', async (req: Request, res: Response) => {
  const { audio, mimeType, sessionId, voice = 'Kore' } = req.body
  const userId = req.user!.id

  if (!audio || !mimeType || !sessionId) {
    return res.status(400).json({ error: 'audio (base64), mimeType, and sessionId are required' })
  }

  console.log(`\n[Chat/Voice] userId='${userId}' sessionId='${sessionId}' mimeType=${mimeType}`)

  try {
    // ── Step 1: STT — transcribe audio to text ────────────────────────────────
    console.log('[Chat/Voice] Step 1 — Transcribing audio...')
    const transcription = await transcribeAudio(audio, mimeType)

    if (!transcription) {
      return res.status(422).json({ error: 'Could not transcribe audio. Please speak clearly and try again.' })
    }
    console.log(`[Chat/Voice] Transcription: "${transcription}"`)

    // ── Step 2: AI — run through orchestrator ────────────────────────────────
    console.log('[Chat/Voice] Step 2 — Running AI orchestrator...')
    const chatResponse = await runChatAndReturnResponse(userId, transcription, sessionId)
    console.log(`[Chat/Voice] AI response: "${chatResponse.response.slice(0, 80)}..."`)

    // ── Step 3: TTS — convert AI response to speech ──────────────────────────
    console.log(`[Chat/Voice] Step 3 — Generating speech (voice=${voice})...`)
    const audioBase64 = await generateSpeech(chatResponse.response, voice)
    console.log(`[Chat/Voice] TTS done — WAV size=${(audioBase64.length / 1024).toFixed(1)}KB (base64)`)

    return res.json({
      transcription,
      response:      chatResponse.response,
      audioBase64,
      audioMimeType: 'audio/wav',
      userId,
      turnCount:     chatResponse.turnCount,
    })
  } catch (error: any) {
    console.error('[Chat/Voice] Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
})

/**
 * Shared logic extracted from POST /api/chat so both /chat and /voice can use it
 * without code duplication or internal HTTP calls.
 */
async function runChatAndReturnResponse(
  userId: string,
  message: string,
  sessionId: string
): Promise<{ response: string; turnCount: number }> {
  // Session lookup / creation
  let { data: sessionData } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (!sessionData) {
    const { data: newSession, error: insertError } = await supabase
      .from('chat_sessions')
      .insert({ session_id: sessionId, user_id: userId, summary: '', turn_count: 0 })
      .select()
      .single()
    if (insertError) throw new Error(`Session creation failed: ${insertError.message}`)
    sessionData = newSession
  }

  const currentTurnCount: number = sessionData?.turn_count || 0
  const existingSummary: string  = sessionData?.summary || ''

  // Load recent messages
  const { data: recentMessagesDesc } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(WINDOW_SIZE)
  const recentMessages = recentMessagesDesc ? [...recentMessagesDesc].reverse() : []

  // Build / retrieve agent
  let agent = agentCache.get(sessionId)
  const summaryBlock = existingSummary ? `\nConversation Summary So Far:\n${existingSummary}\n` : ''
  const staticUserContext =
    `\nIMPORTANT CONTEXT:` +
    `\n- The authenticated user's ID is '${userId}'. Use this as 'userId' in 'confirm_service_booking'.` +
    `\n- The current session ID is '${sessionId}'.` +
    `\n${summaryBlock}`

  if (!agent) {
    agent = new Agent({
      name: orchestratorAgent.name,
      instructions: orchestratorAgent.instructions + staticUserContext,
      tools: orchestratorAgent.tools,
    })
    agent.baseInstructions = orchestratorAgent.instructions + staticUserContext
    for (const msg of recentMessages) {
      agent.memory.addMessage(msg.role === 'user' ? 'user' : 'model', [{ text: msg.content }])
    }
    agentCache.set(sessionId, agent)
  }

  agent.sessionMetadata = { sessionId, userId }
  const freshBookingFacts = await buildBookingFactsBlock(sessionId)
  agent.instructions = agent.baseInstructions + (freshBookingFacts ?? '')

  // Persist user message
  await supabase.from('chat_messages').insert({ session_id: sessionId, user_id: userId, role: 'user', content: message })

  // Run agent
  const responseText = await agent.run(message)

  // Persist AI response
  await supabase.from('chat_messages').insert({ session_id: sessionId, user_id: userId, role: 'assistant', content: responseText })

  // Update turn count
  await supabase
    .from('chat_sessions')
    .update({ turn_count: currentTurnCount + 1, last_active: new Date().toISOString() })
    .eq('session_id', sessionId)

  return { response: responseText, turnCount: currentTurnCount + 1 }
}

export default router
