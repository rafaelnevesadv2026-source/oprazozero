import { DeadlineStatus } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const statusConfig: Record<DeadlineStatus, { label: string; className: string }> = {
  overdue: { label: "Atrasado", className: "bg-urgent/15 text-urgent border-urgent/30" },
  urgent: { label: "Urgente", className: "bg-warning/15 text-warning border-warning/30 animate-pulse-urgent" },
  soon: { label: "Em breve", className: "bg-warning/10 text-warning border-warning/20" },
  safe: { label: "No prazo", className: "bg-success/15 text-success border-success/30" },
};

export function StatusBadge({ status }: { status: DeadlineStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
