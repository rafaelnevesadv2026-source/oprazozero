import { Task, getDeadlineStatus } from "@/lib/tasks";
import { Clock, AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";

interface StatsCardsProps {
  tasks: Task[];
}

export function StatsCards({ tasks }: StatsCardsProps) {
  const pending = tasks.filter((t) => t.status === "pending");
  const completed = tasks.filter((t) => t.status === "completed");
  const overdue = pending.filter((t) => getDeadlineStatus(t.deadline) === "overdue");
  const urgent = pending.filter(
    (t) => getDeadlineStatus(t.deadline) === "urgent" || getDeadlineStatus(t.deadline) === "soon"
  );

  const stats = [
    {
      label: "Total",
      value: tasks.length,
      icon: ListTodo,
      className: "text-primary",
    },
    {
      label: "Atrasadas",
      value: overdue.length,
      icon: AlertTriangle,
      className: "text-urgent",
    },
    {
      label: "Urgentes",
      value: urgent.length,
      icon: Clock,
      className: "text-warning",
    },
    {
      label: "Concluídas",
      value: completed.length,
      icon: CheckCircle2,
      className: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border bg-card p-4 transition-all hover:shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`h-4 w-4 ${stat.className}`} />
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
