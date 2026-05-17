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

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' })
  }

  const token = authHeader.split(' ')[1]

  // Verify the JWT securely with Supabase - this will reject tampered/expired tokens
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' })
  }

  // Attach the verified user to the request object for downstream use
  req.user = { id: user.id, email: user.email! }
  next()
}
