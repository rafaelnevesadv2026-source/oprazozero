import { useState, useMemo } from "react";
import { Task, getDaysRemaining, formatDeadline, getDeadlineStatus } from "@/lib/tasks";
import { CheckCircle2, Circle, Sunrise, Archive, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyPanelProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onSelectTask?: (task: Task) => void;
}

export function DailyPanel({ tasks, onToggle, onSelectTask }: DailyPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (dismissed.has(t.id)) return false;
        if (t.status === "completed") return false;
        const d = getDaysRemaining(t.deadline);
        return d <= 1; // today or overdue
      })
      .sort((a, b) => {
        // Overdue first, then by deadline
        const sa = getDeadlineStatus(a.deadline);
        const sb = getDeadlineStatus(b.deadline);
        if (sa === "overdue" && sb !== "overdue") return -1;
        if (sb === "overdue" && sa !== "overdue") return 1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [tasks, dismissed]);

  const handleToggle = (id: string) => {
    onToggle(id);
    // Auto-dismiss after completing
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const total = tasks.filter(t => {
    const d = getDaysRemaining(t.deadline);
    return d <= 1;
  }).length;

  const doneCount = tasks.filter(t => {
    const d = getDaysRemaining(t.deadline);
    return d <= 1 && t.status === "completed";
  }).length;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sunrise className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold text-card-foreground">Painel do Dia</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {doneCount}/{total} concluídas
        </span>
      </div>

      {todayTasks.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "Nenhuma tarefa para hoje! 🎉" : "Tudo tratado por hoje! ✅"}
          </p>
          {dismissed.size > 0 && (
            <button
              onClick={() => setDismissed(new Set())}
              className="text-xs text-primary hover:underline mt-2 flex items-center gap-1 mx-auto"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar painel
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {todayTasks.map((t) => {
            const status = getDeadlineStatus(t.deadline);
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all group",
                  status === "overdue" ? "bg-urgent/5 hover:bg-urgent/10" : "hover:bg-muted"
                )}
              >
                <button onClick={() => handleToggle(t.id)} className="shrink-0">
                  <Circle className={cn(
                    "h-4 w-4",
                    status === "overdue" ? "text-urgent" : "text-muted-foreground hover:text-primary"
                  )} />
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectTask?.(t)}>
                  <span className="truncate block text-card-foreground">{t.title}</span>
                  <span className={cn(
                    "text-xs",
                    status === "overdue" ? "text-urgent" : "text-muted-foreground"
                  )}>
                    {formatDeadline(t.deadline)}
                  </span>
                </div>
                <button
                  onClick={() => handleDismiss(t.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1"
                  title="Arquivar do painel"
                >
                  <Archive className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
