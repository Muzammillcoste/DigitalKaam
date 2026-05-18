-- Migration: Add booking_ids column to chat_sessions for restart-proof booking tracking
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS booking_ids UUID[] DEFAULT '{}';
