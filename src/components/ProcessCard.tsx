import { Link } from "react-router-dom";
import { Scale, User, ChevronRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessCardProps {
  process: {
    id: string;
    processNumber: string;
    clientName: string;
    adversary: string;
    status: string;
    domain: string;
    notes: string;
  };
  taskCount?: number;
  overdueCount?: number;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  active: { label: "Em andamento", icon: Clock, className: "text-primary" },
  paused: { label: "Pausado", icon: AlertTriangle, className: "text-warning" },
  closed: { label: "Encerrado", icon: CheckCircle2, className: "text-success" },
};

export function ProcessCard({ process, taskCount = 0, overdueCount = 0 }: ProcessCardProps) {
  const statusInfo = statusConfig[process.status] || statusConfig.active;
  const StatusIcon = statusInfo.icon;

  return (
    <Link to={`/processes/${process.id}`} className="block">
      <div className="group rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {process.domain === "juridico" ? (
                <Scale className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-mono text-sm font-medium text-muted-foreground truncate">
                {process.processNumber}
              </span>
            </div>
            <h3 className="font-semibold text-card-foreground truncate">{process.clientName}</h3>
            {process.adversary && (
              <p className="text-xs text-muted-foreground mt-0.5">vs. {process.adversary}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className={cn("flex items-center gap-1", statusInfo.className)}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
              {taskCount > 0 && (
                <span className="text-muted-foreground">{taskCount} tarefa{taskCount !== 1 ? "s" : ""}</span>
              )}
              {overdueCount > 0 && (
                <span className="text-urgent flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </div>
    </Link>
  );
}
