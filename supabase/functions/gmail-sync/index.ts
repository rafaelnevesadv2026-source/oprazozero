import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  
  // Direct body
  if (payload.body?.data) {
    try {
      const decoded = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      return decoded;
    } catch { /* ignore */ }
  }
  
  // Multipart
  if (payload.parts) {
    // Prefer text/plain, then text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        try {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch { /* ignore */ }
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        try {
          const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          // Strip HTML tags for text content
          return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                     .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                     .replace(/<[^>]+>/g, ' ')
                     .replace(/&nbsp;/g, ' ')
                     .replace(/&amp;/g, '&')
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>')
                     .replace(/&quot;/g, '"')
                     .replace(/\s+/g, ' ')
                     .trim();
        } catch { /* ignore */ }
      }
    }
    // Recurse into nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBodyFromParts(part);
        if (nested) return nested;
      }
    }
  }
  return "";
}

async function classifyEmailWithAI(subject: string, bodyText: string, sender: string, accountEmail: string = "") {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, skipping AI classification");
    return { domain: "pessoal", category: "outros", summary: bodyText.slice(0, 200), summary_short: "", summary_medium: "", summary_full: "", deadline: null, value: null, should_create_task: false, task_title: null, task_priority: "medium", requires_action: false, requires_response: false, is_informational: true };
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    
    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de análise profunda de emails para um escritório de advocacia e seguros no Brasil. Data de hoje: ${today}.

REGRA DE OURO: Não simplifique, ORGANIZE. Jamais omita informações.

Analise o email e retorne um JSON com:

- "domain": "juridico" | "pessoal" | "descarte"
- "category": "pagamentos" | "boletos" | "prazos" | "processos" | "intimacoes" | "sinistros" | "contatos" | "promocoes" | "outros"
- "summary": resumo em 1-2 frases
- "summary_short": resumo em 1 linha "📋 Tipo | Referência — ação — prazo"
- "summary_medium": resumo em 4-8 linhas
- "summary_full": ANÁLISE COMPLETA (mínimo 15 linhas). DEVE CONTER: IDENTIFICAÇÃO, DESTINATÁRIO (${accountEmail}), CONTEXTO, CONTEÚDO INTEGRAL, PARTES ENVOLVIDAS, DADOS JURÍDICOS, DADOS FINANCEIROS, DOCUMENTOS, PRAZOS E DATAS, ANÁLISE DE RISCO, AÇÕES RECOMENDADAS, CONSEQUÊNCIAS DE INAÇÃO
- "deadline": data ISO se houver prazo, ou null
- "value": valor monetário (número), ou null
- "should_create_task": true se contém prazo/pagamento/boleto/intimação/audiência
- "task_title": título da tarefa se should_create_task=true
- "task_priority": "low" | "medium" | "high"
- "requires_action": true se requer ação
- "requires_response": true se exige resposta
- "is_informational": true se apenas informativo

Responda APENAS o JSON válido, sem markdown, sem texto extra.`,
        },
        {
          role: "user",
          content: `De: ${sender}\nAssunto: ${subject}\nConteúdo:\n${bodyText.slice(0, 10000)}`,
        },
      ],
      temperature: 0.1,
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 500)}`);
      return { domain: "pessoal", category: "outros", summary: bodyText.slice(0, 200), summary_short: "", summary_medium: "", summary_full: "", deadline: null, value: null, should_create_task: false, task_title: null, task_priority: "medium", requires_action: false, requires_response: false, is_informational: true };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("AI response length:", content.length);

    if (!content || content.length === 0) {
      console.error("AI returned empty content. Full response:", JSON.stringify(data).slice(0, 500));
      return { domain: "pessoal", category: "outros", summary: bodyText.slice(0, 200), summary_short: "", summary_medium: "", summary_full: "", deadline: null, value: null, should_create_task: false, task_title: null, task_priority: "medium", requires_action: false, requires_response: false, is_informational: true };
    }

    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        domain: parsed.domain || "pessoal",
        category: parsed.category || "outros",
        summary: parsed.summary || bodyText.slice(0, 200),
        summary_short: parsed.summary_short || "",
        summary_medium: parsed.summary_medium || "",
        summary_full: parsed.summary_full || "",
        deadline: parsed.deadline || null,
        value: parsed.value || null,
        should_create_task: parsed.should_create_task === true,
        task_title: parsed.task_title || null,
        task_priority: parsed.task_priority || "medium",
        requires_action: parsed.requires_action === true,
        requires_response: parsed.requires_response === true,
        is_informational: parsed.is_informational === true,
      };
    } else {
      console.error("No JSON in AI response:", content.slice(0, 300));
    }
  } catch (err) {
    console.error("AI classification error:", err);
  }

  return { domain: "pessoal", category: "outros", summary: bodyText.slice(0, 200), summary_short: "", summary_medium: "", summary_full: "", deadline: null, value: null, should_create_task: false, task_title: null, task_priority: "medium", requires_action: false, requires_response: false, is_informational: true };
}

