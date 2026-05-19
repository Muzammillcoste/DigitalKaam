import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = Router()

// All admin endpoints require authentication
router.use(requireAuth)

/**
 * GET /api/admin/platform-config
 * Returns all platform fee/config values from the DB.
 *
 * Response: { config: { key: string, value: string, description: string, updated_at: string }[] }
 */
router.get('/platform-config', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('platform_config')
    .select('key, value, description, updated_at')
    .order('key')

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ config: data })
})

/**
 * PUT /api/admin/platform-config/:key
 * Update a single platform config value.
 *
 * Body: { value: string }
 * Example: PUT /api/admin/platform-config/platform_fee_fixed  { "value": "100" }
 *
 * Valid keys:
 *   platform_fee_fixed      — flat PKR fee per booking
 *   platform_fee_percent    — % of service subtotal
 *   visit_fee               — provider callout/visit fee
 *   urgency_fee_high        — same-day emergency surcharge
 *   urgency_fee_medium      — medium urgency surcharge
 *   loyalty_discount_cap    — max loyalty discount per booking
 */
router.put('/platform-config/:key', async (req: Request, res: Response) => {
  const { key } = req.params
  const { value } = req.body

  if (value === undefined || value === null || String(value).trim() === '') {
    return res.status(400).json({ error: 'value is required in request body' })
  }

  // Validate it's a number to prevent storing garbage
  if (isNaN(parseFloat(String(value)))) {
    return res.status(400).json({ error: 'value must be a numeric string (e.g. "50", "5.5")' })
  }

  const { data, error } = await supabase
    .from('platform_config')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  console.log(`[Admin] platform_config updated: ${key} = ${value}`)
  return res.json({ message: `Config '${key}' updated to '${value}'`, config: data })
})

export default router
