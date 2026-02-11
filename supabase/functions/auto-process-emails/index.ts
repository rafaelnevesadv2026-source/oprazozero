import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req ) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    // 1. Buscar e-mails que ainda não foram etiquetados pela IA
    const { data: emails } = await supabase
      .from("gmail_emails")
      .select("*")
      .is("ai_label", null)
      .limit(10);

    if (!emails || emails.length === 0) return new Response(JSON.stringify({ message: "Nenhum e-mail novo para processar." }), { headers: corsHeaders });

    for (const email of emails) {
      // 2. Pedir para o GPT-4o classificar o e-mail
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "Você é um classificador jurídico de elite. Sua tarefa é ler o e-mail e retornar APENAS o nome da etiqueta ideal. Exemplos: 'PAGAMENTO DE SINISTRO' (para morte, óbito, invalidez ), 'TJES' (para tribunais), 'CLIENTE NOVO', 'URGENTE'. Se não identificar, use 'OUTROS'." },
            { role: "user", content: `Assunto: ${email.subject}\nCorpo: ${email.snippet}` }
          ],
          temperature: 0,
        }),
      });

      const aiData = await response.json();
      const label = aiData.choices[0].message.content.toUpperCase();

      // 3. Atualizar o e-mail no banco de dados com a nova etiqueta
      await supabase
        .from("gmail_emails")
        .update({ ai_label: label, processed_at: new Date().toISOString() })
        .eq("id", email.id);
        
      console.log(`E-mail ${email.id} etiquetado como: ${label}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: corsHeaders });
  }
});
