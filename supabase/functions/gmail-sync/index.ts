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
    return { category: "outros", summary: snippet, deadline: null, value: null };
  }

  try {
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
            content: `Você é um assistente que classifica emails para um advogado brasileiro.
Analise o email e retorne um JSON com:
- "category": uma de ["pagamentos", "boletos", "prazos", "promocoes", "contatos", "outros"]
- "summary": resumo em 1-2 frases em português
- "deadline": data do prazo se houver (formato ISO), ou null
- "value": valor monetário mencionado (número), ou null
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
    
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || "outros",
        summary: parsed.summary || snippet,
        deadline: parsed.deadline || null,
        value: parsed.value || null,
      };
    }
  } catch (err) {
    console.error("AI classification error:", err);
  }

  return { category: "outros", summary: snippet, deadline: null, value: null };
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
    // Authenticate user
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

    // Get user's Gmail tokens
    const { data: gmailToken } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!gmailToken) {
      return new Response(JSON.stringify({ error: "Gmail not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if expired
    let accessToken = gmailToken.access_token;
    if (new Date(gmailToken.expires_at) < new Date()) {
      console.log("Refreshing expired token...");
      const refreshed = await refreshAccessToken(
        gmailToken.refresh_token,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );
      if (refreshed.access_token) {
        accessToken = refreshed.access_token;
        await supabase.from("gmail_tokens").update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        }).eq("user_id", user.id);
      } else {
        console.error("Token refresh failed:", refreshed);
        return new Response(JSON.stringify({ error: "Token refresh failed. Reconnect Gmail." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch recent emails from Gmail API
    console.log("Fetching emails from Gmail API...");
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=newer_than:7d",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      const errBody = await listRes.text();
      console.error("Gmail list error:", listRes.status, errBody);
      return new Response(JSON.stringify({ error: "Failed to fetch emails", details: errBody }), {
        status: listRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];
    console.log(`Found ${messages.length} messages`);

    // Get already imported email IDs
    const { data: existingEmails } = await supabase
      .from("gmail_emails")
      .select("gmail_id")
      .eq("user_id", user.id);
    const existingIds = new Set((existingEmails || []).map((e: any) => e.gmail_id));

    const newEmails = messages.filter((m: any) => !existingIds.has(m.id));
    console.log(`${newEmails.length} new emails to process`);

    let processed = 0;
    for (const msg of newEmails.slice(0, 10)) {
      // Fetch full message
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

      // Insert into database
      const { error: insertError } = await supabase.from("gmail_emails").insert({
        user_id: user.id,
        gmail_id: msg.id,
        subject,
        sender,
        snippet,
        received_at: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        category: classification.category,
        ai_summary: classification.summary,
        extracted_deadline: classification.deadline,
        extracted_value: classification.value,
      });

      if (insertError) {
        console.error("Insert error for", msg.id, insertError);
      } else {
        processed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, total: messages.length }),
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
