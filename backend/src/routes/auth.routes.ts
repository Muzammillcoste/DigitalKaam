import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'

const router = Router()

// ── Helper: check if a user has registered as a provider ─────────────────────
async function getProviderStatus(userId: string): Promise<{ isProvider: boolean; providerId: string | null; providerStatus: string | null }> {
  const { data } = await supabase
    .from('providers')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle()
  return {
    isProvider:     !!data,
    providerId:     data?.id ?? null,
    providerStatus: data?.status ?? null,
  }
}

/**
 * POST /api/auth/signup
 * Standard email + password registration.
 * Creates the Supabase auth user AND the user_profiles row in one call.
 *
 * Body: { email, password, full_name, phone?, home_area? }
 * Returns: { access_token, refresh_token, expires_in, token_type, userId, email }
 */
router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, full_name, phone, home_area } = req.body

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' })
  }

  // 1. Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,          // skip email verification for mobile flow
    user_metadata: { full_name },
  })

  if (error || !data.user) {
    return res.status(400).json({ error: error?.message ?? 'Signup failed' })
  }

  const userId = data.user.id

  // 2. Create user_profiles row
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id:        userId,
    full_name,
    email,
    phone:     phone ?? null,
    home_area: home_area ?? null,
  })

  if (profileError) {
    // Rollback: delete the auth user so we don't leave orphaned auth rows
    await supabase.auth.admin.deleteUser(userId)
    return res.status(500).json({ error: `Profile creation failed: ${profileError.message}` })
  }

  // 3. Sign in immediately to get tokens
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError || !signInData.session) {
    return res.status(201).json({ message: 'Account created. Please log in.', userId })
  }

  const { session } = signInData
  return res.status(201).json({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
    expires_in:    session.expires_in,
    token_type:    'Bearer',
    userId,
    email,
    full_name,
    isProvider:     false,   // new user — always customer to start
    providerId:     null,
    providerStatus: null,
  })
})

/**
 * POST /api/auth/profile/sync
 * MUST be called by the mobile app immediately after Google (or any OAuth) sign-in.
 *
 * Google OAuth creates the Supabase auth user but does NOT create a user_profiles row.
 * Without this call, the user cannot create chat sessions (FK violation).
 *
 * Header: Authorization: Bearer <access_token>   ← the token from the Google OAuth session
 * Body:   { full_name?, phone?, home_area? }       ← optional; falls back to Google metadata
 *
 * Returns: { userId, email, full_name, isNewUser }
 *
 * Safe to call multiple times — uses upsert so repeat calls are no-ops.
 */
router.post('/profile/sync', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const userEmail = req.user!.email

  // Pull display name from request body, or fall back to Supabase user metadata (set by Google)
  const { phone, home_area } = req.body

  // Get user metadata from Supabase (includes name Google provided)
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)

  if (userError || !user) {
    return res.status(500).json({ error: 'Could not fetch user metadata' })
  }

  const full_name: string =
    req.body.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||        // Google sets 'name'
    userEmail.split('@')[0]             // last resort fallback

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single()

  const isNewUser = !existing

  const { error: upsertError } = await supabase.from('user_profiles').upsert(
    {
      id:        userId,
      full_name,
      email:     userEmail,
      phone:     phone ?? null,
      home_area: home_area ?? null,
    },
    { onConflict: 'id' }
  )

  if (upsertError) {
    return res.status(500).json({ error: `Profile sync failed: ${upsertError.message}` })
  }

  const providerInfo = await getProviderStatus(userId)
  console.log(`[Auth] profile/sync — userId='${userId}' isNewUser=${isNewUser} name='${full_name}' isProvider=${providerInfo.isProvider}`)

  return res.json({ userId, email: userEmail, full_name, isNewUser, ...providerInfo })
})

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
  const providerInfo = await getProviderStatus(user.id)

  return res.json({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
    expires_in:    session.expires_in,
    token_type:    'Bearer',
    userId:        user.id,
    email:         user.email,
    ...providerInfo,   // isProvider, providerId, providerStatus
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
