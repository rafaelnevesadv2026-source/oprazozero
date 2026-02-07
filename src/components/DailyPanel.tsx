import { Task, getDaysRemaining } from "@/lib/tasks";
import { CheckCircle2, Circle, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyPanelProps {
  tasks: Task[];
  onToggle: (id: string) => void;
}

export function DailyPanel({ tasks, onToggle }: DailyPanelProps) {
  const today = tasks.filter((t) => {
    const d = getDaysRemaining(t.deadline);
    return d <= 0 || d === 1;
  });

  const done = today.filter((t) => t.status === "completed").length;
  const total = today.length;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sunrise className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold text-card-foreground">Painel do Dia</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {done}/{total} concluídas
        </span>
      </div>
      {today.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma tarefa para hoje! 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {today.map((t) => (
            <button
              key={t.id}
              onClick={() => onToggle(t.id)}
              className={cn(
                "flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                t.status === "completed" && "opacity-50"
              )}
            >
              {t.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={cn("truncate", t.status === "completed" && "line-through")}>
                {t.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
