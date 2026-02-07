import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Task, TaskPriority, TaskStatus } from "@/lib/tasks";

export interface ProcessEmail {
  id: string;
  subject: string | null;
  sender: string | null;
  snippet: string | null;
  receivedAt: string | null;
  category: string | null;
  aiSummary: string | null;
  domain: string;
}

export function useProcessDetail(processId: string | undefined) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<ProcessEmail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!user || !processId) { setTasks([]); setEmails([]); setLoading(false); return; }
    setLoading(true);

    const [tasksRes, emailsRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("process_id", processId).eq("user_id", user.id).order("deadline", { ascending: true }),
      supabase.from("gmail_emails").select("*").eq("process_id", processId).eq("user_id", user.id).order("received_at", { ascending: false }),
    ]);

    if (tasksRes.data) {
      setTasks(tasksRes.data.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        deadline: t.deadline,
        priority: t.priority as TaskPriority,
        status: t.status as TaskStatus,
        domain: (t.domain as any) || "juridico",
        source: t.source || "manual",
        createdAt: t.created_at,
      })));
    }

    if (emailsRes.data) {
      setEmails(emailsRes.data.map((e) => ({
        id: e.id,
        subject: e.subject,
        sender: e.sender,
        snippet: e.snippet,
        receivedAt: e.received_at,
        category: e.category,
        aiSummary: e.ai_summary,
        domain: e.domain,
      })));
    }

    setLoading(false);
  }, [user, processId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const linkTask = useCallback(async (taskId: string) => {
    await supabase.from("tasks").update({ process_id: processId }).eq("id", taskId);
    await fetchDetail();
  }, [processId, fetchDetail]);

  const unlinkTask = useCallback(async (taskId: string) => {
    await supabase.from("tasks").update({ process_id: null }).eq("id", taskId);
    await fetchDetail();
  }, [fetchDetail]);

  return { tasks, emails, loading, refetch: fetchDetail, linkTask, unlinkTask };
}
