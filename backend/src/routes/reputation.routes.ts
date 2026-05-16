import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/reputation
router.get('/', async (req: Request, res: Response) => {
  const { providerId } = req.query;
  let query = supabase.from('reputation').select('*');
  if (providerId) query = query.eq('provider_id', providerId as string);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/reputation/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('reputation').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Reputation record not found' });
  return res.json(data);
});

// POST /api/reputation
router.post('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('reputation').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/reputation/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('reputation').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/reputation/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('reputation').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;
