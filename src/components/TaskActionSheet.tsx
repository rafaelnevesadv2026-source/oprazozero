import { Task, formatDeadline, getDeadlineStatus } from "@/lib/tasks";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  Check, Trash2, Calendar, Flag, Scale, User, Archive,
  ChevronDown, X, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const priorityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

interface TaskActionSheetProps {
  tasks: Task[];
  title: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TaskActionSheet({ tasks, title, onToggle, onDelete, onClose }: TaskActionSheetProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 animate-slide-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum item nesta categoria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 animate-slide-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-card-foreground">
          {title} ({tasks.length})
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {tasks.map((task) => {
          const deadlineStatus = getDeadlineStatus(task.deadline);
          const isCompleted = task.status === "completed";
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all group border",
                isCompleted ? "opacity-50 bg-muted/30" : "bg-card hover:bg-muted/50"
              )}
            >
              <button
                onClick={() => onToggle(task.id)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "border-success bg-success"
                    : "border-muted-foreground/40 hover:border-primary"
                )}
              >
                {isCompleted && <Check className="h-3 w-3 text-success-foreground" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium text-card-foreground truncate", isCompleted && "line-through")}>
                    {task.title}
                  </span>
                  {!isCompleted && <StatusBadge status={deadlineStatus} />}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {isCompleted ? "Concluído" : formatDeadline(task.deadline)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    {priorityLabels[task.priority]}
                  </span>
                  {task.domain === "juridico" && (
                    <span className="flex items-center gap-1 text-primary">
                      <Scale className="h-3 w-3" /> Jurídico
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isCompleted && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggle(task.id)} title="Marcar concluída">
                    <Check className="h-3.5 w-3.5 text-success" />
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-urgent" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Deseja excluir definitivamente "{task.title}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(task.id)} className="bg-urgent hover:bg-urgent/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
