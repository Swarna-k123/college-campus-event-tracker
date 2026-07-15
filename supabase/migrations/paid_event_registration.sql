ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_fee numeric(12, 2);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  event_id uuid NOT NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'mock',
  transaction_id text NOT NULL,
  payment_gateway text NOT NULL DEFAULT 'mock',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_student_event_idx ON public.payments (student_id, event_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);
