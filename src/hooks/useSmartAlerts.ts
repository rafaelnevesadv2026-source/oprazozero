import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SmartAlert {
  type: string;
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
  icon: string;
}

export interface AlertStats {
  health: number;
  overdue: number;
  pending: number;
  completed: number;
  processes: number;
  financialRisk: number;
}

export function useSmartAlerts() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-alerts");
      if (error) throw error;
      setAlerts(data.alerts || []);
      setStats(data.stats || null);
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
    }
    setLoading(false);
  }, []);

  return { alerts, stats, loading, fetchAlerts };
}
