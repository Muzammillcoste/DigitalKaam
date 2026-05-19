import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

// Extend Request to carry the verified user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string }
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const refreshTokenHeader = req.headers['x-refresh-token'] as string | undefined

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' })
  }

  const token = authHeader.split(' ')[1]

  // Verify the JWT securely with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)

  // Token is valid
  if (user && !error) {
    req.user = { id: user.id, email: user.email! }
    return next()
  }

  // If token is invalid/expired and we DON'T have a refresh token, reject immediately
  if (error?.message.includes('expired') || !user) {
    if (!refreshTokenHeader) {
      return res.status(401).json({
        error: 'Invalid or expired token.',
        code: 'TOKEN_EXPIRED_NO_REFRESH'
      })
    }

    // Attempt to auto-refresh the session mid-flight using the provided refresh token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshTokenHeader
    })

    if (refreshError || !refreshData.session) {
      return res.status(401).json({
        error: 'Session expired and auto-refresh failed. Please log in again.',
        code: 'REFRESH_FAILED'
      })
    }

    // Success! Session refreshed seamlessly.
    const { session, user: refreshedUser } = refreshData

    // Tell the client that the token rotated so they can update their local store
    // The client MUST listen for these headers on every API response and update local state
    res.setHeader('X-New-Access-Token', session.access_token)
    res.setHeader('X-New-Refresh-Token', session.refresh_token)
    res.setHeader('X-New-Expires-In', session.expires_in.toString())

    // Expose these headers so the frontend JS can read them (CORS requirement)
    res.setHeader('Access-Control-Expose-Headers', 'X-New-Access-Token, X-New-Refresh-Token, X-New-Expires-In')

    // Proceed with the request using the newly verified user identity
    if (refreshedUser) {
      req.user = { id: refreshedUser.id, email: refreshedUser.email! }
    } else {
      // Unlikely, but if user is null on refresh, fail safely
      return res.status(401).json({ error: 'Failed to retrieve user after refresh.' })
    }
    return next()
  }

  // Catch-all for any other auth error
  return res.status(401).json({ error: 'Authentication failed.' })
}
