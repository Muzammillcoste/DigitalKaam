import { Router, Request, Response } from 'express'
import { createDisputeTicket, DisputeType } from '../controllers/disputeController'
import { supabase } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// POST /api/dispute — open a new dispute
router.post('/', async (req: Request, res: Response) => {
  console.log('req.body', req.body)
  const { bookingId, userId, providerId, disputeType, description, sessionId } = req.body
  if (!bookingId || !userId || !providerId || !disputeType) {
    return res.status(400).json({ error: 'bookingId, userId, providerId, disputeType are required' })
  }
  const result = await createDisputeTicket(
    bookingId, userId, providerId,
    disputeType as DisputeType,
    description ?? '',
    sessionId ?? uuidv4()
  )
  return res.json(result)
})

// GET /api/dispute/:disputeId — get dispute status
router.get('/:disputeId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', req.params.disputeId)
    .single()
  if (error) return res.status(404).json({ error: 'Dispute not found' })
  return res.json(data)
})

// GET /api/dispute/user/:userId — all disputes for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// PATCH /api/dispute/:disputeId
router.patch('/:disputeId', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('disputes').update(req.body).eq('id', req.params.disputeId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/dispute/:disputeId
router.delete('/:disputeId', async (req: Request, res: Response) => {
  const { error } = await supabase.from('disputes').delete().eq('id', req.params.disputeId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router