async function syncAccount(supabase: any, account: any, userId: string, clientId: string, clientSecret: string) {
  let accessToken = account.access_token;

  // Refresh token if expired
  if (new Date(account.expires_at) < new Date()) {
    console.log(`Refreshing token for ${account.email}...`);
    const refreshed = await refreshAccessToken(account.refresh_token, clientId, clientSecret);
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      await supabase.from("email_accounts").update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("id", account.id);
    } else {
      console.error(`Token refresh failed for ${account.email}:`, refreshed);
      await supabase.from("email_accounts").update({ status: "error" }).eq("id", account.id);
      return { processed: 0, errors: 1 };
    }
  }

  // Fix account email if it's a placeholder
  if (account.email === "conta conectada" || account.email === "conta principal" || account.email === "unknown") {
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        if (userInfo.email) {
          account.email = userInfo.email;
          await supabase.from("email_accounts").update({ email: userInfo.email }).eq("id", account.id);
          // Also update existing emails with the correct account_email
          await supabase.from("gmail_emails").update({ account_email: userInfo.email })
            .eq("account_id", account.id);
          console.log(`Fixed account email to: ${userInfo.email}`);
        }
      }
    } catch (e) {
      console.error("Failed to fix account email:", e);
    }
  }

  // Fetch emails with pagination - no hard cap
  const MAX_MESSAGES_PER_RUN = 5000;
  console.log(`Fetching emails for ${account.email} (max ${MAX_MESSAGES_PER_RUN} IDs)...`);
  const allMessages: any[] = [];
  let pageToken: string | null = null;

  do {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!listRes.ok) {
      console.error(`Gmail list error for ${account.email}:`, listRes.status);
      if (allMessages.length === 0) return { processed: 0, errors: 1 };
      break;
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];
    allMessages.push(...messages);
    pageToken = listData.nextPageToken || null;
    console.log(`Fetched ${allMessages.length} message IDs so far...`);
    if (allMessages.length >= MAX_MESSAGES_PER_RUN) break;
  } while (pageToken);

  console.log(`Total ${allMessages.length} messages fetched for ${account.email}`);

  // Get already imported email IDs (paginated to avoid 1000 limit)
  const existingIds = new Set<string>();
  let from = 0;
  const PAGE = 1000;
  let fetching = true;
  while (fetching) {
    const { data: existingEmails } = await supabase
      .from("gmail_emails")
      .select("gmail_id")
      .eq("user_id", userId)
      .range(from, from + PAGE - 1);
    if (existingEmails && existingEmails.length > 0) {
      for (const e of existingEmails) existingIds.add(e.gmail_id);
      from += existingEmails.length;
      if (existingEmails.length < PAGE) fetching = false;
    } else {
      fetching = false;
    }
  }
  console.log(`${existingIds.size} existing emails in DB`);


  const newEmails = allMessages.filter((m: any) => !existingIds.has(m.id));
  
  // Limit processing per run to avoid timeout (AI classification is slow)
  const MAX_PROCESS_PER_RUN = 30;
  const emailsToProcess = newEmails.slice(0, MAX_PROCESS_PER_RUN);
  console.log(`${newEmails.length} new emails found, processing ${emailsToProcess.length} for ${account.email}`);

  let processed = 0;
  for (const msg of emailsToProcess) {
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
      
      // Extract full body text
      const bodyText = extractBodyFromParts(msgData.payload) || snippet;

      // Classify with AI using full body
      const classification = await classifyEmailWithAI(subject, bodyText, sender, account.email);

      // Insert email
      const { error: insertError } = await supabase.from("gmail_emails").insert({
        user_id: userId,
        gmail_id: msg.id,
        subject,
        sender,
        snippet,
        body_text: bodyText.slice(0, 50000),
        received_at: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        category: classification.category,
        ai_summary: classification.summary,
        summary_short: classification.summary_short || null,
        summary_medium: classification.summary_medium || null,
        summary_full: classification.summary_full || null,
        extracted_deadline: classification.deadline,
        extracted_value: classification.value,
        account_id: account.id,
        account_email: account.email,
        task_created: classification.should_create_task,
        domain: classification.domain || "pessoal",
        requires_action: classification.requires_action === true,
        requires_response: classification.requires_response === true,
        is_informational: classification.is_informational === true,
      });

      if (insertError) {
        console.error("Insert error for", msg.id, insertError);
        continue;
      }

      // Auto-create task if AI says so
      if (classification.should_create_task && classification.task_title) {
        const deadline = classification.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: taskError } = await supabase.from("tasks").insert({
          user_id: userId,
          title: classification.task_title,
          description: `📧 ${subject}\n\n${classification.summary}\n\nDe: ${sender}`,
          deadline,
          priority: classification.task_priority || "medium",
          source: "email",
          status: "pending",
          domain: classification.domain || "pessoal",
        });
        if (taskError) {
          console.error("Task creation error:", taskError);
        } else {
          console.log(`Auto-created task: ${classification.task_title}`);
        }
      }

      processed++;
    } catch (err) {
      console.error("Error processing message:", msg.id, err);
    }
  }

  const hasMore = newEmails.length > MAX_PROCESS_PER_RUN;
  return { processed, errors: 0, hasMore };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
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

    // Get all active email accounts
    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    // Also check legacy gmail_tokens for backward compatibility
    const { data: legacyToken } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const allAccounts = [...(accounts || [])];

    // If there's a legacy token not in email_accounts, add it
    if (legacyToken && (!accounts || accounts.length === 0)) {
      allAccounts.push({
        id: legacyToken.id,
        email: "conta principal",
        access_token: legacyToken.access_token,
        refresh_token: legacyToken.refresh_token,
        expires_at: legacyToken.expires_at,
      });
    }

    if (allAccounts.length === 0) {
      return new Response(JSON.stringify({ error: "No email accounts connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Syncing ${allAccounts.length} account(s) for user ${user.id}`);

    let totalProcessed = 0;
    let totalErrors = 0;
    let hasMore = false;

    for (const account of allAccounts) {
      const result = await syncAccount(supabase, account, user.id, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      totalProcessed += result.processed;
      totalErrors += result.errors;
      if (result.hasMore) hasMore = true;
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed, accounts: allAccounts.length, errors: totalErrors, hasMore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Gmail sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
