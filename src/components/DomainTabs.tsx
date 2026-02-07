import { cn } from "@/lib/utils";
import { Scale, User, Trash2 } from "lucide-react";
import { TaskDomain } from "@/lib/tasks";

export type DomainFilter = TaskDomain | "all";

const tabs: { value: DomainFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Tudo", icon: null },
  { value: "juridico", label: "Jurídico", icon: <Scale className="h-4 w-4" /> },
  { value: "pessoal", label: "Pessoal", icon: <User className="h-4 w-4" /> },
  { value: "descarte", label: "Descarte", icon: <Trash2 className="h-4 w-4" /> },
];

interface DomainTabsProps {
  active: DomainFilter;
  onChange: (domain: DomainFilter) => void;
  counts?: Record<DomainFilter, number>;
}

export function DomainTabs({ active, onChange, counts }: DomainTabsProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            active === tab.value
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.icon}
          {tab.label}
          {counts && counts[tab.value] > 0 && (
            <span className={cn(
              "ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold",
              active === tab.value ? "bg-primary/10 text-primary" : "bg-muted-foreground/10"
            )}>
              {counts[tab.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
