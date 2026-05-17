import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { access_token, userId, email }
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return res.status(401).json({ error: error.message })
  }

  return res.json({
    access_token: data.session.access_token,
    userId: data.user.id,
    email: data.user.email,
    message: 'Login successful. Use the access_token as a Bearer token in Authorization header.'
  })
})

/**
 * POST /api/auth/register
 * Body: { email, password, full_name, phone, home_area? }
 * Returns: { access_token, userId, email }
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, full_name, phone, home_area } = req.body

  if (!email || !password || !full_name || !phone) {
    return res.status(400).json({ error: 'email, password, full_name, and phone are required' })
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, phone, home_area } },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  if (!data.user) {
    return res.status(400).json({ error: 'Registration failed' })
  }

  // Create the user_profiles record
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: data.user.id,
    full_name,
    phone,
    email,
    home_area: home_area ?? null,
  })

  if (profileError) {
    // Auth user created but profile failed — not critical, proceed
    console.error('Profile creation error:', profileError.message)
  }

  return res.status(201).json({
    access_token: data.session?.access_token ?? null,
    userId: data.user.id,
    email: data.user.email,
    message: 'Registration successful.',
  })
})

export default router
