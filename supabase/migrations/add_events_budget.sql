-- Run in Supabase SQL Editor if the budget column does not exist yet.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS budget numeric(12, 2);
