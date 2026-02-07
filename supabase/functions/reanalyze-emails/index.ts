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

REGRA DE OURO: Não simplifique, ORGANIZE. Jamais omita informações relevantes do email. Toda informação extraída deve ser 100% rastreável ao conteúdo original.

Analise o email de forma COMPLETA e DETALHADA e retorne um JSON com:

- "domain": "juridico" | "pessoal" | "descarte"
  - "juridico": processos, prazos judiciais, intimações, citações, audiências, petições, sinistros, apólices, regulações, contratos, notificações legais, cobranças jurídicas, tribunais, OAB, cartórios, seguradoras, SUSEP
  - "pessoal": contas pessoais, boletos, pagamentos, compromissos, lembretes, finanças, compras, serviços
  - "descarte": spam, promoções puras, newsletters sem ação, propagandas

- "category": "pagamentos" | "boletos" | "prazos" | "processos" | "intimacoes" | "sinistros" | "contatos" | "promocoes" | "outros"

- "summary": resumo legado em 1-2 frases

- "summary_short": resumo em 1 linha no formato "📋 Tipo | Referência — ação — prazo"

- "summary_medium": resumo em 4-8 linhas com: o que é, quem enviou, o que pede, qual prazo, qual risco, o que fazer

- "summary_full": ANÁLISE COMPLETA E DETALHADA (mínimo 15 linhas, até 50 linhas se necessário). DEVE CONTER:
  1. IDENTIFICAÇÃO COMPLETA: Nome completo do remetente, empresa/instituição, cargo se identificável
  2. DESTINATÁRIO: Para quem foi enviado (conta: ${accountEmail})
  3. CONTEXTO: Do que se trata o email, qual o tema principal, qual a natureza (jurídico, financeiro, comercial, informativo)
  4. CONTEÚDO INTEGRAL: Reproduzir TODAS as informações relevantes do email, incluindo números, nomes, referências, códigos
  5. PARTES ENVOLVIDAS: Todas as partes/pessoas/empresas mencionadas com seus papéis
  6. DADOS JURÍDICOS (se aplicável): Número do processo, vara, fórum, juiz, partes (autor/réu), tipo de ação, fase processual, determinação, prazos legais
  7. DADOS FINANCEIROS (se aplicável): Valores exatos, tipo de operação, referências (nº sinistro, contrato, fatura), status (pago, pendente, atrasado), vencimentos
  8. DOCUMENTOS E ANEXOS: Mencionar quaisquer anexos, documentos, comprovantes, boletos referenciados
  9. PRAZOS E DATAS: Todas as datas mencionadas com seu significado
  10. ANÁLISE DE RISCO: Impacto de não agir (financeiro, jurídico, reputacional), nível de urgência
  11. AÇÕES RECOMENDADAS: Lista numerada de próximos passos concretos
  12. CONSEQUÊNCIAS DE INAÇÃO: O que acontece se o email for ignorado
  
  Se não identificar um campo padrão, extraia os dados "brutos" e marque como "informação relevante detectada — conferir manualmente"

- "deadline": data ISO se houver prazo, ou null
- "value": valor monetário (número), ou null
- "should_create_task": true se contém prazo, pagamento, boleto, intimação, audiência, ação necessária
- "task_title": título da tarefa se should_create_task=true
- "task_priority": "low" | "medium" | "high"
- "requires_action": true se requer ação do usuário
- "requires_response": true se exige resposta
- "is_informational": true se apenas informativo
- "suggested_labels": array de strings com etiquetas sugeridas: ["jurídico", "pagamento", "prazo", "processo", "intimação", "sinistro", "boleto", "urgente", "informativo", "pessoal", "ação necessária", "contato", "cobrança"]

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
    return JSON.parse(jsonMatch[0]);
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

    // Get batch size from body
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 20, 50);

    // Get emails that need re-analysis (all user emails, ordered oldest first)
    const { data: emails, error: fetchError } = await supabase
      .from("gmail_emails")
      .select("*")
      .eq("user_id", user.id)
      .or("summary_full.is.null,summary_full.eq.")
      .order("received_at", { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch emails" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!emails || emails.length === 0) {
      // No emails without analysis - check if there are any with short summaries to upgrade
      const { data: shortEmails } = await supabase
        .from("gmail_emails")
        .select("*")
        .eq("user_id", user.id)
        .not("summary_full", "is", null)
        .order("received_at", { ascending: true })
        .limit(batchSize);

      // Filter to only those with short summaries (less than 200 chars)
      const needsUpgrade = (shortEmails || []).filter(
        (e: any) => !e.summary_full || e.summary_full.length < 200
      );

      if (needsUpgrade.length === 0) {
        return new Response(
          JSON.stringify({ success: true, processed: 0, remaining: 0, message: "All emails already analyzed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Process these
      let processed = 0;
      for (const email of needsUpgrade.slice(0, batchSize)) {
        try {
          const result = await analyzeEmailWithAI(
            email.subject || "",
            email.snippet || "",
            email.sender || "",
            email.account_email || ""
          );
          if (!result) continue;

          await supabase.from("gmail_emails").update({
            domain: result.domain || email.domain,
            category: result.category || email.category,
            ai_summary: result.summary || email.ai_summary,
            summary_short: result.summary_short || null,
            summary_medium: result.summary_medium || null,
            summary_full: result.summary_full || null,
            extracted_deadline: result.deadline || email.extracted_deadline,
            extracted_value: result.value || email.extracted_value,
            requires_action: result.requires_action ?? email.requires_action,
            requires_response: result.requires_response ?? email.requires_response,
            is_informational: result.is_informational ?? email.is_informational,
          }).eq("id", email.id);

          processed++;
          console.log(`Re-analyzed: ${email.subject?.slice(0, 60)}`);
        } catch (err) {
          console.error("Error re-analyzing:", email.id, err);
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed, remaining: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process emails without full analysis
    let processed = 0;
    for (const email of emails) {
      try {
        const result = await analyzeEmailWithAI(
          email.subject || "",
          email.snippet || "",
          email.sender || "",
          email.account_email || ""
        );
        if (!result) continue;

        await supabase.from("gmail_emails").update({
          domain: result.domain || email.domain,
          category: result.category || email.category,
          ai_summary: result.summary || email.ai_summary,
          summary_short: result.summary_short || null,
          summary_medium: result.summary_medium || null,
          summary_full: result.summary_full || null,
          extracted_deadline: result.deadline || email.extracted_deadline,
          extracted_value: result.value || email.extracted_value,
          requires_action: result.requires_action ?? email.requires_action,
          requires_response: result.requires_response ?? email.requires_response,
          is_informational: result.is_informational ?? email.is_informational,
        }).eq("id", email.id);

        processed++;
        console.log(`Re-analyzed: ${email.subject?.slice(0, 60)}`);
      } catch (err) {
        console.error("Error re-analyzing:", email.id, err);
      }
    }

    // Count remaining
    const { count } = await supabase
      .from("gmail_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .or("summary_full.is.null,summary_full.eq.");

    return new Response(
      JSON.stringify({ success: true, processed, remaining: count || 0 }),
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
