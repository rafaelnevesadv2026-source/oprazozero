import { useEffect } from "react";
import { useSmartAlerts, SmartAlert } from "@/hooks/useSmartAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Activity, TrendingUp } from "lucide-react";

const levelStyles: Record<string, string> = {
  critical: "border-urgent/30 bg-urgent/5",
  warning: "border-warning/30 bg-warning/5",
  info: "border-primary/20 bg-primary/5",
};

const levelBadge: Record<string, { label: string; className: string }> = {
  critical: { label: "Crítico", className: "bg-urgent text-urgent-foreground" },
  warning: { label: "Atenção", className: "bg-warning text-warning-foreground" },
  info: { label: "Info", className: "bg-primary text-primary-foreground" },
};

export function SmartAlertsPanel() {
  const { alerts, stats, loading, fetchAlerts } = useSmartAlerts();

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const healthColor = stats ? (stats.health >= 85 ? "text-success" : stats.health >= 60 ? "text-warning" : "text-urgent") : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Health Semaphore */}
      {stats && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("text-3xl font-bold", healthColor)}>{stats.health}%</div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">Saúde do Escritório</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.health >= 85 ? "🟢 Saudável" : stats.health >= 60 ? "🟡 Atenção" : "🔴 Crítico"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchAlerts} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
            {stats.financialRisk > 0 && (
              <div className="mt-3 p-2 rounded-md bg-warning/10 border border-warning/20">
                <p className="text-xs font-medium text-warning flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  R$ {stats.financialRisk.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em risco financeiro
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Alertas Inteligentes
            {alerts.filter((a) => a.level === "critical").length > 0 && (
              <Badge className="bg-urgent text-urgent-foreground text-[10px]">
                {alerts.filter((a) => a.level === "critical").length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">Analisando...</p>
          ) : alerts.filter((a) => a.type !== "health").length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">✅ Tudo em ordem!</p>
          ) : (
            alerts.filter((a) => a.type !== "health").sort((a, b) => {
              const order = { critical: 0, warning: 1, info: 2 };
              return order[a.level] - order[b.level];
            }).map((alert, i) => (
              <div key={i} className={cn("p-3 rounded-md border", levelStyles[alert.level])}>
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{alert.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-card-foreground">{alert.title}</p>
                      <Badge className={cn("text-[10px] px-1 py-0", levelBadge[alert.level].className)}>
                        {levelBadge[alert.level].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{alert.description}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
