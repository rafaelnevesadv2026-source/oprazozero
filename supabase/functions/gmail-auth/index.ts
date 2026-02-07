import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ error: "Google credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Step 1: Generate the Google OAuth URL
    if (action === "get_auth_url") {
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

      const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-auth?action=callback`;
      const scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${user.id}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Handle the OAuth callback from Google
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const userId = url.searchParams.get("state");

      if (!code || !userId) {
        return new Response("Missing code or state", { status: 400 });
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-auth?action=callback`;

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      console.log("Google token response status:", tokenRes.status);

      if (!tokenRes.ok) {
        console.error("Token exchange failed:", tokenData);
        return new Response(`Token exchange failed: ${JSON.stringify(tokenData)}`, { status: 400 });
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Get user email from Google
      let userEmail = "unknown";
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          userEmail = userInfo.email || "unknown";
        }
      } catch (e) {
        console.error("Failed to get user email:", e);
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Store in email_accounts table (supports multiple accounts)
      const { error: upsertError } = await supabase.from("email_accounts").upsert(
        {
          user_id: userId,
          email: userEmail,
          provider: "gmail",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          status: "active",
        },
        { onConflict: "user_id,email" }
      );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(`Database error: ${upsertError.message}`, { status: 500 });
      }

      // Also keep backward compatibility with gmail_tokens
      await supabase.from("gmail_tokens").upsert(
        {
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
        },
        { onConflict: "user_id" }
      );

      // Redirect user back to the app
      const appUrl = req.headers.get("origin") || "https://oprazozero.lovable.app";
      return new Response(
        `<html><body><script>window.location.href="${appUrl}/emails?connected=true"</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Step 3: Check connection status
    if (action === "status") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ connected: false, accounts: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ connected: false, accounts: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: accounts } = await supabase
        .from("email_accounts")
        .select("id, email, provider, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "active");

      // Backward compatibility: check gmail_tokens too
      const { data: legacyToken } = await supabase
        .from("gmail_tokens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const connected = (accounts && accounts.length > 0) || !!legacyToken;

      return new Response(JSON.stringify({ connected, accounts: accounts || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: Disconnect an account
    if (action === "disconnect") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let body: any = {};
      try { body = await req.json(); } catch {}
      const accountId = body.account_id;

      if (accountId) {
        await supabase.from("email_accounts").delete().eq("id", accountId).eq("user_id", user.id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Gmail auth error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
