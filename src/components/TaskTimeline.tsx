import { Task, formatDeadline, getDeadlineStatus } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface TaskTimelineProps {
  tasks: Task[];
}

export function TaskTimeline({ tasks }: TaskTimelineProps) {
  const sorted = [...tasks]
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 10);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-card-foreground">Linha do Tempo</h3>
      </div>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {sorted.map((t) => {
            const status = getDeadlineStatus(t.deadline);
            const isCompleted = t.status === "completed";
            return (
              <div key={t.id} className="relative flex items-start gap-4 pl-8">
                <div className="absolute left-1.5 top-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle
                      className={cn(
                        "h-4 w-4",
                        status === "overdue" ? "text-urgent" :
                        status === "urgent" ? "text-warning" : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium truncate", isCompleted && "line-through opacity-50")}>
                    {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDeadline(t.deadline)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
