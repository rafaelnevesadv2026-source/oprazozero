import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GmailEmail {
  id: string;
  gmail_id: string;
  subject: string | null;
  sender: string | null;
  snippet: string | null;
  received_at: string | null;
  category: string;
  ai_summary: string | null;
  extracted_deadline: string | null;
  extracted_value: number | null;
  task_created: boolean;
}

export function useGmail() {
  const { session, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!session) { setConnected(false); setLoading(false); return; }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=status`,
        { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const json = await res.json();
      setConnected(json.connected);
    } catch {
      setConnected(false);
    }
    setLoading(false);
  }, [session]);

  const fetchEmails = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("gmail_emails")
      .select("*")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false });
    if (data) setEmails(data as unknown as GmailEmail[]);
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (connected) fetchEmails();
  }, [connected, fetchEmails]);

  const connectGmail = useCallback(async () => {
    if (!session) return;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=get_auth_url`,
      { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
    );
    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    }
  }, [session]);

  const syncEmails = useCallback(async () => {
    if (!session) return;
    setSyncing(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (json.success) {
        await fetchEmails();
      }
      return json;
    } finally {
      setSyncing(false);
    }
  }, [session, fetchEmails]);

  return { connected, emails, loading, syncing, connectGmail, syncEmails, refetch: fetchEmails };
}
