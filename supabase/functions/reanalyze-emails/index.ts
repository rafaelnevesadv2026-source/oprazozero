import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function analyzeEmailWithAI(subject: string, snippet: string, sender: string, accountEmail: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not set");
    return null;
  }

  const today = new Date().toISOString().split("T")[0];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de análise profunda de emails para um escritório de advocacia e seguros no Brasil. Data de hoje: ${today}.

REGRA DE OURO: Não simplifique, ORGANIZE. Jamais omita informações relevantes do email.

Analise o email e retorne um JSON com:

- "domain": "juridico" | "pessoal" | "descarte"
  - "juridico": processos, prazos judiciais, intimações, citações, audiências, petições, sinistros, apólices, regulações, contratos, notificações legais, cobranças jurídicas, tribunais, OAB, cartórios, seguradoras, SUSEP
  - "pessoal": contas pessoais, boletos, pagamentos, compromissos, lembretes, finanças, compras, serviços
  - "descarte": spam, promoções puras, newsletters sem ação, propagandas

- "category": "pagamentos" | "boletos" | "prazos" | "processos" | "intimacoes" | "sinistros" | "contatos" | "promocoes" | "outros"

- "summary": resumo em 1-2 frases

- "summary_short": resumo em 1 linha no formato "📋 Tipo | Referência — ação — prazo"

- "summary_medium": resumo em 4-8 linhas

- "summary_full": ANÁLISE COMPLETA E DETALHADA (mínimo 15 linhas, até 50 linhas). DEVE CONTER:
  1. IDENTIFICAÇÃO: Nome do remetente, empresa/instituição
  2. DESTINATÁRIO: conta ${accountEmail}
  3. CONTEXTO: Tema principal, natureza
  4. CONTEÚDO INTEGRAL: TODAS as informações relevantes
  5. PARTES ENVOLVIDAS: Todas as partes/pessoas/empresas e seus papéis
  6. DADOS JURÍDICOS (se aplicável): Nº processo, vara, fórum, juiz, partes, tipo de ação
  7. DADOS FINANCEIROS (se aplicável): Valores, tipo operação, referências, status
  8. DOCUMENTOS/ANEXOS referenciados
  9. PRAZOS E DATAS com significado
  10. ANÁLISE DE RISCO
  11. AÇÕES RECOMENDADAS numeradas
  12. CONSEQUÊNCIAS DE INAÇÃO

- "deadline": data ISO se houver prazo, ou null
- "value": valor monetário (número), ou null
- "should_create_task": true se contém prazo, pagamento, boleto, intimação, audiência, ação necessária
- "task_title": título da tarefa se should_create_task=true
- "task_priority": "low" | "medium" | "high"
- "requires_action": true se requer ação do usuário (pagamento, resposta obrigatória, prazo legal, decisão)
- "requires_response": true se exige resposta por email
- "is_informational": true APENAS se é puramente informativo SEM nenhuma ação necessária (newsletters, avisos genéricos, confirmações automáticas)

IMPORTANTE sobre classificação:
- Emails de pagamento/boleto/cobrança NÃO são informativos, são "requires_action: true"
- Emails de prazo/intimação/audiência são "requires_action: true"
- Emails pedindo resposta são "requires_response: true"
- Apenas avisos genéricos, newsletters e confirmações automáticas são "is_informational: true"

Responda APENAS o JSON, sem markdown.`,
        },
        {
          role: "user",
          content: `De: ${sender}\nAssunto: ${subject}\nConteúdo: ${snippet}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      domain: parsed.domain || "pessoal",
      category: parsed.category || "outros",
      summary: parsed.summary || snippet,
      summary_short: parsed.summary_short || "",
      summary_medium: parsed.summary_medium || "",
      summary_full: parsed.summary_full || "",
      deadline: parsed.deadline || null,
      value: parsed.value || null,
      requires_action: parsed.requires_action === true,
      requires_response: parsed.requires_response === true,
      is_informational: parsed.is_informational === true,
    };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 20, 50);

    // Get ALL user emails, process those without good summary_full first, then others
    const { data: emails, error: fetchError } = await supabase
      .from("gmail_emails")
      .select("*")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(batchSize);

    if (fetchError || !emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, remaining: 0, message: "No emails to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prioritize: emails without summary_full or with short ones
    const needsProcessing = emails.filter(
      (e: any) => !e.summary_full || e.summary_full.length < 200
    );
    const toProcess = needsProcessing.length > 0 ? needsProcessing : emails.slice(0, batchSize);

    let processed = 0;
    for (const email of toProcess) {
      try {
        console.log(`Processing: ${email.subject?.slice(0, 60)}...`);
        const result = await analyzeEmailWithAI(
          email.subject || "",
          email.snippet || "",
          email.sender || "",
          email.account_email || ""
        );
        if (!result) {
          console.log(`No AI result for: ${email.id}`);
          continue;
        }

        console.log(`AI result - domain: ${result.domain}, category: ${result.category}, action: ${result.requires_action}, info: ${result.is_informational}`);

        const { error: updateError } = await supabase.from("gmail_emails").update({
          domain: result.domain,
          category: result.category,
          ai_summary: result.summary,
          summary_short: result.summary_short || null,
          summary_medium: result.summary_medium || null,
          summary_full: result.summary_full || null,
          extracted_deadline: result.deadline || null,
          extracted_value: result.value || null,
          requires_action: result.requires_action,
          requires_response: result.requires_response,
          is_informational: result.is_informational,
        }).eq("id", email.id);

        if (updateError) {
          console.error(`Update error for ${email.id}:`, updateError);
        } else {
          processed++;
          console.log(`Updated: ${email.subject?.slice(0, 60)} → ${result.domain}/${result.category}`);
        }
      } catch (err) {
        console.error("Error re-analyzing:", email.id, err);
      }
    }

    // Count remaining without good analysis
    const { count } = await supabase
      .from("gmail_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .or("summary_full.is.null,summary_full.eq.");

    const hasMore = (count || 0) > 0 || needsProcessing.length >= batchSize;

    return new Response(
      JSON.stringify({ success: true, processed, remaining: count || 0, hasMore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reanalyze error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
