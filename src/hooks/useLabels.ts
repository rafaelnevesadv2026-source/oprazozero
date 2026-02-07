import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Label {
  id: string;
  name: string;
  color: string;
}

export function useLabels() {
  const { user } = useAuth();
  const [labels, setLabels] = useState<Label[]>([]);

  const fetchLabels = useCallback(async () => {
    if (!user) { setLabels([]); return; }
    const { data } = await supabase
      .from("labels")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (data) setLabels(data.map((l) => ({ id: l.id, name: l.name, color: l.color })));
  }, [user]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const addLabel = useCallback(async (name: string, color: string) => {
    if (!user) return;
    await supabase.from("labels").insert({ user_id: user.id, name, color });
    await fetchLabels();
  }, [user, fetchLabels]);

  const deleteLabel = useCallback(async (id: string) => {
    await supabase.from("labels").delete().eq("id", id);
    await fetchLabels();
  }, [fetchLabels]);

  return { labels, addLabel, deleteLabel, refetch: fetchLabels };
}
