import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'

const router = Router()

const VALID_SERVICE_TYPES = ['AC Technician', 'Electrician', 'Plumber', 'Mechanic', 'Tutor', 'Beautician', 'Driver']

/**
 * GET /api/provider/me
 * Returns the provider profile for the currently logged-in user.
 * FE uses this to populate the Provider Dashboard.
 * Returns 404 if the user has not registered as a provider yet.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id

  const { data, error } = await supabase
    .from('providers')
    .select('*, reputation(*)')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'No provider profile found. Register via POST /api/provider/onboard' })

  return res.json(data)
})

/**
 * POST /api/provider/onboard
 * "Become a Provider" form. Converts an existing user account into a provider.
 * Can only be called once per user (returns 409 if they already have a provider profile).
 *
 * Body:
 *   service_type*    — one of: AC Technician | Electrician | Plumber | Mechanic | Tutor | Beautician | Driver
 *   specialization*  — e.g. "Inverter AC Repair"
 *   experience_years*— integer
 *   hourly_rate*     — integer (PKR)
 *   area*            — e.g. "Gulshan", "DHA"
 *   phone            — if not provided, pulled from user_profiles
 *   skills           — string[] (optional)
 *   certifications   — string[] (optional)
 *   travel_radius    — integer km (optional, default 10)
 */
router.post('/onboard', requireAuth, async (req: Request, res: Response) => {
  const userId  = req.user!.id
  const userEmail = req.user!.email

  // ── Check not already a provider ──────────────────────────────────────────
  const { data: existing } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return res.status(409).json({
      error: 'You already have a provider profile.',
      providerId: existing.id,
    })
  }

  const { service_type, specialization, experience_years, hourly_rate, area, phone, skills, certifications, travel_radius } = req.body

  // ── Validate required fields ───────────────────────────────────────────────
  if (!service_type || !specialization || experience_years == null || !hourly_rate || !area) {
    return res.status(400).json({
      error: 'service_type, specialization, experience_years, hourly_rate, and area are required',
    })
  }

  if (!VALID_SERVICE_TYPES.includes(service_type)) {
    return res.status(400).json({
      error: `Invalid service_type. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
    })
  }

  if (hourly_rate < 100 || hourly_rate > 50000) {
    return res.status(400).json({ error: 'hourly_rate must be between 100 and 50000 PKR' })
  }

  // ── Pull name + phone from user_profiles if not supplied ──────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, phone')
    .eq('id', userId)
    .single()

  const providerName  = profile?.full_name ?? userEmail.split('@')[0]
  const providerPhone = phone ?? profile?.phone ?? null

  // ── Insert provider record ─────────────────────────────────────────────────
  const { data: newProvider, error: insertError } = await supabase
    .from('providers')
    .insert({
      user_id:          userId,
      name:             providerName,
      email:            userEmail,
      phone:            providerPhone,
      service_type,
      specialization,
      experience_years: parseInt(experience_years),
      hourly_rate:      parseInt(hourly_rate),
      area,
      skills:           skills ?? [],
      certifications:   certifications ?? [],
      travel_radius:    travel_radius ?? 10,
      status:           'active',
      rating:           0,
      review_count:     0,
      reliability_score: 100,
      on_time_score:    100,
      cancellation_rate: 0,
      capacity:         3,
    })
    .select()
    .single()

  if (insertError) {
    return res.status(500).json({ error: insertError.message })
  }

  // ── Create initial reputation record ──────────────────────────────────────
  await supabase.from('reputation').insert({
    provider_id:       newProvider.id,
    positive_reviews:  0,
    negative_reviews:  0,
    complaints:        0,
    disputes:          0,
  })

  console.log(`[Provider] New provider onboarded: ${providerName} (${service_type}) — userId=${userId} providerId=${newProvider.id}`)

  return res.status(201).json({
    message:    'Provider profile created successfully.',
    providerId: newProvider.id,
    provider:   newProvider,
  })
})

/**
 * PATCH /api/provider/me
 * Update the logged-in user's own provider profile.
 * Prevents updating other providers' profiles.
 */
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id

  // Disallow changing user_id or id
  delete req.body.user_id
  delete req.body.id

  const { data: existing } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) return res.status(404).json({ error: 'No provider profile found.' })

  const { data, error } = await supabase
    .from('providers')
    .update(req.body)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})


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
  const { user_id } = req.body;
  if (user_id) {
    const { data: existing } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();
    if (existing) {
      return res.status(200).json(existing);
    }
  }
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

// GET /api/provider/:providerId/traces — agent trace logs for this provider
router.get('/:providerId/traces', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('traces')
    .select('*')
    .eq('provider_id', req.params.providerId)
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
