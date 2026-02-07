
-- Table to store Gmail tokens per user
CREATE TABLE public.gmail_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail_tokens" ON public.gmail_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gmail_tokens" ON public.gmail_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gmail_tokens" ON public.gmail_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gmail_tokens" ON public.gmail_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_gmail_tokens_updated_at
  BEFORE UPDATE ON public.gmail_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table to store analyzed emails
CREATE TABLE public.gmail_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  gmail_id text NOT NULL,
  subject text,
  sender text,
  snippet text,
  received_at timestamp with time zone,
  category text DEFAULT 'outros',
  ai_summary text,
  extracted_deadline timestamp with time zone,
  extracted_value numeric,
  task_created boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, gmail_id)
);

ALTER TABLE public.gmail_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail_emails" ON public.gmail_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gmail_emails" ON public.gmail_emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gmail_emails" ON public.gmail_emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gmail_emails" ON public.gmail_emails FOR DELETE USING (auth.uid() = user_id);
