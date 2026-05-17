import { Router, Request, Response } from 'express'
import { orchestratorAgent } from '../adk/agents/OrchestratorAgent'
import { Agent } from '../adk/Agent'
import { requireAuth } from '../middleware/auth'

const router = Router()

// In-memory session store: sessionId -> { agent, userId }
const sessions = new Map<string, { agent: Agent; userId: string }>()

// Apply JWT authentication to all /api/chat routes
router.use(requireAuth)

router.post('/', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body
  const userId = req.user!.id  // Guaranteed by requireAuth middleware

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' })
  }

  try {
    let session = sessions.get(sessionId)

    if (!session) {
      // Build session-specific instructions with the real authenticated user ID
      const userContext = `\nIMPORTANT CONTEXT:\n- The authenticated user's ID is '${userId}'. You MUST use this exact UUID as the 'userId' parameter whenever you call the 'confirm_service_booking' tool. Do NOT use any other value.\n`

      const agent = new Agent({
        name: orchestratorAgent.name,
        instructions: orchestratorAgent.instructions + userContext,
        tools: orchestratorAgent.tools
      })

      session = { agent, userId }
      sessions.set(sessionId, session)
    }

    const responseText = await session.agent.run(message)

    return res.json({
      response: responseText,
      userId: session.userId  // Return userId so client can confirm it's the right user
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
