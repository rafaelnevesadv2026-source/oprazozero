import { Task, getDeadlineStatus } from "@/lib/tasks";
import { Clock, AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatsFilter = "all" | "overdue" | "urgent" | "completed";

interface StatsCardsProps {
  tasks: Task[];
  activeFilter?: StatsFilter;
  onFilterClick?: (filter: StatsFilter) => void;
}

export function StatsCards({ tasks, activeFilter, onFilterClick }: StatsCardsProps) {
  const pending = tasks.filter((t) => t.status === "pending");
  const completed = tasks.filter((t) => t.status === "completed");
  const overdue = pending.filter((t) => getDeadlineStatus(t.deadline) === "overdue");
  const urgent = pending.filter(
    (t) => getDeadlineStatus(t.deadline) === "urgent" || getDeadlineStatus(t.deadline) === "soon"
  );

  const stats: { key: StatsFilter; label: string; value: number; icon: typeof ListTodo; className: string }[] = [
    { key: "all", label: "Total", value: tasks.length, icon: ListTodo, className: "text-primary" },
    { key: "overdue", label: "Atrasadas", value: overdue.length, icon: AlertTriangle, className: "text-urgent" },
    { key: "urgent", label: "Urgentes", value: urgent.length, icon: Clock, className: "text-warning" },
    { key: "completed", label: "Concluídas", value: completed.length, icon: CheckCircle2, className: "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <button
          key={stat.key}
          onClick={() => onFilterClick?.(stat.key)}
          className={cn(
            "rounded-lg border bg-card p-4 transition-all hover:shadow-md text-left cursor-pointer",
            activeFilter === stat.key && "ring-2 ring-primary shadow-md"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`h-4 w-4 ${stat.className}`} />
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
        </button>
      ))}
    </div>
  );
}
