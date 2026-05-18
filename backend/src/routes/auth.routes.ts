import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { access_token, refresh_token, expires_in, token_type, userId, email }
 *
 * The client should:
 *  1. Store BOTH tokens (e.g. in memory / secure storage — NOT localStorage for web)
 *  2. Send access_token as:  Authorization: Bearer <access_token>
 *  3. Send refresh_token as: X-Refresh-Token: <refresh_token>
 *     (The middleware will auto-refresh mid-conversation when the access token expires)
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return res.status(401).json({ error: error?.message ?? 'Login failed' })
  }

  const { session, user } = data

  return res.json({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
    expires_in:    session.expires_in,   // seconds until access_token expires (typically 3600)
    token_type:    'Bearer',
    userId:        user.id,
    email:         user.email,
  })
})

/**
 * POST /api/auth/refresh
 * Body: { refresh_token: string }
 * Returns: { access_token, refresh_token, expires_in, token_type }
 *
 * Call this when your access_token has expired.
 * Each refresh_token is single-use — Supabase rotates it on every call.
 * Always store the NEW refresh_token returned here for the next refresh.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = req.body

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' })
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token })

  if (error || !data.session) {
    return res.status(401).json({
      error: 'Refresh token is invalid or expired. Please log in again.',
      code:  'REFRESH_FAILED',
    })
  }

  const { session } = data

  return res.json({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,  // rotated — always save this new one
    expires_in:    session.expires_in,
    token_type:    'Bearer',
  })
})

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <access_token>
 * Revokes the user's session on the Supabase side.
 */
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Authorization header with Bearer token is required' })
  }

  // Sign out using the admin client so we can target the specific user session
  const { error } = await supabase.auth.admin.signOut(authHeader.split(' ')[1])

  if (error) {
    // Non-fatal — token may already be expired; still return success to the client
    console.warn('[Auth] Logout warning:', error.message)
  }

  return res.json({ message: 'Logged out successfully' })
})

export default router
