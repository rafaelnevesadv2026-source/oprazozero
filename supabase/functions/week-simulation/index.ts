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

    console.log(`[week-simulation] Simulating week for user ${user.id}`);

    const { data: tasks } = await supabase.from("tasks").select("*").eq("user_id", user.id).eq("status", "pending").order("deadline", { ascending: true });
    const pendingTasks = tasks || [];
    const now = new Date();

    // Group tasks by day of week for next 7 days
    const days: Array<{ date: string; dayName: string; tasks: typeof pendingTasks; estimatedMinutes: number }> = [];
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayTasks = pendingTasks.filter(t => {
        const dl = new Date(t.deadline).toISOString().split("T")[0];
        return dl === dateStr || (i === 0 && new Date(t.deadline) < now);
      });

      // Estimate: high=20min, medium=15min, low=10min
      const estimatedMinutes = dayTasks.reduce((sum, t) => {
        const mins = t.priority === "high" ? 20 : t.priority === "medium" ? 15 : 10;
        return sum + mins;
      }, 0);

      days.push({
        date: dateStr,
        dayName: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : dayNames[date.getDay()],
        tasks: dayTasks,
        estimatedMinutes,
      });
    }

    // Find overloaded days (>120 min)
    const overloaded = days.filter(d => d.estimatedMinutes > 120);
    const suggestions: string[] = [];

    if (overloaded.length > 0) {
      overloaded.forEach(d => {
        suggestions.push(`⚠️ ${d.dayName} está sobrecarregado (${d.tasks.length} tarefas, ~${Math.round(d.estimatedMinutes / 60 * 10) / 10}h estimadas)`);
      });
      // Suggest redistribution
      const lightDays = days.filter(d => d.estimatedMinutes < 60 && d.dayName !== "Sábado" && d.dayName !== "Domingo");
      if (lightDays.length > 0) {
        suggestions.push(`💡 Sugestão: antecipar tarefas para ${lightDays.slice(0, 2).map(d => d.dayName).join(" ou ")}`);
      }
    }

    // Risk of delays
    const tasksWithTightDeadline = pendingTasks.filter(t => {
      const diff = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 2 && t.priority === "high";
    });
    if (tasksWithTightDeadline.length > 0) {
      suggestions.push(`🔴 ${tasksWithTightDeadline.length} tarefa${tasksWithTightDeadline.length > 1 ? "s" : ""} de alta prioridade com prazo em 48h`);
    }

    const simulation = {
      days: days.map(d => ({
        date: d.date,
        dayName: d.dayName,
        taskCount: d.tasks.length,
        estimatedMinutes: d.estimatedMinutes,
        tasks: d.tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline })),
      })),
      suggestions,
      totalTasks: pendingTasks.length,
      totalEstimatedMinutes: days.reduce((s, d) => s + d.estimatedMinutes, 0),
    };

    console.log(`[week-simulation] Simulation complete: ${pendingTasks.length} tasks across 7 days`);

    return new Response(JSON.stringify(simulation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[week-simulation] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
