import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Task, getDeadlineStatus, formatDeadline, getDaysRemaining } from "@/lib/tasks";
import { StatusBadge } from "./StatusBadge";
import { TaskLabelPicker } from "./TaskLabelPicker";
import { useLabels } from "@/hooks/useLabels";
import { cn } from "@/lib/utils";
import {
  Calendar, Flag, Scale, User, FileText, Clock, Check,
  Trash2, AlertTriangle, Info, Zap, Tag
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityConfig: Record<string, { label: string; color: string; icon: typeof Flag }> = {
  high: { label: "Alta", color: "bg-urgent/10 text-urgent border-urgent/20", icon: AlertTriangle },
  medium: { label: "Média", color: "bg-warning/10 text-warning border-warning/20", icon: Flag },
  low: { label: "Baixa", color: "bg-muted text-muted-foreground border-border", icon: Info },
};

const domainConfig: Record<string, { label: string; icon: typeof Scale; color: string }> = {
  juridico: { label: "Jurídico", icon: Scale, color: "text-primary" },
  pessoal: { label: "Pessoal", icon: User, color: "text-muted-foreground" },
  descarte: { label: "Descarte", icon: Trash2, color: "text-muted-foreground" },
};

const sourceLabels: Record<string, string> = {
  manual: "Criação manual",
  email: "Gerada por email (IA)",
  audit: "Gerada por auditoria",
};

function InfoRow({ icon: Icon, label, value, className }: { icon: typeof Calendar; label: string; value: string; className?: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium text-foreground", className)}>{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: typeof Calendar }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export function TaskDetailSheet({ task, open, onOpenChange, onToggle, onDelete }: TaskDetailSheetProps) {
  const { labels } = useLabels();
  if (!task) return null;

  const deadlineStatus = getDeadlineStatus(task.deadline);
  const isCompleted = task.status === "completed";
  const daysRemaining = getDaysRemaining(task.deadline);
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const domainInfo = domainConfig[task.domain] || domainConfig.pessoal;
  const DomainIcon = domainInfo.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <DomainIcon className={cn("h-5 w-5 shrink-0", domainInfo.color)} />
            <SheetTitle className="text-left text-base leading-tight">
              {task.title}
            </SheetTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={deadlineStatus} />
            <Badge variant="outline" className={priority.color}>
              <Flag className="h-3 w-3 mr-1" />
              {priority.label}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-[10px]",
              isCompleted
                ? "bg-success/10 text-success border-success/30"
                : "bg-primary/10 text-primary border-primary/30"
            )}>
              {isCompleted ? (
                <><Check className="h-3 w-3 mr-1" /> Concluída</>
              ) : (
                <><Clock className="h-3 w-3 mr-1" /> Pendente</>
              )}
            </Badge>
          </div>
        </SheetHeader>

        <Separator />

        {/* Descrição */}
        {task.description && (
          <>
            <div className="py-4">
              <SectionHeader title="Descrição" icon={FileText} />
              <div className="rounded-lg border bg-muted/50 p-3 mt-1">
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {task.description}
                </p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Prazo */}
        <div>
          <SectionHeader title="Prazo" icon={Calendar} />
          <InfoRow
            icon={Calendar}
            label="Data limite"
            value={format(new Date(task.deadline), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
            className={cn(
              deadlineStatus === "overdue" && "text-urgent font-bold",
              deadlineStatus === "urgent" && "text-warning font-bold",
              deadlineStatus === "soon" && "text-warning",
            )}
          />
          <InfoRow
            icon={Clock}
            label="Situação"
            value={isCompleted ? "Tarefa concluída" : formatDeadline(task.deadline)}
            className={cn(
              !isCompleted && deadlineStatus === "overdue" && "text-urgent font-semibold",
              !isCompleted && deadlineStatus === "urgent" && "text-warning font-semibold",
            )}
          />
          {!isCompleted && daysRemaining <= 3 && daysRemaining >= 0 && (
            <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-warning font-medium">
                {daysRemaining === 0 ? "⚠️ Vence hoje! Ação imediata necessária." :
                  daysRemaining === 1 ? "⚠️ Vence amanhã! Priorize esta tarefa." :
                    `⚠️ Faltam apenas ${daysRemaining} dias.`}
              </p>
            </div>
          )}
          {!isCompleted && deadlineStatus === "overdue" && (
            <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-urgent/10 border border-urgent/20">
              <AlertTriangle className="h-4 w-4 text-urgent shrink-0" />
              <p className="text-xs text-urgent font-medium">
                🚨 Atrasada há {Math.abs(daysRemaining)} dia{Math.abs(daysRemaining) !== 1 ? "s" : ""}!
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Detalhes */}
        <div>
          <SectionHeader title="Detalhes" icon={Info} />
          <InfoRow icon={DomainIcon} label="Domínio" value={domainInfo.label} />
          <InfoRow icon={Zap} label="Origem" value={sourceLabels[task.source || "manual"] || task.source || "Manual"} />
          <InfoRow
            icon={Tag}
            label="Criada em"
            value={format(new Date(task.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          />
        </div>

        <Separator />

        {/* Etiquetas */}
        <TaskLabelPicker taskId={task.id} allLabels={labels} />

        <Separator />
        <div className="py-4 space-y-2">
          <SectionHeader title="Ações" icon={Zap} />
          <div className="flex gap-2">
            <Button
              onClick={() => { onToggle(task.id); onOpenChange(false); }}
              variant={isCompleted ? "outline" : "default"}
              className="flex-1 gap-2"
            >
              {isCompleted ? (
                <><Clock className="h-4 w-4" /> Reabrir tarefa</>
              ) : (
                <><Check className="h-4 w-4" /> Marcar concluída</>
              )}
            </Button>
            <Button
              onClick={() => { onDelete(task.id); onOpenChange(false); }}
              variant="outline"
              className="gap-2 text-urgent hover:text-urgent hover:bg-urgent/10"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
