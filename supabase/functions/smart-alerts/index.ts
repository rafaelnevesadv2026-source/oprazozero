import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    console.log(`[smart-alerts] Generating alerts for user ${user.id}`);

    // Fetch all user data in parallel
    const [tasksRes, emailsRes, processesRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).order("deadline", { ascending: true }),
      supabase.from("gmail_emails").select("*").eq("user_id", user.id).order("received_at", { ascending: false }).limit(200),
      supabase.from("processes").select("*").eq("user_id", user.id),
    ]);

    const tasks = tasksRes.data || [];
    const emails = emailsRes.data || [];
    const processes = processesRes.data || [];
    const now = new Date();

    const alerts: Array<{ type: string; level: "critical" | "warning" | "info"; title: string; description: string; icon: string }> = [];

    // === PATTERN DETECTION ===

    // 1. Overdue tasks
    const overdueTasks = tasks.filter((t) => t.status === "pending" && new Date(t.deadline) < now);
    if (overdueTasks.length > 0) {
      alerts.push({
        type: "overdue",
        level: "critical",
        title: `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? "s" : ""} atrasada${overdueTasks.length > 1 ? "s" : ""}`,
        description: overdueTasks.slice(0, 3).map((t) => `• ${t.title}`).join("\n"),
        icon: "🔴",
      });
    }

    // 2. Tasks due today/tomorrow
    const urgentTasks = tasks.filter((t) => {
      if (t.status !== "pending") return false;
      const diff = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 1;
    });
    if (urgentTasks.length > 0) {
      alerts.push({
        type: "urgent",
        level: "critical",
        title: `${urgentTasks.length} tarefa${urgentTasks.length > 1 ? "s" : ""} vence${urgentTasks.length > 1 ? "m" : ""} hoje/amanhã`,
        description: urgentTasks.slice(0, 3).map((t) => `• ${t.title}`).join("\n"),
        icon: "⚡",
      });
    }

    // 3. Financial risk - tasks with extracted values
    const financialEmails = emails.filter((e) => e.extracted_value && e.extracted_value > 0 && !e.task_created);
    const totalFinancialRisk = financialEmails.reduce((sum, e) => sum + (e.extracted_value || 0), 0);
    if (totalFinancialRisk > 0) {
      alerts.push({
        type: "financial",
        level: "warning",
        title: `R$ ${totalFinancialRisk.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em risco financeiro`,
        description: financialEmails.slice(0, 3).map((e) => `• ${e.subject || "E-mail sem assunto"}: R$ ${(e.extracted_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`).join("\n"),
        icon: "💰",
      });
    }

    // 4. Stalled processes (no tasks updated in 30+ days)
    const stalledProcesses = processes.filter((p) => {
      if (p.status !== "active") return false;
      const processTasks = tasks.filter((t) => t.process_id === p.id);
      if (processTasks.length === 0) return true;
      const lastActivity = Math.max(...processTasks.map((t) => new Date(t.updated_at).getTime()));
      return (now.getTime() - lastActivity) / (1000 * 60 * 60 * 24) > 30;
    });
    if (stalledProcesses.length > 0) {
      alerts.push({
        type: "stalled",
        level: "warning",
        title: `${stalledProcesses.length} processo${stalledProcesses.length > 1 ? "s" : ""} parado${stalledProcesses.length > 1 ? "s" : ""} há 30+ dias`,
        description: stalledProcesses.slice(0, 3).map((p) => `• ${p.process_number} — ${p.client_name}`).join("\n"),
        icon: "👻",
      });
    }

    // 5. Unprocessed emails
    const unprocessedEmails = emails.filter((e) => !e.task_created && e.domain !== "descarte");
    if (unprocessedEmails.length > 5) {
      alerts.push({
        type: "unprocessed",
        level: "warning",
        title: `${unprocessedEmails.length} e-mails sem tarefa criada`,
        description: "E-mails importantes podem estar sem ação vinculada.",
        icon: "📧",
      });
    }

    // 6. Health score
    const pendingTasks = tasks.filter((t) => t.status === "pending");
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const totalActive = pendingTasks.length + completedTasks.length;
    const healthPercent = totalActive > 0 ? Math.round((1 - overdueTasks.length / Math.max(pendingTasks.length, 1)) * 100) : 100;
    const healthLevel = healthPercent >= 85 ? "info" : healthPercent >= 60 ? "warning" : "critical";
    alerts.push({
      type: "health",
      level: healthLevel,
      title: `Saúde: ${healthPercent}% das tarefas em dia`,
      description: healthLevel === "info" ? "🟢 Escritório saudável" : healthLevel === "warning" ? "🟡 Atenção necessária" : "🔴 Situação crítica",
      icon: healthLevel === "info" ? "🟢" : healthLevel === "warning" ? "🟡" : "🔴",
    });

    console.log(`[smart-alerts] Generated ${alerts.length} alerts`);

    return new Response(JSON.stringify({ alerts, stats: { health: healthPercent, overdue: overdueTasks.length, pending: pendingTasks.length, completed: completedTasks.length, processes: processes.length, financialRisk: totalFinancialRisk } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[smart-alerts] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
