import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { updateLifecycleStatus } from '../controllers/lifecycleController'
import { updateReputation } from '../controllers/reputationController'
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

// POST /api/booking
router.post('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('bookings').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/booking/:bookingId
router.patch('/:bookingId', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('bookings').update(req.body).eq('id', req.params.bookingId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/booking/:bookingId
router.delete('/:bookingId', async (req: Request, res: Response) => {
  const { error } = await supabase.from('bookings').delete().eq('id', req.params.bookingId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

// PATCH /api/booking/:bookingId/status — lifecycle status update (provider calls this)
router.patch('/:bookingId/status', async (req: Request, res: Response) => {
  const { status, completionPhotoUrl, sessionId } = req.body
  const result = await updateLifecycleStatus(
    req.params.bookingId as string,
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
  const { updateReputation: repController } = await import('../controllers/reputationController')
  const result = await repController(
    req.params.bookingId as string, providerId, userId,
    rating, reviewText ?? '', sessionId ?? uuidv4()
  )
  return res.json(result)
})

export default router
