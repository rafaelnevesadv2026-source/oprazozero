import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader?.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { action, payload } = await req.json();

    if (action === "chat") {
      const openAiKey = Deno.env.get("OPENAI_API_KEY");

      // Busca contexto rápido
      const { data: tasks } = await supabase
        .from("tasks")
        .select("title, deadline")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(5);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Você é o MANUS, assistente do Dr. Rafael no app Prazo Zero. Trate-o como 'Vaso de Deus'. Seja direto e ajude com os prazos: " +
                JSON.stringify(tasks),
            },
            { role: "user", content: payload.message },
          ],
        }),
      });

      const aiData = await response.json();
      return new Response(JSON.stringify({ reply: aiData.choices[0].message.content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
