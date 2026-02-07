-- Add status column to gmail_emails for archive/done/active tracking
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_gmail_emails_status ON public.gmail_emails(status);
