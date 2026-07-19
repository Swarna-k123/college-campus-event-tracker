-- Run in Supabase SQL Editor to add the ends_at column.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
