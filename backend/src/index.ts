import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
dotenv.config()

import serviceRoutes from './routes/service.routes'
import bookingRoutes from './routes/booking.routes'
import disputeRoutes from './routes/dispute.routes'
import providerRoutes from './routes/provider.routes'
import usersRoutes from './routes/users.routes'
import availabilityRoutes from './routes/availability.routes'
import reputationRoutes from './routes/reputation.routes'
import tracesRoutes from './routes/traces.routes'
import feedbackRoutes from './routes/feedback.routes'
import chatRoutes from './routes/chat.routes'
import authRoutes from './routes/auth.routes'
import adminRoutes from './routes/admin.routes'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

// ── Rate Limiters ─────────────────────────────────────────────────────────────
// General API: 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
})

// Chat: 20 messages per minute (AI calls are expensive)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Chat rate limit exceeded. Please wait a moment.' },
})

// Auth: 10 attempts per 15 minutes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
})

app.use('/api/', generalLimiter)
app.use('/api/chat', chatLimiter)
app.use('/api/auth', authLimiter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'DigitalKaam Antigravity API', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/service', serviceRoutes)
app.use('/api/booking', bookingRoutes)
app.use('/api/dispute', disputeRoutes)
app.use('/api/provider', providerRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/reputation', reputationRoutes)
app.use('/api/traces', tracesRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`\n🚀 DigitalKaam Antigravity API running on http://localhost:${port}`)
  console.log(`   Health: http://localhost:${port}/health`)
  console.log(`   Service Request: POST http://localhost:${port}/api/service/request\n`)
})

export default app
