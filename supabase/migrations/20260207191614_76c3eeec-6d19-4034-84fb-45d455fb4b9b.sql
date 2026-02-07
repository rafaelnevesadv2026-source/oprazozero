
-- Create processes table
CREATE TABLE public.processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  process_number TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  adversary TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  domain TEXT NOT NULL DEFAULT 'juridico',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own processes" ON public.processes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own processes" ON public.processes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own processes" ON public.processes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own processes" ON public.processes FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_processes_updated_at
  BEFORE UPDATE ON public.processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add process_id to tasks
ALTER TABLE public.tasks ADD COLUMN process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_process_id ON public.tasks(process_id);

-- Add process_id to gmail_emails
ALTER TABLE public.gmail_emails ADD COLUMN process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL;
CREATE INDEX idx_gmail_emails_process_id ON public.gmail_emails(process_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.processes;
