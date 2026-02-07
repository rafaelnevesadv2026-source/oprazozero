import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  status: string;
  created_at: string;
}

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
  account_email: string | null;
}

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useGmail() {
  const { session, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    if (!session) { setConnected(false); setAccounts([]); setLoading(false); return; }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=status`,
        { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const json = await res.json();
      setConnected(json.connected);
      setAccounts(json.accounts || []);
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

  // Realtime subscription for new emails
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("gmail_emails_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gmail_emails", filter: `user_id=eq.${user.id}` },
        () => { fetchEmails(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchEmails]);

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

  const disconnectAccount = useCallback(async (accountId: string) => {
    if (!session) return;
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=disconnect`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account_id: accountId }),
      }
    );
    await checkStatus();
  }, [session, checkStatus]);

  const syncEmails = useCallback(async () => {
    if (!session) return;
    setSyncing(true);
    try {
      let hasMore = true;
      let totalProcessed = 0;
      while (hasMore) {
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
        if (!json.success) break;
        totalProcessed += json.processed || 0;
        hasMore = json.hasMore === true;
        if (hasMore) {
          console.log(`Synced batch (${totalProcessed} total), fetching more...`);
          await fetchEmails();
        }
      }
      await fetchEmails();
      return { success: true, processed: totalProcessed };
    } finally {
      setSyncing(false);
    }
  }, [session, fetchEmails]);

  // Auto-sync every 5 minutes when connected
  useEffect(() => {
    if (!connected || !session) return;
    intervalRef.current = setInterval(() => {
      syncEmails();
    }, AUTO_SYNC_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connected, session, syncEmails]);

  return { connected, accounts, emails, loading, syncing, connectGmail, disconnectAccount, syncEmails, refetch: fetchEmails };
}
