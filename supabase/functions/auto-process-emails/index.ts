import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function runs automatically via cron to:
// 1. Sync new emails from all accounts
// 2. Classify unprocessed emails with AI

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  return await res.json();
}

function extractBodyFromParts(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    try { return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch { /* ignore */ }
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

async function classifyWithAI(subject: string, bodyText: string, sender: string, accountEmail: string) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set");
    return null;
  }
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de análise de emails para um escritório de advocacia e seguros no Brasil. Data: ${today}.
Analise o email e retorne APENAS um JSON válido com:
- "domain": "juridico"|"pessoal"|"descarte"
- "category": "pagamentos"|"boletos"|"prazos"|"processos"|"intimacoes"|"sinistros"|"contatos"|"promocoes"|"outros"
- "summary": resumo em 1-2 frases
- "summary_short": 1 linha "📋 Tipo | Ref — ação — prazo"
- "summary_medium": 4-8 linhas
- "summary_full": análise completa 15-50 linhas com: identificação, destinatário (${accountEmail}), contexto, conteúdo, partes, dados jurídicos/financeiros, prazos, risco, ações recomendadas
- "deadline": ISO date ou null
- "value": número ou null
- "should_create_task": boolean
- "task_title": string ou null
- "task_priority": "low"|"medium"|"high"
- "requires_action": boolean
- "requires_response": boolean
- "is_informational": boolean
Responda APENAS o JSON, sem markdown.`,
        },
        { role: "user", content: `De: ${sender}\nAssunto: ${subject}\nConteúdo:\n${bodyText.slice(0, 10000)}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 300)}`);
    return null;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) {
    console.error("OpenAI empty response:", JSON.stringify(data).slice(0, 300));
    return null;
  }

  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) { console.error("JSON parse error:", e); }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("[auto-process] Starting automatic email processing...");

    // Get ALL active email accounts across ALL users
    const { data: accounts, error: accErr } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("status", "active");

    if (accErr || !accounts || accounts.length === 0) {
      console.log("[auto-process] No active accounts found");
      return new Response(JSON.stringify({ success: true, message: "No accounts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[auto-process] Found ${accounts.length} active account(s)`);

    let totalSynced = 0;
    let totalClassified = 0;

    // PHASE 1: Sync new emails from Gmail for each account
    for (const account of accounts) {
      try {
        let accessToken = account.access_token;

        // Refresh token if expired
        if (new Date(account.expires_at) < new Date()) {
          const refreshed = await refreshAccessToken(account.refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
          if (refreshed.access_token) {
            accessToken = refreshed.access_token;
            await supabase.from("email_accounts").update({
              access_token: refreshed.access_token,
              expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            }).eq("id", account.id);
          } else {
            console.error(`[auto-process] Token refresh failed for ${account.email}`);
            continue;
          }
        }

        // Get recent messages (last 50 for speed)
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listRes.ok) {
          console.error(`[auto-process] Gmail list error for ${account.email}: ${listRes.status}`);
          continue;
        }

        const listData = await listRes.json();
        const messages = listData.messages || [];

        // Check which are new
        const gmailIds = messages.map((m: any) => m.id);
        const { data: existing } = await supabase
          .from("gmail_emails")
          .select("gmail_id")
          .eq("user_id", account.user_id)
          .in("gmail_id", gmailIds);

        const existingIds = new Set((existing || []).map((e: any) => e.gmail_id));
        const newMessages = messages.filter((m: any) => !existingIds.has(m.id));

        console.log(`[auto-process] ${account.email}: ${newMessages.length} new emails`);

        // Process new emails (limit 10 per account per run to avoid timeout)
        for (const msg of newMessages.slice(0, 10)) {
          try {
            const msgRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!msgRes.ok) continue;
            const msgData = await msgRes.json();

            const headers = msgData.payload?.headers || [];
            const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || "";
            const subject = getHeader("Subject");
            const sender = getHeader("From");
            const dateStr = getHeader("Date");
            const snippet = msgData.snippet || "";
            const bodyText = extractBodyFromParts(msgData.payload) || snippet;

            // Classify with AI
            const ai = await classifyWithAI(subject, bodyText, sender, account.email);

            const { error: insertError } = await supabase.from("gmail_emails").insert({
              user_id: account.user_id,
              gmail_id: msg.id,
              subject,
              sender,
              snippet,
              body_text: bodyText.slice(0, 50000),
              received_at: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
              category: ai?.category || "outros",
              ai_summary: ai?.summary || snippet.slice(0, 200),
              summary_short: ai?.summary_short || null,
              summary_medium: ai?.summary_medium || null,
              summary_full: ai?.summary_full || null,
              extracted_deadline: ai?.deadline || null,
              extracted_value: ai?.value || null,
              account_id: account.id,
              account_email: account.email,
              task_created: ai?.should_create_task === true,
              domain: ai?.domain || "pessoal",
              requires_action: ai?.requires_action === true,
              requires_response: ai?.requires_response === true,
              is_informational: ai?.is_informational !== false,
            });

            if (!insertError) {
              totalSynced++;
              // Auto-create task
              if (ai?.should_create_task && ai?.task_title) {
                await supabase.from("tasks").insert({
                  user_id: account.user_id,
                  title: ai.task_title,
                  description: `📧 ${subject}\n\n${ai.summary || ""}\n\nDe: ${sender}`,
                  deadline: ai.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  priority: ai.task_priority || "medium",
                  source: "email",
                  status: "pending",
                  domain: ai.domain || "pessoal",
                });
              }
            }
          } catch (e) {
            console.error(`[auto-process] Error processing msg ${msg.id}:`, e);
          }
        }
      } catch (e) {
        console.error(`[auto-process] Error syncing account ${account.email}:`, e);
      }
    }

    // PHASE 2: Classify unprocessed emails (missing summary_full)
    const { data: unprocessed } = await supabase
      .from("gmail_emails")
      .select("*")
      .or("summary_full.is.null,summary_full.eq.")
      .order("received_at", { ascending: false })
      .limit(10);

    if (unprocessed && unprocessed.length > 0) {
      console.log(`[auto-process] Classifying ${unprocessed.length} unprocessed emails...`);
      for (const email of unprocessed) {
        const bodyText = email.body_text || email.snippet || "";
        const ai = await classifyWithAI(
          email.subject || "",
          bodyText,
          email.sender || "",
          email.account_email || ""
        );
        if (ai) {
          await supabase.from("gmail_emails").update({
            domain: ai.domain || "pessoal",
            category: ai.category || "outros",
            ai_summary: ai.summary || null,
            summary_short: ai.summary_short || null,
            summary_medium: ai.summary_medium || null,
            summary_full: ai.summary_full || null,
            extracted_deadline: ai.deadline || null,
            extracted_value: ai.value || null,
            requires_action: ai.requires_action === true,
            requires_response: ai.requires_response === true,
            is_informational: ai.is_informational === true,
          }).eq("id", email.id);
          totalClassified++;
        }
      }
    }

    console.log(`[auto-process] Done. Synced: ${totalSynced}, Classified: ${totalClassified}`);

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced, classified: totalClassified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[auto-process] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
