import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/provider — all providers (with optional filters)
router.get('/', async (req: Request, res: Response) => {
  const { serviceType, area } = req.query
  let query = supabase.from('providers').select('*').eq('status', 'active')
  if (serviceType) query = query.eq('service_type', serviceType as string)
  if (area) query = query.eq('area', area as string)
  const { data, error } = await query.order('rating', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /api/provider/:providerId — single provider profile
router.get('/:providerId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('providers')
    .select('*, reputation(*)')
    .eq('id', req.params.providerId)
    .single()
  if (error) return res.status(404).json({ error: 'Provider not found' })
  return res.json(data)
})

// GET /api/provider/user/:userId — fetch provider profile by user ID
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('providers')
    .select('*, reputation(*)')
    .eq('user_id', req.params.userId)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// POST /api/provider
router.post('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('providers').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/provider/:providerId
router.patch('/:providerId', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('providers').update(req.body).eq('id', req.params.providerId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/provider/:providerId
router.delete('/:providerId', async (req: Request, res: Response) => {
  const { error } = await supabase.from('providers').delete().eq('id', req.params.providerId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

// GET /api/provider/:providerId/availability — provider's schedule
router.get('/:providerId/availability', async (req: Request, res: Response) => {
  const { date } = req.query
  let query = supabase
    .from('availability')
    .select('*')
    .eq('provider_id', req.params.providerId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
  if (date) query = query.eq('date', date as string)
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /api/provider/:providerId/traces — agent trace logs
router.get('/:providerId/traces', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('traces')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50)
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /api/provider/traces/:sessionId — traces for a specific session
router.get('/traces/:sessionId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('traces')
    .select('*')
    .eq('session_id', req.params.sessionId)
    .order('timestamp', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

export default router
