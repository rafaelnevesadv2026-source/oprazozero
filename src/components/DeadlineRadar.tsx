import { Task, getDaysRemaining } from "@/lib/tasks";
import { AlertTriangle, Clock, CalendarDays, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeadlineRadarProps {
  tasks: Task[];
}

export function DeadlineRadar({ tasks }: DeadlineRadarProps) {
  const pending = tasks.filter((t) => t.status === "pending");

  const buckets = [
    {
      label: "Hoje",
      icon: AlertTriangle,
      className: "text-urgent bg-urgent/10 border-urgent/30",
      count: pending.filter((t) => {
        const d = getDaysRemaining(t.deadline);
        return d <= 0;
      }).length,
    },
    {
      label: "Amanhã",
      icon: Clock,
      className: "text-warning bg-warning/10 border-warning/30",
      count: pending.filter((t) => getDaysRemaining(t.deadline) === 1).length,
    },
    {
      label: "3 dias",
      icon: CalendarDays,
      className: "text-primary bg-primary/10 border-primary/30",
      count: pending.filter((t) => {
        const d = getDaysRemaining(t.deadline);
        return d >= 2 && d <= 3;
      }).length,
    },
    {
      label: "7 dias",
      icon: CalendarCheck,
      className: "text-success bg-success/10 border-success/30",
      count: pending.filter((t) => {
        const d = getDaysRemaining(t.deadline);
        return d >= 4 && d <= 7;
      }).length,
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold text-card-foreground mb-3">🎯 Radar de Prazos</h3>
      <div className="grid grid-cols-4 gap-2">
        {buckets.map((b) => (
          <div
            key={b.label}
            className={cn("flex flex-col items-center gap-1 rounded-lg border p-3 text-center", b.className)}
          >
            <b.icon className="h-5 w-5" />
            <span className="text-2xl font-bold">{b.count}</span>
            <span className="text-xs font-medium">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
