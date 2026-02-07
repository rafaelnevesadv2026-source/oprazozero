
-- Add domain column to gmail_emails
ALTER TABLE public.gmail_emails 
ADD COLUMN domain text NOT NULL DEFAULT 'pessoal';

-- Add domain column to tasks
ALTER TABLE public.tasks 
ADD COLUMN domain text NOT NULL DEFAULT 'pessoal';

-- Add index for domain filtering
CREATE INDEX idx_gmail_emails_domain ON public.gmail_emails(domain);
CREATE INDEX idx_tasks_domain ON public.tasks(domain);
