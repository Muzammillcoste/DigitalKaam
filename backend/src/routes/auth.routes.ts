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

export default router
