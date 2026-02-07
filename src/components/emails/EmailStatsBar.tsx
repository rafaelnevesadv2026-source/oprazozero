import { Mail, AlertTriangle, Clock, CheckCircle, Scale, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailStatsBarProps {
  total: number;
  urgent: number;
  pending: number;
  withDeadline: number;
  withValue: number;
  taskCreated: number;
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof Mail; label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border">
      <Icon className={cn("h-4 w-4", color || "text-muted-foreground")} />
      <div>
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function EmailStatsBar({ total, urgent, pending, withDeadline, withValue, taskCreated }: EmailStatsBarProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      <Stat icon={Mail} label="Total" value={total} />
      <Stat icon={AlertTriangle} label="Ação necessária" value={urgent} color="text-urgent" />
      <Stat icon={Clock} label="Requer resposta" value={pending} color="text-warning" />
      <Stat icon={Scale} label="Com prazo" value={withDeadline} color="text-urgent" />
      <Stat icon={DollarSign} label="Com valor" value={withValue} color="text-success" />
      <Stat icon={CheckCircle} label="Tarefa criada" value={taskCreated} color="text-success" />
    </div>
  );
}
