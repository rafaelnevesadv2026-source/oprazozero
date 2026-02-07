import { Task, getDeadlineStatus, formatDeadline } from "@/lib/tasks";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { Check, Trash2, Calendar, Flag, Scale, User } from "lucide-react";

const priorityIcons: Record<string, string> = {
  high: "text-urgent",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const priorityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

export function TaskCard({ task, onToggle, onDelete, onClick }: TaskCardProps) {
  const deadlineStatus = getDeadlineStatus(task.deadline);
  const isCompleted = task.status === "completed";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/40 animate-slide-in cursor-pointer",
        isCompleted && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isCompleted
              ? "border-success bg-success"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {isCompleted && <Check className="h-3 w-3 text-success-foreground" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={cn(
                "font-semibold text-card-foreground truncate",
                isCompleted && "line-through"
              )}
            >
              {task.title}
            </h3>
            {!isCompleted && <StatusBadge status={deadlineStatus} />}
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {isCompleted ? "Concluído" : formatDeadline(task.deadline)}
            </span>
            <span className={cn("flex items-center gap-1", priorityIcons[task.priority])}>
              <Flag className="h-3 w-3" />
              {priorityLabels[task.priority]}
            </span>
            {task.domain === "juridico" && (
              <span className="flex items-center gap-1 text-primary">
                <Scale className="h-3 w-3" />
                Jurídico
              </span>
            )}
            {task.domain === "pessoal" && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Pessoal
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-urgent p-1"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
