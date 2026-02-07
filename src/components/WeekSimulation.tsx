import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, RefreshCw, AlertTriangle } from "lucide-react";

interface SimDay {
  date: string;
  dayName: string;
  taskCount: number;
  estimatedMinutes: number;
  tasks: Array<{ id: string; title: string; priority: string; deadline: string }>;
}

interface Simulation {
  days: SimDay[];
  suggestions: string[];
  totalTasks: number;
  totalEstimatedMinutes: number;
}

export function WeekSimulation() {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("week-simulation");
      if (error) throw error;
      setSim(data);
    } catch (e) {
      console.error("Week simulation failed:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSimulation(); }, [fetchSimulation]);

  const formatTime = (min: number) => {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Simulação da Semana
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchSimulation} disabled={loading} className="h-7 w-7">
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !sim ? (
          <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">Simulando...</p>
        ) : sim ? (
          <div className="space-y-3">
            {/* Days */}
            <div className="space-y-1.5">
              {sim.days.map((day) => {
                const isOverloaded = day.estimatedMinutes > 120;
                return (
                  <div key={day.date} className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-md text-xs",
                    isOverloaded ? "bg-warning/10 border border-warning/20" : "bg-muted/50"
                  )}>
                    <div className="flex items-center gap-2">
                      {isOverloaded && <AlertTriangle className="h-3 w-3 text-warning" />}
                      <span className="font-medium text-card-foreground">{day.dayName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{day.taskCount} tarefa{day.taskCount !== 1 ? "s" : ""}</span>
                      <span className={cn("font-mono", isOverloaded ? "text-warning font-semibold" : "")}>
                        {formatTime(day.estimatedMinutes)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Suggestions */}
            {sim.suggestions.length > 0 && (
              <div className="space-y-1 pt-2 border-t">
                {sim.suggestions.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{s}</p>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
