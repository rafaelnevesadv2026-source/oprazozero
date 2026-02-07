import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, RefreshCw, AlertTriangle, CheckCircle2, AlertOctagon, TrendingUp, Activity } from "lucide-react";

interface AuditReport {
  timestamp: string;
  health: number;
  critical: string[];
  warnings: string[];
  healthy: string[];
  stats: {
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalProcesses: number;
    activeProcesses: number;
    stalledProcesses: number;
    totalEmails: number;
    financialRisk: number;
  };
}

export function AuditButton() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit");
      if (error) throw error;
      setReport(data);
    } catch (e) {
      console.error("Audit failed:", e);
    }
    setLoading(false);
  }, []);

  return (
    <div className="space-y-4">
      <Button onClick={runAudit} disabled={loading} className="w-full gap-2 font-semibold" size="lg">
        <Search className={cn("h-4 w-4", loading && "animate-spin")} />
        {loading ? "Auditando..." : "🔍 Auditar Escritório"}
      </Button>

      {report && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Relatório de Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Health */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <span className={cn("text-2xl font-bold", report.health >= 85 ? "text-success" : report.health >= 60 ? "text-warning" : "text-urgent")}>
                {report.health}%
              </span>
              <span className="text-sm text-muted-foreground">
                {report.health >= 85 ? "🟢 Saudável" : report.health >= 60 ? "🟡 Atenção" : "🔴 Crítico"}
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-md bg-card border">
                <div className="font-bold text-foreground">{report.stats.totalProcesses}</div>
                <div className="text-muted-foreground">Processos</div>
              </div>
              <div className="p-2 rounded-md bg-card border">
                <div className="font-bold text-foreground">{report.stats.pendingTasks}</div>
                <div className="text-muted-foreground">Pendentes</div>
              </div>
              <div className="p-2 rounded-md bg-card border">
                <div className="font-bold text-foreground">{report.stats.totalEmails}</div>
                <div className="text-muted-foreground">Emails</div>
              </div>
            </div>

            {/* Critical */}
            {report.critical.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-urgent text-xs font-semibold">
                  <AlertOctagon className="h-3 w-3" /> Crítico
                </div>
                {report.critical.map((c, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-4">• {c}</p>
                ))}
              </div>
            )}

            {/* Warnings */}
            {report.warnings.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-warning text-xs font-semibold">
                  <AlertTriangle className="h-3 w-3" /> Atenção
                </div>
                {report.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-4">• {w}</p>
                ))}
              </div>
            )}

            {/* Healthy */}
            {report.healthy.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-success text-xs font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Saudável
                </div>
                {report.healthy.map((h, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-4">• {h}</p>
                ))}
              </div>
            )}

            {/* Financial */}
            {report.stats.financialRisk > 0 && (
              <div className="p-2 rounded-md bg-warning/10 border border-warning/20">
                <p className="text-xs font-medium text-warning flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  R$ {report.stats.financialRisk.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em risco
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
