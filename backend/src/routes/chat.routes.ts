import { Router, Request, Response } from 'express'
import { orchestratorAgent } from '../adk/agents/OrchestratorAgent'
import { Agent } from '../adk/Agent'

const router = Router()

// In-memory session store for agents
const sessions = new Map<string, Agent>()

router.post('/', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' })
  }

  try {
    let agent = sessions.get(sessionId)
    if (!agent) {
      // Create a fresh instance for this session by copying config
      agent = new Agent({
        name: orchestratorAgent.name,
        instructions: orchestratorAgent.instructions,
        tools: orchestratorAgent.tools
      })
      sessions.set(sessionId, agent)
    }

    const responseText = await agent.run(message)

    return res.json({ 
      response: responseText,
      // We can also return the chat history if needed
      // history: agent.memory.getHistory()
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
