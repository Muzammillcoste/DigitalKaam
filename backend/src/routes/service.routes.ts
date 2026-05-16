import { Router, Request, Response } from 'express'
import { runAntigravityOrchestrator } from '../orchestrator/antigravity'

const router = Router()

// POST /api/service/request
// Main entry point — runs full Antigravity pipeline
router.post('/request', async (req: Request, res: Response) => {
  const { userInput, userId, requestedDate, requestedTime, location } = req.body

  if (!userInput || !userId) {
    return res.status(400).json({ error: 'userInput and userId are required' })
  }

  // Default to tomorrow morning if not provided
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  const result = await runAntigravityOrchestrator({
    userInput,
    userId,
    requestedDate: requestedDate ?? defaultDate,
    requestedTime: requestedTime ?? '10:00',
    location,
  })

  return res.json(result)
})

export default router
