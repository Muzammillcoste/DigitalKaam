import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
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

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

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

app.listen(PORT, () => {
  console.log(`\n🚀 DigitalKaam Antigravity API running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   Service Request: POST http://localhost:${PORT}/api/service/request\n`)
})

export default app
