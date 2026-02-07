
-- Create email_labels junction table
CREATE TABLE IF NOT EXISTS public.email_labels (
  email_id UUID NOT NULL REFERENCES public.gmail_emails(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (email_id, label_id)
);

-- Enable RLS
ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage their own email labels
CREATE POLICY "Users can view their own email labels"
ON public.email_labels FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.gmail_emails WHERE id = email_id AND user_id = auth.uid())
);

CREATE POLICY "Users can add labels to their own emails"
ON public.email_labels FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gmail_emails WHERE id = email_id AND user_id = auth.uid())
);

CREATE POLICY "Users can remove labels from their own emails"
ON public.email_labels FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.gmail_emails WHERE id = email_id AND user_id = auth.uid())
);
