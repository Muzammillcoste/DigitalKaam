import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/availability
router.get('/', async (req: Request, res: Response) => {
  const { providerId, date } = req.query;
  let query = supabase.from('availability').select('*');
  if (providerId) query = query.eq('provider_id', providerId as string);
  if (date) query = query.eq('date', date as string);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/availability/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('availability').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Availability not found' });
  return res.json(data);
});

// POST /api/availability
router.post('/', async (req: Request, res: Response) => {
  const { provider_id, date, start_time, end_time, is_booked, travel_buffer } = req.body;
  const { data, error } = await supabase.from('availability').insert([{ provider_id, date, start_time, end_time, is_booked, travel_buffer }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/availability/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('availability').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/availability/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('availability').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;
