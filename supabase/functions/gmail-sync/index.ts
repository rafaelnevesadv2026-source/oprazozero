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

async function classifyEmailWithAI(subject: string, snippet: string, sender: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not set, skipping AI classification");
    return { category: "outros", summary: snippet, deadline: null, value: null, should_create_task: false, task_title: null, task_priority: "medium" };
  }

  try {
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
            content: `Você é um assistente que classifica emails para um advogado brasileiro. Data de hoje: ${today}.
Analise o email e retorne um JSON com:
- "category": uma de ["pagamentos", "boletos", "prazos", "promocoes", "contatos", "outros"]
- "summary": resumo em 1-2 frases em português
- "deadline": data do prazo se houver (formato ISO YYYY-MM-DDTHH:mm:ss), ou null
- "value": valor monetário mencionado (número), ou null
- "should_create_task": true se o email contém prazo, pagamento, boleto ou ação necessária
- "task_title": título curto para a tarefa (se should_create_task=true), ou null
- "task_priority": "low", "medium" ou "high" baseado na urgência
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
        category: parsed.category || "outros",
        summary: parsed.summary || snippet,
        deadline: parsed.deadline || null,
        value: parsed.value || null,
        should_create_task: parsed.should_create_task || false,
        task_title: parsed.task_title || null,
        task_priority: parsed.task_priority || "medium",
      };
    }
  } catch (err) {
    console.error("AI classification error:", err);
  }

  return { category: "outros", summary: snippet, deadline: null, value: null, should_create_task: false, task_title: null, task_priority: "medium" };
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

  // Fetch ALL emails with pagination
  console.log(`Fetching all emails for ${account.email}...`);
  const allMessages: any[] = [];
  let pageToken: string | null = null;

  do {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
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
  } while (pageToken);

  console.log(`Total ${allMessages.length} messages found for ${account.email}`);

  // Get already imported email IDs
  const { data: existingEmails } = await supabase
    .from("gmail_emails")
    .select("gmail_id")
    .eq("user_id", userId);
  const existingIds = new Set((existingEmails || []).map((e: any) => e.gmail_id));

  const newEmails = allMessages.filter((m: any) => !existingIds.has(m.id));
  console.log(`${newEmails.length} new emails to process for ${account.email}`);

  let processed = 0;
  for (const msg of newEmails) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
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

      // Classify with AI
      const classification = await classifyEmailWithAI(subject, snippet, sender);

      // Insert email
      const { error: insertError } = await supabase.from("gmail_emails").insert({
        user_id: userId,
        gmail_id: msg.id,
        subject,
        sender,
        snippet,
        received_at: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        category: classification.category,
        ai_summary: classification.summary,
        extracted_deadline: classification.deadline,
        extracted_value: classification.value,
        account_id: account.id,
        account_email: account.email,
        task_created: classification.should_create_task,
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

  return { processed, errors: 0 };
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

    for (const account of allAccounts) {
      const result = await syncAccount(supabase, account, user.id, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      totalProcessed += result.processed;
      totalErrors += result.errors;
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed, accounts: allAccounts.length, errors: totalErrors }),
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
