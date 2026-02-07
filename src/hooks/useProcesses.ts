import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Process {
  id: string;
  processNumber: string;
  clientName: string;
  adversary: string;
  status: string;
  domain: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function useProcesses() {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProcesses = useCallback(async () => {
    if (!user) { setProcesses([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("processes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setProcesses(data.map((p) => ({
        id: p.id,
        processNumber: p.process_number,
        clientName: p.client_name,
        adversary: p.adversary || "",
        status: p.status,
        domain: p.domain,
        notes: p.notes || "",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProcesses(); }, [fetchProcesses]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("processes_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "processes", filter: `user_id=eq.${user.id}` }, () => fetchProcesses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchProcesses]);

  const addProcess = useCallback(async (data: { processNumber: string; clientName: string; adversary?: string; domain?: string; notes?: string }) => {
    if (!user) return;
    await supabase.from("processes").insert({
      user_id: user.id,
      process_number: data.processNumber,
      client_name: data.clientName,
      adversary: data.adversary || "",
      domain: data.domain || "juridico",
      notes: data.notes || "",
    });
    await fetchProcesses();
  }, [user, fetchProcesses]);

  const updateProcess = useCallback(async (id: string, updates: Partial<{ processNumber: string; clientName: string; adversary: string; status: string; notes: string }>) => {
    const mapped: Record<string, unknown> = {};
    if (updates.processNumber !== undefined) mapped.process_number = updates.processNumber;
    if (updates.clientName !== undefined) mapped.client_name = updates.clientName;
    if (updates.adversary !== undefined) mapped.adversary = updates.adversary;
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.notes !== undefined) mapped.notes = updates.notes;
    await supabase.from("processes").update(mapped).eq("id", id);
    await fetchProcesses();
  }, [fetchProcesses]);

  const deleteProcess = useCallback(async (id: string) => {
    await supabase.from("processes").delete().eq("id", id);
    await fetchProcesses();
  }, [fetchProcesses]);

  return { processes, loading, addProcess, updateProcess, deleteProcess, refetch: fetchProcesses };
}
