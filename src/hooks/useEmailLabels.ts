import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEmailLabels(emailId: string | undefined) {
  const { user } = useAuth();
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmailLabels = useCallback(async () => {
    if (!emailId || !user) return;
    const { data } = await supabase
      .from("email_labels")
      .select("label_id")
      .eq("email_id", emailId);
    if (data) setLabelIds(data.map((r: any) => r.label_id));
  }, [emailId, user]);

  useEffect(() => {
    fetchEmailLabels();
  }, [fetchEmailLabels]);

  const addLabel = useCallback(async (labelId: string) => {
    if (!emailId) return;
    setLoading(true);
    await supabase.from("email_labels").insert({ email_id: emailId, label_id: labelId });
    setLabelIds(prev => [...prev, labelId]);
    setLoading(false);
  }, [emailId]);

  const removeLabel = useCallback(async (labelId: string) => {
    if (!emailId) return;
    setLoading(true);
    await supabase.from("email_labels").delete().eq("email_id", emailId).eq("label_id", labelId);
    setLabelIds(prev => prev.filter(id => id !== labelId));
    setLoading(false);
  }, [emailId]);

  const toggleLabel = useCallback(async (labelId: string) => {
    if (labelIds.includes(labelId)) {
      await removeLabel(labelId);
    } else {
      await addLabel(labelId);
    }
  }, [labelIds, addLabel, removeLabel]);

  return { labelIds, loading, toggleLabel, refetch: fetchEmailLabels };
}
