import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractBodyFromParts(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    try {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch { /* ignore */ }
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        try { return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch { /* ignore */ }
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        try {
          const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        } catch { /* ignore */ }
      }
    }
    for (const part of payload.parts) {
      if (part.parts) { const n = extractBodyFromParts(part); if (n) return n; }
    }
  }
  return "";
}

async function fetchFullBodyFromGmail(supabase: any, email: any): Promise<string> {
  if (email.body_text && email.body_text.length > 100) return email.body_text;
  
  // Try to get access token from email_accounts
  if (!email.account_id) return email.snippet || "";
  
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  
  const { data: account } = await supabase.from("email_accounts").select("*").eq("id", email.account_id).maybeSingle();
  if (!account) return email.snippet || "";
  
  let accessToken = account.access_token;
  if (new Date(account.expires_at) < new Date()) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ refresh_token: account.refresh_token, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, grant_type: "refresh_token" }),
    });
    const refreshed = await res.json();
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      await supabase.from("email_accounts").update({ access_token: refreshed.access_token, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() }).eq("id", account.id);
    } else {
      return email.snippet || "";
    }
  }
  
  try {
    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmail_id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!msgRes.ok) return email.snippet || "";
    const msgData = await msgRes.json();
    const bodyText = extractBodyFromParts(msgData.payload) || email.snippet || "";
    
    // Save body_text for future use
    if (bodyText.length > 100) {
      await supabase.from("gmail_emails").update({ body_text: bodyText.slice(0, 50000) }).eq("id", email.id);
    }
    return bodyText;
  } catch {
    return email.snippet || "";
  }
}

async function analyzeEmailWithAI(subject: string, bodyText: string, sender: string, accountEmail: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const today = new Date().toISOString().split("T")[0];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de análise profunda de emails para um escritório de advocacia e seguros no Brasil. Data de hoje: ${today}.

REGRA DE OURO: Não simplifique, ORGANIZE. Jamais omita informações. Toda informação extraída deve ser 100% rastreável ao conteúdo original.

Analise o email COMPLETO e retorne um JSON com:

- "domain": "juridico" | "pessoal" | "descarte"
- "category": "pagamentos" | "boletos" | "prazos" | "processos" | "intimacoes" | "sinistros" | "contatos" | "promocoes" | "outros"
- "summary": resumo em 1-2 frases
- "summary_short": resumo em 1 linha "📋 Tipo | Referência — ação — prazo"
- "summary_medium": resumo em 4-8 linhas
- "summary_full": ANÁLISE COMPLETA E EXAUSTIVA. MÍNIMO 30 LINHAS, ATÉ 50 LINHAS. TRANSCREVA TODO O CONTEÚDO RELEVANTE. DEVE CONTER:
  1. IDENTIFICAÇÃO: Nome completo do remetente, cargo, empresa/instituição, email
  2. DESTINATÁRIO: Para quem (conta: ${accountEmail})
  3. CONTEXTO: Tema principal, natureza (jurídico, financeiro, comercial, informativo)
  4. CONTEÚDO INTEGRAL: TRANSCREVA todas as informações do email - números, nomes, referências, protocolos, solicitações
  5. PARTES ENVOLVIDAS: TODAS as partes/pessoas/empresas mencionadas e seus papéis
  6. DADOS JURÍDICOS (se aplicável): Nº processo, vara, fórum, comarca, juiz/desembargador, partes (autor/réu), tipo de ação, determinação judicial, prazos legais
  7. DADOS FINANCEIROS (se aplicável): TODOS os valores mencionados, tipo de operação, referências bancárias, status de pagamento, vencimentos
  8. DOCUMENTOS SOLICITADOS/ANEXOS: Liste CADA documento mencionado ou solicitado
  9. PRAZOS E DATAS: TODAS as datas com seu significado e consequência
  10. NÚMEROS DE PROTOCOLO/REFERÊNCIA: Todos os números identificadores
  11. ANÁLISE DE RISCO: Impacto detalhado de não agir
  12. AÇÕES RECOMENDADAS: Lista numerada detalhada de próximos passos
  13. CONSEQUÊNCIAS DE INAÇÃO: O que acontece se não agir

- "deadline": data ISO se houver prazo, ou null
- "value": valor monetário (número), ou null
- "should_create_task": true se contém prazo, pagamento, boleto, intimação, audiência, ação necessária
- "task_title": título da tarefa
- "task_priority": "low" | "medium" | "high"
- "requires_action": true se requer ação (pagamento, resposta obrigatória, prazo legal, decisão, envio de documentos)
- "requires_response": true se exige resposta por email
- "is_informational": true APENAS se é puramente informativo SEM nenhuma ação necessária

IMPORTANTE:
- Emails de pagamento/boleto/cobrança → requires_action: true, is_informational: false
- Emails de prazo/intimação/audiência → requires_action: true, is_informational: false
- Emails pedindo documentos/resposta → requires_response: true, is_informational: false
- APENAS avisos genéricos, newsletters, confirmações automáticas → is_informational: true

Responda APENAS o JSON, sem markdown.`,
        },
        {
          role: "user",
          content: `De: ${sender}\nAssunto: ${subject}\nConteúdo completo do email:\n${bodyText.slice(0, 12000)}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  console.log("AI raw response length:", content.length, "first 200 chars:", content.slice(0, 200));
  
  // Clean markdown code fences if present
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        domain: parsed.domain || "pessoal",
        category: parsed.category || "outros",
        summary: parsed.summary || "",
        summary_short: parsed.summary_short || "",
        summary_medium: parsed.summary_medium || "",
        summary_full: parsed.summary_full || "",
        deadline: parsed.deadline || null,
        value: parsed.value || null,
        requires_action: parsed.requires_action === true,
        requires_response: parsed.requires_response === true,
        is_informational: parsed.is_informational === true,
      };
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "content:", content.slice(0, 500));
    }
  } else {
    console.error("No JSON found in AI response:", content.slice(0, 500));
  }
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

    // Prioritize emails without good summary_full
    const { data: poorEmails } = await supabase
      .from("gmail_emails")
      .select("*")
      .eq("user_id", user.id)
      .or("summary_full.is.null,summary_full.eq.")
      .order("received_at", { ascending: false })
      .limit(batchSize);
    
    // If no poor emails, get recent ones to re-process
    const emails = (poorEmails && poorEmails.length > 0) ? poorEmails : (await supabase
      .from("gmail_emails")
      .select("*")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(batchSize)).data;

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, remaining: 0, message: "No emails to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toProcess = emails;

    let processed = 0;
    for (const email of toProcess) {
      try {
        console.log(`Processing: ${email.subject?.slice(0, 60)}...`);
        
        // Fetch full body from Gmail if not stored
        const bodyText = await fetchFullBodyFromGmail(supabase, email);
        console.log(`Body text length: ${bodyText.length} chars`);
        
        const result = await analyzeEmailWithAI(
          email.subject || "",
          bodyText,
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
