import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { updateLifecycleStatus } from '../controllers/lifecycleController'
import { updateReputation } from '../controllers/reputationController'
import { requireAuth } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Require valid JWT on all booking routes
router.use(requireAuth)

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
// Only the owner provider account can access their own bookings.
router.get('/provider/:providerId', async (req: Request, res: Response) => {
  const providerId = req.params.providerId
  const authUserId = req.user!.id

  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('id, user_id')
    .eq('id', providerId)
    .single()

  if (providerError || !provider) {
    return res.status(404).json({ error: 'Provider not found' })
  }

  if (provider.user_id !== authUserId) {
    return res.status(403).json({ error: 'Forbidden: you can only view your own provider bookings' })
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*, providers(name, email, phone, service_type, area, rating), user_profiles(full_name, phone, email, home_area)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

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
