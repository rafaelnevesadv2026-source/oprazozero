-- Add body_text column to store full email content for AI analysis
ALTER TABLE public.gmail_emails ADD COLUMN IF NOT EXISTS body_text text;