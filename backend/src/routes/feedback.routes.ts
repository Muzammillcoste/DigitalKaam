import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/feedback
router.get('/', async (req: Request, res: Response) => {
  const { providerId, userId, bookingId } = req.query;
  let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });
  
  if (providerId) query = query.eq('provider_id', providerId as string);
  if (userId) query = query.eq('user_id', userId as string);
  if (bookingId) query = query.eq('booking_id', bookingId as string);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/feedback/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('feedback').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Feedback not found' });
  return res.json(data);
});

// POST /api/feedback
router.post('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('feedback').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/feedback/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('feedback').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/feedback/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('feedback').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;
