
-- Create email_accounts table for multiple Gmail accounts
CREATE TABLE public.email_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email_accounts" ON public.email_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email_accounts" ON public.email_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email_accounts" ON public.email_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own email_accounts" ON public.email_accounts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add account_id to gmail_emails to track which account an email came from
ALTER TABLE public.gmail_emails ADD COLUMN account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.gmail_emails ADD COLUMN account_email TEXT;

-- Add source column to tasks if not exists (already exists but ensure it's there)
-- Enable realtime for tasks and gmail_emails
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gmail_emails;
