import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/traces
router.get('/', async (req: Request, res: Response) => {
  const { sessionId } = req.query;
  let query = supabase.from('traces').select('*').order('timestamp', { ascending: false });
  if (sessionId) query = query.eq('session_id', sessionId as string);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/traces/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('traces').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Trace not found' });
  return res.json(data);
});

// POST /api/traces
router.post('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('traces').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// DELETE /api/traces/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('traces').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;
