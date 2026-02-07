
-- Add 3-level summary columns to gmail_emails
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS summary_short TEXT;
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS summary_medium TEXT;
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS summary_full TEXT;
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS requires_action BOOLEAN DEFAULT false;
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS requires_response BOOLEAN DEFAULT false;
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS is_informational BOOLEAN DEFAULT false;
