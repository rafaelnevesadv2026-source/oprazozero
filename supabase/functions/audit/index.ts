import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    console.log(`[audit] Running full audit for user ${user.id}`);

    const [tasksRes, emailsRes, processesRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase.from("gmail_emails").select("*").eq("user_id", user.id).order("received_at", { ascending: false }).limit(500),
      supabase.from("processes").select("*").eq("user_id", user.id),
    ]);

    const tasks = tasksRes.data || [];
    const emails = emailsRes.data || [];
    const processes = processesRes.data || [];
    const now = new Date();

    // Critical
    const critical: string[] = [];
    const warnings: string[] = [];
    const healthy: string[] = [];

    // Overdue tasks
    const overdue = tasks.filter(t => t.status === "pending" && new Date(t.deadline) < now);
    if (overdue.length > 0) critical.push(`${overdue.length} tarefa${overdue.length > 1 ? "s" : ""} atrasada${overdue.length > 1 ? "s" : ""}`);

    // Financial risk in next 48h
    const financialRisk48h = tasks.filter(t => {
      if (t.status !== "pending") return false;
      const diff = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      return diff >= 0 && diff <= 48 && t.domain === "juridico";
    });
    const financialValue = emails.filter(e => e.extracted_value && !e.task_created).reduce((s, e) => s + (e.extracted_value || 0), 0);
    if (financialValue > 0) critical.push(`R$ ${financialValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em valores pendentes`);

    // Stalled processes
    const stalledProcs = processes.filter(p => {
      if (p.status !== "active") return false;
      const procTasks = tasks.filter(t => t.process_id === p.id);
      if (procTasks.length === 0) return true;
      const lastUpdate = Math.max(...procTasks.map(t => new Date(t.updated_at).getTime()));
      return (now.getTime() - lastUpdate) / (1000 * 60 * 60 * 24) > 30;
    });
    if (stalledProcs.length > 0) critical.push(`${stalledProcs.length} processo${stalledProcs.length > 1 ? "s" : ""} sem movimento há 30+ dias`);

    // Emails without response (sent by others, no task)
    const unansweredEmails = emails.filter(e => e.requires_response && !e.task_created && e.domain !== "descarte");
    if (unansweredEmails.length > 5) warnings.push(`${unansweredEmails.length} e-mails aguardando resposta`);

    // Tasks postponed multiple times (approximation: tasks with status pending created 14+ days ago)
    const oldPending = tasks.filter(t => t.status === "pending" && (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24) > 14);
    if (oldPending.length > 0) warnings.push(`${oldPending.length} tarefa${oldPending.length > 1 ? "s" : ""} pendente${oldPending.length > 1 ? "s" : ""} há 14+ dias`);

    // Unprocessed emails
    const unprocessed = emails.filter(e => !e.task_created && e.domain !== "descarte" && e.requires_action);
    if (unprocessed.length > 0) warnings.push(`${unprocessed.length} e-mail${unprocessed.length > 1 ? "s" : ""} com ação necessária sem tarefa`);

    // Health
    const pending = tasks.filter(t => t.status === "pending");
    const completed = tasks.filter(t => t.status === "completed");
    const healthPercent = pending.length + completed.length > 0 ? Math.round((1 - overdue.length / Math.max(pending.length, 1)) * 100) : 100;
    if (healthPercent >= 85) healthy.push(`${healthPercent}% das tarefas em dia`);
    if (overdue.length === 0) healthy.push("Nenhuma tarefa atrasada");
    const completedThisWeek = completed.filter(t => (now.getTime() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60 * 24) <= 7);
    healthy.push(`${completedThisWeek.length} tarefa${completedThisWeek.length !== 1 ? "s" : ""} concluída${completedThisWeek.length !== 1 ? "s" : ""} esta semana`);

    const report = {
      timestamp: now.toISOString(),
      health: healthPercent,
      critical,
      warnings,
      healthy,
      stats: {
        totalTasks: tasks.length,
        pendingTasks: pending.length,
        completedTasks: completed.length,
        overdueTasks: overdue.length,
        totalProcesses: processes.length,
        activeProcesses: processes.filter(p => p.status === "active").length,
        stalledProcesses: stalledProcs.length,
        totalEmails: emails.length,
        financialRisk: financialValue,
      },
    };

    console.log(`[audit] Audit complete: ${critical.length} critical, ${warnings.length} warnings`);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[audit] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
