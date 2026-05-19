import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { updateLifecycleStatus } from '../controllers/lifecycleController'
import { updateReputation } from '../controllers/reputationController'
import { requireAuth } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Require valid JWT on all booking routes
router.use(requireAuth)

// GET /api/booking/:bookingId — fetch booking + receipt
router.get('/:bookingId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, providers(name, phone, service_type, area, rating), user_profiles(full_name, phone, home_area)')
    .eq('id', req.params.bookingId)
    .single()
  if (error) return res.status(404).json({ error: 'Booking not found' })
  return res.json(data)
})

// GET /api/booking/user/me — all bookings for the authenticated user
router.get('/user/me', async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { data, error } = await supabase
    .from('bookings')
    .select('*, providers(name, service_type, rating)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /api/booking/provider/:providerId — all bookings for a provider
router.get('/provider/:providerId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, user_profiles(full_name, phone, home_area)')
    .eq('provider_id', req.params.providerId)
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
  const result = await updateReputation(
    req.params.bookingId as string, providerId, userId,
    rating, reviewText ?? '', sessionId ?? uuidv4()
  )
  return res.json(result)
})

export default router
