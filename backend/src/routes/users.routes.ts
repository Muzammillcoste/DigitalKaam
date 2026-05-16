import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('user_profiles').select('*');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'User not found' });
  return res.json(data);
});

import { v4 as uuidv4 } from 'uuid';

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
  const { full_name, phone, email, home_area } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required to create a user' });
  }

  // 1. Create the user in auth.users via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Password123!', // Dummy password for testing
  });

  if (authError) return res.status(500).json({ error: authError.message });
  
  const userId = authData.user?.id;
  if (!userId) return res.status(500).json({ error: 'Failed to create auth user' });

  // 2. Insert into user_profiles using the valid auth user ID
  const { data, error } = await supabase.from('user_profiles').insert([{ 
    id: userId, 
    full_name, 
    phone, 
    email, 
    home_area 
  }]).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/users/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('user_profiles').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('user_profiles').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;
