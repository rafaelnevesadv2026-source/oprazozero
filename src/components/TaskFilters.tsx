import { cn } from "@/lib/utils";

export type FilterType = "all" | "pending" | "overdue" | "completed";

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "overdue", label: "Atrasadas" },
  { value: "completed", label: "Concluídas" },
];

interface TaskFiltersProps {
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

export function TaskFilters({ active, onChange }: TaskFiltersProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === f.value
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
