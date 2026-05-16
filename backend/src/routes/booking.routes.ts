import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { runLifecycleAgent } from '../agents/lifecycleAgent'
import { runReputationAgent } from '../agents/reputationAgent'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// GET /api/booking/:bookingId — fetch booking + receipt
router.get('/:bookingId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, providers(name, phone, service_type, area, rating)')
    .eq('id', req.params.bookingId)
    .single()
  if (error) return res.status(404).json({ error: 'Booking not found' })
  return res.json(data)
})

// GET /api/booking/user/:userId — all bookings for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, providers(name, service_type, rating)')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// PATCH /api/booking/:bookingId/status — lifecycle status update (provider calls this)
router.patch('/:bookingId/status', async (req: Request, res: Response) => {
  const { status, completionPhotoUrl, sessionId } = req.body
  const result = await runLifecycleAgent(
    req.params.bookingId,
    status,
    completionPhotoUrl,
    sessionId ?? uuidv4()
  )
  return res.json(result)
})

// POST /api/booking/:bookingId/feedback — user submits rating after completion
router.post('/:bookingId/feedback', async (req: Request, res: Response) => {
  const { userId, providerId, rating, reviewText, sessionId } = req.body
  if (!userId || !providerId || !rating) {
    return res.status(400).json({ error: 'userId, providerId, and rating are required' })
  }
  const { runReputationAgent: repAgent } = await import('../agents/reputationAgent')
  const result = await repAgent(
    req.params.bookingId, providerId, userId,
    rating, reviewText ?? '', sessionId ?? uuidv4()
  )
  return res.json(result)
})

export default router
